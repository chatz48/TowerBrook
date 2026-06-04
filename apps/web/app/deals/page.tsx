import Link from "next/link";
import { getCompany } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate, primaryDealParty } from "@/lib/deals";
import { listDeals } from "@/lib/deal-repository";
import { ConfidenceBars, ThemeTag } from "@/app/components/ui";

export default async function DealsPage() {
  const deals = await listDeals();

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Deal Intelligence</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Source-backed transaction scorecards with parties, advisors, missing
              facts, surfaced experts and next diligence actions.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/ingest" className="ee-button ee-button-secondary">
              Ingest deal
            </Link>
            <Link href="/sources" className="ee-button ee-button-primary">
              Review source register
            </Link>
          </div>
        </header>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Tracked deals ({deals.length})</h2>
            <span className="text-[12px] text-ink-faint">Sorted by recency and completeness</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1280px]">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Theme</th>
                  <th>Target</th>
                  <th>Buyer / investor</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Advisors</th>
                  <th>Lawyers</th>
                  <th>Experts</th>
                  <th>Companies</th>
                  <th>Fact completeness</th>
                  <th>Confidence</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const target = primaryDealParty(deal, "target");
                  const buyer = primaryDealParty(deal, "buyer") ?? primaryDealParty(deal, "investor");
                  return (
                    <tr key={deal.id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[260px]">
                        <Link href={`/deals/${deal.id}`} className="ee-link">
                          {deal.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {deal.status.replaceAll("_", " ")} · {deal.geography}
                        </div>
                      </td>
                      <td>
                        <ThemeTag id={deal.theme} small />
                      </td>
                      <td>{target?.companyId ? companyLink(target.companyId, target.name) : target?.name ?? "Missing"}</td>
                      <td>{buyer?.companyId ? companyLink(buyer.companyId, buyer.name) : buyer?.name ?? "Missing"}</td>
                      <td>{DEAL_TYPE_LABEL[deal.dealType]}</td>
                      <td>{dealDate(deal) ?? "Missing"}</td>
                      <td className="font-semibold tabular-nums">{deal.advisorCount}</td>
                      <td className="font-semibold tabular-nums">{deal.lawyerCount}</td>
                      <td className="font-semibold tabular-nums">{deal.expertsSurfaced.length}</td>
                      <td className="font-semibold tabular-nums">{deal.companiesSurfaced.length}</td>
                      <td>
                        <div className="font-semibold tabular-nums">
                          {Math.round(deal.completionScore * 100)}%
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {deal.requiredFactsFound}/{deal.requiredFactsTotal} required
                        </div>
                        <ConfidenceBars value={deal.completionScore} />
                      </td>
                      <td>
                        <div className="font-semibold tabular-nums">
                            {Math.round(deal.confidence * 100)}%
                        </div>
                        <ConfidenceBars value={deal.confidence} />
                      </td>
                      <td className="max-w-[260px] text-[12px] leading-relaxed text-ink-soft">
                        {deal.missingFacts[0]
                          ? `Find ${deal.missingFacts[0].replaceAll("_", " ")}`
                          : "Generate relationship brief"}
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

function companyLink(companyId: string, fallback: string) {
  const company = getCompany(companyId);
  return company ? (
    <Link href={`/companies/${company.id}`} className="ee-link">
      {company.name}
    </Link>
  ) : (
    fallback
  );
}
