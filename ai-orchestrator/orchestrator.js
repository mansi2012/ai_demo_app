import { ORCHESTRATOR_SYSTEM, buildOrchestratorMessage } from './prompts/orchestratorPrompt.js';
import { REFINE_SYSTEM, buildRefineMessage } from './prompts/refinePrompt.js';
import { runFrontendAgent } from './agents/frontendAgent.js';
import { runBackendAgent } from './agents/backendAgent.js';
import { runQAAgent } from './agents/qaAgent.js';
import { runDesignAgent } from './agents/designAgent.js';
import { runReviewerAgent } from './agents/reviewerAgent.js';
import { runSecurityAgent } from './agents/securityAgent.js';
import { runDocsAgent } from './agents/docsAgent.js';
import { callLLM } from './utils/callLLM.js';
import { usageTally, resetUsageTally } from './utils/claude.js';
import { writeProjectFiles } from './utils/writeFiles.js';
import * as cliPrompter from './utils/promptUser.js';
import { extractJSONObject } from './utils/parseAgentJSON.js';
import * as git from './utils/gitActions.js';

// Prompter is swappable — CLI by default, overridden by the web server.
let activePrompter = cliPrompter;
export function setPrompter(p) { activePrompter = p; }
export function resetPrompter() { activePrompter = cliPrompter; }

// Wrappers that always go through the currently-active prompter
const askYesNo = (...args) => activePrompter.askYesNo(...args);
const askText = (...args) => activePrompter.askText(...args);
const askChoice = (...args) => activePrompter.askChoice(...args);
const askYesNoOther = (...args) => activePrompter.askYesNoOther(...args);
const askBatch = (...args) => {
  // Prefer prompter-supplied askBatch; fall back to the CLI helper if absent
  if (typeof activePrompter.askBatch === 'function') return activePrompter.askBatch(...args);
  return cliPrompter.askBatch(...args);
};

/**
 * Ask the LLM to rephrase the user's task for clarity without changing intent.
 * Returns { refined, notes }. On any failure, returns { refined: raw, notes: '(refinement failed)' }
 * so callers can degrade gracefully.
 */
async function refineTask(rawTask) {
  const prompt = `
${REFINE_SYSTEM}

${buildRefineMessage(rawTask)}
`;

  let raw;
  try {
    raw = await callLLM(prompt, { tier: 'aux' });
  } catch (err) {
    console.warn(`[orchestrator] Task refinement LLM call failed: ${err.message} — using raw task.`);
    return { refined: rawTask, notes: '(refinement call failed)' };
  }

  const jsonStr = extractJSONObject(raw);
  if (!jsonStr) {
    console.warn('[orchestrator] Task refinement returned no JSON — using raw task.');
    return { refined: rawTask, notes: '(no JSON in refinement)' };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const refined = typeof parsed.refined === 'string' && parsed.refined.trim() !== ''
      ? parsed.refined.trim()
      : rawTask;
    const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : '';
    return { refined, notes };
  } catch (err) {
    console.warn(`[orchestrator] Task refinement JSON parse failed: ${err.message} — using raw task.`);
    return { refined: rawTask, notes: '(refinement parse failed)' };
  }
}

/**
 * Interactive refinement step. Shows the user the original vs refined task
 * and lets them accept, reject, or edit. Returns the task to feed into planning.
 * Controlled by env: SKIP_REFINE=true bypasses entirely.
 */
