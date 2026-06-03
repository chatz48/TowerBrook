import type { CompanyCategory, ExpertType, RelationshipType } from "./types";

export const EXPERT_TYPE_LABEL: Record<ExpertType, string> = {
  "ex-founder": "Ex-founder",
  operator: "Operator",
  advisor: "Advisor",
  banker: "Banker",
  lawyer: "Lawyer",
  "service-provider": "Service provider",
  investor: "Investor / dealmaker",
};

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  founded: "founded",
  "co-founded": "co-founded",
  led: "led",
  partner: "is a partner at",
  board: "sat on the board of",
  advised: "advised",
  "invested-in": "is backed by",
  acquired: "was acquired by",
  banked: "advised on a deal with",
  "legal-counsel": "was legal counsel on",
  served: "has a contract with",
};

export const COMPANY_CATEGORY_LABEL: Record<CompanyCategory, string> = {
  target: "Potential target",
  advisory: "Advisory",
  "service-provider": "Service provider",
  investor: "Investor",
  incumbent: "Incumbent / acquirer",
};

/** Tailwind-friendly class hints per expert type (badge styling). */
export const EXPERT_TYPE_STYLE: Record<ExpertType, string> = {
  "ex-founder": "bg-emerald-50 text-emerald-700 border-emerald-200",
  operator: "bg-teal-50 text-teal-700 border-teal-200",
  advisor: "bg-violet-50 text-violet-700 border-violet-200",
  banker: "bg-amber-50 text-amber-700 border-amber-200",
  lawyer: "bg-rose-50 text-rose-700 border-rose-200",
  "service-provider": "bg-slate-50 text-slate-700 border-slate-200",
  investor: "bg-blue-50 text-blue-700 border-blue-200",
};

export const COMPANY_CATEGORY_STYLE: Record<CompanyCategory, string> = {
  target: "bg-emerald-50 text-emerald-700 border-emerald-200",
  advisory: "bg-violet-50 text-violet-700 border-violet-200",
  "service-provider": "bg-slate-50 text-slate-700 border-slate-200",
  investor: "bg-blue-50 text-blue-700 border-blue-200",
  incumbent: "bg-amber-50 text-amber-700 border-amber-200",
};

export const OWNERSHIP_LABEL: Record<string, string> = {
  independent: "Independent",
  "sponsor-owned": "Sponsor-owned",
  acquired: "Acquired",
  public: "Public",
};

export const OWNERSHIP_STYLE: Record<string, string> = {
  independent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "sponsor-owned": "bg-amber-50 text-amber-700 border-amber-200",
  acquired: "bg-slate-100 text-slate-600 border-slate-200",
  public: "bg-slate-100 text-slate-600 border-slate-200",
};

export const ACCESS_LABEL: Record<string, string> = {
  proprietary: "Proprietary access",
  obvious: "Well-known name",
};

export const ACCESS_STYLE: Record<string, string> = {
  proprietary: "bg-blue-50 text-blue-700 border-blue-200",
  obvious: "bg-slate-100 text-slate-500 border-slate-200",
};

export function confidenceLabel(c: number): { label: string; style: string } {
  if (c >= 0.85) return { label: "High confidence", style: "text-emerald-600" };
  if (c >= 0.75) return { label: "Good confidence", style: "text-amber-600" };
  return { label: "Indicative", style: "text-rose-500" };
}
