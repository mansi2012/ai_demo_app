import { callLLM } from '../utils/callLLM.js';
import { REVIEWER_SYSTEM, buildReviewerMessage } from '../prompts/reviewerPrompt.js';
import { parseAgentJSON } from '../utils/parseAgentJSON.js';

/**
 * Reviews backend + frontend code against project conventions.
 * @param {string} context  Concatenated file contents + summaries from implementation
 * @returns {Promise<{ summary: string, verdict: 'pass'|'warnings'|'fail', issues: Array<{severity,area,file,line?,rule,message}>, files: [] }>}
 */
export async function runReviewerAgent(context) {
  const prompt = `
${REVIEWER_SYSTEM}

${buildReviewerMessage(context)}
`;
  const started = Date.now();
  console.log('[reviewerAgent] running...');
  const raw = await callLLM(prompt, { tier: 'aux' });
  console.log(`[reviewerAgent] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const result = parseAgentJSON(raw, 'reviewerAgent');
  if (!Array.isArray(result.issues)) result.issues = [];
  if (typeof result.verdict !== 'string') result.verdict = 'pass';

  return result;
}
