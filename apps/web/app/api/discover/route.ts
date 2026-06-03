import Anthropic from "@anthropic-ai/sdk";
import { getExperts } from "@/lib/data";
import { getTheme, THEME_SPECIALTIES } from "@/lib/themes";
import { hasModel, MODEL } from "@/lib/llm";

/**
 * Live discovery agent — the "engine" version of our curated dataset.
 *
 * Given a theme, Claude uses its server-side web_search tool to find experts we
 * don't already have, and returns them in (a subset of) our Expert schema with
 * a real source URL each. This is the feature that makes the directory grow at
 * runtime rather than being a fixed list.
 */
const SYSTEM = `You are a sourcing agent for a private equity firm. You find REAL, named individuals who are experts on a given investment theme — ex-founders, advisors, bankers, lawyers, or peer-fund dealmakers. Use web search to find current, verifiable people. Never invent anyone. For each, capture a real source URL you actually saw. Return ONLY a JSON array, no prose.`;

export async function POST(request: Request) {
  if (!hasModel()) {
    return Response.json(
      {
        error:
          "Live discovery needs ANTHROPIC_API_KEY. The curated directory works without it; this feature calls the web-search agent at runtime.",
      },
      { status: 503 },
    );
  }

  try {
    const { themeId } = (await request.json()) as { themeId: string };
    const theme = getTheme(themeId);
    if (!theme) return Response.json({ error: "Unknown theme" }, { status: 400 });

    const existing = getExperts()
      .filter((e) => e.themes.includes(theme.id))
      .map((e) => e.name);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
      messages: [
        {
          role: "user",
          content: `Theme: ${theme.name}
Description: ${theme.description}
Search terms to consider: ${theme.keywords.join(", ")}
Sub-specialties to cover (spread results across these): ${THEME_SPECIALTIES[theme.id].join(", ")}

Find 4-6 experts NOT already in this list: ${existing.join(", ") || "(none)"}.
Prefer people with a recent, datable event (a raise, exit, move or appointment).

Return ONLY a JSON array. Each item:
{
  "name": string,
  "type": "ex-founder" | "advisor" | "banker" | "lawyer" | "investor" | "operator" | "service-provider",
  "headline": string,            // e.g. "Founder & CEO, Acme Solar"
  "company": string,             // the main company they're associated with
  "specialty": string,           // one of the sub-specialties above
  "whyRelevant": string,         // one sentence
  "recentNews": string,          // a recent datable headline, or "" if none
  "sourceUrl": string,           // a real URL you saw via search
  "confidence": number           // 0-1, your confidence this is accurate
}`,
        },
      ],
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const candidates = parseJsonArray(text);
    return Response.json({ candidates, raw: candidates.length ? undefined : text });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Discovery failed" },
      { status: 500 },
    );
  }
}

/** Pull the first JSON array out of the model's response, defensively. */
function parseJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