async function confirmRefinedTask(rawTask) {
  if (process.env.SKIP_REFINE === 'true') {
    console.log('[orchestrator] SKIP_REFINE=true — using raw task as-is.');
    return { task: rawTask, refinement: null };
  }

  console.log('\n[orchestrator] Refining task...');
  const { refined, notes } = await refineTask(rawTask);

  if (refined.trim() === rawTask.trim()) {
    console.log('[orchestrator] Task is already clear — no refinement needed.');
    return { task: rawTask, refinement: { refined, notes, accepted: 'unchanged' } };
  }

  console.log('\n--- Original ---');
  console.log(rawTask);
  console.log('\n--- Refined ---');
  console.log(refined);
  if (notes) console.log(`\n(note: ${notes})`);

  const answer = await askYesNoOther('Use the refined task?', {
    kind: 'refinement',
    original: rawTask,
    refined,
    notes,
  });

  if (answer === 'Yes') {
    console.log('[orchestrator] Using refined task.');
    return { task: refined, refinement: { refined, notes, accepted: 'refined' } };
  }
  if (answer === 'No') {
    console.log('[orchestrator] Using your original task.');
    return { task: rawTask, refinement: { refined, notes, accepted: 'original' } };
  }
  console.log('[orchestrator] Using your edited task.');
  return { task: answer, refinement: { refined, notes, accepted: 'edited', edited: answer } };
}

async function planTask(task) {
  const prompt = `
${ORCHESTRATOR_SYSTEM}

${buildOrchestratorMessage(task)}

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation.
If unsure, still return valid JSON.
`;

  const raw = await callLLM(prompt);

  const jsonStr = extractJSONObject(raw);
  if (!jsonStr) {
    throw new Error(`Orchestrator returned no JSON object.\n--- raw ---\n${raw}\n--- end raw ---`);
  }

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Orchestrator JSON parse failed: ${err.message}\n--- extracted ---\n${jsonStr}\n--- raw ---\n${raw}\n--- end raw ---`
    );
  }
}

/**
 * Normalise a missing_requirement entry to { question, type, options }.
 * Handles the legacy string shape for backwards compat.
 */
function normaliseRequirement(req) {
  if (typeof req === 'string') {
    return { question: req, type: 'text', options: [] };
  }
  return {
    question: req.question ?? '(missing question text)',
    type: req.type ?? 'choice',
    options: Array.isArray(req.options) ? req.options : [],
  };
}

/**
 * Prompt the user for ALL missing requirements in a single batch and fold
 * their answers into agent_instructions as a "User clarifications" block.
 * The web prompter renders one combined modal; the CLI prompter loops
 * internally. Either way, orchestrator calls askBatch exactly once.
 *
 * Mutates `plan` in place. Returns the list of {question, answer} pairs.
 */
async function resolveMissingRequirements(plan) {
  const rawReqs = Array.isArray(plan.missing_requirements) ? plan.missing_requirements : [];
  if (rawReqs.length === 0) return [];

  const normalised = rawReqs.map(normaliseRequirement);

  console.log(
    `\n[orchestrator] ${normalised.length} clarification${normalised.length === 1 ? '' : 's'} needed before implementation.`
  );

  const answers = await askBatch(normalised);
  const pairs = normalised.map((req, i) => ({
    question: req.question,
    answer: (answers?.[i] ?? '').toString().trim() || '(no answer provided)',
  }));

  const block =
    '\n\n--- User clarifications ---\n' +
    pairs.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join('\n\n');

  plan.agent_instructions = plan.agent_instructions ?? {};
  for (const name of ['frontend', 'backend', 'qa']) {
    if (typeof plan.agent_instructions[name] === 'string' && plan.agent_instructions[name].trim() !== '') {
      plan.agent_instructions[name] += block;
    }
  }

  console.log('[orchestrator] Clarifications captured — continuing with updated instructions.');
  return pairs;
}

/**
 * Build a "handoff" context block from a completed agent's output so that a
 * later agent can align its work with what was actually produced.
 * Includes the summary AND full file contents — the receiving agent needs to
 * see exact endpoint paths, request/response shapes, and model fields.
 */
function buildAgentHandoff(sourceLabel, output) {
  const files = Array.isArray(output?.files) ? output.files : [];
  const parts = [
    '',
    `═══════════════════════════════════════════════════════`,
    `CONTEXT FROM ${sourceLabel.toUpperCase()} AGENT (already finished)`,
    `═══════════════════════════════════════════════════════`,
    '',
    `Summary: ${output?.summary || '(no summary provided)'}`,
    '',
    `${sourceLabel} produced ${files.length} file${files.length === 1 ? '' : 's'}. Full contents below — use these to match API paths, payload shapes, model fields, and component names EXACTLY:`,
    '',
  ];

  for (const f of files) {
    parts.push(
      `───── ${f.action ?? 'create'}: ${f.path} ─────`,
      f.content ?? '(no content)',
      ''
    );
  }

  parts.push(
    `═══════════════════════════════════════════════════════`,
    `END ${sourceLabel.toUpperCase()} CONTEXT`,
    `═══════════════════════════════════════════════════════`,
    '',
    `Your job is to integrate with the work above, not duplicate or contradict it.`,
    `- Reuse the exact endpoint paths, request bodies, and response shapes from any route/controller files`,
    `- Match data model field names (camelCase on the wire, snake_case in DB is handled by Sequelize — trust what's in the code above)`,
    `- If the ${sourceLabel} required authentication on a route, your integration must include the Bearer token`,
    '',
  );

  return parts.join('\n');
}

