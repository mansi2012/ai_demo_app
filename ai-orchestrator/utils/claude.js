import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(prompt) {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 16384);

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const usage = response.usage ?? {};
  console.log(
    `[claude] model=${model} stop_reason=${response.stop_reason} ` +
    `output_tokens=${usage.output_tokens ?? "?"} text_chars=${text.length}`
  );

  if (response.stop_reason === "max_tokens") {
    console.warn(
      `[claude] ⚠ Output hit max_tokens (${maxTokens}) — response is TRUNCATED. ` +
      `Set ANTHROPIC_MAX_TOKENS higher in .env to avoid this.`
    );
  }

  return text;
}
