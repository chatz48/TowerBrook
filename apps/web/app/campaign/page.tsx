import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { companiesWithLinks, getCompanies, getExperts } from "@/lib/data";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { rankExperts } from "@/lib/score";
import { THEME_BY_ID } from "@/lib/themes";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import type { CompanyWithLinks, Expert, ExpertType, ThemeId } from "@/lib/types";
import { singleParam } from "@/lib/url-params";
import CallCampaignWorkspace, {
  type CampaignCompany,
  type CampaignExpert,
  type CampaignGap,
  type CampaignMetric,
} from "./CallCampaignWorkspace";

const CORE_ARCHETYPES: ExpertType[] = [
  "ex-founder",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "investor",
  "technical-dd",
  "lender-credit",
];

function expertReadiness(expert: Expert) {
  if ((expert.linkedin || expert.email) && expert.confidence >= 0.75) return "Call-ready";
  if (expert.confidence >= 0.75) return "Find contact path";
  return "Needs verification";
}

function expertConfidence(expert: Expert) {
  if (expert.confidence >= 0.85) return "Verified profile confidence";
  if (expert.confidence >= 0.75) return "Good source confidence";
  return "Needs source review";
}

function callObjective(expert: Expert) {
  const edges = new Set(expert.companies.map((link) => link.companyId)).size;
  const primaryCompany = expert.companies[0]?.companyId.replaceAll("-", " ");
  const specialty = expert.specialties?.[0]?.toLowerCase();
  if (!edges) {
    return "Map their strongest companies, buyer pain and founder/operator referral paths.";
  }
  if (expert.type === "ex-founder") {
    return `Pressure-test founder economics, buyer urgency and two operator referrals around ${primaryCompany ?? "their strongest company edge"}.`;
  }
  if (expert.type === "operator") {
    return `Validate implementation bottlenecks, procurement timing and customer references across ${edges} mapped company edge${edges === 1 ? "" : "s"}.`;
  }
  if (expert.type === "banker") {
    return `Ask which assets are actionable now, who owns the buyer dialogue and which advisers control warm introductions.`;
  }
  if (expert.type === "investor" || expert.type === "lender-credit") {
    return `Test sponsor appetite, leverage constraints and valuation signals for ${specialty ?? "the theme"} targets.`;
  }
  if (expert.type === "lawyer") {
    return `Verify deal parties, counsel history, completion risk and diligence issues behind the mapped transaction edges.`;
  }
  return `Use their ${edges} mapped edge${edges === 1 ? "" : "s"} to identify named decision-makers, live diligence gaps and referral paths.`;
}

function callPhase(expert: Expert): CampaignExpert["phase"] {
  if (expert.type === "ex-founder" || expert.type === "operator") {
    return "Market orientation";
  }
  if (expert.type === "banker" || expert.type === "investor" || expert.type === "lender-credit") {
    return "Buyer validation";
  }
  return "Deal intelligence";
}

function mapExpert(expert: Expert): CampaignExpert {
  return {
    id: expert.id,
    name: expert.name,
    href: `/experts/${expert.id}`,
    headline: expert.headline,
    readiness: expertReadiness(expert),
    confidence: expertConfidence(expert),
    objective: callObjective(expert),
    phase: callPhase(expert),
    sourceCount: expert.sources.length,
    companyEdges: new Set(expert.companies.map((link) => link.companyId)).size,
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
  return CORE_ARCHETYPES.map((type) => {
    const matching = experts.filter((expert) => expert.type === type);
    const verified = matching.filter(
      (expert) => expert.confidence >= 0.75 && expert.sources.length > 0,
    ).length;
    const contactable = matching.filter((expert) => expert.linkedin || expert.email).length;
    const severity =
      matching.length === 0 || verified === 0
        ? "high"
        : contactable < 2
          ? "medium"
          : "low";
    return {
      archetype: EXPERT_TYPE_LABEL[type],
      total: matching.length,
      verified,
      contactable,
      severity,
    };
  });
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
