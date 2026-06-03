import {
  buildExpertContext,
  complete,
  hasModel,
  loadExpertOrThrow,
} from "@/lib/llm";

const SYSTEM = `You write short, credible cold-outreach emails on behalf of a private equity investor reaching out to a sector expert. The emails are warm but concise, show genuine homework, and make a specific, low-friction ask. You ONLY reference facts provided in the context — never invent shared connections, deals, or flattery you can't support. No buzzwords. 120-160 words max.`;

export async function POST(request: Request) {
  try {
    const { expertId, context } = (await request.json()) as {
      expertId: string;
      context?: string;
    };
    const expert = loadExpertOrThrow(expertId);
    const ctx = buildExpertContext(expert);

    if (!hasModel()) {
      return Response.json({ text: fallbackEmail(expert.name, context), grounded: false });
    }

    const user = `Draft a cold-outreach email to this expert from an investor at a PE firm.

CONTEXT (the only facts you may reference):
${ctx}

${context ? `The investor's specific reason for reaching out: ${context}\n` : ""}
Requirements:
- Subject line + body.
- Open with a specific, accurate reference to their background (from context).
- One clear, low-friction ask (a 20-30 min call).
- Sign off as "[Your name], TowerBrook".
- No clichés, no overclaiming.`;

    const text = await complete(SYSTEM, user);
    return Response.json({ text, grounded: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to draft email" },
      { status: 400 },
    );
  }
}

function fallbackEmail(name: string, angle?: string): string {
  const first = name.split(" ")[0];
  return `(Template view — set ANTHROPIC_API_KEY for an AI-written draft.)

Subject: A quick call on the space?

Hi ${first},

I lead diligence in your sector at TowerBrook and have been following your work closely. ${
    angle ? `We're currently ${angle}, and ` : "We're "
}building our view of where the real opportunity sits — and your perspective would be genuinely valuable.

Would you be open to a 20-30 minute call in the next couple of weeks? Happy to work around your schedule.

Best,
[Your name], TowerBrook`;
}
