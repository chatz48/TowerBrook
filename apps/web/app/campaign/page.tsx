import { campaignPlan, coverageMatrix, type ThemeFocus } from "@/lib/investment-readiness";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import CampaignWorkspace from "@/app/components/campaign/CampaignWorkspace";

export default async function CampaignPage() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const theme = themeFocus as ThemeFocus;
  const plan = campaignPlan(theme, includeTowerBrookEmployees);
  const coverage = coverageMatrix(theme, includeTowerBrookEmployees);

  return (
    <CampaignWorkspace
      key={`${theme}:${includeTowerBrookEmployees}`}
      theme={theme}
      calls={plan.calls.map(({ expert, readiness }) => ({
        id: expert.id,
        name: expert.name,
        headline: expert.headline,
        href: `/experts/${expert.id}`,
        readiness: readiness.label,
        reasons: readiness.reasons,
        theme: expert.themes[0],
        companyCount: expert.companies.length,
      }))}
      targets={plan.targets.map(({ company, scorecard, readiness }) => ({
        id: company.id,
        name: company.name,
        href: `/companies/${company.id}`,
        score: scorecard.total,
        scoreLabel: scorecard.label,
        readiness: readiness.label,
        nextAction: scorecard.nextAction,
        theme: company.themes[0],
        expertCount: company.expertCount,
      }))}
      gaps={plan.gaps}
      coverage={coverage.map((cell) => ({
        type: cell.type,
        label: cell.label,
        total: cell.total,
        verified: cell.verified,
        contactable: cell.contactable,
        towerBrookPath: cell.towerBrookPath,
        gapSeverity: cell.gapSeverity,
      }))}
      nextSteps={plan.nextSteps}
    />
  );
}
