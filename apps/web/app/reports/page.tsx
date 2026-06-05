import ReportWorkspace from "@/app/components/reports/ReportWorkspace";
import { getCompany, getExpert } from "@/lib/data";
import { buildReport } from "@/lib/report";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const params = (await searchParams) ?? {};
  const expertId = singleParam(params.expert);
  const companyId = singleParam(params.company);
  const expert = expertId ? getExpert(expertId) : undefined;
  const company = companyId ? getCompany(companyId) : undefined;
  const report = await buildReport(themeFocus, includeTowerBrookEmployees);

  return (
    <ReportWorkspace
      key={`${themeFocus}:${includeTowerBrookEmployees}`}
      report={report}
      focusContext={
        expert
          ? {
              kind: "expert",
              name: expert.name,
              href: `/experts/${expert.id}`,
              detail: expert.whyRelevant,
            }
          : company
            ? {
                kind: "company",
                name: company.name,
                href: `/companies/${company.id}`,
                detail: company.whyInteresting ?? company.description,
              }
            : undefined
      }
    />
  );
}

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
