import { callLLM } from '../utils/callLLM.js';
import { FRONTEND_SYSTEM, buildFrontendMessage } from '../prompts/frontendPrompt.js';
import { parseAgentJSON } from '../utils/parseAgentJSON.js';

/**
 * Receives orchestrator instructions and returns { summary, files[] }.
 * @param {string} instructions
 * @returns {Promise<{summary: string, files: Array<{path: string, action?: string, content: string}>, raw?: string}>}
 */
export async function runFrontendAgent(instructions) {
  const prompt = `
${FRONTEND_SYSTEM}

${buildFrontendMessage(instructions)}
`;
  const started = Date.now();
  console.log('[frontendAgent] running...');
  const raw = await callLLM(prompt);
  console.log(`[frontendAgent] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  const result = parseAgentJSON(raw, 'frontendAgent');
  warnIfEmpty('frontendAgent', result, raw);
  return result;
}

function warnIfEmpty(label, result, raw) {
  const hasSummary = typeof result.summary === 'string' && result.summary.trim() !== '';
  const hasFiles = Array.isArray(result.files) && result.files.length > 0;
  if (hasSummary || hasFiles) return;

  console.warn(
    `[${label}] ⚠ Empty result — no summary and no files. Commit will be skipped.\n` +
    `  Likely causes: max_tokens truncation, contradictory instructions, or LLM refused to produce output.\n` +
    `  --- raw response preview (first 800 chars) ---\n${(raw ?? '').slice(0, 800)}\n  --- end preview ---`
  );
}
