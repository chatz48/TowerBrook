import { companiesWithLinks, getExperts } from "@/lib/data";
import { DEAL_ADVISOR_LABEL, DEAL_TYPE_LABEL, dealDate } from "@/lib/deals";
import { hasDealDatabase, retrieveSourceChunks } from "@/lib/deal-db";
import { listDeals } from "@/lib/deal-repository";
import { COMPANY_CATEGORY_LABEL, EXPERT_TYPE_LABEL } from "@/lib/labels";
import { complete, hasModel, MODEL } from "@/lib/llm";
import { rankExperts } from "@/lib/score";
import { getTheme, THEMES } from "@/lib/themes";
import { callIntelligenceApi, hasIntelligenceApi } from "@/lib/intelligence-api";
import type { Company, Deal, Expert, ExpertType, Source, ThemeId } from "@/lib/types";

type SourceRecord = {
  source_id: string;
  title: string;
  publisher: string;
  url: string;
  source_type: string;
  snippet: string;
  entities: string[];
  confidence: number;
};

type RankedExpert = {
  expert_id: string;
  rank: number;
  name: string;
  title: string;
  firm: string;
  archetype: string;
  relevance: number;
  access: string;
  momentum: string;
  why: string;
  citations: string[];
};

type RankedCompany = {
  company_id: string;
  rank: number;
  name: string;
  category: string;
  stage: string;
  expert_density: number;
  why: string;
  citations: string[];
  confidence: number;
};

type AskResponse = {
  intent: string;
  answer_summary: string;
  generated_at: string;
  input_context: {
    question: string;
    objective: string;
    theme: string;
    geography: string;
    archetypes: string[];
    source_scope: string;
  };
  ranked_experts: RankedExpert[];
  ranked_companies: RankedCompany[];
  call_sequence: {
    phase: string;
    expert_ids: string[];
    goal: string;
    citations: string[];
  }[];
  what_to_listen_for: {
    claim: string;
    raises_conviction_if: string;
    reduces_conviction_if: string;
    citations: string[];
  }[];
  gaps: string[];
  risks: {
    risk: string;
    why_it_matters: string;
    disconfirming_question: string;
    citations: string[];
  }[];
  sources_used: SourceRecord[];
  confidence: {
    score: number;
    label: string;
    rationale: string;
  };
  assumptions: string[];
  follow_up_actions: {
    action: string;
    label: string;
    prompt: string;
  }[];
  grounded: boolean;
  model: string;
  agentic_answer?: string;
  tool_calls?: unknown[];
};

type AskRequest = {
  question?: string;
  filters?: {
    objective?: string;
    theme?: string;
    geography?: string;
    archetypes?: string[];
    sourceScope?: string;
  };
};

const SYSTEM = `You are a research copilot for a private equity deal team.
You receive a deterministic JSON answer built only from the local expert/company graph.
You may refine wording, risks, gaps, call sequencing, and listening prompts, but you must not invent people, companies, sources, IDs, facts, dates, or URLs.
Return only strict JSON matching the provided shape.`;

const EXPERT_TYPES = new Set<ExpertType>([
  "ex-founder",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "service-provider",
  "investor",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskRequest;
    const question = body.question?.trim();
    if (!question) {
      return Response.json({ error: "Ask a question first." }, { status: 400 });
    }

    const baseline = await buildStructuredAnswer(question, body.filters ?? {});
    const agentic = await maybeAskIntelligenceApi(question, body.filters ?? {});
    const enrichedBaseline = agentic
      ? {
          ...baseline,
          agentic_answer: agentic.answer,
          tool_calls: agentic.tool_calls,
          grounded: true,
          model: `${baseline.model} + intelligence-api`,
        }
      : baseline;

    if (!hasModel()) {
      return Response.json({
        ...enrichedBaseline,
        grounded: Boolean(agentic),
        model: agentic ? "deterministic-fallback + intelligence-api" : "deterministic-fallback",
      });
    }

    const refined = await refineWithModel(enrichedBaseline);
    return Response.json({ ...refined, agentic_answer: agentic?.answer, tool_calls: agentic?.tool_calls });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to answer" },
      { status: 400 },
    );
  }
}