/**
 * Run backend first, then frontend with backend's output injected as context.
 * Sequential (not parallel) so frontend can align with the actual APIs backend
 * built. If only one is assigned, that one runs alone.
 */
function buildDesignHandoff(design) {
  if (!design?.spec?.trim()) return '';
  return [
    '',
    '═══════════════════════════════════════════════════════',
    'DESIGN SPEC (from Design agent — follow this exactly)',
    '═══════════════════════════════════════════════════════',
    '',
    design.spec,
    '',
    '═══════════════════════════════════════════════════════',
    'END DESIGN SPEC',
    '═══════════════════════════════════════════════════════',
    '',
  ].join('\n');
}

function buildReviewContext(outputs) {
  const parts = [];
  for (const name of ['backend', 'frontend']) {
    const out = outputs[name];
    if (!out || !out.files?.length) continue;
    parts.push(`═══ ${name.toUpperCase()} ═══`);
    parts.push(`Summary: ${out.summary || '(none)'}`);
    parts.push('');
    for (const f of out.files) {
      parts.push(`───── ${f.action ?? 'create'}: ${f.path} ─────`);
      parts.push(f.content ?? '');
      parts.push('');
    }
  }
  return parts.join('\n');
}

async function dispatchImplementation(plan, designOutput) {
  const { assigned_agents, agent_instructions } = plan;
  const outputs = {};

  const hasBackend = assigned_agents.includes('backend') && agent_instructions.backend;
  const hasFrontend = assigned_agents.includes('frontend') && agent_instructions.frontend;

  // ── 1. Backend runs first (frontend may need to see its APIs) ──
  if (hasBackend) {
    console.log('[orchestrator] Backend agent starting…');
    outputs.backend = await runBackendAgent(agent_instructions.backend);
    const bFiles = outputs.backend?.files?.length ?? 0;
    console.log(`[orchestrator] Backend agent finished — ${bFiles} file${bFiles === 1 ? '' : 's'} produced.`);
  }

  // ── 2. Frontend runs next with backend + design handoffs ──
  if (hasFrontend) {
    let frontendInstructions = agent_instructions.frontend;
    if (outputs.backend) {
      const handoff = buildAgentHandoff('Backend', outputs.backend);
      frontendInstructions += handoff;
      console.log(
        `[orchestrator] Injecting backend context into frontend instructions ` +
        `(${(handoff.length / 1024).toFixed(1)} KB).`
      );
    }
    if (designOutput?.spec) {
      const designHandoff = buildDesignHandoff(designOutput);
      frontendInstructions += designHandoff;
      console.log(
        `[orchestrator] Injecting design spec into frontend instructions ` +
        `(${(designHandoff.length / 1024).toFixed(1)} KB).`
      );
    }
    console.log('[orchestrator] Frontend agent starting…');
    outputs.frontend = await runFrontendAgent(frontendInstructions);
    const fFiles = outputs.frontend?.files?.length ?? 0;
    console.log(`[orchestrator] Frontend agent finished — ${fFiles} file${fFiles === 1 ? '' : 's'} produced.`);
  }

  return outputs;
}

