import { ORCHESTRATOR_SYSTEM, buildOrchestratorMessage } from './prompts/orchestratorPrompt.js';
import { REFINE_SYSTEM, buildRefineMessage } from './prompts/refinePrompt.js';
import { runFrontendAgent } from './agents/frontendAgent.js';
import { runBackendAgent } from './agents/backendAgent.js';
import { runQAAgent } from './agents/qaAgent.js';
import { callLLM } from './utils/callLLM.js';
import { writeProjectFiles } from './utils/writeFiles.js';
import { askYesNo, askText, askChoice, askYesNoOther } from './utils/promptUser.js';
import { extractJSONObject } from './utils/parseAgentJSON.js';
import * as git from './utils/gitActions.js';

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
    raw = await callLLM(prompt);
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

  const answer = await askYesNoOther('\nUse the refined task?');

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
 * Ask the human a single missing-requirement question. Supports:
 *  - structured objects: { question, type: "choice"|"yesno", options? }
 *  - plain strings (legacy shape) — prompted as free text
 * Returns { question, answer } with both as strings.
 */
async function askMissingRequirement(req) {
  if (typeof req === 'string') {
    const answer = await askText(`\n${req}\nYour answer:`);
    return { question: req, answer: answer || '(no answer provided)' };
  }

  const question = req.question ?? '(missing question text)';
  const type = req.type ?? 'choice';

  if (type === 'yesno') {
    const answer = await askYesNoOther(question);
    return { question, answer };
  }

  const answer = await askChoice(question, req.options ?? []);
  return { question, answer };
}

/**
 * Prompt the user for every missing requirement in the plan and fold their
 * answers into agent_instructions as a "User clarifications" block, so the
 * downstream agents run with full context.
 * Mutates `plan` in place. Returns the list of {question, answer} pairs.
 */
async function resolveMissingRequirements(plan) {
  const reqs = Array.isArray(plan.missing_requirements) ? plan.missing_requirements : [];
  if (reqs.length === 0) return [];

  console.log(`\n[orchestrator] ${reqs.length} clarification${reqs.length === 1 ? '' : 's'} needed before implementation:`);

  const answers = [];
  for (const req of reqs) {
    const pair = await askMissingRequirement(req);
    answers.push(pair);
  }

  const block =
    '\n\n--- User clarifications ---\n' +
    answers.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join('\n\n');

  plan.agent_instructions = plan.agent_instructions ?? {};
  for (const name of ['frontend', 'backend', 'qa']) {
    if (typeof plan.agent_instructions[name] === 'string' && plan.agent_instructions[name].trim() !== '') {
      plan.agent_instructions[name] += block;
    }
  }

  console.log('\n[orchestrator] Clarifications captured — continuing with updated instructions.');
  return answers;
}

