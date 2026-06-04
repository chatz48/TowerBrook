import jobsRaw from "@/data/origination-research-jobs.json";
import type { ThemeId } from "./types";

export interface OriginationJob {
  external_job_id: string;
  job_type: "founder_origination" | "advisor_expert_gap" | "identity_resolution";
  theme_id: ThemeId | null;
  priority: number;
  query: string;
  metadata: {
    category: "founder-origination" | "advisor-expert-gap" | "identity-resolution";
    objective: string;
    queries: string[];
    target_name?: string;
    target_organization?: string;
    target_organizations?: string[];
    target_themes?: ThemeId[];
    expected_outputs: string[];
  };
}

interface OriginationResearchJobs {
  operating_principle: string;
  required_pipeline: string[];
  coverage: {
    total_jobs: number;
    founder_origination: number;
    advisor_expert_gaps: number;
    identity_resolution: number;
    advisor_organizations: string[];
  };
  queues: {
    founder_origination: OriginationJob[];
    advisor_expert_gaps: OriginationJob[];
    identity_resolution: OriginationJob[];
  };
}

const JOBS = jobsRaw as OriginationResearchJobs;

export function getOriginationResearchJobs(): OriginationResearchJobs {
  return JOBS;
}
