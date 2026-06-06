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
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { buildReport, type ReportModel } from "@/lib/report";
import type { Expert, ExpertType, ThemeId } from "@/lib/types";
import SearchBox, { type SearchItem } from "./components/SearchBox";
import ReportExportControls from "./components/reports/ReportExportControls";
import { Badge } from "./components/ui";

const CORE_ARCHETYPES: ExpertType[] = [
  "ex-founder",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "investor",
];

function coverageGaps(themeId: ThemeId, includeTowerBrookEmployees: boolean): string[] {
  const covered = new Set(
    filterTowerBrookEmployees(expertsForTheme(themeId), includeTowerBrookEmployees).flatMap(
      (expert) => expert.specialties ?? [],
    ),
  );
  return THEME_SPECIALTIES[themeId].filter((specialty) => !covered.has(specialty));
}

function isVerifiedExpert(expert: Expert) {
  return expert.confidence >= 0.75 && expert.sources.length > 0;
}

function isContactableExpert(expert: Expert) {
  return Boolean(expert.linkedin || expert.email);
}

function coverageMatrix(experts: Expert[]) {
  return CORE_ARCHETYPES.map((type) => {
    const archetypeExperts = experts.filter((expert) => expert.type === type);
    const verified = archetypeExperts.filter(isVerifiedExpert).length;
    const contactable = archetypeExperts.filter(isContactableExpert).length;
    const gap =
      archetypeExperts.length === 0 || verified === 0
        ? "high"
        : contactable < 2
          ? "medium"
          : "low";
    return {
      type,
      total: archetypeExperts.length,
      verified,
      contactable,
      gap,
    };
  });
}

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
  const matrixRows = coverageMatrix(experts);
  const gapCount = matrixRows.filter((row) => row.gap !== "low").length;
  const callReadyCount = experts.filter(
    (expert) => isVerifiedExpert(expert) && (isContactableExpert(expert) || expert.confidence >= 0.85),
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
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <section className="ee-panel rounded-lg p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <div className="ee-label text-accent">Command centre</div>
              <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
                Start with the next investment decision
              </h1>
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                Identify the people worth calling, the companies they can
                unlock, and the evidence or coverage gap that should shape the
                next diligence step.
              </p>
            </div>
            <SearchBox index={index} scopeLabel="Full expert and company graph" />
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

        <GuidedWorkflow
          themeLabel={currentThemeLabel}
          callReadyCount={Math.min(8, callReadyCount)}
          targetCount={Math.min(8, targetCount)}
          gapCount={gapCount}
          matrixRows={matrixRows}
        />

        <ThemeMemoPanel report={report} gapCount={gapCount} />

        <section className="mt-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight">Theme command centre</h2>
              <p className="mt-1 text-[12px] text-ink-soft">
                Open a theme with a first call, a lead target, and a known research gap.
              </p>
            </div>
            <Link href="/campaign" className="ee-button ee-button-secondary">
              Open origination desk
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

                  <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fbfcff] px-5 py-4">
                    <span className="text-[11px] text-ink-faint">
                      {brief.stats.targets} independent targets · {brief.stats.exits} acquired comps
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

