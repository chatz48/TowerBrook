import {
  buildExpertContext,
  complete,
  hasModel,
  loadExpertOrThrow,
} from "@/lib/llm";

const SYSTEM = `You are a research analyst at a private equity firm preparing a partner for a call with a sector expert. You produce tight, skimmable one-page call-prep briefs. You ONLY use the facts provided — never invent companies, deals, dates or quotes. If something isn't in the context, omit it. Tone: professional, concise, useful for a time-crunched investor.`;

export async function POST(request: Request) {
  try {
    const { expertId, context } = (await request.json()) as {
      expertId: string;
      context?: string;
    };
    const expert = loadExpertOrThrow(expertId);
    const ctx = buildExpertContext(expert);

    if (!hasModel()) {
      return Response.json({ text: fallbackBrief(expert.name, ctx, context), grounded: false });
    }

    const user = `Prepare a call-prep brief for an investor speaking with this expert.

CONTEXT (the only facts you may use):
${ctx}

${context ? `The investor's angle for this call: ${context}\n` : ""}
Produce, using markdown-free plain text with clear headers:
1. SNAPSHOT — one line on who they are and why they matter.
2. WHY THIS CALL — 2-3 bullets on what unique insight they can give.
3. SMART QUESTIONS — 4-5 specific questions tailored to their background${context ? " and the investor's angle" : ""}.
4. WATCH-OUTS — anything to be sensitive about (e.g. recent exits, current employer).
Keep it under 250 words.`;

    const text = await complete(SYSTEM, user);
    return Response.json({ text, grounded: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to generate brief" },
      { status: 400 },
    );
  }
}

function fallbackBrief(name: string, ctx: string, angle?: string): string {
  return `CALL-PREP BRIEF — ${name}
(Template view — set ANTHROPIC_API_KEY for an AI-written brief.)

SNAPSHOT
${ctx.split("\n").slice(0, 3).join("\n")}

WHY THIS CALL
- Direct operating/advisory experience in the theme (see connections below).
- Can speak to deal dynamics, valuations and the talent network in the space.

SUGGESTED QUESTIONS
- How has the competitive landscape shifted in the last 18 months?
- Where do you see the most mispriced opportunity right now?
- Who else should we be speaking to?
${angle ? `- On your angle "${angle}": what would you want to de-risk first?` : ""}

CONTEXT ON FILE
${ctx}`;
}
