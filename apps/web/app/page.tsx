import Link from "next/link";
import { THEMES } from "@/lib/themes";
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
import { buildReport, type ReportModel } from "@/lib/report";
import {
  expertReadiness,
  coverageMatrix,
  themeGapSummary,
} from "@/lib/investment-readiness";
import type { ThemeId } from "@/lib/types";
import SearchBox, { type SearchItem } from "./components/SearchBox";
import ReportExportControls from "./components/reports/ReportExportControls";
import { Badge, PageShell } from "./components/ui";

export default async function Home() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const report = await buildReport(themeFocus, includeTowerBrookEmployees);
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
  const matrixRows = coverageMatrix(themeFocus, includeTowerBrookEmployees);
  const gapCount = matrixRows.filter((row) => row.gapSeverity !== "low").length;
  const callReadyCount = experts.filter(
    (expert) => {
      const readiness = expertReadiness(expert);
      return readiness.level === "call-ready" || readiness.level === "verify-contact";
    },
  ).length;
  const targetCount = linkedCompanies.filter(
    (company) =>
      company.category === "target" &&
      company.ownershipStatus !== "acquired",
  ).length;
  const currentThemeLabel =
    themeFocus === "all"
      ? "All three themes"
      : visibleThemes[0]?.name ?? "Selected theme";
  const searchExperts = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  const searchCompanies = getCompanies();

  const index: SearchItem[] = [
    ...searchExperts.map((expert) => ({
      id: expert.id,
      name: expert.name,
      sub: expert.headline,
      kind: "expert" as const,
      href: `/experts/${expert.id}`,
      keywords: `${expert.name} ${expert.headline} ${expert.org ?? ""} ${expert.whyRelevant}`.toLowerCase(),
    })),
    ...searchCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      sub: company.description,
      kind: "company" as const,
      href: `/companies/${company.id}`,
      keywords: `${company.name} ${company.description}`.toLowerCase(),
    })),
  ];

  return (
    <PageShell>
        <section className="ee-panel rounded-lg px-3 py-2 sm:px-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className="ee-label text-accent">Command Centre</div>
              <h1 className="truncate text-[13px] font-semibold tracking-tight text-ink">
                Next investment decision
              </h1>
              <p className="truncate text-[11px] text-ink-soft">
                Find people, companies, and diligence gaps.
              </p>
            </div>
            <div className="w-full md:w-[360px] lg:w-[430px]">
              <SearchBox index={index} scopeLabel="" compact />
            </div>
          </div>
        </section>

        <GuidedWorkflow
          themeLabel={currentThemeLabel}
          callReadyCount={Math.min(8, callReadyCount)}
          targetCount={Math.min(8, targetCount)}
          gapCount={gapCount}
          matrixRows={matrixRows}
          themeFocus={themeFocus}
        />

        <BlankSpacesCard
          matrixRows={matrixRows}
          themeFocus={themeFocus}
          visibleThemes={visibleThemes}
        />

        <details className="mt-4 ee-panel rounded-lg">
          <summary className="cursor-pointer list-none px-4 py-3 marker:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="ee-label text-ink">Coverage snapshot</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-faint">
                  <CoverageFact value={experts.length} label="expert profiles" />
                  <CoverageFact value={companies.length} label="companies" />
                  <CoverageFact value={sourceCount} label="source records" />
                  <CoverageFact
                    value={directExperts.length + directCompanies.length}
                    label="public TowerBrook paths"
                  />
                </div>
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-accent">Expand</span>
            </div>
          </summary>
          <div className="border-t border-line px-4 pb-4 pt-1.5 text-[11px] text-ink-soft">
            Use the guided workflow above for your next move. Expand this panel when you need
            coverage counts before an IC or partner meeting.
          </div>
        </details>

        <MemoSummaryCard report={report} gapCount={gapCount} />

        <section className="mt-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Your week across themes</h2>
              <p className="mt-0.5 text-[11px] text-ink-soft">
                Top call, lead target, and coverage gap per theme.
              </p>
            </div>
            <Link href="/campaign" className="ee-button ee-button-secondary">
              Open origination
            </Link>
          </div>

          <div className={`grid gap-4 ${visibleThemes.length > 1 ? "xl:grid-cols-3" : ""}`}>
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
              const gap = themeGapSummary(theme.id, expertsForTheme(theme.id))[0];

              return (
                <article
                  key={theme.id}
                  className="ee-panel overflow-hidden rounded-lg border-t-2"
                  style={{ borderTopColor: theme.accent }}
                >
                  <div className="border-b border-line p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[15px] font-semibold tracking-tight">
                          {theme.name}
                        </h3>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
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
                      href={firstCall ? `/experts/${firstCall.expert.id}` : "/ask"}
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
                      label={gap ? "Coverage gap" : "Coverage check"}
                      title={gap ?? "No taxonomy gap flagged"}
                      body={
                        gap
                          ? "No mapped expert currently covers this specialty."
                          : "Review source freshness and relationship depth."
                      }
                      href={`/ask?prompt=${encodeURIComponent(`Find experts for ${gap ?? "source freshness"}`)}`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fbfcff] px-4 py-3">
                    <span className="text-[11px] text-ink-faint">
                      {brief.stats.targets} independent targets · {brief.stats.exits} acquired comparables
                    </span>
                    <Link
                      href="/campaign"
                      className="ee-button ee-button-primary min-h-8 px-3"
                    >
                      Start plan
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
    </PageShell>
  );
}