function ThemeMemoPanel({
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
    <section id="theme-memo" className="mt-5 ee-panel overflow-hidden rounded-lg scroll-mt-28">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="ee-label text-accent">Theme memo</div>
              <h2 className="mt-2 text-[22px] font-semibold tracking-tight">
                {report.themeName} IC pack
              </h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                The memo is part of the Command Centre: it updates with the selected
                theme and packages saved work, sourced experts, target companies,
                evidence gaps and next actions into a partner-ready draft.
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${readinessClass}`}>
              {readiness}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MemoMetric label="Sources" value={report.stats.sources} detail={`${report.stats.highConfidenceSources} high confidence`} />
            <MemoMetric label="Experts" value={report.stats.experts} detail="Mapped into memo" />
            <MemoMetric label="Open gaps" value={gapCount + needsEvidence} detail="Research or source checks" />
          </div>

          <div className="mt-5 overflow-x-auto rounded-md border border-line">
            <table className="ee-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Memo section</th>
                  <th>Status</th>
                  <th>Evidence</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {report.sections.slice(0, 6).map((section) => (
                  <tr key={section.id}>
                    <td className="font-semibold">{section.title}</td>
                    <td>
                      <MemoStatusBadge status={section.status} />
                    </td>
                    <td className="text-[11px] text-ink-soft">
                      {section.citations.length} citation{section.citations.length === 1 ? "" : "s"} /
                      {" "}{Math.round(section.confidence * 100)}% confidence
                    </td>
                    <td className="text-[11px] text-ink-soft">
                      {section.actions[0] ?? "Review before circulation"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="border-t border-line bg-[#fbfcff] p-5 xl:border-l xl:border-t-0">
          <div className="ee-label text-ink">Use this memo</div>
          <div className="mt-4">
            <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
          </div>
          <div className="mt-4 grid gap-2">
            <Link href="/ask?prompt=Strengthen%20the%20current%20theme%20memo%20using%20saved%20experts%2C%20companies%20and%20source%20gaps" className="ee-button ee-button-primary w-full">
              Ask AI to strengthen
            </Link>
            <Link href="/discover" className="ee-button ee-button-secondary w-full">
              Create research tasks
            </Link>
            <Link href="/reports" className="ee-button ee-button-secondary w-full">
              Open full memo workspace
            </Link>
          </div>
          <div className="mt-5 rounded-md border border-line bg-white p-3">
            <div className="ee-label text-ink">What feeds it</div>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
              <li>Saved experts and target companies from the basket.</li>
              <li>AI Copilot notes that were saved back to the memo stream.</li>
              <li>Source-backed graph evidence and open research gaps.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MemoMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-[22px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
      <div className="mt-1 text-[11px] text-ink-faint">{detail}</div>
    </div>
  );
}

function MemoStatusBadge({ status }: { status: ReportModel["sections"][number]["status"] }) {
  const className =
    status === "Evidence-backed draft"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Ready for analyst review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>
      {status}
    </span>
  );
}

function GuidedWorkflow({
  themeLabel,
  callReadyCount,
  targetCount,
  gapCount,
  matrixRows,
}: {
  themeLabel: string;
  callReadyCount: number;
  targetCount: number;
  gapCount: number;
  matrixRows: ReturnType<typeof coverageMatrix>;
}) {
  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <div className="ee-panel rounded-lg p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="ee-label text-ink">Guided investment workflow</div>
            <h2 className="mt-2 max-w-2xl text-[22px] font-semibold tracking-tight">
              What do you need by the next IC / Monday meeting?
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
              Pick the job. The app carries the theme scope, saved work, evidence state,
              call targets and company validation steps through the workflow.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-paper px-3 py-2 text-[11px] font-semibold text-ink-soft">
            Scoped to {themeLabel}
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <WorkflowCard
            step="01"
            title="Build my call list"
            body={`${callReadyCount || 8} call-ready or contact-verification experts, sequenced by evidence and company edges.`}
            href="/campaign"
            action="Start plan"
          />
          <WorkflowCard
            step="02"
            title="Show target companies"
            body={`${targetCount || 8} priority targets with PE scorecards, ownership checks and linked experts.`}
            href="/campaign#targets"
            action="Add targets"
          />
          <WorkflowCard
            step="03"
            title="Fill coverage gaps"
            body={`${gapCount} expert archetype gap${gapCount === 1 ? "" : "s"} need more research before the map is complete.`}
            href="/discover"
            action="Open queue"
          />
          <WorkflowCard
            step="04"
            title="Prepare meeting pack"
            body="Convert sources, calls, targets, gaps and next steps into the theme memo."
            href="#theme-memo"
            action="Review memo"
          />
        </div>
      </div>

      <div className="ee-panel overflow-hidden rounded-lg">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="ee-label text-ink">Coverage matrix</h2>
            <p className="mt-1 text-[11px] text-ink-faint">
              Completeness by expert archetype.
            </p>
          </div>
          <Link href="/discover" className="shrink-0 text-[12px] font-semibold text-accent">
            Research gaps
          </Link>
        </div>
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
                  <td className="font-semibold">{EXPERT_TYPE_LABEL[row.type]}</td>
                  <td className="tabular-nums">{row.total}</td>
                  <td className="tabular-nums">{row.verified}</td>
                  <td className="tabular-nums">{row.contactable}</td>
                  <td>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        row.gap === "high"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : row.gap === "medium"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {row.gap}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function WorkflowCard({
  step,
  title,
  body,
  href,
  action,
}: {
  step: string;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group block min-h-[190px] rounded-lg border border-line bg-white p-4 transition-colors hover:border-line-strong hover:bg-[#fbfcff]"
    >
      <div className="text-[11px] font-semibold tracking-[0.12em] text-accent">
        {step}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-4 text-[12px] font-semibold text-accent group-hover:underline">
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
