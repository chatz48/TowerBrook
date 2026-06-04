import { notFound } from "next/navigation";
import Link from "next/link";
import { getTheme, THEME_SPECIALTIES, THEMES } from "@/lib/themes";
import {
  companiesWithLinks,
  expertsForTheme,
  getCompanies,
  themeStats,
} from "@/lib/data";
import { rankExperts } from "@/lib/score";
import { buildTowerBrookLens, towerBrookExpertScore } from "@/lib/towerbrook";
import { COMPANY_CATEGORY_LABEL, COMPANY_CATEGORY_STYLE } from "@/lib/labels";
import type { ThemeId } from "@/lib/types";
import ExpertList from "@/app/components/ExpertList";
import ThemeGraph from "@/app/components/ThemeGraph";
import { buildBrief } from "@/lib/brief";
import { Badge, BackLink, ConfidenceBars } from "@/app/components/ui";

export function generateStaticParams() {
  return THEMES.map((t) => ({ theme: t.id }));
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ theme: string }>;
}) {
  const { theme: themeId } = await params;
  const theme = getTheme(themeId);
  if (!theme) notFound();

  const id = theme.id as ThemeId;
  const stats = themeStats(id);
  const themeExperts = expertsForTheme(id);
  const ranked = rankExperts(themeExperts).map(({ expert, score }) => ({
    expert,
    score: score.total,
  }));
  const companies = companiesWithLinks(id);
  const allCompanies = getCompanies();
  const companyNames = Object.fromEntries(allCompanies.map((c) => [c.id, c.name]));
  const companiesById = new Map(allCompanies.map((c) => [c.id, c]));
  const brief = buildBrief(id);
  const towerBrookLens = buildTowerBrookLens(themeExperts, companies);
  const topExperts = brief.callList;
  const leadTarget =
    companies.find(
      (company) =>
        company.category === "target" &&
        company.ownershipStatus === "independent",
    ) ?? companies[0];
  const evidenceSources = new Set([
    ...themeExperts.flatMap((expert) => expert.sources.map((source) => source.url)),
    ...companies.flatMap((company) => company.sources.map((source) => source.url)),
  ]).size;
  const externalRelationshipExpert = towerBrookLens.workedWithExperts.find(
    (expert) => !expert.headline.toLowerCase().includes("towerbrook"),
  );
  const externalRelationshipCompany = towerBrookLens.workedWithCompanies.find(
    (company) => company.id !== "towerbrook",
  );
  const specialtyCounts = new Map<string, number>();
  for (const { expert } of ranked) {
    for (const specialty of expert.specialties ?? []) {
      specialtyCounts.set(specialty, (specialtyCounts.get(specialty) ?? 0) + 1);
    }
  }
  const clusters = [...specialtyCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const blankSpaces = THEME_SPECIALTIES[id]
    .filter((specialty) => !specialtyCounts.has(specialty))
    .slice(0, 5);

  // Graph data: only companies with at least one linked expert, so the
  // "derivation" is legible rather than a wall of orphan nodes.
  const graphCompanies = companies.filter((c) => c.expertCount > 0);
  const graphCompanyIds = new Set(graphCompanies.map((c) => c.id));
  const graphExperts = themeExperts;
  const graphLinks = graphExperts.flatMap((e) =>
    e.companies
      .filter((l) => graphCompanyIds.has(l.companyId))
      .map((l) => ({
        expertId: e.id,
        companyId: l.companyId,
        relationship: l.relationship,
      })),
  );

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <BackLink href="/">Back to Themes</BackLink>

        <header className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {theme.name}
            </h1>
            <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
              {theme.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-ink-faint">
              <span>Global</span>
              <span>Infrastructure</span>
              <span>{evidenceSources} unique source records</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="#experts" className="ee-button ee-button-primary">
              Review all experts
            </Link>
            <Link href="#companies" className="ee-button ee-button-secondary">
              Review targets
            </Link>
            <Link href="/discover" className="ee-button ee-button-secondary">
              Fill coverage gaps
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DecisionCard
            label="First call"
            title={topExperts[0]?.expert.name ?? "No expert mapped"}
            body={topExperts[0]?.whyNow ?? "Build expert coverage for this theme."}
            href={topExperts[0] ? `/experts/${topExperts[0].expert.id}` : "/discover"}
            action="Prepare call"
          />
          <DecisionCard
            label="Lead target"
            title={leadTarget?.name ?? "No target mapped"}
            body={
              leadTarget?.whyInteresting ??
              leadTarget?.description ??
              "Derive a target from expert evidence."
            }
            href={leadTarget ? `/companies/${leadTarget.id}` : "/companies"}
            action="Review evidence"
          />
          <DecisionCard
            label="Critical coverage gap"
            title={blankSpaces[0] ?? "No taxonomy gap identified"}
            body={
              blankSpaces[0]
                ? "No mapped expert currently covers this specialty."
                : "Review source freshness and relationship depth."
            }
            href="/discover"
            action="Run discovery"
          />
          <DecisionCard
            label="Existing relationship path"
            title={
              externalRelationshipExpert?.name ??
              externalRelationshipCompany?.name ??
              "No direct path mapped"
            }
            body={
              externalRelationshipExpert?.headline ??
              externalRelationshipCompany?.description ??
              "No TowerBrook relationship is evidenced in this theme."
            }
            href={
              externalRelationshipExpert?.href ??
              externalRelationshipCompany?.href ??
              "/graph"
            }
            action="Open path"
          />
        </section>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-[11px] text-ink-faint">
          <span className="ee-label text-ink">Coverage snapshot</span>
          <CoverageFact value={stats.expertCount} label="experts mapped" />
          <CoverageFact value={brief.stats.targets} label="independent targets" />
          <CoverageFact value={stats.companyCount} label="companies mapped" />
          <CoverageFact value={blankSpaces.length} label="taxonomy gaps" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_520px]">
          <div className="space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Call this week</h2>
                <Link href="#experts" className="text-[12px] text-accent">
                  View all
                </Link>
              </div>
              <table className="ee-table">
                <thead>
                  <tr>
                    <th className="w-14">#</th>
                    <th>Expert</th>
                    <th>Why call now</th>
                    <th>Companies they can unlock</th>
                    <th>Relationship path</th>
                    <th>Evidence</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {topExperts.map(({ expert, whyNow }, index) => {
                    const towerBrook = towerBrookExpertScore(expert, companiesById);
                    const linkedCompanyNames = expert.companies
                      .map((link) => companyNames[link.companyId] ?? link.companyId)
                      .slice(0, 3);
                    return (
                    <tr key={expert.id}>
                      <td>
                        <span className="inline-grid h-8 w-8 place-items-center rounded bg-[#f1f4f9] text-[16px] font-semibold text-accent">
                          {index + 1}
                        </span>
                      </td>
                      <td>
                        <Link href={`/experts/${expert.id}`} className="ee-link">
                          {expert.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-soft">
                          {expert.headline}
                        </div>
                      </td>
                      <td className="max-w-[300px] text-[11px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-3">{whyNow}</span>
                      </td>
                      <td className="max-w-[230px] text-[11px] text-ink-soft">
                        <span className="line-clamp-3">
                          {linkedCompanyNames.join(", ") || "No company edge mapped"}
                        </span>
                      </td>
                      <td>
                        <Badge
                          className={
                            towerBrook.isDirect
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-line bg-white text-ink-soft"
                          }
                        >
                          {towerBrook.isDirect ? towerBrook.label : "No internal path mapped"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-ink-soft">
                        {expert.sources.length} source{expert.sources.length === 1 ? "" : "s"}
                        {expert.news?.length ? ` · ${expert.news.length} dated signal${expert.news.length === 1 ? "" : "s"}` : ""}
                      </td>
                      <td>
                        <Link
                          href={`/experts/${expert.id}`}
                          className="ee-button ee-button-secondary min-h-8 px-3"
                        >
                          View profile
                        </Link>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Expert clusters</h2>
                <Link href="/graph" className="text-[12px] text-accent">
                  View graph
                </Link>
              </div>
              <table className="ee-table">
                <thead>
                  <tr>
                    <th>Cluster</th>
                    <th>Experts</th>
                    <th>Topic focus</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((cluster, index) => (
                    <tr key={cluster.name}>
                      <td>
                        <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-success text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        {cluster.name}
                      </td>
                      <td className="tabular-nums">{cluster.count}</td>
                      <td>
                        <ConfidenceBars value={Math.min(1, cluster.count / Math.max(1, clusters[0]?.count ?? 1))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Blank spaces</h2>
                <Link href="/discover" className="text-[12px] text-accent">
                  View all
                </Link>
              </div>
              <table className="ee-table">
                <thead>
                  <tr>
                    <th>Topic area</th>
                    <th>Geography</th>
                    <th>Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {blankSpaces.map((space, index) => (
                    <tr key={space}>
                      <td>{space}</td>
                      <td>{index % 2 === 0 ? "UK / Europe" : "North America"}</td>
                      <td className={index < 2 ? "text-danger" : "text-warning"}>
                        {index < 2 ? "High" : "Medium"}
                      </td>
                    </tr>
                  ))}
                  {blankSpaces.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-ink-faint">
                        No taxonomy-level gaps identified. Review source freshness and relationship depth next.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <p className="border-t border-line px-4 py-3 text-[12px] text-ink-faint">
                Blank spaces indicate limited expert coverage relative to the
                source register and theme taxonomy.
              </p>
            </section>
          </aside>
        </div>

        <section id="experts" className="mt-6">
          <ExpertList
            ranked={ranked}
            themeId={id}
            companyNames={companyNames}
            towerBrookScores={Object.fromEntries(
              themeExperts.map((expert) => {
                const score = towerBrookExpertScore(expert, companiesById);
                return [
                expert.id,
                {
                  score: score.score,
                  label: score.label,
                  isDirect: score.isDirect,
                },
              ];
              }),
            )}
          />
        </section>

        <section id="companies" className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="ee-panel overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="ee-label text-ink">Companies derived</h2>
              <span className="text-[12px] text-ink-faint">
                Ranked by expert density
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="ee-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Category</th>
                    <th>Expert links</th>
                    <th>Why surfaced</th>
                    <th>Sources</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.slice(0, 12).map((company) => (
                    <tr key={company.id}>
                      <td>
                        <Link href={`/companies/${company.id}`} className="ee-link">
                          {company.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {company.hq ?? company.ownershipStatus ?? "Mapped company"}
                        </div>
                      </td>
                      <td>
                        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                          {COMPANY_CATEGORY_LABEL[company.category]}
                        </Badge>
                      </td>
                      <td className="font-semibold tabular-nums">
                        {company.expertCount}
                      </td>
                      <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-2">
                          {company.whyInteresting ?? company.description}
                        </span>
                      </td>
                      <td>
                        {company.sources.slice(0, 3).map((source, i) => (
                          <a
                            key={`${source.url}-${i}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ee-link mr-1"
                          >
                            [{i + 1}]
                          </a>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ee-panel rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ee-label text-ink">Theme map preview</h2>
              <Link href="/graph" className="text-[12px] text-accent">
                Open graph explorer
              </Link>
            </div>
            <ThemeGraph
              accent={theme.accent}
              experts={graphExperts.map((e) => ({ id: e.id, name: e.name, type: e.type }))}
              companies={graphCompanies.map((c) => ({
                id: c.id,
                name: c.name,
                expertCount: c.expertCount,
              }))}
              links={graphLinks}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function DecisionCard({
  label,
  title,
  body,
  href,
  action,
}: {
  label: string;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <Link href={href} className="ee-panel rounded-lg p-5 hover:border-line-strong">
      <div className="ee-label text-ink-faint">{label}</div>
      <h2 className="mt-2 text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
        {body}
      </p>
      <span className="mt-4 inline-flex text-[12px] font-semibold text-accent">
        {action} →
      </span>
    </Link>
  );
}

function CoverageFact({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <span>
      <strong className="font-semibold tabular-nums text-ink">{value}</strong> {label}
    </span>
  );
}
