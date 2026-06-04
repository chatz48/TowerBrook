import expertsRaw from "@/data/experts.json";
import companiesRaw from "@/data/companies.json";
import type {
  Company,
  CompanyWithLinks,
  Expert,
  ExpertWithCompanies,
  ThemeId,
} from "./types";
import { filterTowerBrookEmployees } from "./employee-scope";

// JSON is the single source of truth; it's produced by the discovery pipeline
// (scripts/) and hand-verified. We cast once here and build all derived views
// in memory — there's no DB, which keeps the demo trivially runnable.
const EXPERTS = expertsRaw as Expert[];
const COMPANIES = companiesRaw as Company[];

const EXPERT_BY_ID = new Map(EXPERTS.map((e) => [e.id, e]));
const COMPANY_BY_ID = new Map(COMPANIES.map((c) => [c.id, c]));

export function getExperts(): Expert[] {
  return EXPERTS;
}

export function getCompanies(): Company[] {
  return COMPANIES;
}

export function getExpert(id: string): Expert | undefined {
  return EXPERT_BY_ID.get(id);
}

export function getCompany(id: string): Company | undefined {
  return COMPANY_BY_ID.get(id);
}

export function expertsForTheme(theme: ThemeId): Expert[] {
  return EXPERTS.filter((e) => e.themes.includes(theme));
}

export function companiesForTheme(theme: ThemeId): Company[] {
  return COMPANIES.filter((c) => c.themes.includes(theme));
}

/** Resolve an expert's edges into full company records (for detail views). */
export function resolveExpert(expert: Expert): ExpertWithCompanies {
  return {
    ...expert,
    resolvedCompanies: expert.companies
      .map((link) => {
        const company = COMPANY_BY_ID.get(link.companyId);
        return company
          ? { company, relationship: link.relationship, note: link.note }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}

/**
 * Build the reverse index: for each company, which experts touch it and how.
 * Expert density is the core "interesting company" signal the brief asks for —
 * a company multiple discovered experts founded / advised / banked is, by
 * construction, where the deal-relevant knowledge concentrates.
 */
export function companiesWithLinks(
  theme?: ThemeId,
  includeTowerBrookEmployees = false,
): CompanyWithLinks[] {
  const pool = theme ? companiesForTheme(theme) : COMPANIES;
  const visibleExperts = filterTowerBrookEmployees(EXPERTS, includeTowerBrookEmployees);
  const result = pool.map((company) => {
    const linkedExperts = visibleExperts.flatMap((expert) =>
      expert.companies
        .filter((l) => l.companyId === company.id)
        .filter(() => !theme || expert.themes.includes(theme))
        .map((l) => ({ expert, relationship: l.relationship, note: l.note })),
    );
    return { ...company, linkedExperts, expertCount: linkedExperts.length };
  });
  // Rank: expert density first, then confidence as a tie-breaker.
  return result.sort(
    (a, b) => b.expertCount - a.expertCount || b.confidence - a.confidence,
  );
}

export function companyWithLinks(
  id: string,
  includeTowerBrookEmployees = false,
): CompanyWithLinks | undefined {
  const company = COMPANY_BY_ID.get(id);
  if (!company) return undefined;
  const linkedExperts = filterTowerBrookEmployees(EXPERTS, includeTowerBrookEmployees).flatMap((expert) =>
    expert.companies
      .filter((l) => l.companyId === id)
      .map((l) => ({ expert, relationship: l.relationship, note: l.note })),
  );
  return { ...company, linkedExperts, expertCount: linkedExperts.length };
}

export interface ThemeStats {
  expertCount: number;
  companyCount: number;
  byType: Record<string, number>;
}

export function themeStats(theme: ThemeId, includeTowerBrookEmployees = false): ThemeStats {
  const experts = filterTowerBrookEmployees(expertsForTheme(theme), includeTowerBrookEmployees);
  const byType: Record<string, number> = {};
  for (const e of experts) byType[e.type] = (byType[e.type] ?? 0) + 1;
  return {
    expertCount: experts.length,
    companyCount: companiesForTheme(theme).length,
    byType,
  };
}
