import ResearchWorkspace from "@/app/components/copilot/ResearchWorkspace";
import { getThemeFocus } from "@/lib/theme-focus-server";

export default async function AskPage() {
  const themeFocus = await getThemeFocus();
  return <ResearchWorkspace key={themeFocus} initialTheme={themeFocus} />;
}
