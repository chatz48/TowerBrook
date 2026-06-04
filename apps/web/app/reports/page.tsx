import ReportWorkspace from "@/app/components/reports/ReportWorkspace";
import { buildReport } from "@/lib/report";
import { getThemeFocus } from "@/lib/theme-focus-server";

export default async function ReportsPage() {
  const themeFocus = await getThemeFocus();
  const report = await buildReport(themeFocus);

  return <ReportWorkspace key={themeFocus} report={report} />;
}
