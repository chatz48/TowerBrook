import targetedExpansionRaw from "@/data/targeted-expert-expansion-candidates.json";
import type { ExpertType, ThemeId } from "./types";

export interface TargetedExpertExpansionCandidate {
  candidate_id: string;
  name: string;
  expert_type: ExpertType;
  themes: ThemeId[];
  organization: string;
  role: string;
  deal_or_source: string;
  why_useful: string;
  source: {
    title: string;
    url: string;
  };
  confidence: number;
  review_status: "needs_review" | "needs_more_evidence";
}

export interface SpecialistPublication {
  name: string;
  themes: ThemeId[];
  why_useful: string;
  url: string;
}

export interface TargetedExpertExpansion {
  schema_version: string;
  generated_at: string;
  generated_by: string;
  operating_principle: string;
  coverage: {
    expert_candidates: number;
    recent_pe_deals_covered: number;
    specialist_publications: number;
    by_expert_type: Partial<Record<ExpertType, number>>;
  };
  targeted_queries: string[];
  expert_candidates: TargetedExpertExpansionCandidate[];
  specialist_publications: SpecialistPublication[];
}

const TARGETED_EXPANSION = targetedExpansionRaw as TargetedExpertExpansion;

export function getTargetedExpertExpansion(): TargetedExpertExpansion {
  return TARGETED_EXPANSION;
}