function formatOutput(plan, agentOutputs, writeManifest) {
  const lines = ['---'];

  if (plan._refinement) {
    const { refined, notes, accepted } = plan._refinement;
    lines.push(`Task Refinement: ${accepted}`);
    if (accepted === 'refined' || accepted === 'edited' || accepted === 'unchanged') {
      lines.push(`Refined version:\n${refined}`);
      if (notes) lines.push(`(note: ${notes})`);
    }
    lines.push('');
  }

  lines.push(
    `Task Understanding:\n${plan.task_understanding}`,
    '',
    'Task Breakdown:',
    `Frontend:\n${plan.breakdown.frontend ?? 'Not required'}`,
    '',
    `Backend:\n${plan.breakdown.backend ?? 'Not required'}`,
    '',
    `QA:\n${plan.breakdown.qa ?? 'Not required'}`
  );

  if (plan.missing_requirements?.length > 0) {
    lines.push('', 'Missing Requirements / Assumptions Needed:');
    plan.missing_requirements.forEach((r) => {
      if (typeof r === 'string') {
        lines.push(`  - ${r}`);
      } else {
        const opts = Array.isArray(r.options) && r.options.length
          ? ` [${r.options.join(' | ')}]`
          : '';
        lines.push(`  - (${r.type ?? 'choice'}) ${r.question}${opts}`);
      }
    });
  }

  if (Array.isArray(plan._clarifications) && plan._clarifications.length) {
    lines.push('', 'User Clarifications:');
    plan._clarifications.forEach(({ question, answer }) =>
      lines.push(`  Q: ${question}`, `  A: ${answer}`, '')
    );
  }

  lines.push(
    '',
    `Assigned Agents:\n${plan.assigned_agents.map(a => `  - ${a.charAt(0).toUpperCase() + a.slice(1)} Agent`).join('\n')}`,
    '',
  );

  if (agentOutputs.design) {
    lines.push('Design Agent:');
    lines.push(`  Summary: ${agentOutputs.design.summary ?? '(none)'}`);
    if (agentOutputs.design.spec) {
      lines.push('  Spec:');
      agentOutputs.design.spec.split('\n').forEach((l) => lines.push(`    ${l}`));
    }
    lines.push('');
  }

  for (const name of ['frontend', 'backend']) {
    const out = agentOutputs[name];
    if (!out) continue;
    lines.push(`${name.charAt(0).toUpperCase() + name.slice(1)} Agent:`);
    lines.push(`  Summary: ${out.summary ?? '(none)'}`);
    if (out.raw) {
      lines.push('  (JSON parse failed — raw output below)');
      lines.push(out.raw);
    } else if (Array.isArray(out.files) && out.files.length) {
      lines.push('  Files:');
      out.files.forEach(f => lines.push(`    - [${f.action ?? 'create'}] ${f.path}`));
    }
    lines.push('');
  }

  if (agentOutputs.reviewer) {
    const r = agentOutputs.reviewer;
    lines.push('Reviewer Agent:');
    lines.push(`  Verdict: ${r.verdict ?? 'pass'}`);
    lines.push(`  Summary: ${r.summary ?? '(none)'}`);
    if (r.issues?.length) {
      lines.push('  Issues:');
      r.issues.forEach((i) =>
        lines.push(`    - [${i.severity}] ${i.area}/${i.file}${i.line ? `:${i.line}` : ''} — ${i.rule}: ${i.message}`)
      );
    }
    lines.push('');
  }

  if (agentOutputs.security) {
    const s = agentOutputs.security;
    lines.push('Security Agent:');
    lines.push(`  Verdict: ${s.verdict ?? 'pass'}`);
    lines.push(`  Summary: ${s.summary ?? '(none)'}`);
    if (s.issues?.length) {
      lines.push('  Issues:');
      s.issues.forEach((i) =>
        lines.push(`    - [${i.severity}] ${i.area}/${i.file}${i.line ? `:${i.line}` : ''} — ${i.category}: ${i.message}`)
      );
    }
    lines.push('');
  }

  if (agentOutputs.docs) {
    const d = agentOutputs.docs;
    lines.push('Docs Agent:');
    lines.push(`  Summary: ${d.summary ?? '(none)'}`);
    if (d.files?.length) {
      lines.push('  Files:');
      d.files.forEach((f) => lines.push(`    - [${f.action ?? 'modify'}] ${f.path}`));
    }
    lines.push('');
  }

  if (agentOutputs.qa) {
    if (agentOutputs.qa.skipped) {
      lines.push('QA Agent:', `  Skipped — ${agentOutputs.qa.reason}`, '');
    } else {
      const qa = typeof agentOutputs.qa === 'string'
        ? agentOutputs.qa
        : JSON.stringify(agentOutputs.qa, null, 2);
      lines.push('QA Agent:', qa, '');
    }
  }

  if (writeManifest && writeManifest.length) {
    lines.push('File Writes:');
    writeManifest.forEach(f => {
      lines.push(`  - ${f.status}: ${f.path}${f.reason ? ` — ${f.reason}` : ''}`);
    });
  }

  lines.push('---');
  return lines.join('\n');
}

