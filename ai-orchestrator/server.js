import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { orchestrate, setPrompter, resetPrompter } from './orchestrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// Run registry — one run at a time (serial). Keeps state simple.
// ─────────────────────────────────────────────────────────────
const runs = new Map(); // runId -> Run
let activeRunId = null;

function createRun(task, closesIssue) {
  const id = crypto.randomUUID();
  const run = {
    id,
    task,
    closesIssue,
    createdAt: Date.now(),
    log: [],                  // { level, msg, ts }[]
    events: new EventEmitter(),
    pendingPrompt: null,      // { id, type, question, options? }
    status: 'pending',        // pending | running | done | error
    result: null,
    error: null,
  };
  run.events.setMaxListeners(0); // SSE clients can come and go
  runs.set(id, run);
  return run;
}

function pushLog(run, level, msg) {
  const entry = { level, msg: String(msg), ts: Date.now() };
  run.log.push(entry);
  run.events.emit('log', entry);
}

// ─────────────────────────────────────────────────────────────
// console.* capture — wraps while a run is active so that the
// orchestrator's existing console.log/warn/error are relayed to
// the browser without modifying the orchestrator itself.
// ─────────────────────────────────────────────────────────────
function installConsoleCapture(run) {
  const orig = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  const serialize = (args) =>
    args
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
      .join(' ');
  console.log = (...a) => { orig.log(...a); pushLog(run, 'log', serialize(a)); };
  console.warn = (...a) => { orig.warn(...a); pushLog(run, 'warn', serialize(a)); };
  console.error = (...a) => { orig.error(...a); pushLog(run, 'error', serialize(a)); };
  return () => {
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
  };
}

// ─────────────────────────────────────────────────────────────
// Web prompter — the shape matches utils/promptUser.js so the
// orchestrator can be injected with this in place of readline.
// ─────────────────────────────────────────────────────────────
function createWebPrompter(run) {
  function openPrompt(prompt) {
    const id = crypto.randomUUID();
    run.pendingPrompt = { id, ...prompt };
    run.events.emit('prompt', run.pendingPrompt);
    return new Promise((resolve) => {
      run.events.once(`answer:${id}`, (answer) => {
        run.pendingPrompt = null;
        run.events.emit('prompt_closed', { id });
        resolve(answer);
      });
    });
  }

  return {
    askYesNo: async (question, defaultValue = false, context) => {
      const raw = await openPrompt({ kind: 'yesno', question, default: defaultValue, context });
      // Web UI sends boolean — coerce
      if (typeof raw === 'boolean') return raw;
      const s = String(raw).trim().toLowerCase();
      if (s === '') return defaultValue;
      return s === 'y' || s === 'yes' || s === 'true';
    },
    askText: async (question, defaultValue = '', context) => {
      const raw = await openPrompt({ kind: 'text', question, default: defaultValue, context });
      const s = String(raw ?? '').trim();
      return s === '' ? defaultValue : s;
    },
    askChoice: async (question, options = [], context) => {
      const raw = await openPrompt({ kind: 'choice', question, options, context });
      return String(raw ?? '').trim() || '(no answer provided)';
    },
    askYesNoOther: async (question, context) => {
      const raw = await openPrompt({ kind: 'yesno_other', question, context });
      const s = String(raw ?? '').trim();
      if (!s) return '(no answer provided)';
      // Canonicalise Yes/No; anything else is treated as custom text
      if (s.toLowerCase() === 'yes' || s.toLowerCase() === 'y') return 'Yes';
      if (s.toLowerCase() === 'no' || s.toLowerCase() === 'n') return 'No';
      return s;
    },
    askBatch: async (requirements) => {
      const question =
        `A few clarifications before the agents run — please answer all ${requirements.length} ` +
        `item${requirements.length === 1 ? '' : 's'}:`;
      const raw = await openPrompt({ kind: 'batch', question, requirements });
      if (!Array.isArray(raw)) return requirements.map(() => '(no answer provided)');
      return requirements.map((_, i) => {
        const v = raw[i];
        if (v == null) return '(no answer provided)';
        const s = String(v).trim();
        return s || '(no answer provided)';
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Issues — authenticated REST first (UI token / env), then gh CLI,
// then unauthenticated public REST. Order maximises "private repos work".
// ─────────────────────────────────────────────────────────────

/** Extract a GitHub token from the incoming request header, or .env fallback. */
function resolveGithubToken(req) {
  const hdr = req.headers.authorization || '';
  // Accept both "Bearer <token>" and "token <token>" forms for convenience
  const m = hdr.match(/^(?:Bearer|token)\s+(\S+)$/i);
  if (m) return m[1];
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  return null;
}

async function fetchIssuesViaRest(repo, token) {
  const url = `https://api.github.com/repos/${repo}/issues?state=open&per_page=50`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(url, { headers });
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`GitHub API ${r.status}: ${text}`);
    err.status = r.status;
    throw err;
  }
  const issues = await r.json();
  return issues
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      body: i.body ?? '',
      url: i.html_url,
      labels: (i.labels || []).map((l) => l.name),
    }));
}

function fetchIssuesViaGh(repo) {
  const check = spawnSync('gh', ['--version'], { encoding: 'utf-8' });
  if (check.error || check.status !== 0) return null;
  const r = spawnSync(
    'gh',
    ['issue', 'list', '--repo', repo, '--state', 'open', '--json', 'number,title,body,url,labels', '--limit', '50'],
    { encoding: 'utf-8' }
  );
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    throw new Error(`gh issue list failed: ${err}`);
  }
  const parsed = JSON.parse(r.stdout);
  return parsed.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ?? '',
    url: i.url,
    labels: (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
  }));
}

