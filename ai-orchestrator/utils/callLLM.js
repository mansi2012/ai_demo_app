import { callGemini } from "./gemini.js";
import { callClaude } from "./claude.js";
import { callOpenAI } from "./openai.js";
import { callOllama } from "./ollama.js";

/**
 * @param {string} prompt
 * @param {{ tier?: 'main' | 'aux' }} options
 *   tier='aux' → uses the cheaper model (Haiku for Claude). Intended for design,
 *   reviewer, security, docs, refinement — any agent that doesn't write code.
 */
export async function callLLM(prompt, options = {}) {
  const provider = process.env.LLM_PROVIDER;

  if (process.env.DEV_MODE === "true") {
    throw new Error("DEV_MODE is ON — using mock instead");
  }

  if (provider === "claude") {
    return callClaude(prompt, options);
  }

  // Other providers don't yet honour the tier option — they fall through to their default.
  // (Add tier routing inside gemini.js / openai.js if/when you use those providers for aux work.)
  if (provider === "gemini") {
    return callGemini(prompt);
  }
  if (provider === "openai") {
    return callOpenAI(prompt);
  }
  if (provider === "ollama") {
    return callOllama(prompt);
  }

  throw new Error("Unsupported LLM provider");
}
