import type { ScoreBreakdown, SessionScoreBreakdown } from "./score";

export type ScoreHelpLine = { label: string; value: string };

function formatPoints(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return "—";
}

/** Plain-language lines for the expert relevance popover. */
export function relevanceScoreLines(breakdown: ScoreBreakdown): ScoreHelpLine[] {
  const lines: ScoreHelpLine[] = [
    { label: "Expert type", value: formatPoints(breakdown.base) },
    { label: "Company links", value: formatPoints(breakdown.edges) },
  ];
  if (breakdown.signals > 0) {
    lines.push({ label: "Recent signals", value: formatPoints(breakdown.signals) });
  }
  if (breakdown.recency > 0) {
    lines.push({ label: "Timely news", value: formatPoints(breakdown.recency) });
  }
  if (breakdown.access !== 0) {
    lines.push({
      label: "Access",
      value:
        breakdown.access > 0
          ? `+${breakdown.access} (less obvious name)`
          : `${breakdown.access} (well-known name)`,
    });
  }
  if (breakdown.crossTheme > 0) {
    lines.push({ label: "Cross-theme", value: formatPoints(breakdown.crossTheme) });
  }
  lines.push({ label: "Total", value: String(breakdown.total) });
  return lines;
}

export const RELEVANCE_SCORE_FOOTNOTE =
  "Weighted by source confidence on the expert record. Higher scores surface people with stronger theme fit, company edges, and timely signals.";

/** Session-ranked experts on theme pages include calibration on top of base relevance. */
export function sessionScoreLines(breakdown: SessionScoreBreakdown): ScoreHelpLine[] {
  const lines = relevanceScoreLines(breakdown).filter((line) => line.label !== "Total");
  if (breakdown.sessionFit > 0) {
    lines.push({ label: "Session fit", value: formatPoints(breakdown.sessionFit) });
  }
  if (breakdown.objectiveFit > 0) {
    lines.push({ label: "Call objective", value: formatPoints(breakdown.objectiveFit) });
  }
  if (breakdown.optimizationFit !== 0) {
    lines.push({ label: "Optimize for", value: formatPoints(breakdown.optimizationFit) });
  }
  lines.push({ label: "Total", value: String(breakdown.total) });
  return lines;
}

export const SESSION_SCORE_FOOTNOTE =
  "Re-ranks the directory for your selected call objective and expert-type preferences on top of base relevance.";
