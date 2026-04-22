import { callLLM } from '../utils/callLLM.js';
import { QA_SYSTEM, buildQAMessage } from '../prompts/qaPrompt.js';

/**
 * Receives orchestrator instructions + optional implementation context, returns test cases.
 * @param {string} instructions - Test scope from the orchestrator breakdown
 * @param {object|null} implementationContext - { frontend: { summary, files[] }, backend: { summary, files[] } }
 * @returns {Promise<Array|string>} Array of test case objects, or raw text on parse failure
 */
export async function runQAAgent(instructions, implementationContext = null) {
  const prompt = `
${QA_SYSTEM}

${buildQAMessage(instructions, implementationContext)}

Return ONLY a valid JSON array of test cases. No explanation.
`;
  const started = Date.now();
  console.log('[qaAgent] running...');
  const raw = await callLLM(prompt);
  console.log(`[qaAgent] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn('[qaAgent] No JSON array found in response — returning raw text');
    return raw;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    console.warn('[qaAgent] JSON parse failed — returning raw text');
    return raw;
  }
}
