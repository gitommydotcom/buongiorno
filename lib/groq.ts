import Groq from "groq-sdk";

let client: Groq | null = null;

export function groq(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY non configurata");
    client = new Groq({ apiKey });
  }
  return client;
}

export const MODEL = "llama-3.3-70b-versatile";

export async function complete(systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number; temperature?: number }) {
  const res = await groq().chat.completions.create({
    model: MODEL,
    temperature: opts?.temperature ?? 0.6,
    max_tokens: opts?.maxTokens ?? 700,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