function CoverageFact({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <strong className="font-semibold tabular-nums text-ink">{value}</strong> {label}
    </span>
  );
}

function MemoSummaryCard({
  report,
  gapCount,
}: {
  report: ReportModel;
  gapCount: number;
}) {
  const needsEvidence = report.sections.filter((section) =>
    section.status === "Needs source confirmation",
  ).length;
  const reviewCount = report.sections.filter((section) =>
    section.status !== "Evidence-backed draft",
  ).length;
  const readiness =
    needsEvidence > 0 ? "Missing evidence" : reviewCount > 0 ? "Needs review" : "Ready";
  const readinessClass =
    readiness === "Ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : readiness === "Needs review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <section id="theme-memo" className="mt-4 ee-panel rounded-lg p-4 scroll-mt-28">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="ee-label text-accent">Theme memo</div>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight">
            Your IC pack is ready
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-ink-soft">
            {report.sections.length} sections · {report.stats.highConfidenceSources} high-confidence
            sources · {report.stats.experts} experts mapped · {gapCount + needsEvidence} open gaps
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${readinessClass}`}>
          {readiness}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/reports" className="ee-button ee-button-primary">
          Open full memo
        </Link>
        <Link href="/ask?prompt=Strengthen%20the%20current%20theme%20memo" className="ee-button ee-button-secondary">
          Ask AI to strengthen
        </Link>
        <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
      </div>
    </section>
  );
}

function BlankSpacesCard({
  matrixRows,
  themeFocus,
  visibleThemes,
}: {
  matrixRows: ReturnType<typeof coverageMatrix>;
  themeFocus: ThemeId | "all";
  visibleThemes: typeof THEMES;
}) {
  const openGaps = matrixRows.filter((row) => row.gapSeverity !== "low");
  const themeLabel =
    themeFocus === "all" ? "across all themes" : visibleThemes[0]?.name ?? "this theme";

  return (
    <section className="mt-4 ee-panel rounded-lg p-4">
      <div className="ee-label text-ink">Where we&apos;re thin</div>
      <h2 className="mt-1 text-[15px] font-semibold tracking-tight">Coverage gaps to close</h2>
      <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-ink-soft">
        {openGaps.length ? (
          openGaps.slice(0, 4).map((row) => (
            <li key={row.type} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2">
              <span>
                <strong className="text-ink">{row.label}</strong> coverage is {row.gapSeverity}:
                {" "}{row.verified} verified / {row.contactable} contactable {themeLabel}
              </span>
              <Link
                href={`/discover?gap=${encodeURIComponent(row.label)}`}
                className="ee-link text-[12px] font-semibold"
              >
                Find experts
              </Link>
            </li>
          ))
        ) : (
          <li className="rounded-md border border-line bg-white px-3 py-2">
            Core archetypes are covered {themeLabel}. Review source freshness before IC circulation.
          </li>
        )}
      </ul>
    </section>
  );
}

function GuidedWorkflow({
  themeLabel,
  callReadyCount,
  targetCount,
  gapCount,
  matrixRows,
  themeFocus,
}: {
  themeLabel: string;
  callReadyCount: number;
  targetCount: number;
  gapCount: number;
  matrixRows: ReturnType<typeof coverageMatrix>;
  themeFocus: ThemeId | "all";
}) {
  const themeQuery = themeFocus === "all" ? "" : `?theme=${themeFocus}`;
  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(400px,0.92fr)]">
      <div className="ee-panel rounded-lg border-2 border-accent/20 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="ee-label text-ink">Guided investment workflow</div>
            <h2 className="mt-1 max-w-2xl text-[16px] font-semibold tracking-tight">
              What do you need by the next IC / Monday meeting?
            </h2>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-ink-soft">
              Pick the job. Your theme scope, saved work, and call targets stay with you
              across every step.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1.5 text-[10px] font-semibold text-ink-soft">
            Scoped to {themeLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-4">
          <WorkflowCard
            step="01"
            title="Build my call list"
            body={`${callReadyCount || 8} call-ready or contact-verification experts, sequenced by evidence and company edges.`}
            href={`/experts${themeQuery}${themeQuery ? "&" : "?"}readiness=actionable`}
            action="Start plan"
            primary
          />
          <WorkflowCard
            step="02"
            title="Show target companies"
            body={`${targetCount || 8} priority targets with PE scorecards, ownership checks and linked experts.`}
            href={`/companies${themeQuery}${themeQuery ? "&" : "?"}category=target`}
            action="Add targets"
          />
          <WorkflowCard
            step="03"
            title="Fill coverage gaps"
            body={
              gapCount === 1
                ? "1 expert archetype gap needs more research before the map is complete."
                : `${gapCount} expert archetype gaps need more research before the map is complete.`
            }
            href={`/discover${themeQuery}${themeQuery ? "&" : "?"}severity=high`}
            action="Open queue"
          />
          <WorkflowCard
            step="04"
            title="Prepare meeting pack"
            body="Assemble sources, calls, targets, gaps and next steps into the theme memo."
            href="/reports"
            action="Review memo"
          />
        </div>
      </div>

      <details className="ee-panel overflow-hidden rounded-lg">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 border-b border-line px-4 py-3 marker:hidden">
          <div>
            <h2 className="ee-label text-ink">Coverage matrix</h2>
            <p className="mt-1 text-[11px] text-ink-faint">
              Completeness by expert archetype — expand when needed.
            </p>
          </div>
          <span className="shrink-0 text-[12px] font-semibold text-accent">Expand</span>
        </summary>
        <div className="overflow-x-auto">
          <table className="ee-table min-w-[520px]">
            <thead>
              <tr>
                <th>Archetype</th>
                <th>Total</th>
                <th>Verified</th>
                <th>Contactable</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.type}>
                  <td className="font-semibold">{row.label}</td>
                  <td className="tabular-nums">{row.total}</td>
                  <td className="tabular-nums">{row.verified}</td>
                  <td className="tabular-nums">{row.contactable}</td>
                  <td>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        row.gapSeverity === "high"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : row.gapSeverity === "medium"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {row.gapSeverity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function WorkflowCard({
  step,
  title,
  body,
  href,
  action,
  primary = false,
}: {
  step: string;
  title: string;
  body: string;
  href: string;
  action: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-lg border bg-white p-3 transition-colors hover:border-line-strong hover:bg-[#fbfcff] ${
        primary ? "border-accent/40 shadow-sm" : "border-line"
      }`}
    >
      <div className="text-[10px] font-semibold tracking-[0.12em] text-accent">
        {step}
      </div>
      <h3 className="mt-2 text-[13px] font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-3 text-[12px] font-semibold text-accent group-hover:underline">
        {action}{" "}-&gt;
      </div>
    </Link>
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
