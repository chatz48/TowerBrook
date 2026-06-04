import Link from "next/link";
import { THEME_SPECIALTIES, THEMES } from "@/lib/themes";
import {
  companiesWithLinks,
  getCompanies,
  getExperts,
  expertsForTheme,
} from "@/lib/data";
import { buildBrief } from "@/lib/brief";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import {
  isTowerBrookWorkedWithCompany,
  isTowerBrookWorkedWithExpert,
} from "@/lib/towerbrook";
import type { ThemeId } from "@/lib/types";
import SearchBox, { type SearchItem } from "./components/SearchBox";
import { Badge } from "./components/ui";

function coverageGaps(themeId: ThemeId, includeTowerBrookEmployees: boolean): string[] {
  const covered = new Set(
    filterTowerBrookEmployees(expertsForTheme(themeId), includeTowerBrookEmployees).flatMap(
      (expert) => expert.specialties ?? [],
    ),
  );
  return THEME_SPECIALTIES[themeId].filter((specialty) => !covered.has(specialty));
}

export default async function Home() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const experts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
    includeTowerBrookEmployees,
  );
  const companies = getCompanies().filter((company) => matchesThemeFocus(company.themes, themeFocus));
  const linkedCompanies = companiesWithLinks(
    themeFocus === "all" ? undefined : themeFocus,
    includeTowerBrookEmployees,
  );
  const visibleThemes = THEMES.filter((theme) => themeFocus === "all" || theme.id === themeFocus);
  const directCompanies = linkedCompanies.filter(
    (company) => company.id !== "towerbrook" && isTowerBrookWorkedWithCompany(company),
  );
  const directExperts = experts.filter(
    (expert) => isTowerBrookWorkedWithExpert(expert),
  );
  const sourceCount = new Set([
    ...experts.flatMap((expert) => expert.sources.map((source) => source.url)),
    ...companies.flatMap((company) => company.sources.map((source) => source.url)),
  ]).size;

  const index: SearchItem[] = [
    ...experts.map((expert) => ({
      id: expert.id,
      name: expert.name,
      sub: expert.headline,
      kind: "expert" as const,
      href: `/experts/${expert.id}`,
      keywords: `${expert.name} ${expert.headline} ${expert.org ?? ""} ${expert.whyRelevant}`.toLowerCase(),
    })),
    ...companies.map((company) => ({
      id: company.id,
      name: company.name,
      sub: company.description,
      kind: "company" as const,
      href: `/companies/${company.id}`,
      keywords: `${company.name} ${company.description}`.toLowerCase(),
    })),
  ];

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <section className="ee-panel rounded-lg p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <div className="ee-label text-accent">Origination desk</div>
              <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
                Start with the next investment decision
              </h1>
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                Identify the people worth calling, the companies they can
                unlock, and the evidence or coverage gap that should shape the
                next diligence step.
              </p>
            </div>
            <SearchBox index={index} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[11px] text-ink-faint">
            <span className="ee-label text-ink">Coverage snapshot</span>
            <CoverageFact value={experts.length} label="expert profiles" />
            <CoverageFact value={companies.length} label="companies" />
            <CoverageFact value={sourceCount} label="source records" />
            <CoverageFact
              value={directExperts.length + directCompanies.length}
              label="public TowerBrook paths"
            />
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight">Theme command centers</h2>
              <p className="mt-1 text-[12px] text-ink-soft">
                Open a theme with a first call, a lead target, and a known research gap.
              </p>
            </div>
            <Link href="/discover" className="ee-button ee-button-secondary">
              Review discovery queue
            </Link>
          </div>

          <div className={`grid gap-5 ${visibleThemes.length > 1 ? "xl:grid-cols-3" : ""}`}>
            {visibleThemes.map((theme) => {
              const brief = buildBrief(theme.id, includeTowerBrookEmployees);
              const themeCompanies = companiesWithLinks(theme.id, includeTowerBrookEmployees);
              const firstCall = brief.callList[0];
              const leadTarget =
                themeCompanies.find(
                  (company) =>
                    company.category === "target" &&
                    company.ownershipStatus === "independent",
                ) ?? themeCompanies[0];
              const gap = coverageGaps(theme.id, includeTowerBrookEmployees)[0];

              return (
                <article
                  key={theme.id}
                  className="ee-panel overflow-hidden rounded-lg border-t-2"
                  style={{ borderTopColor: theme.accent }}
                >
                  <div className="border-b border-line p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[17px] font-semibold tracking-tight">
                          {theme.name}
                        </h3>
                        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                          {theme.description}
                        </p>
                      </div>
                      <Badge className="shrink-0 border-line bg-paper text-ink-soft">
                        {brief.stats.experts} experts
                      </Badge>
                    </div>
                  </div>

                  <div className="divide-y divide-line">
                    <DecisionRow
                      label="First call"
                      title={firstCall?.expert.name ?? "No expert mapped"}
                      body={firstCall?.whyNow ?? "Build expert coverage for this theme."}
                      href={firstCall ? `/experts/${firstCall.expert.id}` : "/discover"}
                    />
                    <DecisionRow
                      label="Lead target"
                      title={leadTarget?.name ?? "No target mapped"}
                      body={
                        leadTarget?.whyInteresting ??
                        leadTarget?.description ??
                        "Derive a company from expert evidence."
                      }
                      href={leadTarget ? `/companies/${leadTarget.id}` : "/companies"}
                    />
                    <DecisionRow
                      label="Coverage gap"
                      title={gap ?? "No taxonomy gap identified"}
                      body={
                        gap
                          ? "No mapped expert currently covers this specialty."
                          : "Review source freshness and relationship depth."
                      }
                      href="/discover"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fbfcff] px-5 py-4">
                    <span className="text-[11px] text-ink-faint">
                      {brief.stats.targets} independent targets · {brief.stats.exits} acquired comps
                    </span>
                    <Link
                      href={`/themes/${theme.id}`}
                      className="ee-button ee-button-primary min-h-8 px-3"
                    >
                      Open theme
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <RelationshipPanel
            title="Existing company paths"
            description="Portfolio companies and transaction advisors already connected to TowerBrook."
            items={directCompanies.slice(0, 6).map((company) => ({
              name: company.name,
              detail:
                company.whyInteresting ??
                company.description,
              href: `/companies/${company.id}`,
            }))}
            actionHref="/companies"
            actionLabel="Review all companies"
          />
          <RelationshipPanel
            title="Existing people paths"
            description="TowerBrook team members, portfolio operators, and transaction advisors in the graph."
            items={directExperts.slice(0, 6).map((expert) => ({
              name: expert.name,
              detail: expert.headline,
              href: `/experts/${expert.id}`,
            }))}
            actionHref="/experts"
            actionLabel="Review all experts"
          />
        </section>
      </div>
    </div>
  );
}

function CoverageFact({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <strong className="font-semibold tabular-nums text-ink">{value}</strong> {label}
    </span>
  );
}

function DecisionRow({
  label,
  title,
  body,
  href,
}: {
  label: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="block px-5 py-4 hover:bg-[#fbfcff]">
      <div className="ee-label text-ink-faint">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-ink">{title}</div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
        {body}
      </p>
    </Link>
  );
}

function RelationshipPanel({
  title,
  description,
  items,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  items: { name: string; detail: string; href: string }[];
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="ee-panel overflow-hidden rounded-lg">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="ee-label text-ink">{title}</h2>
          <p className="mt-1 text-[11px] text-ink-faint">{description}</p>
        </div>
        <Link href={actionHref} className="shrink-0 text-[12px] font-semibold text-accent">
          {actionLabel}
        </Link>
      </div>
      <div className="grid sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border-b border-line px-5 py-4 odd:sm:border-r hover:bg-[#fbfcff]"
          >
            <div className="text-[13px] font-semibold text-ink">{item.name}</div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
              {item.detail}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
