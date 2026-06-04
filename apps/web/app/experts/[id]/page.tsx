import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, getExperts, getExpert, resolveExpert } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate } from "@/lib/deals";
import { listDealsForExpert } from "@/lib/deal-repository";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import {
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import {
  Badge,
  BackLink,
  Chip,
  NewsFeed,
  SourceLinks,
  ThemeTag,
} from "@/app/components/ui";
import ExpertActions from "@/app/components/ExpertActions";

export function generateStaticParams() {
  return getExperts().map((e) => ({ id: e.id }));
}

export default async function ExpertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const base = getExpert(id);
  if (!base) notFound();
  const expert = resolveExpert(base);
  const companiesById = new Map(getCompanies().map((company) => [company.id, company]));
  const towerBrook = towerBrookExpertScore(base, companiesById);
  const relatedDeals = await listDealsForExpert(expert.id);
  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <BackLink href={`/themes/${expert.themes[0]}`}>Back to experts</BackLink>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-5">
            <header className="ee-panel rounded-lg p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-semibold tracking-tight">
                      {expert.name}
                    </h1>
                    <Badge className={EXPERT_TYPE_STYLE[expert.type]}>
                      {EXPERT_TYPE_LABEL[expert.type]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[15px] font-medium text-ink-soft">
                    {expert.headline}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-ink-faint">
                    {expert.org ? <span>{expert.org}</span> : null}
                    {expert.location ? <span>{expert.location}</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expert.themes.map((t) => (
                      <ThemeTag key={t} id={t} small />
                    ))}
                    {expert.specialties?.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                </div>
                <div className="min-w-[360px] rounded-lg border border-line bg-[#fbfcff] p-4 max-lg:min-w-0">
                  <div className="ee-label text-ink">Next action</div>
                  <div className="mt-2 text-[15px] font-semibold text-ink">
                    Prepare a source-backed call with {expert.name.split(" ")[0]}
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                    {expert.resolvedCompanies.length} company edge{expert.resolvedCompanies.length === 1 ? "" : "s"},
                    {" "}{expert.sources.length} source record{expert.sources.length === 1 ? "" : "s"},
                    {" "}and {towerBrook.isDirect ? towerBrook.label : "no public TowerBrook path mapped"}.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <a href="#call-actions" className="ee-button ee-button-primary min-h-8 px-3">
                      Prepare call
                    </a>
                    <Link href="/graph" className="ee-button ee-button-secondary min-h-8 px-3">
                      Show path
                    </Link>
                    <Link href="/reports" className="ee-button ee-button-secondary min-h-8 px-3">
                      Use in report
                    </Link>
                  </div>
                </div>
              </div>
            </header>

            <section className="ee-panel rounded-lg">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Why call {expert.name.split(" ")[0]}</h2>
                <a href="#sources" className="text-[12px] font-semibold text-accent">Review sources</a>
              </div>
              <div className="px-5 py-4">
                <ul className="space-y-2 text-[13px] leading-relaxed text-ink">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                    <span>{expert.whyRelevant}</span>
                  </li>
                  {expert.bio ? (
                    <li className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                      <span>{expert.bio}</span>
                    </li>
                  ) : null}
                  {expert.signals?.slice(0, 2).map((signal) => (
                    <li key={signal} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-success" />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Company / deal connections ({expert.resolvedCompanies.length})</h2>
              </div>
              <table className="ee-table">
                <thead>
                  <tr>
                    <th>Company / deal</th>
                    <th>Relationship</th>
                    <th>Evidence</th>
                    <th>Evidence coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {expert.resolvedCompanies.map((rc) => (
                    <tr key={`${rc.company.id}-${rc.relationship}`}>
                      <td>
                        <Link href={`/companies/${rc.company.id}`} className="ee-link">
                          {rc.company.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {rc.company.category}
                        </div>
                      </td>
                      <td>{RELATIONSHIP_LABEL[rc.relationship]}</td>
                      <td className="max-w-[320px] text-[12px] text-ink-soft">
                        {rc.note ?? rc.company.whyInteresting ?? rc.company.description}
                      </td>
                      <td className="text-[11px] text-ink-soft">
                        {rc.company.sources.length} company source{rc.company.sources.length === 1 ? "" : "s"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {expert.news?.length ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="mb-3 ee-label text-ink">News & momentum signals</div>
                <NewsFeed items={expert.news} />
              </section>
            ) : null}

            {relatedDeals.length ? (
              <section className="ee-panel overflow-hidden rounded-lg">
                <div className="border-b border-line px-4 py-3">
                  <h2 className="ee-label text-ink">Deal involvement ({relatedDeals.length})</h2>
                </div>
                <table className="ee-table">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Why call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedDeals.map((deal) => {
                      const partyRole =
                        deal.parties.find((party) => party.personId === expert.id)?.role ??
                        "surfaced expert";
                      return (
                        <tr key={deal.id}>
                          <td>
                            <Link href={`/deals/${deal.id}`} className="ee-link">
                              {deal.name}
                            </Link>
                            <div className="mt-0.5 text-[11px] text-ink-faint">
                              Completeness {Math.round(deal.completionScore * 100)}%
                            </div>
                          </td>
                          <td>{partyRole.replaceAll("-", " ")}</td>
                          <td>{DEAL_TYPE_LABEL[deal.dealType]}</td>
                          <td>{dealDate(deal) ?? "Missing"}</td>
                          <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                            Ask who advised the deal, what diligence mattered, and which similar companies should be mapped next.
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}

          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Relationship path</div>
              <div className="mt-3 text-[14px] font-semibold">
                {towerBrook.isDirect ? towerBrook.label : "No public TowerBrook path mapped"}
              </div>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {(towerBrook.isDirect && towerBrook.reasons.length
                  ? towerBrook.reasons
                  : ["Use sourced outreach or verify an introduction path through public deal evidence."]
                ).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </section>
            <div id="call-actions">
              <ExpertActions expertId={expert.id} expertName={expert.name} />
            </div>
            <section className="ee-panel rounded-lg p-5" id="sources">
              <div className="mb-3 ee-label text-ink">Sources used</div>
              <SourceLinks sources={expert.sources} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