async function maybeAskIntelligenceApi(
  question: string,
  filters: NonNullable<AskRequest["filters"]>,
): Promise<{ answer: string; tool_calls: unknown[] } | null> {
  if (!hasIntelligenceApi()) return null;
  try {
    return await callIntelligenceApi<{ answer: string; tool_calls: unknown[] }>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message: question,
        theme_id: filters.theme,
        tools: ["rag_search_sources", "rag_search_entities"],
      }),
    });
  } catch {
    return null;
  }
}

async function refineWithModel(baseline: AskResponse): Promise<AskResponse> {
  const prompt = `BASELINE_JSON:
${JSON.stringify(baseline, null, 2)}

Return a JSON object with the same top-level keys. Keep ranked_experts, ranked_companies, sources_used IDs, URLs, names, and citations from BASELINE_JSON only.`;

  try {
    const raw = await complete(SYSTEM, prompt);
    const parsed = parseJsonObject(raw);
    if (!parsed) return { ...baseline, grounded: true, model: `${MODEL} (baseline used)` };
    return normalizeModelResponse(parsed, baseline);
  } catch {
    return { ...baseline, grounded: true, model: `${MODEL} (baseline used)` };
  }
}

async function buildStructuredAnswer(
  question: string,
  filters: NonNullable<AskRequest["filters"]>,
): Promise<AskResponse> {
  const words = tokenize(question);
  const themeId = inferTheme(question, filters.theme);
  const objective = filters.objective ?? inferObjective(question);
  const archetypes = normalizeArchetypes(filters.archetypes);
  const theme = themeId ? getTheme(themeId) : undefined;

  const rankedExpertInputs = rankExperts(
    getExperts().filter((expert) => {
      if (themeId && !expert.themes.includes(themeId)) return false;
      if (archetypes.length > 0 && !archetypes.includes(expert.type)) return false;
      return true;
    }),
  )
    .map(({ expert, score }) => ({
      expert,
      score:
        score.total +
        keywordScore(words, expertText(expert)) * 8 +
        (expert.access === "proprietary" ? 4 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const rankedCompanyInputs = companiesWithLinks(themeId)
    .map((company) => ({
      company,
      score:
        company.expertCount * 24 +
        company.confidence * 25 +
        keywordScore(words, companyText(company)) * 7,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const rankedDealInputs = (await listDeals())
    .filter((deal) => !themeId || deal.theme === themeId)
    .map((deal) => ({
      deal,
      score:
        deal.completionScore * 40 +
        deal.confidence * 30 +
        keywordScore(words, dealText(deal)) * 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, question.toLowerCase().includes("deal") ? 4 : 2);

  const sourceIndex = buildSourceIndex(
    rankedExpertInputs.map((x) => x.expert),
    rankedCompanyInputs.map((x) => x.company),
    rankedDealInputs.map((x) => x.deal),
  );

  if (hasDealDatabase()) {
    try {
      const chunks = await retrieveSourceChunks(question, 8, themeId ? { theme: themeId } : {});
      for (const chunk of chunks) {
        const source_id = `V${sourceIndex.size + 1}`;
        sourceIndex.set(source_id, {
          source_id,
          title: chunk.title,
          publisher: chunk.publisher ?? "Vector source",
          url: chunk.url ?? "",
          source_type: "Vector retrieval",
          snippet: chunk.content,
          entities: [String(chunk.metadata.dealName ?? chunk.metadata.dealExternalId ?? "source chunk")],
          confidence: Math.max(0.55, Math.min(0.98, chunk.similarity)),
        });
      }
    } catch {
      // Keep the deterministic path available if embeddings are not configured.
    }
  }

  const sourceIds = [...sourceIndex.keys()];

  const ranked_experts = rankedExpertInputs.map(({ expert, score }, index) => {
    const citations = citationsFor(expert.sources, sourceIndex);
    return {
      expert_id: expert.id,
      rank: index + 1,
      name: expert.name,
      title: expert.headline,
      firm: expert.org ?? firmFromHeadline(expert.headline),
      archetype: EXPERT_TYPE_LABEL[expert.type],
      relevance: clamp(Math.round(score), 1, 99),
      access: expert.access === "proprietary" ? "Warm/proprietary" : "Known-market",
      momentum: momentumLabel(expert),
      why: expert.whyRelevant,
      citations,
    };
  });

  const ranked_companies = rankedCompanyInputs.map(({ company }, index) => ({
    company_id: company.id,
    rank: index + 1,
    name: company.name,
    category: COMPANY_CATEGORY_LABEL[company.category],
    stage: company.stage ?? company.ownershipStatus ?? "Unspecified",
    expert_density: company.expertCount,
    why: company.whyInteresting ?? company.description,
    citations: citationsFor(company.sources, sourceIndex),
    confidence: company.confidence,
  }));

  const phases = ["Market orientation", "Operator diligence", "Transaction angle"];
  const call_sequence = phases
    .map((phase, index) => {
      const expert = ranked_experts[index] ?? ranked_experts[ranked_experts.length - 1];
      if (!expert) return null;
      return {
        phase,
        expert_ids: [expert.expert_id],
        goal: callGoal(phase, expert, ranked_companies[0]?.name),
        citations: expert.citations.slice(0, 2),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const topTheme = theme?.name ?? "the selected market";
  const primaryCitations = sourceIds.slice(0, 3);
  const topDeal = rankedDealInputs[0]?.deal;
  const what_to_listen_for = [
    {
      claim: `${topTheme} has actionable people with direct operator, advisor, or transaction visibility.`,
      raises_conviction_if:
        "Experts cite specific buyer budgets, procurement friction, deal activity, or implementation bottlenecks from first-hand work.",
      reduces_conviction_if:
        "Experts only repeat market-level themes and cannot name specific companies, projects, customers, or advisers.",
      citations: primaryCitations.slice(0, 2),
    },
    {
      claim: "The highest-ranked companies are interesting because multiple sourced expert edges point to them.",
      raises_conviction_if:
        "Calls confirm the company is still independent, growing, and reachable through warm network paths.",
      reduces_conviction_if:
        "Calls reveal stale ownership, weak commercial traction, or relationships too distant for access.",
      citations: primaryCitations.slice(1, 3),
    },
    ...(topDeal
      ? [
          {
            claim: `${topDeal.name} is the strongest deal-specific evidence item in the current answer set.`,
            raises_conviction_if:
              "Follow-up sources fill advisor, counsel, valuation, financing, and completion-date gaps without contradictions.",
            reduces_conviction_if:
              "Missing facts remain undisclosed or sources disagree on economics, parties, or strategic rationale.",
            citations: citationsFor(topDeal.sources, sourceIndex).slice(0, 2),
          },
        ]
      : []),
  ];

  const gaps = [
    ...(topDeal
      ? topDeal.missingFacts
          .slice(0, 3)
          .map((fact) => `Deal gap for ${topDeal.name}: ${fact.replaceAll("_", " ")}.`)
      : []),
    themeId
      ? `Add more buyer-side and customer references in ${theme?.shortName ?? themeId}.`
      : "Select a single theme to tighten ranking and reduce cross-theme noise.",
    "Validate which experts are currently available for calls versus only useful as source context.",
    "Add recent primary source notes from expert calls to distinguish live conviction from directory evidence.",
  ];

  const risks = [
    {
      risk: "Directory bias",
      why_it_matters:
        "Rankings favor people and companies already represented in the curated graph.",
      disconfirming_question:
        "Who is missing from the current map that a specialist buyer, lender, or trade operator would expect to see?",
      citations: primaryCitations.slice(0, 2),
    },
    {
      risk: "Source staleness",
      why_it_matters:
        "Some records are based on public profiles or deal pages and may lag current employment, ownership, or availability.",
      disconfirming_question:
        "What has changed since the cited source was published, and who can verify it this week?",
      citations: primaryCitations.slice(1, 3),
    },
  ];

  const confidenceScore = average([
    ...rankedExpertInputs.map((x) => x.expert.confidence),
    ...rankedCompanyInputs.map((x) => x.company.confidence),
  ]);

  return {
    intent: inferIntent(question, objective),
    answer_summary: summaryFor(objective, ranked_experts, ranked_companies),
    generated_at: new Date().toISOString(),
    input_context: {
      question,
      objective,
      theme: theme?.name ?? "All themes",
      geography: filters.geography ?? "Global / Europe priority",
      archetypes: archetypes.map((type) => EXPERT_TYPE_LABEL[type]),
      source_scope: filters.sourceScope ?? "Local sourced directory",
    },
    ranked_experts,
    ranked_companies,
    call_sequence,
    what_to_listen_for,
    gaps,
    risks,
    sources_used: [...sourceIndex.values()],
    confidence: {
      score: Number(confidenceScore.toFixed(2)),
      label: confidenceScore >= 0.84 ? "High" : confidenceScore >= 0.76 ? "Medium" : "Indicative",
      rationale:
        "Calculated from the average confidence of ranked expert and company records, then tempered for directory coverage gaps.",
    },
    assumptions: [
      "The answer uses only local expert, company, deal, relationship, and source records.",
      "Higher-ranked experts are prioritized for session fit, confidence, source coverage, access, and graph relevance.",
      "Company rank is directional and driven by linked expert density plus record confidence.",
    ],
    follow_up_actions: [
      {
        action: "add_to_shortlist",
        label: "Add experts to shortlist",
        prompt: `Create a shortlist from ${ranked_experts.slice(0, 3).map((e) => e.name).join(", ")}.`,
      },
      {
        action: "build_call_plan",
        label: "Build call plan",
        prompt: `Build a three-call plan for ${theme?.shortName ?? "this question"}.`,
      },
      {
        action: "open_source_evidence",
        label: "Open source evidence",
        prompt: "Show the strongest source evidence and unresolved gaps.",
      },
      {
        action: "build_deal_brief",
        label: "Build deal brief",
        prompt: topDeal
          ? `Build a source-backed deal brief for ${topDeal.name}.`
          : "Build a source-backed deal brief for the most relevant transaction.",
      },
      {
        action: "ask_follow_up",
        label: "Ask follow-up",
        prompt: ranked_companies[0]
          ? `Which experts can introduce us to ${ranked_companies[0].name}?`
          : "Where is the directory coverage weakest?",
      },
    ],
    grounded: false,
    model: "deterministic-fallback",
  };
}

function normalizeModelResponse(value: unknown, baseline: AskResponse): AskResponse {
  if (!isRecord(value)) return baseline;
  const allowedExpertIds = new Set(baseline.ranked_experts.map((e) => e.expert_id));
  const allowedCompanyIds = new Set(baseline.ranked_companies.map((c) => c.company_id));
  const allowedSourceIds = new Set(baseline.sources_used.map((s) => s.source_id));

  const next: AskResponse = {
    ...baseline,
    answer_summary: stringOr(value.answer_summary, baseline.answer_summary),
    gaps: stringArray(value.gaps, baseline.gaps),
    assumptions: stringArray(value.assumptions, baseline.assumptions),
    grounded: true,
    model: MODEL,
  };

  if (Array.isArray(value.call_sequence)) {
    next.call_sequence = value.call_sequence
      .map((item, index) => {
        if (!isRecord(item)) return baseline.call_sequence[index];
        const expert_ids = stringArray(item.expert_ids, baseline.call_sequence[index]?.expert_ids ?? [])
          .filter((id) => allowedExpertIds.has(id));
        return {
          phase: stringOr(item.phase, baseline.call_sequence[index]?.phase ?? "Call"),
          expert_ids,
          goal: stringOr(item.goal, baseline.call_sequence[index]?.goal ?? ""),
          citations: cleanCitations(item.citations, allowedSourceIds),
        };
      })
      .filter((item) => item && item.expert_ids.length > 0);
  }

  if (Array.isArray(value.what_to_listen_for)) {
    next.what_to_listen_for = value.what_to_listen_for
      .map((item, index) => {
        if (!isRecord(item)) return baseline.what_to_listen_for[index];
        return {
          claim: stringOr(item.claim, baseline.what_to_listen_for[index]?.claim ?? ""),
          raises_conviction_if: stringOr(
            item.raises_conviction_if,
            baseline.what_to_listen_for[index]?.raises_conviction_if ?? "",
          ),
          reduces_conviction_if: stringOr(
            item.reduces_conviction_if,
            baseline.what_to_listen_for[index]?.reduces_conviction_if ?? "",
          ),
          citations: cleanCitations(item.citations, allowedSourceIds),
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(value.risks)) {
    next.risks = value.risks
      .map((item, index) => {
        if (!isRecord(item)) return baseline.risks[index];
        return {
          risk: stringOr(item.risk, baseline.risks[index]?.risk ?? ""),
          why_it_matters: stringOr(item.why_it_matters, baseline.risks[index]?.why_it_matters ?? ""),
          disconfirming_question: stringOr(
            item.disconfirming_question,
            baseline.risks[index]?.disconfirming_question ?? "",
          ),
          citations: cleanCitations(item.citations, allowedSourceIds),
        };
      })
      .filter(Boolean);
  }

  next.ranked_experts = baseline.ranked_experts.filter((expert) =>
    allowedExpertIds.has(expert.expert_id),
  );
  next.ranked_companies = baseline.ranked_companies.filter((company) =>
    allowedCompanyIds.has(company.company_id),
  );
  next.sources_used = baseline.sources_used;
  return next;
}

function buildSourceIndex(experts: Expert[], companies: Company[], deals: Deal[] = []): Map<string, SourceRecord> {
  const sources = new Map<string, SourceRecord>();
  const add = (
    source: Source,
    owner: { name: string; description: string; confidence: number; entities: string[] },
  ) => {
    const key = `${source.title}|${source.url}`;
    const existing = [...sources.values()].find((item) => `${item.title}|${item.url}` === key);
    if (existing) {
      existing.entities = [...new Set([...existing.entities, ...owner.entities])].slice(0, 8);
      existing.confidence = Math.max(existing.confidence, owner.confidence);
      return;
    }
    const source_id = `S${sources.size + 1}`;
    sources.set(source_id, {
      source_id,
      title: source.title,
      publisher: source.publisher ?? "Source on file",
      url: source.url,
      source_type: classifySource(source),
      snippet: owner.description,
      entities: owner.entities.slice(0, 8),
      confidence: owner.confidence,
    });
  };

  for (const expert of experts) {
    for (const source of expert.sources.slice(0, 2)) {
      add(source, {
        name: expert.name,
        description: expert.whyRelevant,
        confidence: expert.confidence,
        entities: [expert.name, expert.org, ...expert.themes, ...(expert.specialties ?? [])].filter(
          Boolean,
        ) as string[],
      });
    }
  }
  for (const company of companies) {
    for (const source of company.sources.slice(0, 2)) {
      add(source, {
        name: company.name,
        description: company.whyInteresting ?? company.description,
        confidence: company.confidence,
        entities: [company.name, company.owner, ...company.themes, ...(company.specialties ?? [])].filter(
          Boolean,
        ) as string[],
      });
    }
  }
  for (const deal of deals) {
    for (const source of deal.sources.slice(0, 3)) {
      add(source, {
        name: deal.name,
        description: `${deal.name}: ${DEAL_TYPE_LABEL[deal.dealType]}${dealDate(deal) ? ` (${dealDate(deal)})` : ""}. ${deal.investmentRelevance}`,
        confidence: deal.confidence,
        entities: [
          deal.name,
          DEAL_TYPE_LABEL[deal.dealType],
          ...deal.parties.map((party) => party.name),
          ...deal.advisors.map((advisor) => `${advisor.name} (${DEAL_ADVISOR_LABEL[advisor.role]})`),
        ],
      });
    }
  }
  return sources;
}

function citationsFor(sources: Source[], index: Map<string, SourceRecord>): string[] {
  const keys = new Set(sources.map((source) => `${source.title}|${source.url}`));
  return [...index.values()]
    .filter((item) => keys.has(`${item.title}|${item.url}`))
    .map((item) => item.source_id)
    .slice(0, 3);
}

function inferTheme(question: string, selected?: string): ThemeId | undefined {
  if (selected && selected !== "all" && getTheme(selected)) return selected as ThemeId;
  const q = question.toLowerCase();
  const matches = THEMES.map((theme) => ({
    id: theme.id,
    score: keywordScore(tokenize(q), `${theme.name} ${theme.description} ${theme.keywords.join(" ")}`),
  })).sort((a, b) => b.score - a.score);
  return matches[0]?.score ? matches[0].id : undefined;
}

function inferObjective(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("company") || q.includes("target")) return "Map companies";
  if (q.includes("risk") || q.includes("red") || q.includes("disconfirm")) return "Red-team thesis";
  if (q.includes("call") || q.includes("prep")) return "Prepare calls";
  return "Find experts";
}

function inferIntent(question: string, objective: string): string {
  const q = question.toLowerCase();
  if (objective === "Map companies") return "map_companies";
  if (objective === "Red-team thesis") return "red_team";
  if (q.includes("sequence") || q.includes("plan") || objective === "Prepare calls") return "build_call_plan";
  return "find_experts";
}

function normalizeArchetypes(input?: string[]): ExpertType[] {
  return (input ?? [])
    .map((item) => item as ExpertType)
    .filter((item) => EXPERT_TYPES.has(item));
}

function summaryFor(
  objective: string,
  experts: RankedExpert[],
  companies: RankedCompany[],
): string {
  const expertNames = experts.slice(0, 3).map((expert) => expert.name).join(", ");
  const companyNames = companies.slice(0, 2).map((company) => company.name).join(" and ");
  if (!experts.length) return "No strong expert matches in the current directory. Broaden the theme or archetype filters.";
  if (objective === "Map companies") {
    return `Start with ${companyNames || "the highest-density companies"}, then use ${expertNames} to validate why those assets matter.`;
  }
  if (objective === "Red-team thesis") {
    return `Use ${expertNames} to pressure-test the thesis, with ${companyNames || "linked companies"} as concrete evidence checks.`;
  }
  return `Start with ${expertNames}; they provide the best mix of relevance, source coverage, access, and graph links for this session.`;
}

function callGoal(phase: string, expert: RankedExpert, company?: string): string {
  if (phase === "Market orientation") {
    return `Establish the current market map and identify which claims deserve diligence first with ${expert.name}.`;
  }
  if (phase === "Operator diligence") {
    return `Pressure-test implementation bottlenecks, buyer behavior, and timing signals${company ? ` around ${company}` : ""}.`;
  }
  return "Convert the first two calls into target, adviser, and follow-up introductions.";
}

function momentumLabel(expert: Expert): string {
  if ((expert.news ?? []).some((item) => item.date >= "2024-01-01")) return "High";
  if ((expert.signals ?? []).length > 0) return "Medium";
  return "Stable";
}

function classifySource(source: Source): string {
  const hay = `${source.title} ${source.publisher ?? ""}`.toLowerCase();
  if (hay.includes("deal") || hay.includes("acquisition") || hay.includes("portfolio")) return "Deal / portfolio";
  if (hay.includes("profile") || hay.includes("team") || hay.includes("people")) return "Expert profile";
  if (hay.includes("regulator") || hay.includes("ofwat") || hay.includes("ferc")) return "Regulatory";
  return "Source page";
}

function firmFromHeadline(headline: string): string {
  const parts = headline.split(",");
  return parts.length > 1 ? parts.slice(1).join(",").trim() : "Independent";
}

function expertText(expert: Expert): string {
  return [
    expert.name,
    expert.headline,
    expert.org,
    expert.location,
    expert.whyRelevant,
    expert.bio,
    expert.type,
    ...(expert.specialties ?? []),
    ...expert.themes,
    ...expert.companies.map((link) => `${link.relationship} ${link.note ?? ""}`),
    ...(expert.signals ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function companyText(company: Company): string {
  return [
    company.name,
    company.category,
    company.description,
    company.whyInteresting,
    company.stage,
    company.ownershipStatus,
    company.owner,
    company.hq,
    ...(company.specialties ?? []),
    ...company.themes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function dealText(deal: Deal): string {
  return [
    deal.name,
    deal.theme,
    deal.geography,
    DEAL_TYPE_LABEL[deal.dealType],
    deal.investmentRelevance,
    deal.strategicRationale,
    ...deal.parties.map((party) => `${party.role} ${party.name}`),
    ...deal.advisors.map((advisor) => `${DEAL_ADVISOR_LABEL[advisor.role]} ${advisor.name}`),
    ...deal.facts.map((fact) => `${fact.factType} ${fact.factValue}`),
    ...deal.missingFacts,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/\W+/).filter((word) => word.length > 2))];
}

function keywordScore(words: string[], text: string): number {
  const hay = text.toLowerCase();
  return words.filter((word) => hay.includes(word)).length;
}

function average(values: number[]): number {
  if (!values.length) return 0.7;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseJsonObject(raw: string): unknown | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return next.length ? next : fallback;
}

function cleanCitations(value: unknown, allowed: Set<string>): string[] {
  return stringArray(value, []).filter((id) => allowed.has(id)).slice(0, 3);
}
