import Anthropic from "@anthropic-ai/sdk";
import { resolveExpert, getExpert } from "./data";
import { RELATIONSHIP_LABEL } from "./labels";
import type { ExpertWithCompanies } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

/**
 * Turn an expert record into a compact, factual context block. The model only
 * ever sees what we actually sourced — names, edges, signals, source titles —
 * which keeps generated briefs grounded rather than invented.
 */
export function buildExpertContext(expert: ExpertWithCompanies): string {
  const edges = expert.resolvedCompanies
    .map(
      (rc) =>
        `- ${expert.name} ${RELATIONSHIP_LABEL[rc.relationship]} ${rc.company.name}${
          rc.note ? ` (${rc.note})` : ""
        }. ${rc.company.description}`,
    )
    .join("\n");
  const signals = (expert.signals ?? []).map((s) => `- ${s}`).join("\n");
  const sources = expert.sources.map((s) => `- ${s.title} (${s.publisher ?? s.url})`).join("\n");

  return [
    `Name: ${expert.name}`,
    `Role: ${expert.headline}`,
    expert.org ? `Organisation: ${expert.org}` : "",
    expert.location ? `Location: ${expert.location}` : "",
    `Why relevant: ${expert.whyRelevant}`,
    expert.bio ? `Background: ${expert.bio}` : "",
    edges ? `Company connections:\n${edges}` : "",
    signals ? `Recent signals:\n${signals}` : "",
    sources ? `Sources on file:\n${sources}` : "",
    `Data confidence: ${(expert.confidence * 100).toFixed(0)}%`,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface GenResult {
  text: string;
  model: string;
  grounded: boolean; // true if a real model produced it
}

/** Whether a live model is configured. */
export function hasModel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function complete(system: string, user: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text: system,
        // Cache the (stable) system prompt across requests.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: user }],
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

export { MODEL };

/** Resolve an expert by id or throw a clean error for the route. */
export function loadExpertOrThrow(expertId: string): ExpertWithCompanies {
  const base = getExpert(expertId);
  if (!base) throw new Error(`Unknown expert: ${expertId}`);
  return resolveExpert(base);
}
