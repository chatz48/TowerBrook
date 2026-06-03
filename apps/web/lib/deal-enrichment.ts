import Anthropic from "@anthropic-ai/sdk";
import { getDbDeal, persistSourceChunks, upsertSource } from "./deal-db";
import { getSupabaseServiceClient } from "./supabase";
import { MODEL } from "./llm";
import type { DealFact } from "./types";

type EnrichedSource = {
  title: string;
  url: string;
  publisher?: string;
  snippet?: string;
};

type EnrichedFact = {
  factType: string;
  factValue: string;
  normalizedValue?: string;
  sourceUrl: string;
  evidenceText: string;
  confidence: number;
  reviewStatus?: DealFact["reviewStatus"];
};

type EnrichedConflict = {
  factType: string;
  values: string[];
  note: string;
};

type EnrichmentPayload = {
  sources?: EnrichedSource[];
  facts?: EnrichedFact[];
  conflicts?: EnrichedConflict[];
  remainingMissingFacts?: string[];
};

const SYSTEM = `You enrich private-equity deal facts using web search.
Use authoritative sources first: buyer, seller, target, investor, bank, law firm, regulator, reputable trade press.
Never invent undisclosed economics. Return strict JSON only. Low-confidence or uncertain facts must be review-gated.`;

export async function runDealEnrichment(externalDealId: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Set ANTHROPIC_API_KEY to run web-search deal enrichment.");
  }

  const deal = await getDbDeal(externalDealId);
  if (!deal) throw new Error(`Unknown persisted deal: ${externalDealId}`);

  const supabase = getSupabaseServiceClient();
  const { data: dealRow, error: dealRowError } = await supabase
    .from("deals")
    .select("id")
    .eq("external_id", externalDealId)
    .single();
  if (dealRowError) throw new Error(dealRowError.message);
  const dealUuid = dealRow.id as string;

  const { data: run, error: runError } = await supabase
    .from("deal_enrichment_runs")
    .insert({
      trigger: "manual",
      status: "running",
      queries: deal.followUpSearches,
      metadata: { dealExternalId: externalDealId },
    })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
      messages: [
        {
          role: "user",
          content: `Deal: ${deal.name}
Theme: ${deal.theme}
Known facts:
${deal.facts.map((fact) => `- ${fact.factType}: ${fact.factValue}`).join("\n")}

Missing facts:
${deal.missingFacts.map((fact) => `- ${fact}`).join("\n")}

Run targeted searches using these query ideas:
${deal.followUpSearches.map((query) => `- ${query}`).join("\n")}

Return strict JSON:
{
  "sources": [{"title": string, "url": string, "publisher": string, "snippet": string}],
  "facts": [{"factType": string, "factValue": string, "normalizedValue": string, "sourceUrl": string, "evidenceText": string, "confidence": number, "reviewStatus": "verified" | "needs_review" | "not_disclosed"}],
  "conflicts": [{"factType": string, "values": string[], "note": string}],
  "remainingMissingFacts": string[]
}`,
        },
      ],
    });

    const text = response.content.map((part) => (part.type === "text" ? part.text : "")).join("");
    const payload = parseJson<EnrichmentPayload>(text) ?? {};
    const sourceIdByUrl = new Map<string, string>();

    for (const source of payload.sources ?? []) {
      const sourceId = await upsertSource({
        title: source.title,
        url: source.url,
        publisher: source.publisher,
        sourceType: "web_enrichment",
        rawText: source.snippet,
        metadata: { dealExternalId: externalDealId },
      });
      sourceIdByUrl.set(source.url, sourceId);
      if (source.snippet) {
        await persistSourceChunks(sourceId, source.snippet, {
          dealExternalId: externalDealId,
          enrichmentRunId: run.id,
        });
      }
    }

    const factRows = [];
    for (const fact of payload.facts ?? []) {
      const sourceId =
        sourceIdByUrl.get(fact.sourceUrl) ??
        (fact.sourceUrl
          ? await upsertSource({
              title: fact.sourceUrl,
              url: fact.sourceUrl,
              sourceType: "web_enrichment",
              rawText: fact.evidenceText,
              metadata: { dealExternalId: externalDealId },
            })
          : undefined);
      factRows.push({
        deal_id: dealUuid,
        fact_type: fact.factType,
        fact_value: fact.factValue,
        normalized_value: fact.normalizedValue ?? null,
        source_id: sourceId ?? null,
        evidence_text: fact.evidenceText,
        confidence: Math.max(0, Math.min(1, fact.confidence ?? 0.7)),
        extraction_method: "web_search",
        review_status: fact.reviewStatus ?? "needs_review",
      });
    }

    if (factRows.length) {
      const { error } = await supabase.from("deal_facts").insert(factRows);
      if (error) throw new Error(error.message);
    }

    const conflictRows = (payload.conflicts ?? []).map((conflict) => ({
      deal_id: dealUuid,
      fact_type: conflict.factType,
      values: conflict.values,
      note: conflict.note,
    }));
    if (conflictRows.length) {
      const { error } = await supabase.from("deal_fact_conflicts").insert(conflictRows);
      if (error) throw new Error(error.message);
    }

    const { error: updateDealError } = await supabase
      .from("deals")
      .update({
        missing_facts: payload.remainingMissingFacts ?? deal.missingFacts,
        updated_at: new Date().toISOString(),
      })
      .eq("external_id", externalDealId);
    if (updateDealError) throw new Error(updateDealError.message);

    const { error: completeError } = await supabase
      .from("deal_enrichment_runs")
      .update({
        status: "completed",
        sources_found: payload.sources?.length ?? 0,
        facts_created: factRows.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    if (completeError) throw new Error(completeError.message);

    return {
      runId: run.id as string,
      sourcesFound: payload.sources?.length ?? 0,
      factsCreated: factRows.length,
      conflictsCreated: conflictRows.length,
      remainingMissingFacts: payload.remainingMissingFacts ?? deal.missingFacts,
    };
  } catch (error) {
    await supabase
      .from("deal_enrichment_runs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Enrichment failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
