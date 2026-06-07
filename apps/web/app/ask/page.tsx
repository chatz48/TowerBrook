import ResearchWorkspace from "@/app/components/copilot/ResearchWorkspace";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { singleParam } from "@/lib/url-params";

export default async function AskPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const params = (await searchParams) ?? {};
  const prompt = singleParam(params.prompt);
  const expert = singleParam(params.expert);
  const company = singleParam(params.company);
  const initialPrompt =
    prompt ??
    (expert ? "Prepare a call brief for this expert and identify companies they can unlock." : undefined) ??
    (company ? "Build a target memo view for this company, including people to call and evidence gaps." : undefined);

  return (
    <ResearchWorkspace
      key={`${themeFocus}:${includeTowerBrookEmployees}`}
      initialTheme={themeFocus}
      includeTowerBrookEmployees={includeTowerBrookEmployees}
      initialPrompt={initialPrompt}
      autoRunInitial={Boolean(initialPrompt)}
    />
  );
}
