import { companiesWithLinks, getExperts } from "@/lib/data";
import { DEAL_ADVISOR_LABEL, DEAL_TYPE_LABEL, dealDate } from "@/lib/deals";
import { hasDealDatabase, retrieveSourceChunks } from "@/lib/deal-db";
import { listDeals } from "@/lib/deal-repository";
import { COMPANY_CATEGORY_LABEL, EXPERT_TYPE_LABEL } from "@/lib/labels";
import { buildExternalChatPayload, geographyToSession, objectiveToSession } from "@/lib/copilot-safety";
import { rankExpertsForSession, type SessionCalibration } from "@/lib/score";
import { parseSseChunk } from "@/lib/sse";
import { getTheme, THEMES } from "@/lib/themes";
import { callBackendApi, hasBackendApi } from "@/lib/backend-api";
import type { AskResponse, ChatTurn, PageContext, SourceRecord, ToolTrace } from "@/lib/ask-types";
import type { Company, Deal, Expert, ExpertType, Source, ThemeId } from "@/lib/types";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { warmPathsForExpert, warmPathStatusLabel } from "@/lib/warm-paths";

type RankedExpert = AskResponse["ranked_experts"][number];
type RankedCompany = AskResponse["ranked_companies"][number];

type AskRequest = {
  question?: string;
  chatHistory?: ChatTurn[];
  filters?: {
    objective?: string;
    theme?: string;
    geography?: string;
    archetypes?: string[];
    sourceScope?: string;
    includeTowerBrookEmployees?: boolean;
  };
  pageContext?: PageContext;
};

const EXPERT_TYPES = new Set<ExpertType>([
  "ex-founder",
  "operator",
  "advisor",
  "strategy-consultant",
  "commercial-dd",
  "technical-dd",
  "engineering-consultant",
  "regulatory-policy",
  "banker",
  "lawyer",
  "service-provider",
  "investor",
]);

type BackendChatResult = {
  answer: string;
  tool_calls: ToolTrace[];
  confidence?: number;
  intent?: string;
  model_used?: string;
  structured?: AskResponse["structured"];
  citations?: { title: string; evidence: string; url?: string }[];
  request_id?: string;
  verification_warnings?: string[];
  node_timings_ms?: Record<string, number>;
};

function wantsStream(request: Request): boolean {
  if (request.headers.get("accept")?.includes("text/event-stream")) return true;
  try {
    return new URL(request.url).searchParams.get("stream") === "1";
  } catch {
    return false;
  }
}

export async function handleAskRequest(request: Request) {
  if (wantsStream(request)) return handleAskStream(request);

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const body = (await request.json()) as AskRequest;
    const prepared = await prepareAskContext(body);
    if ("error" in prepared) {
      return Response.json({ error: prepared.error }, { status: 400 });
    }

    const agentic = await maybeAskIntelligenceApi(
      prepared.question,
      prepared.filters,
      prepared.pageContext,
      prepared.chatHistory,
      prepared.baseline,
    );

    if (agentic.result?.structured || agentic.result?.answer) {
      const merged = mergeBackendIntoBaseline(prepared.baseline, agentic.result);
      return Response.json({
        ...merged,
        backend_enriched: true,
        request_id: requestId,
        backend_error: agentic.error,
      });
    }

    return Response.json({
      ...prepared.baseline,
      backend_error: agentic.error,
      enrichment_warnings: agentic.error
        ? ["Live research unavailable; rankings and citations are from the directory only."]
        : prepared.baseline.enrichment_warnings,
      request_id: requestId,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to answer" },
      { status: 400 },
    );
  }
}

