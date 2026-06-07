export type PageContext = {
  title?: string;
  pathname?: string;
  url?: string;
  headings?: string[];
  selectedText?: string;
  visibleText?: string;
};

export type SourceRecord = {
  source_id: string;
  title: string;
  publisher: string;
  url: string;
  source_type: string;
  snippet: string;
  entities: string[];
  confidence: number;
};

export type ChatTurn = {
  role?: string;
  content?: string;
};

export type ToolTrace = {
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status?: string;
};

export type AskResponse = {
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
    page_context?: {
      title: string;
      pathname: string;
      headings: string[];
    };
  };
  ranked_experts: {
    expert_id: string;
    rank: number;
    name: string;
    title: string;
    firm: string;
    archetype: string;
    relevance: number;
    score_breakdown?: {
      base: number;
      session_fit: number;
      objective_fit: number;
      keyword_boost: number;
    };
    access: string;
    momentum: string;
    why: string;
    citations: string[];
  }[];
  ranked_companies: {
    company_id: string;
    rank: number;
    name: string;
    category: string;
    stage: string;
    expert_density: number;
    why: string;
    citations: string[];
    confidence: number;
  }[];
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
  /** True when the structured answer is fully directory-sourced (no unverified LLM prose). */
  grounded: boolean;
  model_refined?: boolean;
  refine_failed?: boolean;
  backend_enriched?: boolean;
  backend_error?: string;
  vector_retrieval_failed?: boolean;
  enrichment_warnings?: string[];
  request_id?: string;
  model: string;
  intent?: string;
  model_used?: string;
  /** LangGraph structured synthesis from backend (gaps, risks, findings). */
  structured?: {
    answer_summary?: string;
    key_findings?: string[];
    gaps?: string[];
    risks?: string[];
    follow_ups?: string[];
    uncertainty_notes?: string;
  };
  /** Legacy supplemental prose slot — mirrors structured.answer_summary when present. */
  agentic_answer?: string;
  tool_calls?: ToolTrace[];
};
