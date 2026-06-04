import Link from "next/link";
import { getExperts, getCompanies } from "@/lib/data";
import {
  getAdvisorExpertGaps,
  getExpertDiscoveryCandidates,
} from "@/lib/expert-discovery";
import { getOriginationResearchJobs } from "@/lib/origination";
import { rankExperts } from "@/lib/score";
import { getTargetedExpertExpansion } from "@/lib/targeted-expansion";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { Badge } from "@/app/components/ui";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { matchesThemeFocus } from "@/lib/theme-focus";

export default async function ExpertsPage() {
  const themeFocus = await getThemeFocus();
  const companies = getCompanies();
  const companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const ranked = rankExperts(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
  );
  const expertCandidates = getExpertDiscoveryCandidates().filter((candidate) =>
    matchesThemeFocus(candidate.themes, themeFocus),
  );
  const advisorGaps = getAdvisorExpertGaps().filter((gap) =>
    matchesThemeFocus(gap.themes, themeFocus),
  );
  const origination = getOriginationResearchJobs();
  const targetedExpansion = getTargetedExpertExpansion();
  const targetedCandidates = targetedExpansion.expert_candidates.filter((candidate) =>
    matchesThemeFocus(candidate.themes, themeFocus),
  );
  const founderOrigination = origination.queues.founder_origination.filter(
    (job) => themeFocus === "all" || job.theme_id === themeFocus,
  );

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Expert Explorer</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Use founders, operators and transaction experts to uncover new
              investment opportunities, introductions and companies.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/ask" className="ee-button ee-button-secondary">
              Ask over experts
            </Link>
            <Link href="/discover" className="ee-button ee-button-primary">
              Review coverage gaps
            </Link>
          </div>
        </header>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">Call list</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Canonical experts prioritized for a call, referral ask, or company lead.
              </p>
            </div>
            <Link href="/discover" className="ee-link text-[12px]">
              Review research pipeline
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1180px]">
              <thead>
                <tr>
                  <th className="w-14">#</th>
                  <th>Expert</th>
                  <th>Why call</th>
                  <th>Companies they can unlock</th>
                  <th>Relationship path</th>
                  <th>Evidence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 10).map(({ expert }, index) => {
                  const towerBrook = towerBrookExpertScore(expert, companiesById);
                  const latestNews = expert.news
                    ?.slice()
                    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
                  return (
                    <tr key={expert.id}>
                      <td>
                        <span className="inline-grid h-8 w-8 place-items-center rounded bg-[#f1f4f9] text-[16px] font-semibold text-accent">
                          {index + 1}
                        </span>
                      </td>
                      <td className="min-w-[230px]">
                        <Link href={`/experts/${expert.id}`} className="ee-link">
                          {expert.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-soft">{expert.headline}</div>
                      </td>
                      <td className="max-w-[340px] text-[11px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-3">
                          {latestNews?.headline ?? expert.signals?.[0] ?? expert.whyRelevant}
                        </span>
                      </td>
                      <td className="max-w-[260px] text-[11px] text-ink-soft">
                        <span className="line-clamp-3">
                          {expert.companies
                            .map((link) => companyNames[link.companyId] ?? link.companyId)
                            .slice(0, 4)
                            .join(", ") || "No company edge mapped"}
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
                        <Link href={`/experts/${expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex flex-col gap-2 border-b border-line px-4 py-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="ee-label text-ink">Targeted expansion from recent PE tombstones</h2>
              <p className="mt-1 max-w-4xl text-[11px] leading-relaxed text-ink-faint">
                Targeted search pass for named dealmakers, lender-credit professionals, lawyers and
                diligence specialists from recent grid, clean-energy and smart-water transactions.
                These are review-gated leads, not canonical experts yet.
              </p>
            </div>
            <div className="grid min-w-[300px] grid-cols-3 gap-2 text-right">
              <DiscoveryMetric label="Candidates" value={targetedCandidates.length} />
              <DiscoveryMetric label="PE deals" value={targetedExpansion.coverage.recent_pe_deals_covered} />
              <DiscoveryMetric label="Publications" value={targetedExpansion.coverage.specialist_publications} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1260px]">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Type</th>
                  <th>Organization</th>
                  <th>Theme</th>
                  <th>Deal / source</th>
                  <th>Why useful for origination</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {targetedCandidates.slice(0, 24).map((candidate) => (
                  <tr key={candidate.candidate_id} className="hover:bg-[#fbfcff]">
                    <td className="min-w-[190px]">
                      <div className="font-semibold">{candidate.name}</div>
                      <div className="mt-0.5 text-[11px] text-ink-soft">{candidate.role}</div>
                    </td>
                    <td>{EXPERT_TYPE_LABEL[candidate.expert_type]}</td>
                    <td className="max-w-[210px] text-[11px] text-ink-soft">{candidate.organization}</td>
                    <td className="max-w-[190px] text-[11px] text-ink-soft">
                      {candidate.themes.map((theme) => theme.replaceAll("-", " ")).join(", ")}
                    </td>
                    <td className="max-w-[250px] text-[11px] text-ink-soft">
                      <span className="line-clamp-2">{candidate.deal_or_source}</span>
                    </td>
                    <td className="max-w-[390px] text-[11px] leading-relaxed text-ink-soft">
                      <span className="line-clamp-3">{candidate.why_useful}</span>
                    </td>
                    <td>
                      <a
                        href={candidate.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ee-link"
                      >
                        Source
                      </a>
                      <div className="mt-0.5 text-[11px] text-ink-faint">
                        {Math.round(candidate.confidence * 100)}% · {candidate.review_status.replaceAll("_", " ")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">Founder-led opportunity origination</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Previously funded or acquired founders researched for new companies, investments, boards, referrals and opportunities.
              </p>
            </div>
            <Link href="/discover" className="ee-link text-[12px]">
              Run live discovery
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Founder / ex-founder</th>
                  <th>Previously funded companies</th>
                  <th>Theme</th>
                  <th>Opportunity objective</th>
                  <th>First Keiro search</th>
                </tr>
              </thead>
              <tbody>
                {founderOrigination.slice(0, 30).map((job) => (
                  <tr key={job.external_job_id} className="hover:bg-[#fbfcff]">
                    <td className="font-semibold">{job.metadata.target_name}</td>
                    <td className="max-w-[260px] text-[11px] text-ink-soft">
                      {(job.metadata.target_organizations ?? []).join(", ")}
                    </td>
                    <td className="text-[11px] text-ink-soft">{job.theme_id?.replaceAll("-", " ")}</td>
                    <td className="max-w-[350px] text-[11px] text-ink-soft">
                      <span className="line-clamp-2">{job.metadata.objective}</span>
                    </td>
                    <td className="max-w-[380px] text-[11px] text-ink-soft">
                      <span className="line-clamp-2">{job.query}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">PE-derived expert candidate pool</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Review-gated people ranked from TowerBrook and peer-fund transaction evidence.
              </p>
            </div>
            <span className="text-[12px] text-ink-faint">Experts first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1260px]">
              <thead>
                <tr>
                  <th>Expert candidate</th>
                  <th>Archetype</th>
                  <th>Access path</th>
                  <th>PE deal roles</th>
                  <th>Connected companies</th>
                  <th>Profile gaps</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {expertCandidates.map((candidate) => (
                  <tr key={candidate.candidate_id} className="hover:bg-[#fbfcff]">
                    <td className="min-w-[230px]">
                      {candidate.canonical_match.expert_id ? (
                        <Link href={`/experts/${candidate.canonical_match.expert_id}`} className="ee-link">
                          {candidate.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{candidate.name}</span>
                      )}
                      <div className="mt-0.5 text-[11px] text-ink-soft">{candidate.headline}</div>
                    </td>
                    <td>{EXPERT_TYPE_LABEL[candidate.expert_type]}</td>
                    <td className={candidate.access_path.startsWith("direct") ? "text-success" : "text-ink-soft"}>
                      {candidate.access_path.replaceAll("-", " ")}
                    </td>
                    <td className="max-w-[300px] text-[11px] text-ink-soft">
                      <span className="line-clamp-3">
                        {candidate.deal_roles
                          .map((role) => `${role.role.replaceAll("-", " ")} · ${role.target}`)
                          .join("; ")}
                      </span>
                    </td>
                    <td className="max-w-[260px] text-[11px] text-ink-soft">
                      <span className="line-clamp-3">
                        {candidate.connected_companies.map((company) => company.name).join(", ")}
                      </span>
                    </td>
                    <td className="max-w-[250px] text-[11px] text-ink-soft">
                      <span className="line-clamp-3">
                        {candidate.missing_profile_facts.slice(0, 3).join(", ")}
                      </span>
                    </td>
                    <td>
                      {candidate.sources.slice(0, 4).map((source, index) => (
                        <a
                          key={`${candidate.candidate_id}-${source.url}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ee-link mr-1"
                        >
                          [{index + 1}]
                        </a>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">Named-expert coverage gaps</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Advisor and service-provider organizations evidenced on PE deals where the individual professionals still need to be identified.
              </p>
            </div>
            <span className="text-[12px] text-ink-faint">
              {advisorGaps.filter((gap) => gap.coverage_status === "no-named-expert").length} with no named expert
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Expert sought</th>
                  <th>Deal role</th>
                  <th>PE deals</th>
                  <th>Named coverage</th>
                  <th>First search</th>
                </tr>
              </thead>
              <tbody>
                {advisorGaps.slice(0, 24).map((gap) => (
                  <tr key={gap.gap_id} className="hover:bg-[#fbfcff]">
                    <td className="font-semibold">{gap.organization}</td>
                    <td>{EXPERT_TYPE_LABEL[gap.expert_type_sought]}</td>
                    <td className="text-[11px] text-ink-soft">{gap.advisor_role.replaceAll("-", " ")}</td>
                    <td className="max-w-[280px] text-[11px] text-ink-soft">
                      {gap.deals.map((deal) => deal.target).join(", ")}
                    </td>
                    <td>{gap.named_experts_found.map((expert) => expert.name).join(", ") || "None yet"}</td>
                    <td className="max-w-[340px] text-[11px] text-ink-soft">
                      <span className="line-clamp-2">{gap.search_queries[0]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">All experts ({ranked.length})</h2>
            <span className="text-[12px] text-ink-faint">Canonical expert directory</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Expert</th>
                  <th>Archetype</th>
                  <th>Themes</th>
                  <th>Why relevant</th>
                  <th>Relationship path</th>
                  <th>Connected companies</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ expert }, index) => {
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
                      <td className="max-w-[340px] text-[11px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-3">{expert.whyRelevant}</span>
                      </td>
                      <td className={towerBrook.isDirect ? "text-success" : "text-ink-faint"}>
                        {towerBrook.isDirect ? towerBrook.label : "No internal path mapped"}
                      </td>
                      <td className="max-w-[260px]">
                        <span className="line-clamp-2">
                          {expert.companies.map((link) => companyNames[link.companyId] ?? link.companyId).join(", ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-ink-soft">
                        {expert.sources.length} source{expert.sources.length === 1 ? "" : "s"}
                        {expert.news?.length ? ` · ${expert.news.length} dated signal${expert.news.length === 1 ? "" : "s"}` : ""}
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

function DiscoveryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="ee-panel rounded-lg p-4">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