async function handleAskStream(request: Request): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const encoder = new TextEncoder();
  const body = (await request.json()) as AskRequest;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const prepared = await prepareAskContext(body);
        if ("error" in prepared) {
          send("error", { message: prepared.error });
          controller.close();
          return;
        }

        send("baseline", { ...prepared.baseline, request_id: requestId });

        if (!hasBackendApi()) {
          send("complete", { ...prepared.baseline, request_id: requestId });
          controller.close();
          return;
        }

        const external = buildExternalChatPayload(
          prepared.question,
          prepared.filters,
          prepared.pageContext,
          extractEntityIdsFromHistory(prepared.chatHistory),
          {
            answer_summary: prepared.baseline.answer_summary,
            ranked_expert_names: prepared.baseline.ranked_experts.map((e) => e.name),
            ranked_company_names: prepared.baseline.ranked_companies.map((c) => c.name),
          },
        );

        const backendRes = await fetchBackendStream(external.message, external.theme_id);
        if (!backendRes.ok || !backendRes.body) {
          send("complete", {
            ...prepared.baseline,
            backend_error: `Backend stream failed (${backendRes.status})`,
            request_id: requestId,
          });
          controller.close();
          return;
        }

        const reader = backendRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseChunk(buffer);
          buffer = parsed.remainder;

          for (const sse of parsed.events) {
            if (sse.event === "phase") {
              send("phase", JSON.parse(sse.data));
            }
            if (sse.event === "complete") {
              const backend = JSON.parse(sse.data) as BackendChatResult;
              const merged = mergeBackendIntoBaseline(prepared.baseline, backend);
              send("complete", { ...merged, request_id: requestId });
            }
            if (sse.event === "error") {
              send("error", JSON.parse(sse.data));
            }
          }
        }

        controller.close();
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : "Stream failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function prepareAskContext(body: AskRequest): Promise<
  | {
      question: string;
      filters: NonNullable<AskRequest["filters"]>;
      pageContext?: PageContext;
      chatHistory: ChatTurn[];
      baseline: AskResponse;
    }
  | { error: string }
> {
  const question = body.question?.trim();
  if (!question) return { error: "Ask a question first." };

  const chatHistory = normalizeChatHistory(body.chatHistory);
  const pageContext = normalizePageContext(body.pageContext);
  const contextualQuestion = questionWithChatHistory(question, chatHistory);
  const baseline = await buildStructuredAnswer(
    contextualQuestion,
    body.filters ?? {},
    pageContext,
    question,
  );

  return {
    question,
    filters: body.filters ?? {},
    pageContext,
    chatHistory,
    baseline,
  };
}