app.get('/api/issues', async (req, res) => {
  const repo = String(req.query.repo || '').trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    return res.status(400).json({ error: 'repo must be in the form owner/name' });
  }
  const token = resolveGithubToken(req);

  // 1. Authenticated REST (UI-supplied token / env) — best for private repos
  if (token) {
    try {
      const issues = await fetchIssuesViaRest(repo, token);
      return res.json({ source: 'rest-auth', issues, authenticated: true });
    } catch (err) {
      if (err.status === 401) {
        return res.status(401).json({
          error: 'GitHub rejected the token (invalid or expired). Update it and try again.',
          authRequired: true,
        });
      }
      if (err.status === 404) {
        return res.status(404).json({
          error: `Repo '${repo}' not found. Either the name is wrong or the token lacks access to it.`,
          authRequired: true,
        });
      }
      // Fall through to other methods on unknown REST errors
      console.warn(`[issues] authenticated REST failed, trying fallbacks: ${err.message}`);
    }
  }

  // 2. gh CLI — uses the OS keychain; works for private if user ran `gh auth login`
  try {
    const viaGh = fetchIssuesViaGh(repo);
    if (viaGh) return res.json({ source: 'gh', issues: viaGh, authenticated: true });
  } catch (err) {
    console.warn(`[issues] gh CLI path failed, trying unauthenticated REST: ${err.message}`);
  }

  // 3. Unauthenticated REST — public repos only
  try {
    const issues = await fetchIssuesViaRest(repo, null);
    return res.json({ source: 'rest-public', issues, authenticated: false });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        error:
          `Repo '${repo}' not found via the public API. If it's private, add a token (UI input or GITHUB_TOKEN env).`,
        authRequired: true,
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Runs
// ─────────────────────────────────────────────────────────────
app.post('/api/runs', async (req, res) => {
  if (activeRunId) {
    const active = runs.get(activeRunId);
    if (active && (active.status === 'pending' || active.status === 'running')) {
      return res.status(409).json({
        error: 'a run is already in progress',
        activeRunId,
      });
    }
  }

  const { task, closesIssue } = req.body ?? {};
  if (!task || typeof task !== 'string' || task.trim() === '') {
    return res.status(400).json({ error: 'task is required and must be a non-empty string' });
  }

  const run = createRun(task.trim(), closesIssue);
  activeRunId = run.id;
  res.json({ runId: run.id });

  // Kick off orchestration asynchronously
  (async () => {
    const restoreConsole = installConsoleCapture(run);
    const prompter = createWebPrompter(run);
    setPrompter(prompter);
    run.status = 'running';
    try {
      const result = await orchestrate(run.task, { closesIssue: run.closesIssue });
      run.result = result;
      run.status = 'done';
      run.events.emit('done', { formatted: result.formatted });
    } catch (err) {
      run.error = err;
      run.status = 'error';
      run.events.emit('error', { message: err.message ?? String(err) });
    } finally {
      restoreConsole();
      resetPrompter();
      if (activeRunId === run.id) activeRunId = null;
    }
  })();
});

app.get('/api/runs/:id/events', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const write = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay history
  run.log.forEach((entry) => write('log', entry));
  if (run.pendingPrompt) write('prompt', run.pendingPrompt);
  if (run.status === 'done') write('done', { formatted: run.result?.formatted ?? '' });
  if (run.status === 'error') write('error', { message: run.error?.message ?? 'unknown error' });

  const onLog = (e) => write('log', e);
  const onPrompt = (p) => write('prompt', p);
  const onClosed = (e) => write('prompt_closed', e);
  const onDone = (d) => write('done', d);
  const onError = (e) => write('error', e);

  run.events.on('log', onLog);
  run.events.on('prompt', onPrompt);
  run.events.on('prompt_closed', onClosed);
  run.events.on('done', onDone);
  run.events.on('error', onError);

  req.on('close', () => {
    run.events.off('log', onLog);
    run.events.off('prompt', onPrompt);
    run.events.off('prompt_closed', onClosed);
    run.events.off('done', onDone);
    run.events.off('error', onError);
    res.end();
  });
});

app.post('/api/runs/:id/answer', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  if (!run.pendingPrompt) return res.status(400).json({ error: 'no pending prompt' });

  const { promptId, answer } = req.body ?? {};
  if (promptId !== run.pendingPrompt.id) {
    return res.status(409).json({ error: 'promptId mismatch (stale?)' });
  }
  run.events.emit(`answer:${promptId}`, answer);
  res.json({ ok: true });
});

app.get('/api/runs/:id', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  res.json({
    id: run.id,
    status: run.status,
    task: run.task,
    closesIssue: run.closesIssue,
    pendingPrompt: run.pendingPrompt,
    error: run.error?.message ?? null,
  });
});

// ─────────────────────────────────────────────────────────────
// Static root
// ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = Number(process.env.UI_PORT ?? 3500);
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  console.warn(`[ui] ${publicDir} does not exist yet — create public/index.html to use the UI.`);
}
app.listen(port, () => {
  console.log(`[ui] listening on http://localhost:${port}`);
  console.log(`[ui] default repo from env: ${process.env.GITHUB_REPO ?? '(unset)'}`);
});
