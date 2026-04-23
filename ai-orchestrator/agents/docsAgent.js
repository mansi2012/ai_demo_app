import fs from 'node:fs';
import path from 'node:path';
import { callLLM } from '../utils/callLLM.js';
import { DOCS_SYSTEM, buildDocsMessage } from '../prompts/docsPrompt.js';
import { parseAgentJSON } from '../utils/parseAgentJSON.js';
import { PROJECT_ROOT } from '../utils/writeFiles.js';

const DOC_FILES = [
  'backend/README.md',
  'backend/CLAUDE.md',
  'frontend/README.md',
  'frontend/CLAUDE.md',
];

function readDocs() {
  const parts = [];
  for (const rel of DOC_FILES) {
    const abs = path.join(PROJECT_ROOT, rel);
    if (fs.existsSync(abs)) {
      const content = fs.readFileSync(abs, 'utf-8');
      parts.push(`───── ${rel} (exists) ─────`, content, '');
    } else {
      parts.push(`───── ${rel} (does not exist) ─────`, '', '');
    }
  }
  return parts.join('\n');
}

/**
 * Updates module-level README / CLAUDE files to reflect the implementation.
 * Produces files (unlike reviewer / security which produce issues).
 * @param {string} implementationContext Backend + frontend summaries/files
 * @returns {Promise<{ summary: string, files: Array<{path,action,content}>, raw?: string }>}
 */
export async function runDocsAgent(implementationContext) {
  const existingDocs = readDocs();
  const prompt = `
${DOCS_SYSTEM}

${buildDocsMessage(implementationContext, existingDocs)}
`;
  const started = Date.now();
  console.log('[docsAgent] running...');
  const raw = await callLLM(prompt, { tier: 'aux' });
  console.log(`[docsAgent] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const result = parseAgentJSON(raw, 'docsAgent');
  // Guard: only keep files inside the allowed doc set
  result.files = (result.files || []).filter((f) => {
    const ok = DOC_FILES.includes(f.path);
    if (!ok) {
      console.warn(`[docsAgent] ⚠ Ignoring out-of-scope file path: ${f.path}`);
    }
    return ok;
  });

  return result;
}
