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
import PointOfView from "@/app/components/PointOfView";
import TowerBrookFocus from "@/app/components/TowerBrookFocus";
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
  const topExperts = ranked.slice(0, 5);
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
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-semibold tracking-tight">
                {theme.name}
              </h1>
              <span className="text-muted" aria-hidden="true">
                ☆
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
              {theme.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-ink-faint">
              <span>Global</span>
              <span>Infrastructure</span>
              <span>Updated June 2, 2026</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/reports" className="ee-button ee-button-primary">
              Build call plan
            </Link>
            <Link href="/reports" className="ee-button ee-button-secondary">
              Expert memo
            </Link>
            <Link href="/discover" className="ee-button ee-button-secondary">
              Discovery queue
            </Link>
          </div>
        </header>

        <section className="ee-panel mt-6 grid rounded-lg sm:grid-cols-2 lg:grid-cols-6">
          <ThemeMetric label="Experts mapped" value={stats.expertCount} sub="Across archetypes" />
          <ThemeMetric label="Actionable targets" value={brief.stats.targets} sub="Independent companies" />
          <ThemeMetric label="Recent exits (3Y)" value={brief.stats.exits} sub="Sourced exit comps" />
          <ThemeMetric label="Advisors" value={brief.stats.advisers} sub="Active on this theme" />
          <ThemeMetric label="Companies mapped" value={stats.companyCount} sub={`${companies[0]?.expertCount ?? 0} on top company`} />
          <ThemeMetric label="TowerBrook score" value={towerBrookLens.score} sub="Relationship lens" />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_520px]">
          <div className="space-y-5">
            <PointOfView brief={brief} />

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
                    <th>Relevance</th>
                    <th>Momentum</th>
                    <th>Access</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {topExperts.map(({ expert, score }, index) => (
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
                      <td>
                        <span className="font-semibold tabular-nums text-success">
                          {score}
                        </span>
                        <div className="mt-1">
                          <ConfidenceBars value={Math.min(1, score / 120)} />
                        </div>
                      </td>
                      <td className="text-success">
                        {expert.news?.length || expert.signals?.length ? "High" : "Medium"}
                      </td>
                      <td>
                        <Badge
                          className={
                            expert.access === "proprietary"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-line bg-white text-ink-soft"
                          }
                        >
                          {expert.access === "proprietary" ? "Warm" : "Known"}
                        </Badge>
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
                  ))}
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
                  {(blankSpaces.length ? blankSpaces : THEME_SPECIALTIES[id].slice(-5)).map((space, index) => (
                    <tr key={space}>
                      <td>{space}</td>
                      <td>{index % 2 === 0 ? "UK / Europe" : "North America"}</td>
                      <td className={index < 2 ? "text-danger" : "text-warning"}>
                        {index < 2 ? "High" : "Medium"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line px-4 py-3 text-[12px] text-ink-faint">
                Blank spaces indicate limited expert coverage relative to the
                source register and theme taxonomy.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-6">
          <TowerBrookFocus lens={towerBrookLens} scopeLabel={theme.name} />
        </section>

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

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
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

function ThemeMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="border-b border-r border-line px-5 py-4 last:border-r-0 lg:border-b-0">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[12px] text-ink-soft">{sub}</div>
    </div>
  );
}
