import Link from "next/link";
import { getExperts, getCompanies } from "@/lib/data";
import {
  getAdvisorExpertGaps,
  getExpertDiscovery,
  getExpertDiscoveryCandidates,
} from "@/lib/expert-discovery";
import { getOriginationResearchJobs } from "@/lib/origination";
import { rankExperts } from "@/lib/score";
import { getTargetedExpertExpansion } from "@/lib/targeted-expansion";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { NextActionPanel, WorkflowRail } from "@/app/components/InvestorWorkflow";
import { ConfidenceBars } from "@/app/components/ui";

export default function ExpertsPage() {
  const companies = getCompanies();
  const companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const ranked = rankExperts(getExperts());
  const discovery = getExpertDiscovery();
  const expertCandidates = getExpertDiscoveryCandidates();
  const advisorGaps = getAdvisorExpertGaps();
  const origination = getOriginationResearchJobs();
  const targetedExpansion = getTargetedExpertExpansion();

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
            <Link href="/reports" className="ee-button ee-button-primary">
              Build call plan
            </Link>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <DiscoveryMetric label="Founder opportunity jobs" value={origination.coverage.founder_origination} />
          <DiscoveryMetric label="PE expert candidates" value={discovery.coverage.expert_candidates} />
          <DiscoveryMetric label="TowerBrook-connected" value={discovery.coverage.towerbrook_connected_experts} />
          <DiscoveryMetric label="Canonical matches" value={discovery.coverage.canonical_expert_matches} />
          <DiscoveryMetric label="Advisor-person gaps" value={discovery.coverage.advisor_expert_gaps} />
          <DiscoveryMetric label="Identity jobs" value={origination.coverage.identity_resolution} />
        </section>

        <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="ee-panel rounded-lg p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="ee-label text-ink">Call-planning workflow</h2>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                  Move from a long people list to a practical sequence: the
                  person to call, the reason to call them, and the companies or
                  gaps they should help unlock.
                </p>
              </div>
              <Link href="/reports" className="ee-button ee-button-secondary">
                Build call plan
              </Link>
            </div>
            <div className="mt-4">
              <WorkflowRail
                steps={[
                  {
                    label: "Warm access",
                    title: ranked[0]?.expert.name ?? "Find first expert",
                    body: ranked[0]
                      ? `Start with ${ranked[0].expert.headline} and ask for investable companies and skeptical follow-up names.`
                      : "Rank experts by objective, role, access and evidence confidence.",
                    href: ranked[0] ? `/experts/${ranked[0].expert.id}` : "/experts",
                  },
                  {
                    label: "Founder origination",
                    title: origination.queues.founder_origination[0]?.metadata.target_name ?? "Review founder jobs",
                    body: "Use previously funded founders to surface new boards, investments, referrals and post-exit ventures.",
                    href: "/discover",
                  },
                  {
                    label: "Deal evidence",
                    title: expertCandidates[0]?.name ?? "Review PE-derived candidates",
                    body: "Prioritize named people tied to PE deals before relying on organization-level advisor names.",
                    href: expertCandidates[0]?.canonical_match.expert_id
                      ? `/experts/${expertCandidates[0].canonical_match.expert_id}`
                      : "/experts",
                  },
                  {
                    label: "Coverage gap",
                    title: advisorGaps[0]?.organization ?? "Find missing named advisors",
                    body: "Convert banker, lawyer and diligence-firm mentions into specific people the team can call.",
                    href: "/discover",
                  },
                ]}
              />
            </div>
          </div>

          <NextActionPanel
            title="Use this page for"
            description="Keep the list work-oriented: every row should support a call, a referral ask, or a target-company lead."
            actions={[
              {
                title: "Generate first-call prep",
                body: ranked[0]
                  ? `Open ${ranked[0].expert.name} and generate a sourced call brief.`
                  : "Open the highest-ranked expert and generate a sourced call brief.",
                href: ranked[0] ? `/experts/${ranked[0].expert.id}` : "/experts",
                action: "Prep",
                tone: "primary",
              },
              {
                title: "Find company leads",
                body: "Scan connected companies before the call so the expert can confirm, refute or extend the list.",
                href: "/companies",
                action: "Targets",
              },
              {
                title: "Run live discovery",
                body: "Create a job when the row has an organization-level gap or stale identity evidence.",
                href: "/discover",
                action: "Run",
              },
            ]}
          />
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
              <DiscoveryMetric label="Candidates" value={targetedExpansion.coverage.expert_candidates} />
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
                {targetedExpansion.expert_candidates.slice(0, 24).map((candidate) => (
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
                  <th>Priority</th>
                  <th>Founder / ex-founder</th>
                  <th>Previously funded companies</th>
                  <th>Theme</th>
                  <th>Opportunity objective</th>
                  <th>First Keiro search</th>
                </tr>
              </thead>
              <tbody>
                {origination.queues.founder_origination.slice(0, 30).map((job) => (
                  <tr key={job.external_job_id} className="hover:bg-[#fbfcff]">
                    <td className="font-semibold tabular-nums">{job.priority}</td>
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
                  <th>Priority</th>
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
                    <td className="font-semibold tabular-nums">{candidate.scores.research_priority}</td>
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
              <h2 className="ee-label text-ink">Highest-priority named-expert gaps</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Advisor and service-provider organizations evidenced on PE deals where the individual professionals still need to be identified.
              </p>
            </div>
            <span className="text-[12px] text-ink-faint">
              {discovery.coverage.advisor_gaps_with_no_named_expert} with no named expert
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Priority</th>
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
                    <td className="font-semibold tabular-nums">{gap.search_priority}</td>
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

function DiscoveryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="ee-panel rounded-lg p-4">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
