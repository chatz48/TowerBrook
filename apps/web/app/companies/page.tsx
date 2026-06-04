import Link from "next/link";
import { companiesWithLinks } from "@/lib/data";
import { dealCoverage } from "@/lib/deal-repository";
import { getDerivedCompanyCandidates } from "@/lib/expert-discovery";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  OWNERSHIP_LABEL,
  OWNERSHIP_STYLE,
} from "@/lib/labels";
import { Badge, ConfidenceBars } from "@/app/components/ui";

export default async function CompaniesPage() {
  const companies = companiesWithLinks();
  const derivedCandidates = getDerivedCompanyCandidates();
  const dealCounts = await dealCoverage();

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Company Explorer</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Companies surfaced through the expert graph, ranked by independent
              people evidence and investment relevance.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/graph" className="ee-button ee-button-secondary">
              Explain path
            </Link>
            <Link href="/reports" className="ee-button ee-button-primary">
              Build company memo
            </Link>
          </div>
        </header>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">
                PE companies reverse-derived from experts ({derivedCandidates.length})
              </h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Candidate companies ranked only after aggregating named expert and PE-deal connections.
              </p>
            </div>
            <Link href="/experts" className="ee-link text-[12px]">
              Inspect expert evidence
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Company candidate</th>
                  <th>Category</th>
                  <th>Ownership</th>
                  <th>Named experts</th>
                  <th>PE deals</th>
                  <th>Why surfaced</th>
                </tr>
              </thead>
              <tbody>
                {derivedCandidates.slice(0, 40).map((company) => (
                  <tr key={company.candidate_id} className="hover:bg-[#fbfcff]">
                    <td className="font-semibold tabular-nums">{company.scores.research_priority}</td>
                    <td className="min-w-[220px]">
                      {company.canonical_match.company_id ? (
                        <Link href={`/companies/${company.canonical_match.company_id}`} className="ee-link">
                          {company.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{company.name}</span>
                      )}
                      <div className="mt-0.5 text-[11px] text-ink-soft">{company.owner ?? "Ownership to verify"}</div>
                    </td>
                    <td>
                      <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                        {COMPANY_CATEGORY_LABEL[company.category]}
                      </Badge>
                    </td>
                    <td className="text-[11px] text-ink-soft">{company.ownership_status.replaceAll("-", " ")}</td>
                    <td className="max-w-[280px] text-[11px] text-ink-soft">
                      <span className="line-clamp-2">
                        {company.expert_connections.map((expert) => expert.name).join(", ") || "No named expert yet"}
                      </span>
                    </td>
                    <td className="font-semibold tabular-nums">{company.deal_connections.length}</td>
                    <td className="max-w-[360px] text-[11px] text-ink-soft">
                      <span className="line-clamp-2">{company.why_interesting}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Derived companies ({companies.length})</h2>
            <span className="text-[12px] text-ink-faint">Sorted by expert density</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Category</th>
                  <th>Ownership</th>
                  <th>Expert links</th>
                  <th>Deals</th>
                  <th>TowerBrook</th>
                  <th>Confidence</th>
                  <th>Investment angle</th>
                  <th>Linked experts</th>
                  <th>Sources</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const towerBrook = towerBrookCompanyScore(company, company.expertCount);
                  return (
                    <tr key={company.id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[220px]">
                        <Link href={`/companies/${company.id}`} className="ee-link">
                          {company.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-soft">
                          {company.hq ?? company.website ?? "Mapped company"}
                        </div>
                      </td>
                      <td>
                        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                          {COMPANY_CATEGORY_LABEL[company.category]}
                        </Badge>
                      </td>
                      <td>
                        {company.ownershipStatus ? (
                          <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
                            {OWNERSHIP_LABEL[company.ownershipStatus]}
                          </Badge>
                        ) : (
                          <span className="text-ink-faint">Review</span>
                        )}
                      </td>
                      <td className="font-semibold tabular-nums">{company.expertCount}</td>
                      <td className="font-semibold tabular-nums">
                        {dealCounts.get(company.id) ?? 0}
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
                      <td>
                        <div className="font-semibold tabular-nums">
                          {(company.confidence * 5).toFixed(1)}
                        </div>
                        <ConfidenceBars value={company.confidence} />
                      </td>
                      <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-2">
                          {company.whyInteresting ?? company.description}
                        </span>
                      </td>
                      <td className="max-w-[240px]">
                        <span className="line-clamp-2">
                          {company.linkedExperts.map((link) => link.expert.name).join(", ") || "No direct links"}
                        </span>
                      </td>
                      <td>
                        {company.sources.slice(0, 4).map((source, i) => (
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
