import ReportWorkspace from "@/app/components/reports/ReportWorkspace";
import { buildReport } from "@/lib/report";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";

export default async function ReportsPage() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const report = await buildReport(themeFocus, includeTowerBrookEmployees);

  return (
    <ReportWorkspace
      key={`${themeFocus}:${includeTowerBrookEmployees}`}
      report={report}
    />
  );
}