async function fetchBackendStream(message: string, themeId?: string): Promise<Response> {
  const baseUrl =
    process.env.BACKEND_API_URL?.replace(/\/$/, "") ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8001" : null);
  if (!baseUrl) throw new Error("BACKEND_API_URL is not configured");

  return fetch(`${baseUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.BACKEND_API_TOKEN
        ? { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ message, theme_id: themeId }),
  });
}

async function maybeAskIntelligenceApi(
  question: string,
  filters: NonNullable<AskRequest["filters"]>,
  pageContext?: PageContext,
  chatHistory: ChatTurn[] = [],
  baseline?: AskResponse,
): Promise<{ result: BackendChatResult | null; error?: string }> {
  if (!hasBackendApi()) return { result: null };
  try {
    const entityIds = extractEntityIdsFromHistory(chatHistory);
    const external = buildExternalChatPayload(
      question,
      filters,
      pageContext,
      entityIds,
      baseline
        ? {
            answer_summary: baseline.answer_summary,
            ranked_expert_names: baseline.ranked_experts.map((e) => e.name),
            ranked_company_names: baseline.ranked_companies.map((c) => c.name),
          }
        : undefined,
    );
    const result = await callBackendApi<BackendChatResult>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message: external.message,
        theme_id: external.theme_id,
      }),
    });
    if (!result) return { result: null, error: "Backend returned empty response" };
    return { result };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Live research unavailable",
    };
  }
}

function looksLikePromptLeak(text: string | undefined): boolean {
  if (!text) return false;
  const markers = [
    "TowerBrook's research copilot",
    "Return strict JSON",
    "JSON schema:",
    "Ground every claim in the supplied evidence",
  ];
  return markers.some((marker) => text.includes(marker));
}

function mergeBackendIntoBaseline(baseline: AskResponse, backend: BackendChatResult): AskResponse {
  const structured = backend.structured;
  const mergedGaps = [...new Set([...(structured?.gaps ?? []), ...baseline.gaps])].slice(0, 8);
  const mergedRisks = structured?.risks?.length
    ? structured.risks.map((risk) => ({
        risk,
        why_it_matters: "Surfaced during additional research — verify before circulation.",
        disconfirming_question: "What evidence would disprove this risk?",
        citations: baseline.sources_used.slice(0, 2).map((s) => s.source_id),
      }))
    : baseline.risks;

  const rawSummary = structured?.answer_summary || backend.answer;
  const synthesisSummary = looksLikePromptLeak(rawSummary) ? baseline.answer_summary : rawSummary;
  const enrichmentWarnings: string[] = [];
  if (structured?.uncertainty_notes) {
    enrichmentWarnings.push(structured.uncertainty_notes);
  }

  return {
    ...baseline,
    answer_summary: synthesisSummary,
    gaps: mergedGaps,
    risks: mergedRisks,
    structured,
    agentic_answer: synthesisSummary,
    tool_calls: backend.tool_calls,
    intent: backend.intent ?? baseline.intent,
    model_used: backend.model_used,
    request_id: backend.request_id,
    verification_warnings: backend.verification_warnings,
    node_timings_ms: backend.node_timings_ms,
    model: baseline.model,
    grounded: false,
    backend_enriched: true,
    enrichment_warnings: [
      ...enrichmentWarnings,
      ...(backend.verification_warnings ?? []),
    ].filter(Boolean).length
      ? [...enrichmentWarnings, ...(backend.verification_warnings ?? [])]
      : undefined,
    confidence: backend.confidence
      ? {
          score: backend.confidence,
          label: backend.confidence >= 0.8 ? "High" : backend.confidence >= 0.65 ? "Medium" : "Indicative",
          rationale: `Confidence after ${backend.tool_calls?.length ?? 0} research step${(backend.tool_calls?.length ?? 0) === 1 ? "" : "s"} — verify citations before outreach.`,
        }
      : baseline.confidence,
    follow_up_actions: structured?.follow_ups?.length
      ? [
          ...baseline.follow_up_actions,
          ...structured.follow_ups.slice(0, 3).map((prompt, index) => ({
            action: `langgraph_follow_up_${index}`,
            label: "Follow-up",
            prompt,
          })),
        ].slice(0, 8)
      : baseline.follow_up_actions,
  };
}

function extractEntityIdsFromHistory(
  history: ChatTurn[],
): { expert_ids: string[]; company_ids: string[] } | undefined {
  const expertIds = new Set<string>();
  const companyIds = new Set<string>();
  for (const turn of history) {
    const content = turn.content ?? "";
    for (const match of content.matchAll(/\(([a-z0-9-]+)\)/gi)) {
      const id = match[1];
      if (id.includes("expert") || id.startsWith("exp-")) expertIds.add(id);
      if (id.includes("company") || id.startsWith("co-")) companyIds.add(id);
    }
  }
  if (!expertIds.size && !companyIds.size) return undefined;
  return { expert_ids: [...expertIds], company_ids: [...companyIds] };
}

async function buildStructuredAnswer(
  question: string,
  filters: NonNullable<AskRequest["filters"]>,
  pageContext?: PageContext,
  displayQuestion = question,
): Promise<AskResponse> {
  const pageContextText = pageContextSearchText(pageContext);
  const words = tokenize(`${question} ${pageContextText}`);
  const themeId = inferTheme(`${question} ${pageContextText}`, filters.theme);
  const objective = filters.objective ?? inferObjective(question);
  const archetypes = normalizeArchetypes(filters.archetypes);
  const includeTowerBrookEmployees = filters.includeTowerBrookEmployees === true;
  const theme = themeId ? getTheme(themeId) : undefined;

  const sessionCalibration: SessionCalibration = {
    objective: objectiveToSession(objective),
    preferredTypes: archetypes.length > 0 ? archetypes : (["operator", "advisor", "banker", "ex-founder"] as ExpertType[]),
    optimizeFor: objective.includes("Red") ? "non-obvious" : "balanced",
    theme: themeId,
    geography: geographyToSession(filters.geography),
  };

  const rankedExpertInputs = rankExpertsForSession(
    filterTowerBrookEmployees(
      getExperts().filter((expert) => {
        if (themeId && !expert.themes.includes(themeId)) return false;
        if (archetypes.length > 0 && !archetypes.includes(expert.type)) return false;
        return true;
      }),
      includeTowerBrookEmployees,
    ),
    sessionCalibration,
  )
    .map(({ expert, score }) => {
      const keywordBoost = keywordScore(words, expertText(expert)) * 8 + (expert.access === "proprietary" ? 4 : 0);
      return {
        expert,
        score: score.total + keywordBoost,
        breakdown: {
          base: score.baseTotal,
          session_fit: score.sessionFit,
          objective_fit: score.objectiveFit,
          keyword_boost: keywordBoost,
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const rankedCompanyInputs = companiesWithLinks(themeId, includeTowerBrookEmployees)
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
  const pageContextSourceId = addPageContextSource(sourceIndex, pageContext);

  let vectorRetrievalFailed = false;
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
      vectorRetrievalFailed = true;
    }
  }

  const sourceIds = [...sourceIndex.keys()];

  const ranked_experts = rankedExpertInputs.map(({ expert, score, breakdown }, index) => {
    const citations = citationsFor(expert.sources, sourceIndex);
    return {
      expert_id: expert.id,
      rank: index + 1,
      name: expert.name,
      title: expert.headline,
      firm: expert.org ?? firmFromHeadline(expert.headline),
      archetype: EXPERT_TYPE_LABEL[expert.type],
      relevance: clamp(Math.round(score), 1, 99),
      score_breakdown: breakdown,
      access: expertAccessLabel(expert),
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
  const pageCitations = pageContextSourceId ? [pageContextSourceId] : [];
  const topDeal = rankedDealInputs[0]?.deal;
  const what_to_listen_for = [
    ...(pageContext
      ? [
          {
            claim: `The current page is about ${pageContext.title || pageContext.pathname || "the selected workflow"}, so this answer is tuned to that visible context.`,
            raises_conviction_if:
              "The cited page rows and source evidence point to the same experts, companies, or gaps the user is inspecting.",
            reduces_conviction_if:
              "The page is only a broad index and the user needs a specific theme, expert, company, or deal selected.",
            citations: pageCitations,
          },
        ]
      : []),
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
    ...(pageContext
      ? [
          `Current-page context is limited to visible text from ${pageContext.title || pageContext.pathname || "the page"}; open the relevant profile, deal, company, or source record for tighter grounding.`,
        ]
      : []),
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
      question: displayQuestion,
      objective,
      theme: theme?.name ?? "All themes",
      geography: filters.geography ?? "Global / Europe priority",
      archetypes: archetypes.map((type) => EXPERT_TYPE_LABEL[type]),
      source_scope: filters.sourceScope ?? "Local sourced directory",
      ...(pageContext
        ? {
            page_context: {
              title: pageContext.title ?? "Current page",
              pathname: pageContext.pathname ?? "",
              headings: pageContext.headings ?? [],
            },
          }
        : {}),
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
      ...(pageContext
        ? [
            "The answer uses the current page title, route, headings, selected text, and visible text excerpt as local context.",
          ]
        : []),
      "The answer uses only local expert, company, deal, relationship, and source records.",
      "Higher-ranked experts are prioritized for session fit, confidence, source coverage, access, and graph relevance.",
      "Company rank is directional and driven by linked expert density plus record confidence.",
    ],
    vector_retrieval_failed: vectorRetrievalFailed,
    enrichment_warnings: vectorRetrievalFailed
      ? ["Deal vector retrieval failed (embedding dimension or API misconfiguration). Directory sources only."]
      : undefined,
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
      ...(pageContext
        ? [
            {
              action: "search_more",
              label: "Search around this page",
              prompt: `Find more source-backed information related to ${pageContext.title || pageContext.pathname || "this page"}.`,
            },
          ]
        : []),
    ],
    grounded: true,
    model: "deterministic-fallback",
  };
}

function expertAccessLabel(expert: Expert) {
  const warmPath = warmPathsForExpert(expert.id)[0];
  if (warmPath) return `${warmPathStatusLabel(warmPath.status)} via ${warmPath.intro_route}`;
  if (expert.email) return "Direct email on file";
  if (expert.linkedin) return "LinkedIn path on file";
  return expert.access === "proprietary"
    ? "Sourced outreach needed; rank driven by evidence and graph relevance"
    : "Known market participant";
}

function normalizeChatHistory(history: ChatTurn[] | undefined): ChatTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: typeof turn.content === "string" ? turn.content.trim() : "",
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-8);
}

function questionWithChatHistory(question: string, history: ChatTurn[]): string {
  if (!history.length) return question;
  const context = history
    .slice(-6)
    .map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`)
    .join("\n");
  return `${question}\n\nUse this prior conversation only to resolve follow-up references; prioritize the latest user question.\n${context}`;
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
    const sourceType = classifySource(source);
    sources.set(source_id, {
      source_id,
      title: source.title,
      publisher: source.publisher ?? "Source on file",
      url: source.url,
      source_type: sourceType,
      snippet: owner.description,
      entities: owner.entities.slice(0, 8),
      confidence: sourceType === "Contact reference" ? Math.min(owner.confidence, 0.62) : owner.confidence,
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

function addPageContextSource(index: Map<string, SourceRecord>, pageContext?: PageContext): string | null {
  if (!pageContext) return null;
  const snippet = [
    pageContext.selectedText ? `Selected text: ${pageContext.selectedText}` : "",
    pageContext.visibleText ?? "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
  const sourceId = "P1";
  index.set(sourceId, {
    source_id: sourceId,
    title: pageContext.title || "Current page",
    publisher: "Current browser page",
    url: pageContext.url ?? pageContext.pathname ?? "",
    source_type: "UI context (unverified)",
    snippet: snippet || `Route: ${pageContext.pathname ?? "current page"}`,
    entities: [
      pageContext.title,
      pageContext.pathname,
      ...(pageContext.headings ?? []),
    ].filter((item): item is string => Boolean(item)).slice(0, 8),
    confidence: pageContext.selectedText ? 0.86 : 0.72,
  });
  return sourceId;
}

function citationsFor(sources: Source[], index: Map<string, SourceRecord>): string[] {
  const keys = new Set(sources.map((source) => `${source.title}|${source.url}`));
  return [...index.values()]
    .filter((item) => keys.has(`${item.title}|${item.url}`))
    .map((item) => item.source_id)
    .slice(0, 3);
}

function normalizePageContext(value: unknown): PageContext | undefined {
  if (!isRecord(value)) return undefined;
  const title = stringOr(value.title, "").slice(0, 180);
  const pathname = stringOr(value.pathname, "").slice(0, 220);
  const url = stringOr(value.url, "").slice(0, 500);
  const headings = stringArray(value.headings, [])
    .map((heading) => heading.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12);
  const selectedText = stringOr(value.selectedText, "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const visibleText = stringOr(value.visibleText, "").replace(/\s+/g, " ").trim().slice(0, 6000);

  if (!title && !pathname && !url && !headings.length && !selectedText && !visibleText) {
    return undefined;
  }

  return {
    title,
    pathname,
    url,
    headings,
    selectedText,
    visibleText,
  };
}

function pageContextSearchText(pageContext?: PageContext): string {
  if (!pageContext) return "";
  return [
    pageContext.title,
    pageContext.pathname,
    ...(pageContext.headings ?? []),
    pageContext.selectedText,
    pageContext.visibleText,
  ]
    .filter(Boolean)
    .join(" ");
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
  if (hay.includes("linkedin") || hay.includes("contactout") || hay.includes("email finder")) return "Contact reference";
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
