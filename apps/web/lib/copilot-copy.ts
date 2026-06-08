import type { AskResponse } from "./ask-types";

/** Plain-language trust badge for Copilot answers — no vendor or model names. */
export function copilotTrustLabel(
  answer: Pick<AskResponse, "grounded" | "backend_enriched">,
): string {
  if (answer.grounded) return "Sourced from directory";
  if (answer.backend_enriched) return "AI-assisted summary · ranks from directory";
  return "Sourced from directory";
}

/** Short helper line under the badge so users know what was verified vs drafted. */
export function copilotTrustDetail(
  answer: Pick<AskResponse, "grounded" | "backend_enriched" | "ranked_experts" | "sources_used">,
): string {
  const expertCount = answer.ranked_experts?.length ?? 0;
  const sourceCount = answer.sources_used?.length ?? 0;
  if (answer.grounded) {
    return `${expertCount} ranked experts · ${sourceCount} cited source${sourceCount === 1 ? "" : "s"}`;
  }
  if (answer.backend_enriched) {
    return `Rankings from the directory · summary may be AI-drafted · ${sourceCount} source${sourceCount === 1 ? "" : "s"} to verify`;
  }
  return `${expertCount} ranked experts · verify citations before outreach`;
}

export const COPILOT_PROGRESS_LABELS = [
  "Building answer from directory…",
  "Matching your question to the workflow…",
  "Checking directory citations…",
  "Refining answer…",
  "Finalising confidence…",
] as const;

export function copilotProgressLabel(step: number): string {
  return COPILOT_PROGRESS_LABELS[step] ?? "Preparing response…";
}
