/**
 * Strip "reasoning" / "thinking" blocks some models emit before their real answer.
 * Covers DeepSeek R1 (<think>...</think>), Anthropic-ish (<thinking>), and generic <reasoning>.
 * Applied before JSON extraction so braces inside the reasoning can't confuse the parser.
 */
function stripReasoningBlocks(s) {
  return s
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    // also handle an unclosed <think> at the start (model ran out of tokens mid-reasoning)
    .replace(/^\s*<think(?:ing)?>[\s\S]*?(?=\{)/i, '');
}

/**
 * Strip markdown code fences if the model wrapped its JSON in them.
 */
function stripCodeFences(s) {
  return s
    .trim()
    .replace(/^```(?:json|JSON)?\s*\r?\n?/, '')
    .replace(/\r?\n?```\s*$/, '');
}

/**
 * Walk s starting at index `start`, returning the substring for the first balanced `{...}`,
 * or null if unbalanced. Respects string literals and escape sequences so braces inside
 * strings don't affect depth.
 */
function readBalancedObject(s, start) {
  if (s[start] !== '{') return null;

  let depth = 0;
  let inStr = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];

    if (escaped) { escaped = false; continue; }
    if (inStr) {
      if (c === '\\') escaped = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Extract the first JSON object from an LLM response that actually parses.
 * Returns the JSON substring (caller can still JSON.parse it), or null if nothing usable.
 *
 * Strategy:
 *  1. Strip reasoning blocks and markdown code fences.
 *  2. For every `{` in the remaining string, try to read a balanced object and JSON.parse it.
 *  3. Return the first candidate that parses. If none parse, return the first balanced
 *     candidate anyway so the caller can surface a useful error with the extracted slice.
 */
export function extractJSONObject(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  let s = stripReasoningBlocks(raw);
  s = stripCodeFences(s);

  let firstBalanced = null;

  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue;

    const candidate = readBalancedObject(s, i);
    if (!candidate) continue;

    if (firstBalanced === null) firstBalanced = candidate;

    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // keep looking — later {...} might parse
    }
  }

  return firstBalanced; // may be null; caller decides how to report
}

/**
 * Parse an agent's LLM response into { summary, files, ... }.
 * Never throws — on any failure returns a shape the orchestrator can render.
 */
export function parseAgentJSON(raw, label) {
  const jsonStr = extractJSONObject(raw);
  if (!jsonStr) {
    console.warn(`[${label}] no JSON object found in response — returning raw`);
    return { summary: '(no JSON found)', files: [], raw };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed.files)) parsed.files = [];
    if (typeof parsed.summary !== 'string') parsed.summary = '';
    return parsed;
  } catch (err) {
    console.warn(`[${label}] JSON parse failed: ${err.message} — returning raw`);
    return { summary: '(parse failed)', files: [], raw };
  }
}