async function dispatchImplementation(plan) {
  const { assigned_agents, agent_instructions } = plan;
  const promises = {};

  if (assigned_agents.includes('frontend') && agent_instructions.frontend) {
    promises.frontend = runFrontendAgent(agent_instructions.frontend);
  }
  if (assigned_agents.includes('backend') && agent_instructions.backend) {
    promises.backend = runBackendAgent(agent_instructions.backend);
  }

  const keys = Object.keys(promises);
  if (keys.length === 0) return {};

  const results = await Promise.all(Object.values(promises));
  return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
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

function buildPRBody({ task, writtenPaths, formatted }) {
  const fileList = writtenPaths.map((p) => `- \`${p}\``).join('\n') || '_(none)_';
  return [
    '## Summary',
    '',
    task,
    '',
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
    '_Generated by `ai-orchestrator`._',
  ].join('\n');
}

async function maybeCreatePullRequest({ headBranch, task, writtenPaths, formatted }) {
  if (headBranch === 'main' || headBranch === 'master') {
    console.log(`[git] Current branch is '${headBranch}' — skipping PR creation (can't PR to itself).`);
    return;
  }
  if (!git.hasRemote('origin')) {
    console.log(`[git] No 'origin' remote configured — skipping PR creation.`);
    return;
  }
  if (!git.hasGhCli()) {
    console.log(
      `[git] GitHub CLI ('gh') not found — skipping PR creation.\n` +
      `      Install from https://cli.github.com/ or open a PR manually in the browser.`
    );
    return;
  }

  const answer = await askYesNoOther(`Create a pull request to 'main'?`);
  if (answer === 'No') {
    console.log(`[git] PR creation skipped.`);
    return;
  }
  const baseBranch = answer === 'Yes' ? 'main' : answer;
  if (!baseBranch || baseBranch === headBranch) {
    console.log(`[git] Base branch '${baseBranch}' is invalid or same as head — skipping.`);
    return;
  }

  const title = buildPRTitle(task);
  const body = buildPRBody({ task, writtenPaths, formatted });

  try {
    const prUrl = git.createPullRequest({ base: baseBranch, head: headBranch, title, body });
    console.log(`[git] PR opened: ${prUrl}`);
  } catch (err) {
    console.error(`[git] gh pr create failed: ${err.message}`);
    console.log(
      `[git] You can retry manually:\n` +
      `        gh pr create --base ${baseBranch} --head ${headBranch} --title "${title}"`
    );
  }
}

async function maybeCommitAndPush(writtenPaths, task, prContext) {
  if (writtenPaths.length === 0) return;

  let branch;
  try {
    branch = git.currentBranch();
  } catch (err) {
    console.warn(`[git] could not read current branch: ${err.message}`);
    return;
  }

  console.log(`\n[git] Current branch: ${branch}`);
  console.log(`[git] Files to stage: ${writtenPaths.length}`);
  writtenPaths.forEach(p => console.log(`  - ${p}`));

  // Decide target branch up front so all following prompts can reference it by name
  const targetBranch = await askText(
    `\nTarget branch? (Enter to use '${branch}', or type a name to switch/create):`,
    branch
  );

  const commit = await askYesNo(
    `Commit ${writtenPaths.length} file(s) to branch '${targetBranch}'?`
  );
  if (!commit) {
    console.log(`[git] Skipped. Files remain in your working tree on '${branch}' uncommitted.`);
    return;
  }

  let activeBranch = branch;
  if (targetBranch !== branch) {
    try {
      const { created } = git.switchOrCreateBranch(targetBranch);
      activeBranch = targetBranch;
      console.log(`[git] Switched to ${created ? 'new' : 'existing'} branch '${targetBranch}'`);
    } catch (err) {
      console.error(`[git] Could not switch to '${targetBranch}': ${err.message}`);
      console.error(`[git] Commit aborted. Your files are still in the working tree on '${branch}' — resolve manually.`);
      return;
    }
  }

  const commitMsg = `ai-orchestrator: ${task}`.slice(0, 200);
  try {
    git.addAndCommit(writtenPaths, commitMsg);
    console.log(`[git] Committed on '${activeBranch}': "${commitMsg}"`);
  } catch (err) {
    console.error(`[git] commit failed: ${err.message}`);
    return;
  }

  const push = await askYesNo(`Push branch '${activeBranch}' to origin?`);
  if (!push) {
    console.log(`[git] Commit is local only. Push manually with: git push -u origin ${activeBranch}`);
    return;
  }

  try {
    git.pushCurrentBranch();
    console.log(`[git] Pushed to origin/${activeBranch}.`);
  } catch (err) {
    console.error(`[git] push failed: ${err.message}`);
    return;
  }

  // Offer to open a PR now that the branch is pushed
  await maybeCreatePullRequest({
    headBranch: activeBranch,
    task,
    writtenPaths,
    formatted: prContext?.formatted ?? '',
  });
}

/**
 * Main orchestration entry point.
 * @param {string} task
 * @returns {Promise<{ plan: object, agentOutputs: object, formatted: string, writeManifest: Array }>}
 */
export async function orchestrate(rawTask) {
  const { task, refinement } = await confirmRefinedTask(rawTask);

  console.log('\n[orchestrator] Planning task...');
  const plan = await planTask(task);
  if (refinement) plan._refinement = refinement;

  console.log(`[orchestrator] Assigned agents: ${plan.assigned_agents.join(', ')}`);

  const clarifications = await resolveMissingRequirements(plan);
  if (clarifications.length) {
    plan._clarifications = clarifications;
  }

  // ── Phase 1 — Implementation (frontend + backend in parallel) ──
  const implAssigned = plan.assigned_agents.some(a => a === 'frontend' || a === 'backend');
  const agentOutputs = {};

  if (implAssigned) {
    console.log('[orchestrator] Phase 1 — implementation (frontend + backend)...');
    Object.assign(agentOutputs, await dispatchImplementation(plan));
  }

  // ── Write files to disk so QA can see what actually landed ──
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
    await maybeCommitAndPush(writtenPaths, task, { formatted });
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

  return { plan, agentOutputs, formatted, writeManifest };
}
