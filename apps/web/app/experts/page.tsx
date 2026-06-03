import Link from "next/link";
import { getExperts, getCompanies } from "@/lib/data";
import { rankExperts } from "@/lib/score";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { ConfidenceBars } from "@/app/components/ui";

export default function ExpertsPage() {
  const companies = getCompanies();
  const companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const ranked = rankExperts(getExperts());

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Expert Explorer</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Ranked people across all themes, with transparent graph scoring,
              source confidence, momentum and company connections.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/ask" className="ee-button ee-button-secondary">
              Ask over experts
            </Link>
            <Link href="/reports" className="ee-button ee-button-primary">
              Build call plan
            </Link>
          </div>
        </header>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">All experts ({ranked.length})</h2>
            <span className="text-[12px] text-ink-faint">Sorted by base priority</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Expert</th>
                  <th>Archetype</th>
                  <th>Themes</th>
                  <th>Score</th>
                  <th>TowerBrook</th>
                  <th>Momentum</th>
                  <th>Access</th>
                  <th>Connected companies</th>
                  <th>Sources</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ expert, score }, index) => {
                  const towerBrook = towerBrookExpertScore(expert, companiesById);
                  return (
                    <tr key={expert.id} className="hover:bg-[#fbfcff]">
                      <td>
                        <span className="inline-grid h-8 w-8 place-items-center rounded bg-[#f1f4f9] text-[16px] font-semibold text-accent">
                          {index + 1}
                        </span>
                      </td>
                      <td className="min-w-[230px]">
                        <Link href={`/experts/${expert.id}`} className="ee-link">
                          {expert.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-soft">
                          {expert.headline}
                        </div>
                      </td>
                      <td>{EXPERT_TYPE_LABEL[expert.type]}</td>
                      <td className="text-[11px] text-ink-soft">
                        {expert.themes.join(", ")}
                      </td>
                      <td>
                        <div className="font-semibold tabular-nums">{score.total}</div>
                        <ConfidenceBars value={Math.min(1, score.total / 120)} />
                      </td>
                      <td>
                        <div
                          className={`font-semibold tabular-nums ${
                            towerBrook.isDirect ? "text-success" : "text-ink"
                          }`}
                        >
                          {towerBrook.score}
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {towerBrook.label}
                        </div>
                        <ConfidenceBars value={towerBrook.score / 100} />
                      </td>
                      <td className={score.recency || score.signals ? "text-success" : "text-warning"}>
                        {score.recency || score.signals ? "High" : "Medium"}
                      </td>
                      <td>{expert.access === "proprietary" ? "Warm" : "Known"}</td>
                      <td className="max-w-[260px]">
                        <span className="line-clamp-2">
                          {expert.companies.map((link) => companyNames[link.companyId] ?? link.companyId).join(", ")}
                        </span>
                      </td>
                      <td>
                        {expert.sources.slice(0, 4).map((source, i) => (
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
