import {
  buildExpertContext,
  complete,
  hasModel,
  loadExpertOrThrow,
} from "@/lib/llm";
import { RELATIONSHIP_LABEL } from "@/lib/labels";
import type { ExpertWithCompanies } from "@/lib/types";

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
      return Response.json({ text: fallbackBrief(expert, context), grounded: false });
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

function fallbackBrief(expert: ExpertWithCompanies, angle?: string): string {
  const firstCompany = expert.resolvedCompanies[0];
  const companyLines = expert.resolvedCompanies.slice(0, 4).map(
    (link) =>
      `- ${RELATIONSHIP_LABEL[link.relationship]} ${link.company.name}${
        link.note ? `: ${link.note}` : ""
      }`,
  );
  const sourceLine = `${expert.sources.length} source record${
    expert.sources.length === 1 ? "" : "s"
  } on file; record confidence ${(expert.confidence * 100).toFixed(0)}%.`;
  const whyCallLines = [
    `- ${expert.whyRelevant}`,
    expert.bio ? `- ${expert.bio}` : "",
    firstCompany
      ? `- First company angle to validate: ${firstCompany.company.name}.`
      : "- No company edge is mapped yet; use the call to request referrals and validate coverage gaps.",
  ].filter(Boolean);

  return `CALL-PREP BRIEF — ${expert.name}
Prepared from source-backed profile, company-link and deal records.

WHY THIS CALL
${whyCallLines.join("\n")}

COMPANIES / PATHS TO TEST
${companyLines.length ? companyLines.join("\n") : "- Ask which companies, advisors and operators should be added to the graph."}

SMART QUESTIONS
- What has changed in customer urgency, procurement, or buyer behavior over the last 18 months?
- Which companies would you diligence first, and which would you avoid?
- What evidence would prove this theme is investable rather than just active?
- Who else should we be speaking to?
- Which banker, lawyer, operator, or former founder sees the market most clearly?
${angle ? `- On the stated angle (${angle}): what would you de-risk first?` : ""}

WATCH-OUTS
- Confirm whether any current role creates a conflict before discussing specific companies.
- Treat graph coverage as directional until call notes and source evidence are added back.
- ${sourceLine}`;
}
