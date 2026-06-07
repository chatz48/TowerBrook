import Link from "next/link";
import { getCompanies, getExperts } from "@/lib/data";
import { getAdvisorExpertGaps, getExpertDiscoveryCandidates } from "@/lib/expert-discovery";
import { rankExperts } from "@/lib/score";
import { THEME_BY_ID, THEMES, THEME_SPECIALTIES } from "@/lib/themes";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { isThemeFocus, matchesThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import ExpertFilters from "./ExpertFilters";
import { expertReadiness } from "@/lib/investment-readiness";
import ExpertCallList from "./ExpertCallList";
import OperatorWorkflowRail from "@/app/components/OperatorWorkflowRail";
import { singleParam } from "@/lib/url-params";
import { PageShell } from "@/app/components/ui";
import { expertCallAngle } from "@/lib/expert-copy";

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const selectedTheme = singleParam(params.theme);
  const selectedType = singleParam(params.type) ?? "all";
  const selectedReadiness = singleParam(params.readiness) ?? "all";
  const query = (singleParam(params.q) ?? "").trim().toLowerCase();
  const activeTheme: ThemeFocus = isThemeFocus(selectedTheme) ? selectedTheme : themeFocus;
  const specialties =
    activeTheme === "all"
      ? Array.from(new Set(THEMES.flatMap((theme) => THEME_SPECIALTIES[theme.id]))).sort()
      : THEME_SPECIALTIES[activeTheme];
  const rawSelectedSpecialty = singleParam(params.specialty) ?? "all";
  const selectedSpecialty =
    rawSelectedSpecialty === "all" || specialties.includes(rawSelectedSpecialty)
      ? rawSelectedSpecialty
      : "all";

  const companies = getCompanies();
  const companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const scopedExperts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, activeTheme)),
    includeTowerBrookEmployees,
  );
  const filteredExperts = scopedExperts
    .filter((expert) => selectedType === "all" || expert.type === selectedType)
    .filter((expert) => selectedSpecialty === "all" || expert.specialties?.includes(selectedSpecialty))
    .filter((expert) => {
      const readiness = expertReadiness(expert);
      if (selectedReadiness === "all") return true;
      if (selectedReadiness === "actionable") return readiness.level === "call-ready" || readiness.level === "verify-contact";
      return readiness.level === selectedReadiness;
    })
    .filter((expert) => {
      if (!query) return true;
      return [
        expert.name,
        expert.headline,
        expert.org ?? "",
        expert.location ?? "",
        expert.whyRelevant,
        expert.specialties?.join(" ") ?? "",
        expert.companies.map((link) => companyNames[link.companyId] ?? link.companyId).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  const ranked = rankExperts(filteredExperts);
  const firstCall = ranked[0]?.expert;
  const advisorGaps = getAdvisorExpertGaps().filter((gap) => matchesThemeFocus(gap.themes, activeTheme));
  const candidateCount = getExpertDiscoveryCandidates().filter((candidate) =>
    matchesThemeFocus(candidate.themes, activeTheme),
  ).length;

  return (
    <PageShell>
        <header className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Expert Call List</h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
              {ranked.length} matches in scope · {candidateCount} research candidates · {advisorGaps.length} advisor gaps.
            </p>
          </div>
          <div className="ee-panel rounded-lg p-4">
            <div className="ee-label text-ink">This week&apos;s first call</div>
            <div className="mt-2 text-[15px] font-semibold">
              {firstCall?.name ?? "No matching expert"}
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">
              {firstCall?.signals?.[0] ?? (firstCall ? expertCallAngle(firstCall) : "Broaden the filters or open the research queue to fill the coverage gap.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {firstCall ? (
                <>
                  <Link href={`/experts/${firstCall.id}`} className="ee-button ee-button-primary min-h-8 px-3">
                    Prepare call
                  </Link>
                  <Link href={`/graph?focus=expert:${firstCall.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                    View relationships
                  </Link>
                </>
              ) : (
                <Link href="/discover" className="ee-button ee-button-primary min-h-8 px-3">
                  Open research queue
                </Link>
              )}
            </div>
          </div>
        </header>

        <ExpertFilters
          initialTheme={activeTheme}
          initialSpecialty={selectedSpecialty}
          initialType={selectedType}
          initialReadiness={selectedReadiness}
          initialQuery={singleParam(params.q) ?? ""}
        />
        <OperatorWorkflowRail
          title="Build a call slate, then move it into execution"
          subtitle="Use this page to choose the best first calls, verify evidence quality, and hand the selected people into the origination plan."
          steps={[
            {
              label: "Select",
              detail: "Pick founder, operator and advisor coverage that explains the market.",
            },
            {
              label: "Sequence",
              detail: "Send selected experts into campaign phases with the theme already scoped.",
            },
            {
              label: "Close gaps",
              detail: "Open the research queue when a needed archetype is missing or thin.",
            },
          ]}
          actions={[
            { label: "Open campaign", href: "/campaign", primary: true },
            { label: "Fill gaps", href: "/discover" },
            { label: "Meeting memo", href: "/reports" },
          ]}
        />
        <div className="ee-panel mb-5 rounded-lg px-4 py-3">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-faint">
            <span><strong className="text-ink">{ranked.length}</strong> call-ready matches</span>
            <span><strong className="text-ink">{candidateCount}</strong> research candidates in queue</span>
            <span><strong className="text-ink">{advisorGaps.length}</strong> advisor-name gaps</span>
            <span>{activeTheme === "all" ? "All themes" : THEME_BY_ID[activeTheme]?.name}</span>
          </div>
        </div>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">Call-ready experts</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Pick the calls that can change the next investment decision.
              </p>
            </div>
            <Link href="/discover" className="ee-link text-[12px]">
              Fill gaps from research queue
            </Link>
          </div>
          <ExpertCallList
            rows={ranked.slice(0, 36).map(({ expert, score }) => {
              const towerBrook = towerBrookExpertScore(expert, companiesById);
              return {
                expert,
                score,
                readiness: expertReadiness(expert),
                companyPreview:
                  expert.companies
                    .map((link) => companyNames[link.companyId] ?? link.companyId)
                    .slice(0, 5)
                    .join(", ") || "Ask for target introductions",
                towerBrookLabel: towerBrook.label,
                towerBrookDirect: towerBrook.isDirect,
              };
            })}
          />
        </section>
    </PageShell>
  );
}