function buildPRTitle(task) {
  const firstLine = String(task).replace(/\s+/g, ' ').trim();
  return firstLine.length <= 70 ? firstLine : firstLine.slice(0, 67) + '...';
}

function buildPRBody({ task, writtenPaths, formatted, closesIssue }) {
  const fileList = writtenPaths.map((p) => `- \`${p}\``).join('\n') || '_(none)_';
  const lines = [
    '## Summary',
    '',
    task,
    '',
  ];
  if (closesIssue != null && closesIssue !== '') {
    lines.push(`Closes #${closesIssue}`, '');
  }
  lines.push(
    '## Files changed',
    '',
    fileList,
    '',
    '## Test plan',
    '',
    '- [ ] Install deps where changed (`npm install`)',
    '- [ ] Review diffs for correctness',
    '- [ ] Run the relevant dev server / tests locally',
    '',
    '## Orchestrator output',
    '',
    '<details><summary>Full run report</summary>',
    '',
    '```',
    formatted,
    '```',
    '',
    '</details>',
    '',
    '---',
    '',
    '_Generated by `ai-orchestrator`._'
  );
  return lines.join('\n');
}

/**
 * Produce a branch name safe for `git checkout -b`. Always lowercase,
 * hyphen-separated, no special characters, capped length.
 */
function slugify(s, maxLen = 40) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '');
}

function generateBranchName({ closesIssue, task }) {
  const firstLine = String(task).split('\n')[0] || '';
  const titleSlug = slugify(firstLine);
  if (closesIssue) {
    return titleSlug ? `issue-${closesIssue}-${titleSlug}` : `issue-${closesIssue}`;
  }
  const ts = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return titleSlug ? `ai-${titleSlug}-${ts}` : `ai-run-${Date.now()}`;
}

