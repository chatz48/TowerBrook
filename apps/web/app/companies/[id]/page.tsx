import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, companyWithLinks, getCompany } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate, primaryDealParty } from "@/lib/deals";
import { listDealsForCompany } from "@/lib/deal-repository";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
  OWNERSHIP_LABEL,
  OWNERSHIP_STYLE,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import {
  Badge,
  BackLink,
  Chip,
  Confidence,
  ConfidenceBars,
  NewsFeed,
  SourceLinks,
  ThemeTag,
} from "@/app/components/ui";

export function generateStaticParams() {
  return getCompanies().map((c) => ({ id: c.id }));
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = companyWithLinks(id);
  if (!company) notFound();
  const towerBrook = towerBrookCompanyScore(company, company.expertCount);
  const relatedDeals = await listDealsForCompany(company.id);

  const similar = (company.similarCompanyIds ?? [])
    .map((sid) => getCompany(sid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1300px]">
        <BackLink href={`/themes/${company.themes[0]}`}>Back to theme</BackLink>

        <header className="ee-panel mt-5 rounded-lg p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-semibold tracking-tight">{company.name}</h1>
                <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                  {COMPANY_CATEGORY_LABEL[company.category]}
                </Badge>
                {company.ownershipStatus ? (
                  <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
                    {OWNERSHIP_LABEL[company.ownershipStatus]}
                    {company.owner ? ` · ${company.owner}` : ""}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                {company.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {company.themes.map((theme) => (
                  <ThemeTag key={theme} id={theme} small />
                ))}
                {company.specialties?.map((specialty) => (
                  <Chip key={specialty}>{specialty}</Chip>
                ))}
              </div>
            </div>
            <div className="grid min-w-[420px] grid-cols-2 overflow-hidden rounded-lg border border-line max-lg:min-w-0">
              <Fact label="Expert links" value={String(company.expertCount)} />
              <Fact label="TowerBrook" value={`${towerBrook.score}`} />
              <Fact label="Confidence" value={`${(company.confidence * 100).toFixed(0)}%`} />
              <Fact label="Scale" value={company.sizeBand ?? company.funding ?? "Not captured"} />
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            {company.whyInteresting ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Why it surfaced</div>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  {company.whyInteresting} <a href="#sources" className="ee-link">[1]</a>
                </p>
              </section>
            ) : null}

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Experts connected to this company ({company.expertCount})</h2>
              </div>
              <table className="ee-table">
                <thead>
                  <tr>
                    <th>Expert</th>
                    <th>Archetype</th>
                    <th>Relationship</th>
                    <th>Evidence</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {company.linkedExperts.map((link) => (
                    <tr key={`${link.expert.id}-${link.relationship}`}>
                      <td>
                        <Link href={`/experts/${link.expert.id}`} className="ee-link">
                          {link.expert.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {link.expert.headline}
                        </div>
                      </td>
                      <td>
                        <Badge className={EXPERT_TYPE_STYLE[link.expert.type]}>
                          {EXPERT_TYPE_LABEL[link.expert.type]}
                        </Badge>
                      </td>
                      <td>{RELATIONSHIP_LABEL[link.relationship]}</td>
                      <td className="max-w-[340px] text-[12px] text-ink-soft">
                        {link.note ?? link.expert.whyRelevant}
                      </td>
                      <td>
                        <span className="text-success">High</span>
                        <div className="mt-1"><ConfidenceBars value={link.expert.confidence} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {company.news?.length ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="mb-3 ee-label text-ink">In the news</div>
                <NewsFeed items={company.news} />
              </section>
            ) : null}

            {relatedDeals.length ? (
              <section className="ee-panel overflow-hidden rounded-lg">
                <div className="border-b border-line px-4 py-3">
                  <h2 className="ee-label text-ink">Related deals ({relatedDeals.length})</h2>
                </div>
                <table className="ee-table">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Completeness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedDeals.map((deal) => {
                      const role =
                        deal.parties.find((party) => party.companyId === company.id)?.role ??
                        deal.advisors.find((advisor) => advisor.companyId === company.id)?.role ??
                        "surfaced";
                      const counterparty =
                        primaryDealParty(deal, "buyer")?.name ??
                        primaryDealParty(deal, "investor")?.name ??
                        primaryDealParty(deal, "target")?.name;
                      return (
                        <tr key={deal.id}>
                          <td>
                            <Link href={`/deals/${deal.id}`} className="ee-link">
                              {deal.name}
                            </Link>
                            <div className="mt-0.5 text-[11px] text-ink-faint">
                              {counterparty}
                            </div>
                          </td>
                          <td>{role.replaceAll("-", " ")}</td>
                          <td>{DEAL_TYPE_LABEL[deal.dealType]}</td>
                          <td>{dealDate(deal) ?? "Missing"}</td>
                          <td>
                            <div className="font-semibold tabular-nums">
                              {Math.round(deal.completionScore * 100)}%
                            </div>
                            <ConfidenceBars value={deal.completionScore} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}

            {similar.length > 0 ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Comparable companies</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {similar.map((item) => (
                    <Link
                      key={item.id}
                      href={`/companies/${item.id}`}
                      className="rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-medium hover:border-line-strong"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="space-y-5">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">TowerBrook score</div>
              <div className="mt-4 rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold">{towerBrook.label}</span>
                  <span className="text-[22px] font-semibold tabular-nums">
                    {towerBrook.score}
                  </span>
                </div>
                <div className="mt-2"><ConfidenceBars value={towerBrook.score / 100} /></div>
                <ul className="mt-3 space-y-1 text-[12px] leading-relaxed text-ink-soft">
                  {(towerBrook.reasons.length
                    ? towerBrook.reasons
                    : ["Theme-adjacent infrastructure fit"]
                  ).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Company evidence</div>
              <div className="mt-4 rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold">Confidence</span>
                  <span className="text-[18px] font-semibold tabular-nums">
                    {(company.confidence * 5).toFixed(1)} / 5
                  </span>
                </div>
                <div className="mt-2"><ConfidenceBars value={company.confidence} /></div>
                <div className="mt-3"><Confidence value={company.confidence} /></div>
              </div>
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ee-button ee-button-secondary mt-4 w-full"
                >
                  Open website
                </a>
              ) : null}
              <Link href="/graph" className="ee-button ee-button-primary mt-3 w-full">
                Open graph path
              </Link>
            </section>

            <section className="ee-panel rounded-lg p-5" id="sources">
              <div className="mb-3 ee-label text-ink">Sources</div>
              <SourceLinks sources={company.sources} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-b border-line px-4 py-3 even:border-r-0">
      <dt className="ee-label">{label}</dt>
      <dd className="mt-2 text-[18px] font-semibold">{value}</dd>
    </div>
  );
}
