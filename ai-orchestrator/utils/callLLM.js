import { callGemini } from "./gemini.js";
import { callClaude } from "./claude.js";
import { callOpenAI } from "./openai.js";
import { callOllama } from "./ollama.js";

export async function callLLM(prompt) {
  const provider = process.env.LLM_PROVIDER;

  if (process.env.DEV_MODE === "true") {
    throw new Error("DEV_MODE is ON — using mock instead");
  }

  if (provider === "gemini") {
    return callGemini(prompt);
  }

  if (provider === "openai") {
    return callOpenAI(prompt);
  }

  if (provider === "claude") {
    return callClaude(prompt);
  }

  if (provider === "ollama") {
    return callOllama(prompt);
  }

  throw new Error("Unsupported LLM provider");
}
