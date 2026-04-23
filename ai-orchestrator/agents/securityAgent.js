import { callLLM } from '../utils/callLLM.js';
import { SECURITY_SYSTEM, buildSecurityMessage } from '../prompts/securityPrompt.js';
import { parseAgentJSON } from '../utils/parseAgentJSON.js';

/**
 * Audits recently-generated code for security issues (OWASP-ish).
 * @param {string} context Concatenated file contents + summaries from implementation
 * @returns {Promise<{ summary: string, verdict: 'pass'|'warnings'|'fail', issues: Array<{severity,area,file,line?,category,message}>, files: [] }>}
 */
export async function runSecurityAgent(context) {
  const prompt = `
${SECURITY_SYSTEM}

${buildSecurityMessage(context)}
`;
  const started = Date.now();
  console.log('[securityAgent] running...');
  const raw = await callLLM(prompt, { tier: 'aux' });
  console.log(`[securityAgent] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const result = parseAgentJSON(raw, 'securityAgent');
  if (!Array.isArray(result.issues)) result.issues = [];
  if (typeof result.verdict !== 'string') result.verdict = 'pass';

  return result;
}
