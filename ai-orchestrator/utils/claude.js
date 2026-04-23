import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Running token tally for this process (printed in summaries)
export const usageTally = {
  main: { input: 0, output: 0, calls: 0 },
  aux: { input: 0, output: 0, calls: 0 },
};

export function resetUsageTally() {
  usageTally.main = { input: 0, output: 0, calls: 0 };
  usageTally.aux = { input: 0, output: 0, calls: 0 };
}

function modelForTier(tier) {
  if (tier === "aux") {
    return process.env.ANTHROPIC_AUX_MODEL ?? "claude-haiku-4-5-20251001";
  }
  return process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
}

function maxTokensForTier(tier) {
  if (tier === "aux") {
    return Number(process.env.ANTHROPIC_AUX_MAX_TOKENS ?? 4096);
  }
  return Number(process.env.ANTHROPIC_MAX_TOKENS ?? 16384);
}

/**
 * @param {string} prompt
 * @param {{ tier?: 'main' | 'aux' }} options
 */
export async function callClaude(prompt, options = {}) {
  const tier = options.tier === "aux" ? "aux" : "main";
  const model = modelForTier(tier);
  const maxTokens = maxTokensForTier(tier);

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
  const inTokens = usage.input_tokens ?? 0;
  const outTokens = usage.output_tokens ?? 0;

  usageTally[tier].input += inTokens;
  usageTally[tier].output += outTokens;
  usageTally[tier].calls += 1;

  console.log(
    `[claude:${tier}] model=${model} stop_reason=${response.stop_reason} ` +
    `in=${inTokens} out=${outTokens} chars=${text.length}`
  );

  if (response.stop_reason === "max_tokens") {
    console.warn(
      `[claude] ⚠ Output hit max_tokens (${maxTokens}, tier=${tier}) — response is TRUNCATED. ` +
      `Raise ${tier === "aux" ? "ANTHROPIC_AUX_MAX_TOKENS" : "ANTHROPIC_MAX_TOKENS"} in .env to avoid this.`
    );
  }

  return text;
}
