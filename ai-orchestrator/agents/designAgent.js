import { callLLM } from '../utils/callLLM.js';
import { DESIGN_SYSTEM, buildDesignMessage } from '../prompts/designPrompt.js';
import { parseAgentJSON } from '../utils/parseAgentJSON.js';

/**
 * Produces a UI/UX spec that the frontend agent will align to.
 * Does NOT produce code — just a structured spec string.
 * @param {string} instructions  Frontend portion of the orchestrator plan
 * @returns {Promise<{ summary: string, spec: string, files: [], raw?: string }>}
 */
export async function runDesignAgent(instructions) {
  const prompt = `
${DESIGN_SYSTEM}

${buildDesignMessage(instructions)}
`;
  const started = Date.now();
  console.log('[designAgent] running...');
  const raw = await callLLM(prompt, { tier: 'aux' });
  console.log(`[designAgent] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const result = parseAgentJSON(raw, 'designAgent');
  if (typeof result.spec !== 'string') result.spec = '';

  if (!result.spec.trim() && !result.summary?.trim()) {
    console.warn(
      `[designAgent] ⚠ Empty result — no spec produced.\n` +
      `  --- raw preview (first 400 chars) ---\n${(raw ?? '').slice(0, 400)}\n  --- end preview ---`
    );
  }
  return result;
}
