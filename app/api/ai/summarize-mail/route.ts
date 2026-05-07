import { fetchInbox } from "@/lib/gmail";
import { getSettings } from "@/lib/settings";
import { mailSummaryPrompt } from "@/lib/prompts";
import { completeStream } from "@/lib/groq";
import { withTimeout } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const mail = await withTimeout(fetchInbox(25), 5000, []);

    const { system, user } = mailSummaryPrompt({
      language: s.language,
      mail,
      customPrompt: s.aiPrompts?.mail,
      basePrompt: s.aiPrompts?.baseMail,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const piece of completeStream(system, user, { maxTokens: 350, temperature: 0.4 })) {
            controller.enqueue(encoder.encode(piece));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n[errore AI: ${(err as Error).message}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return new Response(`errore: ${(e as Error).message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
