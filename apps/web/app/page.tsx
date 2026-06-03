import Link from "next/link";
import { THEMES } from "@/lib/themes";
import {
  companiesWithLinks,
  getCompanies,
  getExperts,
  expertsForTheme,
  themeStats,
} from "@/lib/data";
import { rankExperts } from "@/lib/score";
import { buildTowerBrookLens } from "@/lib/towerbrook";
import SearchBox, { type SearchItem } from "./components/SearchBox";
import TowerBrookFocus from "./components/TowerBrookFocus";
import { ConfidenceBars } from "./components/ui";

export default function Home() {
  const experts = getExperts();
  const companies = getCompanies();
  const towerBrookLens = buildTowerBrookLens(experts, companiesWithLinks());

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
        <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="ee-panel rounded-lg p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight">
                  Theme command center
                </h1>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                  Move from investment theme to ranked experts, surfaced
                  companies, relationship paths, call prep and memo outputs.
                  The graph is the database; sources are the evidence.
                </p>
              </div>
              <div className="min-w-[360px] max-xl:min-w-0">
                <SearchBox index={index} />
              </div>
            </div>
          </section>

          <section className="ee-panel rounded-lg p-5">
            <div className="ee-label text-ink">Workflow status</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatusMetric value={experts.length} label="experts" />
              <StatusMetric value={companies.length} label="companies" />
              <StatusMetric value={THEMES.length} label="themes" />
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/ask" className="ee-button ee-button-primary flex-1">
                Ask copilot
              </Link>
              <Link href="/discover" className="ee-button ee-button-secondary flex-1">
                Research jobs
              </Link>
            </div>
          </section>
        </div>

        <section className="mb-5">
          <TowerBrookFocus lens={towerBrookLens} />
        </section>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Investment themes</h2>
            <span className="text-[12px] text-ink-faint">Select a command center</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Theme</th>
                  <th>Experts</th>
                  <th>Companies</th>
                  <th>Top expert</th>
                  <th>Coverage</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {THEMES.map((theme) => {
                  const stats = themeStats(theme.id);
                  const top = rankExperts(expertsForTheme(theme.id))[0];
                  const coverage = Math.min(1, stats.expertCount / 16);
                  return (
                    <tr key={theme.id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[360px]">
                        <Link href={`/themes/${theme.id}`} className="ee-link text-[14px]">
                          {theme.name}
                        </Link>
                        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-soft">
                          {theme.description}
                        </p>
                      </td>
                      <td className="text-[18px] font-semibold tabular-nums">{stats.expertCount}</td>
                      <td className="text-[18px] font-semibold tabular-nums">{stats.companyCount}</td>
                      <td>
                        {top ? (
                          <Link href={`/experts/${top.expert.id}`} className="ee-link">
                            {top.expert.name}
                          </Link>
                        ) : (
                          <span className="text-ink-faint">None</span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-success">
                          {coverage > 0.75 ? "Strong" : "Developing"}
                        </div>
                        <ConfidenceBars value={coverage} />
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/themes/${theme.id}`} className="ee-button ee-button-primary min-h-8 px-3">
                            Open
                          </Link>
                          <Link href="/reports" className="ee-button ee-button-secondary min-h-8 px-3">
                            Memo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          {[
            ["Research Copilot", "Structured answers with ranked experts, companies, call sequence, risks and evidence.", "/ask"],
            ["Graph Explorer", "Traverse expert-to-company paths and inspect source-backed edge metadata.", "/graph"],
            ["Reports / Memo Builder", "Assemble sectioned, cited outputs with source register and export controls.", "/reports"],
          ].map(([title, body, href]) => (
            <Link key={title} href={href} className="ee-panel rounded-lg p-5 hover:border-line-strong">
              <div className="ee-label text-ink">{title}</div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{body}</p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-accent">
                Open →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

function StatusMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="text-[22px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-ink-faint">{label}</div>
    </div>
  );
}
