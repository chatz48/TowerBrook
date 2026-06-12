export type {
  AskResponse,
  ChatTurn,
  PageContext,
  SourceRecord,
  ToolTrace,
} from "@/lib/ask-types";

export type CopilotFilters = {
  objective: string;
  theme: string;
  geography: string;
  archetypes: string[];
  sourceScope: string;
  includeTowerBrookEmployees: boolean;
};

export type CopilotRetrievalOptions = {
  baseline: boolean;
  hybrid: boolean;
  reranking: boolean;
};
