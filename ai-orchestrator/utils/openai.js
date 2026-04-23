import axios from "axios";

export async function callOpenAI(prompt) {
  const { data } = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS ?? 4096),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return data.choices[0].message.content;
}