function uniqueBranchName(base) {
  if (!git.branchExists(base)) return base;
  let n = 2;
  while (git.branchExists(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Always creates a fresh branch, commits the agent output there, pushes, and
 * opens a PR to PR_BASE_BRANCH (default 'main'). No user prompts — this is
 * intentional so the web UI can run end-to-end without interaction.
 */
async function commitAndShareWork(writtenPaths, task, prContext) {
  if (writtenPaths.length === 0) return;

  let originalBranch;
  try {
    originalBranch = git.currentBranch();
  } catch (err) {
    console.warn(`[git] could not read current branch: ${err.message}`);
    return;
  }

  // ── Generate a fresh branch off the current HEAD ──
  const baseName = generateBranchName({ closesIssue: prContext?.closesIssue, task });
  const newBranch = uniqueBranchName(baseName);

  console.log(`\n[git] Current branch: ${originalBranch}`);
  console.log(`[git] Creating new branch: ${newBranch}`);
  console.log(`[git] Files to stage: ${writtenPaths.length}`);
  writtenPaths.forEach((p) => console.log(`  - ${p}`));

  try {
    git.switchOrCreateBranch(newBranch);
    console.log(`[git] Switched to new branch '${newBranch}'`);
  } catch (err) {
    console.error(`[git] Could not create branch '${newBranch}': ${err.message}`);
    console.error(`[git] Files remain in the working tree on '${originalBranch}' — resolve manually.`);
    return;
  }

  // ── Commit ──
  const commitMsg = `ai-orchestrator: ${task}`.slice(0, 200);
  try {
    git.addAndCommit(writtenPaths, commitMsg);
    console.log(`[git] Committed on '${newBranch}': "${commitMsg}"`);
  } catch (err) {
    console.error(`[git] commit failed: ${err.message}`);
    return;
  }

  // ── Push ──
  if (!git.hasRemote('origin')) {
    console.log(`[git] No 'origin' remote configured — commit stays local on '${newBranch}'.`);
    return;
  }
  try {
    git.pushCurrentBranch();
    console.log(`[git] Pushed to origin/${newBranch}.`);
  } catch (err) {
    console.error(`[git] push failed: ${err.message}`);
    console.log(`[git] Commit is on local branch '${newBranch}'; PR creation skipped because push failed.`);
    return;
  }

  // ── Open PR ──
  const baseBranch = process.env.PR_BASE_BRANCH || 'main';
  if (baseBranch === newBranch) {
    console.log(`[git] Head branch equals base '${baseBranch}' — skipping PR creation.`);
    return;
  }
  if (!git.hasGhCli()) {
    console.log(
      `[git] 'gh' CLI not found — skipping automatic PR creation.\n` +
      `      Open one manually: gh pr create --base ${baseBranch} --head ${newBranch}\n` +
      `      Install: https://cli.github.com/`
    );
    return;
  }

  const title = buildPRTitle(task);
  const body = buildPRBody({
    task,
    writtenPaths,
    formatted: prContext?.formatted ?? '',
    closesIssue: prContext?.closesIssue,
  });

  try {
    const prUrl = git.createPullRequest({ base: baseBranch, head: newBranch, title, body });
    console.log(`[git] PR opened: ${prUrl}`);
  } catch (err) {
    console.error(`[git] gh pr create failed: ${err.message}`);
    console.log(
      `[git] Retry manually:\n` +
      `        gh pr create --base ${baseBranch} --head ${newBranch} --title "${title}"`
    );
  }
}

/**
 * Main orchestration entry point.
 * @param {string} task
 * @returns {Promise<{ plan: object, agentOutputs: object, formatted: string, writeManifest: Array }>}
 */
// ── Rough pricing (USD per 1M tokens) — used only for the end-of-run estimate ──
const CLAUDE_PRICE = {
  // main-tier: Opus 4.7
  main: { input: 15, output: 75 },
  // aux-tier: Haiku 4.5
  aux: { input: 0.8, output: 4 },
};

function estimateUsageCost() {
  const m = usageTally.main;
  const a = usageTally.aux;
  const cost = (u, p) => (u.input * p.input + u.output * p.output) / 1_000_000;
  return {
    main: { ...m, costUSD: cost(m, CLAUDE_PRICE.main) },
    aux: { ...a, costUSD: cost(a, CLAUDE_PRICE.aux) },
    totalUSD: cost(m, CLAUDE_PRICE.main) + cost(a, CLAUDE_PRICE.aux),
  };
}

function printUsageReport() {
  const u = estimateUsageCost();
  const line = (label, t, cost) =>
    `  ${label}: ${t.calls} call${t.calls === 1 ? '' : 's'}, ` +
    `in ${t.input.toLocaleString()} / out ${t.output.toLocaleString()} tokens ` +
    `≈ $${cost.toFixed(4)}`;
  console.log('\n[orchestrator] Token usage this run:');
  console.log(line('main (backend/frontend/qa/planner)', u.main, u.main.costUSD));
  console.log(line('aux  (design/reviewer/security/docs/refine)', u.aux, u.aux.costUSD));
  console.log(`  TOTAL ≈ $${u.totalUSD.toFixed(4)}`);
}

export async function orchestrate(rawTask, opts = {}) {
  resetUsageTally();
  const { closesIssue } = opts;
  const { task, refinement } = await confirmRefinedTask(rawTask);

  console.log('\n[orchestrator] Planning task...');
  const plan = await planTask(task);
  if (refinement) plan._refinement = refinement;

  console.log(`[orchestrator] Assigned agents: ${plan.assigned_agents.join(', ')}`);

  const clarifications = await resolveMissingRequirements(plan);
  if (clarifications.length) {
    plan._clarifications = clarifications;
  }

  const implAssigned = plan.assigned_agents.some(a => a === 'frontend' || a === 'backend');
  const hasFrontend = plan.assigned_agents.includes('frontend') && plan.agent_instructions.frontend;
  const agentOutputs = {};

  // ── Phase 0 — Design spec (runs before frontend so it can align) ──
  if (hasFrontend && process.env.SKIP_DESIGN !== 'true') {
    console.log('\n[orchestrator] Phase 0 — design spec...');
    agentOutputs.design = await runDesignAgent(plan.agent_instructions.frontend);
  }

  // ── Phase 1 — Implementation (backend → frontend, sequential with handoff) ──
  if (implAssigned) {
    console.log('\n[orchestrator] Phase 1 — implementation...');
    Object.assign(agentOutputs, await dispatchImplementation(plan, agentOutputs.design));
  }

  // ── Write impl files to disk ──
  const filesToWrite = [];
  for (const agentName of ['frontend', 'backend']) {
    const out = agentOutputs[agentName];
    if (out && Array.isArray(out.files)) {
      out.files.forEach(f => filesToWrite.push({ agent: agentName, ...f }));
    }
  }

  let writeManifest = [];
  if (filesToWrite.length) {
    console.log(`\n[orchestrator] Writing ${filesToWrite.length} file(s) to project...`);
    writeManifest = writeProjectFiles(filesToWrite);
    writeManifest.forEach(f => {
      const tag = f.agent ? `[${f.agent}] ` : '';
      console.log(`  ${tag}${f.status}: ${f.path}${f.reason ? ` — ${f.reason}` : ''}`);
    });
  } else if (implAssigned) {
    console.log('\n[orchestrator] No files produced by frontend/backend.');
  }

  // ── Phase 1.5 — Reviewer + Security + Docs (parallel, all read the same context) ──
  const landedNow = writeManifest.some(f => f.status === 'created' || f.status === 'modified');
  if (landedNow) {
    const reviewContext = buildReviewContext(agentOutputs);
    const postImpl = [];
    const labels = [];

    if (process.env.SKIP_REVIEW !== 'true') {
      postImpl.push(runReviewerAgent(reviewContext));
      labels.push('reviewer');
    }
    if (process.env.SKIP_SECURITY !== 'true') {
      postImpl.push(runSecurityAgent(reviewContext));
      labels.push('security');
    }
    if (process.env.SKIP_DOCS !== 'true') {
      postImpl.push(runDocsAgent(reviewContext));
      labels.push('docs');
    }

    if (postImpl.length) {
      console.log(`\n[orchestrator] Phase 1.5 — post-implementation (${labels.join(' + ')})...`);
      const results = await Promise.all(postImpl);
      labels.forEach((name, i) => { agentOutputs[name] = results[i]; });

      if (agentOutputs.reviewer) {
        const r = agentOutputs.reviewer;
        console.log(`[orchestrator] Review verdict: ${r.verdict} — ${r.issues.length} issue${r.issues.length === 1 ? '' : 's'}`);
      }
      if (agentOutputs.security) {
        const s = agentOutputs.security;
        console.log(`[orchestrator] Security verdict: ${s.verdict} — ${s.issues.length} issue${s.issues.length === 1 ? '' : 's'}`);
      }

      // Docs agent produces files too — write them
      if (agentOutputs.docs?.files?.length) {
        const docFilesToWrite = agentOutputs.docs.files.map((f) => ({ agent: 'docs', ...f }));
        console.log(`\n[orchestrator] Writing ${docFilesToWrite.length} doc file(s)...`);
        const docManifest = writeProjectFiles(docFilesToWrite);
        docManifest.forEach((f) => {
          console.log(`  [docs] ${f.status}: ${f.path}${f.reason ? ` — ${f.reason}` : ''}`);
        });
        writeManifest = writeManifest.concat(docManifest);
      }
    }
  }

  // ── Phase 2 — QA, only if there's something to test ──
  const qaAssigned = plan.assigned_agents.includes('qa') && plan.agent_instructions.qa;
  if (qaAssigned) {
    const landed = writeManifest.filter(f => f.status === 'created' || f.status === 'modified');
    const qaShouldRun = !implAssigned || landed.length > 0;

    if (!qaShouldRun) {
      console.warn('\n[orchestrator] Phase 2 — QA skipped: frontend/backend produced no files to test.');
      agentOutputs.qa = { skipped: true, reason: 'no files landed from implementation phase' };
    } else {
      console.log('\n[orchestrator] Phase 2 — QA (with implementation context)...');
      const qaContext = {
        frontend: agentOutputs.frontend
          ? {
              summary: agentOutputs.frontend.summary,
              files: landed.filter(f => f.agent === 'frontend').map(f => f.path),
            }
          : null,
        backend: agentOutputs.backend
          ? {
              summary: agentOutputs.backend.summary,
              files: landed.filter(f => f.agent === 'backend').map(f => f.path),
            }
          : null,
      };
      const hasContext = qaContext.frontend || qaContext.backend;
      agentOutputs.qa = await runQAAgent(
        plan.agent_instructions.qa,
        hasContext ? qaContext : null
      );
    }
  }

  // ── Build the formatted summary NOW so the git step can reuse it for PR body ──
  const formatted = formatOutput(plan, agentOutputs, writeManifest);

  // ── Git prompt (commit → push → create PR) ──
  const writtenPaths = writeManifest
    .filter(f => f.status === 'created' || f.status === 'modified')
    .map(f => f.path);
  if (writtenPaths.length) {
    await commitAndShareWork(writtenPaths, task, { formatted, closesIssue });
  } else if (implAssigned) {
    const emptyAgents = ['frontend', 'backend']
      .filter((name) => {
        const out = agentOutputs[name];
        if (!out) return false;
        const hasSummary = typeof out.summary === 'string' && out.summary.trim() !== '';
        const hasFiles = Array.isArray(out.files) && out.files.length > 0;
        return !(hasSummary || hasFiles);
      });
    console.warn(
      `\n[orchestrator] Nothing to commit — no files were written.\n` +
      (emptyAgents.length
        ? `  Empty agent output from: ${emptyAgents.join(', ')}. See warnings above for the raw response preview.\n`
        : '') +
      `  If this looks wrong: raise ANTHROPIC_MAX_TOKENS in ai-orchestrator/.env (current default 16384) and re-run.`
    );
  }

  printUsageReport();
  return { plan, agentOutputs, formatted, writeManifest, usage: estimateUsageCost() };
}
