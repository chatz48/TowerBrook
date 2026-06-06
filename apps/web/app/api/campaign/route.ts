import { NextResponse } from "next/server";
import { campaignPlan, type ThemeFocus } from "@/lib/investment-readiness";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const theme = (url.searchParams.get("theme") ?? "all") as ThemeFocus;
  const includeTowerBrookEmployees = url.searchParams.get("includeTowerBrookEmployees") === "true";
  const plan = campaignPlan(theme, includeTowerBrookEmployees);
  return NextResponse.json({
    theme,
    generatedAt: new Date().toISOString(),
    calls: plan.calls.map(({ expert, readiness }) => ({
      id: expert.id,
      name: expert.name,
      headline: expert.headline,
      href: `/experts/${expert.id}`,
      readiness: readiness.label,
      reasons: readiness.reasons,
    })),
    targets: plan.targets.map(({ company, scorecard, readiness }) => ({
      id: company.id,
      name: company.name,
      href: `/companies/${company.id}`,
      score: scorecard.total,
      scoreLabel: scorecard.label,
      readiness: readiness.label,
      nextAction: scorecard.nextAction,
    })),
    gaps: plan.gaps,
    nextSteps: plan.nextSteps,
  });
}
