import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { companiesWithLinks, getCompanies, getExperts } from "@/lib/data";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { rankExperts } from "@/lib/score";
import { THEME_BY_ID } from "@/lib/themes";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import { expertReadiness, coverageMatrix } from "@/lib/investment-readiness";
import { callObjective, callPhase } from "@/lib/expert-copy";
import type { CompanyWithLinks, Expert, ThemeId } from "@/lib/types";
import { singleParam } from "@/lib/url-params";
import CallCampaignWorkspace, {
  type CampaignCompany,
  type CampaignExpert,
  type CampaignGap,
  type CampaignMetric,
} from "./CallCampaignWorkspace";

function mapExpert(expert: Expert): CampaignExpert {
  const readiness = expertReadiness(expert);
  const edges = new Set(expert.companies.map((link) => link.companyId)).size;
  return {
    id: expert.id,
    name: expert.name,
    href: `/experts/${expert.id}`,
    headline: expert.headline,
    readiness: readiness.label,
    confidence: readiness.reasons[0] ?? "Profile noted",
    objective: callObjective(expert),
    phase: callPhase(expert),
    sourceCount: expert.sources.length,
    companyEdges: edges,
  };
}

function targetAction(company: CompanyWithLinks) {
  const firstExpert = company.linkedExperts[0]?.expert.name;
  if (firstExpert) {
    return `Use ${firstExpert} to validate buyer pain, ownership, scale and whether the company is an actionable target.`;
  }
  return "Find an expert path, then verify ownership, funding, scale and buying criteria.";
}

function mapCompany(company: CompanyWithLinks): CampaignCompany {
  const towerBrook = towerBrookCompanyScore(company, company.expertCount);
  return {
    id: company.id,
    name: company.name,
    href: `/companies/${company.id}`,
    score: towerBrook.score,
    label: towerBrook.score >= 80 ? "High-priority target" : "Diligence candidate",
    ownership: company.ownershipStatus?.replaceAll("-", " ") ?? "Ownership to verify",
    stage: company.stage ?? "Stage to verify",
    expertCount: company.expertCount,
    nextAction: targetAction(company),
  };
}

function coverageGaps(experts: Expert[]): CampaignGap[] {
  return coverageMatrix("all", true).map((cell) => ({
    archetype: cell.label,
    total: cell.total,
    verified: cell.verified,
    contactable: cell.contactable,
    severity: cell.gapSeverity,
  }));
}

export default async function CampaignPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const selectedExpertIds = (singleParam(params.experts) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const selectedExpertSet = new Set(selectedExpertIds);
  const theme = themeFocus === "all" ? undefined : (themeFocus as ThemeId);
  const themeLabel = theme ? THEME_BY_ID[theme].name : "All three themes";
  const sourceCompanyCount = getCompanies().length;
  const experts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
    includeTowerBrookEmployees,
  );
  const expertRows = rankExperts(experts)
    .sort((a, b) => {
      const aSelected = selectedExpertSet.has(a.expert.id) ? 1 : 0;
      const bSelected = selectedExpertSet.has(b.expert.id) ? 1 : 0;
      return bSelected - aSelected || b.score.total - a.score.total;
    })
    .slice(0, Math.max(8, selectedExpertSet.size))
    .map(({ expert }) => mapExpert(expert));

  const companyRows = companiesWithLinks(theme, includeTowerBrookEmployees)
    .filter(
      (company) =>
        company.id !== "towerbrook" &&
        company.category === "target" &&
        company.ownershipStatus !== "acquired",
    )
    .map((company) => ({
      company,
      score: towerBrookCompanyScore(company, company.expertCount).score,
    }))
    .sort((a, b) => b.score - a.score || b.company.expertCount - a.company.expertCount)
    .slice(0, 8)
    .map(({ company }) => mapCompany(company));

  const gaps = coverageGaps(experts);
  const metrics: CampaignMetric[] = [
    {
      label: "Plan items",
      value: expertRows.length + companyRows.length,
      detail: "Calls and targets",
    },
  ];

  return (
    <CallCampaignWorkspace
      themeLabel={themeLabel}
      storageKey={`towerbrook-campaign-v1:${themeFocus}:${includeTowerBrookEmployees}`}
      metrics={metrics}
      experts={expertRows}
      companies={companyRows}
      gaps={gaps}
      sourceCompanyCount={sourceCompanyCount}
      selectedExpertIds={selectedExpertIds}
    />
  );
}
