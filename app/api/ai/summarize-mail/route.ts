import { NextResponse } from "next/server";
import { fetchInbox } from "@/lib/gmail";
import { getSettings } from "@/lib/settings";
import { mailSummaryPrompt } from "@/lib/prompts";
import { complete } from "@/lib/groq";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const mail = await fetchInbox(25);

    const { system, user } = mailSummaryPrompt({
      language: s.language,
      mail,
      customPrompt: s.aiPrompts?.mail,
      basePrompt: s.aiPrompts?.baseMail,
    });

    const inputHash =
      mail.map((m) => m.id).join("|") +
      "::" +
      (s.aiPrompts?.mail ?? "").length +
      ":" +
      (s.aiPrompts?.baseMail ?? "").length;

    const text = await cached(`narration:mail:${inputHash}`, 10 * 60, () =>
      complete(system, user, { maxTokens: 700, temperature: 0.4 }),
    );

    return NextResponse.json({ text, count: mail.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
