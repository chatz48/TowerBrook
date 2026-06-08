/** Which answer sections match what the user actually asked for. */
export type SectionKey =
  | "experts"
  | "companies"
  | "callSequence"
  | "listenFor"
  | "gapsRisks"
  | "sources";

export type SectionMode = "primary" | "expandable" | "hidden";

export type SectionPlan = {
  mode: SectionMode;
  limit: number;
};

const HIDDEN: SectionPlan = { mode: "hidden", limit: 0 };
const expandable = (limit: number): SectionPlan => ({ mode: "expandable", limit });
const primary = (limit: number): SectionPlan => ({ mode: "primary", limit });

export function inferIntent(question: string, objective: string): string {
  const q = question.toLowerCase();
  if (objective === "Map companies" || /compan(y|ies)|target|actionable/.test(q)) {
    if (objective === "Map companies" || (/(compan(y|ies)|target)/.test(q) && !/who should|call|expert/.test(q))) {
      return "map_companies";
    }
  }
  if (objective === "Red-team thesis" || /red team|red-team|disconfirm|bear case/.test(q)) {
    return "red_team";
  }
  if (objective === "Prepare calls" || /call plan|three-call|call sequence/.test(q)) {
    return "build_call_plan";
  }
  if (/listen for|conviction signal|what to ask/.test(q)) {
    return "build_call_plan";
  }
  return "find_experts";
}

/** Primary sections open by default; supplementary sections stay collapsed until expanded. */
export function planSections(question: string, objective: string): Record<SectionKey, SectionPlan> {
  const intent = inferIntent(question, objective);
  const q = question.toLowerCase();
  const mentionsCompanies =
    objective === "Map companies" || /compan(y|ies)|target|actionable/.test(q);
  const mentionsCalls =
    objective === "Prepare calls" || /call plan|sequence|three-call/.test(q);
  const mentionsListen = /listen for|conviction signal|what to ask/.test(q);
  const mentionsRisks =
    objective === "Red-team thesis" || /risk|red team|disconfirm|bear case|\bgaps?\b/.test(q);

  const sources = expandable(6);

  if (intent === "map_companies") {
    return {
      experts: /expert|call|who/.test(q) ? expandable(3) : expandable(2),
      companies: primary(4),
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: HIDDEN,
      sources,
    };
  }

  if (intent === "build_call_plan") {
    const listenPrimary = mentionsListen && !mentionsCalls;
    return {
      experts: expandable(4),
      companies: mentionsCompanies ? expandable(2) : HIDDEN,
      callSequence: listenPrimary ? expandable(3) : primary(3),
      listenFor: listenPrimary ? primary(1) : mentionsListen ? expandable(1) : HIDDEN,
      gapsRisks: HIDDEN,
      sources: expandable(4),
    };
  }

  if (intent === "red_team") {
    return {
      experts: expandable(3),
      companies: mentionsCompanies ? expandable(2) : HIDDEN,
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: primary(2),
      sources,
    };
  }

  return {
    experts: primary(3),
    companies: mentionsCompanies ? expandable(3) : expandable(2),
    callSequence: mentionsCalls ? expandable(3) : HIDDEN,
    listenFor: mentionsListen ? expandable(1) : HIDDEN,
    gapsRisks: mentionsRisks ? expandable(2) : HIDDEN,
    sources,
  };
}
