import axios from "axios";

export async function callOllama(prompt) {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  const { data } = await axios.post(
    `${baseUrl}/api/generate`,
    {
      model: process.env.OLLAMA_MODEL ?? " qwen3-coder-next:cloud",
      prompt,
      stream: false,
    },
    { timeout: Number(process.env.OLLAMA_TIMEOUT_MS ?? 120000) }
  );

  return data.response;
}
