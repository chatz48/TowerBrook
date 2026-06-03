import ReportWorkspace from "@/app/components/reports/ReportWorkspace";
import { buildReport } from "@/lib/report";

export default async function ReportsPage() {
  const report = await buildReport("grid-infrastructure");

  return <ReportWorkspace report={report} />;
}
