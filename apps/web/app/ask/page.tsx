import ResearchWorkspace from "@/app/components/copilot/ResearchWorkspace";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";

export default async function AskPage() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  return (
    <ResearchWorkspace
      key={`${themeFocus}:${includeTowerBrookEmployees}`}
      initialTheme={themeFocus}
      includeTowerBrookEmployees={includeTowerBrookEmployees}
    />
  );
}
