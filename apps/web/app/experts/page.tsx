import Link from "next/link";
import { getCompanies, getExperts } from "@/lib/data";
import { getAdvisorExpertGaps, getExpertDiscoveryCandidates } from "@/lib/expert-discovery";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { rankExperts } from "@/lib/score";
import { THEME_BY_ID, THEMES, THEME_SPECIALTIES } from "@/lib/themes";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import type { Expert } from "@/lib/types";
import { Badge } from "@/app/components/ui";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { isThemeFocus, matchesThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import ExpertFilters from "./ExpertFilters";

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
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Expert Call List</h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
              A ranked slate of people to call, filtered by theme, specialty and expert type.
              Each row shows why the person matters, what companies they can unlock, and how to reach them.
            </p>
          </div>
          <div className="ee-panel rounded-lg p-4">
            <div className="ee-label text-ink">This week&apos;s first call</div>
            <div className="mt-2 text-[15px] font-semibold">
              {firstCall?.name ?? "No matching expert"}
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">
              {firstCall?.signals?.[0] ?? firstCall?.whyRelevant ?? "Broaden the filters or open the research queue to fill the coverage gap."}
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
          initialQuery={singleParam(params.q) ?? ""}
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
                Prioritized for outreach, company discovery and source-backed diligence.
              </p>
            </div>
            <Link href="/discover" className="ee-link text-[12px]">
              Fill gaps from research queue
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1260px]">
              <thead>
                <tr>
                  <th className="w-14">#</th>
                  <th>Expert</th>
                  <th>Specialty</th>
                  <th>Why call</th>
                  <th>Companies they can unlock</th>
                  <th>Contact</th>
                  <th>Relationship path</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 36).map(({ expert }, index) => {
                  const towerBrook = towerBrookExpertScore(expert, companiesById);
                  return (
                    <tr key={expert.id}>
                      <td>
                        <span className="inline-grid h-8 w-8 place-items-center rounded bg-[#f1f4f9] text-[16px] font-semibold text-accent">
                          {index + 1}
                        </span>
                      </td>
                      <td className="min-w-[240px]">
                        <Link href={`/experts/${expert.id}`} className="ee-link">
                          {expert.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-soft">{expert.headline}</div>
                        <div className="mt-0.5 text-[11px] text-ink-faint">{expert.org ?? expert.location ?? EXPERT_TYPE_LABEL[expert.type]}</div>
                      </td>
                      <td className="max-w-[220px] text-[11px] text-ink-soft">
                        <span className="line-clamp-3">
                          {(expert.specialties?.length ? expert.specialties : [EXPERT_TYPE_LABEL[expert.type]]).join(", ")}
                        </span>
                      </td>
                      <td className="max-w-[340px] text-[11px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-3">
                          {expert.news?.[0]?.headline ?? expert.signals?.[0] ?? expert.whyRelevant}
                        </span>
                      </td>
                      <td className="max-w-[270px] text-[11px] text-ink-soft">
                        <span className="line-clamp-3">
                          {expert.companies
                            .map((link) => companyNames[link.companyId] ?? link.companyId)
                            .slice(0, 5)
                            .join(", ") || "Ask for target introductions"}
                        </span>
                      </td>
                      <td>
                        <ContactLinks expert={expert} />
                      </td>
                      <td>
                        <Badge
                          className={
                            towerBrook.isDirect
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-line bg-white text-ink-soft"
                          }
                        >
                          {towerBrook.isDirect ? towerBrook.label : "No public path mapped"}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/experts/${expert.id}`} className="ee-button ee-button-primary min-h-8 px-3">
                            Prepare
                          </Link>
                          <Link href={`/graph?focus=expert:${expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                            View relationships
                          </Link>
                          <WorkspaceActionButton
                            item={{
                              id: expert.id,
                              kind: "call",
                              name: expert.name,
                              sub: expert.headline,
                              href: `/experts/${expert.id}`,
                              theme: expert.themes[0],
                              note: expert.whyRelevant,
                            }}
                          >
                            Save
                          </WorkspaceActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function ContactLinks({ expert }: { expert: Expert }) {
  const contactFacts = expert.contactFacts ?? [];
  const directLinks = [
    expert.email ? { label: "Email", href: `mailto:${expert.email}`, kind: "email" as const } : null,
    expert.linkedin ? { label: "LinkedIn", href: expert.linkedin, kind: "linkedin" as const } : null,
  ].filter((link): link is { label: string; href: string; kind: "email" | "linkedin" } => Boolean(link));

  const introFacts = contactFacts
    .filter((fact) => fact.type === "intro_path" && fact.value)
    .map((fact) => ({
      label: fact.evidence ?? "Intro path",
      value: fact.value!,
      kind: "intro" as const,
      confidence: fact.confidence,
      status: fact.status,
    }));

  const websiteFacts = contactFacts
    .filter((fact) => fact.type === "website" && fact.value)
    .map((fact) => ({
      label: "Website",
      value: fact.value!,
      kind: "website" as const,
    }));

  if (!directLinks.length && !introFacts.length && !websiteFacts.length) {
    return (
      <Link href={`/experts/${expert.id}#call-actions`} className="ee-link text-[12px]">
        Draft outreach
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 text-[12px]">
      {directLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-2 py-1 text-[11px] font-medium text-accent hover:border-accent hover:bg-[#f4f8ff] transition-colors"
        >
          <span className="text-[10px]">
            {link.kind === "email" ? "✉" : "in"}
          </span>
          {link.label}
        </a>
      ))}
      {introFacts.map((fact, index) => (
        <span
          key={`intro-${index}`}
          className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
          title={fact.status === "verified" ? "Verified intro path" : fact.status}
        >
          <span className="text-[10px]">↗</span>
          {fact.label}
          {fact.confidence !== undefined && (
            <span className="text-[9px] text-emerald-500">
              {Math.round(fact.confidence * 100)}%
            </span>
          )}
        </span>
      ))}
      {websiteFacts.map((fact, index) => (
        <a
          key={`web-${index}`}
          href={fact.value.startsWith("http") ? fact.value : `https://${fact.value}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-2 py-1 text-[11px] font-medium text-ink-soft hover:border-accent hover:text-accent transition-colors"
        >
          <span className="text-[10px]">🌐</span>
          {fact.label}
        </a>
      ))}
    </div>
  );
}

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
