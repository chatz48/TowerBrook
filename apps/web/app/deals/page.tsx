import Link from "next/link";
import { getCompany } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate, primaryDealParty } from "@/lib/deals";
import { listDeals } from "@/lib/deal-repository";
import { ConfidenceBars, ThemeTag } from "@/app/components/ui";
import { getThemeFocus } from "@/lib/theme-focus-server";

export default async function DealsPage() {
  const themeFocus = await getThemeFocus();
  const deals = (await listDeals()).filter(
    (deal) => themeFocus === "all" || deal.theme === themeFocus,
  );

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
            <table className="ee-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Theme</th>
                  <th>Parties</th>
                  <th>Type & date</th>
                  <th>Evidence coverage</th>
                  <th>Network surfaced</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const target = primaryDealParty(deal, "target");
                  const buyer = primaryDealParty(deal, "buyer") ?? primaryDealParty(deal, "investor");
                  return (
                    <tr key={deal.id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[220px]">
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
                      <td className="min-w-[180px]">
                        <div>
                          <span className="text-[10px] uppercase tracking-wide text-ink-faint">Target </span>
                          {target?.companyId ? companyLink(target.companyId, target.name) : target?.name ?? "Missing"}
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] uppercase tracking-wide text-ink-faint">Buyer </span>
                          {buyer?.companyId ? companyLink(buyer.companyId, buyer.name) : buyer?.name ?? "Missing"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div>{DEAL_TYPE_LABEL[deal.dealType]}</div>
                        <div className="mt-1 text-[11px] text-ink-faint">{dealDate(deal) ?? "Date missing"}</div>
                      </td>
                      <td className="min-w-[150px]">
                        <div className="font-semibold tabular-nums">
                          {Math.round(deal.completionScore * 100)}%
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {deal.requiredFactsFound}/{deal.requiredFactsTotal} required facts · {Math.round(deal.confidence * 100)}% record confidence
                        </div>
                        <ConfidenceBars value={deal.completionScore} />
                      </td>
                      <td className="min-w-[150px]">
                        <div className="font-semibold tabular-nums">
                          {deal.expertsSurfaced.length} experts · {deal.companiesSurfaced.length} companies
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {deal.advisorCount} advisors · {deal.lawyerCount} lawyers
                        </div>
                      </td>
                      <td className="max-w-[220px] text-[12px] leading-relaxed text-ink-soft">
                        <div>
                          {deal.missingFacts[0]
                            ? `Chase ${deal.missingFacts[0].replaceAll("_", " ")}`
                            : "Review completed scorecard"}
                        </div>
                        <Link href={`/deals/${deal.id}`} className="ee-link mt-1 inline-flex text-[11px]">
                          Open deal →
                        </Link>
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
