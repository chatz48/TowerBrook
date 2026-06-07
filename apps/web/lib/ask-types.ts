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
  grounded: boolean;
  model_refined?: boolean;
  backend_enriched?: boolean;
  backend_error?: string;
  model: string;
  agentic_answer?: string;
  tool_calls?: unknown[];
};
