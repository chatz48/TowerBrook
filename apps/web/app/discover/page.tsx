"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getAdvisorExpertGaps,
  getDerivedCompanyCandidates,
  getExpertDiscovery,
  getExpertDiscoveryCandidates,
  type AdvisorExpertGap,
  type DerivedCompanyCandidate,
  type ExpertDiscoveryCandidate,
} from "@/lib/expert-discovery";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
} from "@/lib/labels";
import { THEMES, THEME_BY_ID } from "@/lib/themes";
import type { CompanyCategory, ExpertType, ThemeId } from "@/lib/types";
import { publishThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { useThemeFocusClient } from "@/lib/theme-focus-client";
import { Badge, ThemeTag } from "@/app/components/ui";

interface ResearchJob {
  id: string;
  job_type: string;
  status: string;
  theme_id?: string;
  query?: string;
  progress_completed: number;
  progress_total: number;
  sources_found: number;
  entities_created: number;
  relationships_created: number;
  error?: string;
}

type QueueView = "experts" | "companies" | "gaps";

const DISCOVERY = getExpertDiscovery();
const EXPERTS = getExpertDiscoveryCandidates();
const COMPANIES = getDerivedCompanyCandidates();
const GAPS = getAdvisorExpertGaps();

const EXPERT_TYPE_FILTERS: ExpertType[] = [
  "investor",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "technical-dd",
  "lender-credit",
];

const COMPANY_CATEGORY_FILTERS: CompanyCategory[] = [
  "target",
  "advisory",
  "service-provider",
  "investor",
  "incumbent",
];

const QUEUES: { id: QueueView; label: string; description: string }[] = [
  {
    id: "experts",
    label: "Experts",
    description: "People to call or verify from public deal and company evidence.",
  },
  {
    id: "companies",
    label: "Companies",
    description: "Targets and ecosystem firms derived from expert connections.",
  },
  {
    id: "gaps",
    label: "Missing names",
    description: "Advisor organizations where the named person is still missing.",
  },
];

export default function DiscoverPage() {
  const themeId = useThemeFocusClient();
  const [view, setView] = useState<QueueView>("experts");
  const [query, setQuery] = useState("");
  const [expertType, setExpertType] = useState<ExpertType | "all">("all");
  const [companyCategory, setCompanyCategory] = useState<CompanyCategory | "all">("all");
  const [selectedExpertId, setSelectedExpertId] = useState(EXPERTS[0]?.candidate_id ?? "");
  const [selectedCompanyId, setSelectedCompanyId] = useState(COMPANIES[0]?.candidate_id ?? "");
  const [selectedGapId, setSelectedGapId] = useState(GAPS[0]?.gap_id ?? "");
  const [loadingJob, setLoadingJob] = useState(false);
  const [jobError, setJobError] = useState("");
  const [job, setJob] = useState<ResearchJob | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperts = useMemo(
    () =>
      EXPERTS.filter((expert) => matchesThemeFocus(expert.themes, themeId))
        .filter((expert) => expertType === "all" || expert.expert_type === expertType)
        .filter((expert) => {
          if (!normalizedQuery) return true;
          return [
            expert.name,
            expert.headline,
            expert.why_relevant,
            expert.expert_type,
            expert.organizations.join(" "),
            expert.connected_companies.map((company) => company.name).join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => b.scores.research_priority - a.scores.research_priority),
    [expertType, normalizedQuery, themeId],
  );

  const filteredCompanies = useMemo(
    () =>
      COMPANIES.filter((company) => matchesThemeFocus(company.themes, themeId))
        .filter((company) => companyCategory === "all" || company.category === companyCategory)
        .filter((company) => {
          if (!normalizedQuery) return true;
          return [
            company.name,
            company.category,
            company.owner ?? "",
            company.ownership_status,
            company.why_interesting,
            company.expert_connections.map((expert) => expert.name).join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => b.scores.research_priority - a.scores.research_priority),
    [companyCategory, normalizedQuery, themeId],
  );

  const filteredGaps = useMemo(
    () =>
      GAPS.filter((gap) => matchesThemeFocus(gap.themes, themeId))
        .filter((gap) => {
          if (!normalizedQuery) return true;
          return [
            gap.organization,
            gap.advisor_role,
            gap.expert_type_sought,
            gap.deals.map((deal) => `${deal.deal_name} ${deal.target}`).join(" "),
            gap.search_queries.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => b.search_priority - a.search_priority),
    [normalizedQuery, themeId],
  );

  const selectedExpert =
    filteredExperts.find((expert) => expert.candidate_id === selectedExpertId) ??
    filteredExperts[0];
  const selectedCompany =
    filteredCompanies.find((company) => company.candidate_id === selectedCompanyId) ??
    filteredCompanies[0];
  const selectedGap =
    filteredGaps.find((gap) => gap.gap_id === selectedGapId) ?? filteredGaps[0];

  const selectedLead =
    view === "experts" ? selectedExpert : view === "companies" ? selectedCompany : selectedGap;

  const visibleCounts = {
    experts: filteredExperts.length,
    companies: filteredCompanies.length,
    gaps: filteredGaps.length,
  };

  function changeTheme(focus: ThemeFocus) {
    publishThemeFocus(focus);
  }

  async function createDiscoveryJob(lead?: ExpertDiscoveryCandidate | DerivedCompanyCandidate | AdvisorExpertGap) {
    const request = buildJobRequest(lead, themeId);
    setLoadingJob(true);
    setJobError("");
    setJob(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      setJob(data.job);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setLoadingJob(false);
    }
  }

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1580px]">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Discover</h1>
            <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-ink-soft">
              Start from three investment themes, review the discovered people, derive company
              opportunities from their relationships, and turn gaps into research jobs or call prep.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/experts" className="ee-button ee-button-secondary">
              Call list
            </Link>
            <Link href="/companies" className="ee-button ee-button-secondary">
              Company map
            </Link>
            <button
              onClick={() => createDiscoveryJob(selectedLead)}
              disabled={loadingJob || !selectedLead}
              className="ee-button ee-button-primary disabled:opacity-50"
            >
              {loadingJob ? "Creating job..." : "Enrich selected lead"}
            </button>
          </div>
        </header>

        <section className="ee-insight-strip mb-5">
          <InsightMetric
            label="Discovered experts"
            value={DISCOVERY.coverage.expert_candidates}
            detail={`${DISCOVERY.coverage.towerbrook_connected_experts} with public TowerBrook/deal evidence`}
          />
          <InsightMetric
            label="Derived companies"
            value={DISCOVERY.coverage.derived_companies}
            detail="Targets, advisors and ecosystem firms"
          />
          <InsightMetric
            label="Missing advisor names"
            value={DISCOVERY.coverage.advisor_gaps_with_no_named_expert}
            detail="Research-gated coverage gaps"
          />
          <InsightMetric
            label="Visible now"
            value={visibleCounts[view]}
            detail={`${THEME_LABEL[themeId]} · ${QUEUES.find((queue) => queue.id === view)?.label}`}
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Theme scope</div>
              <select
                value={themeId}
                onChange={(event) => changeTheme(event.target.value as ThemeFocus)}
                className="mt-3 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
              >
                <option value="all">All three themes</option>
                {THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 space-y-3">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => changeTheme(theme.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      themeId === theme.id
                        ? "border-line-dark bg-[#f7fbff]"
                        : "border-line bg-white hover:border-line-strong"
                    }`}
                  >
                    <ThemeTag id={theme.id} small />
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                      {theme.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="ee-label text-ink">Find a lead</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                    Search names, firms, deal targets, roles and evidence snippets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setExpertType("all");
                    setCompanyCategory("all");
                  }}
                  className="text-[12px] font-semibold text-accent"
                >
                  Reset
                </button>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. JSM, banker, leak detection"
                className="mt-4 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
              {view === "experts" ? (
                <label className="mt-3 block text-[12px] font-medium text-ink-soft">
                  Expert type
                  <select
                    value={expertType}
                    onChange={(event) => setExpertType(event.target.value as ExpertType | "all")}
                    className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
                  >
                    <option value="all">All expert types</option>
                    {EXPERT_TYPE_FILTERS.map((type) => (
                      <option key={type} value={type}>
                        {EXPERT_TYPE_LABEL[type]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {view === "companies" ? (
                <label className="mt-3 block text-[12px] font-medium text-ink-soft">
                  Company type
                  <select
                    value={companyCategory}
                    onChange={(event) =>
                      setCompanyCategory(event.target.value as CompanyCategory | "all")
                    }
                    className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
                  >
                    <option value="all">All company types</option>
                    {COMPANY_CATEGORY_FILTERS.map((category) => (
                      <option key={category} value={category}>
                        {COMPANY_CATEGORY_LABEL[category]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Job status</div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                Use enrichment when a selected lead needs identity resolution, more sources, or a
                named person behind an advisor organization.
              </p>
              {jobError ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
                  {jobError}
                </div>
              ) : null}
              {job ? (
                <div className="mt-4 rounded-md border border-line bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[13px]">{job.status}</span>
                    <span className="text-[11px] text-ink-faint">{job.job_type}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-ink-soft">
                    <span>{job.sources_found} sources</span>
                    <span>{job.entities_created} entities</span>
                    <span>{job.relationships_created} edges</span>
                  </div>
                  <p className="mt-2 break-all text-[11px] text-ink-faint">{job.id}</p>
                </div>
              ) : null}
            </section>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <div className="grid gap-2 md:grid-cols-3">
                  {QUEUES.map((queue) => (
                    <button
                      key={queue.id}
                      type="button"
                      onClick={() => setView(queue.id)}
                      className={`rounded-md border p-3 text-left transition ${
                        view === queue.id
                          ? "border-accent bg-[#f4f8ff]"
                          : "border-line bg-white hover:border-line-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold">{queue.label}</span>
                        <span className="text-[18px] font-semibold tabular-nums">
                          {visibleCounts[queue.id]}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                        {queue.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {view === "experts" ? (
                <ExpertQueue
                  experts={filteredExperts}
                  selectedId={selectedExpert?.candidate_id}
                  onSelect={setSelectedExpertId}
                />
              ) : null}
              {view === "companies" ? (
                <CompanyQueue
                  companies={filteredCompanies}
                  selectedId={selectedCompany?.candidate_id}
                  onSelect={setSelectedCompanyId}
                />
              ) : null}
              {view === "gaps" ? (
                <GapQueue
                  gaps={filteredGaps}
                  selectedId={selectedGap?.gap_id}
                  onSelect={setSelectedGapId}
                />
              ) : null}
            </section>

            <section className="ee-panel rounded-lg">
              <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="ee-label text-ink">Selected lead workspace</h2>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Evidence, call plan, company derivation and next research action.
                  </p>
                </div>
                <button
                  onClick={() => createDiscoveryJob(selectedLead)}
                  disabled={loadingJob || !selectedLead}
                  className="ee-button ee-button-secondary disabled:opacity-50"
                >
                  Run targeted research
                </button>
              </div>
              <div className="p-5">
                {view === "experts" ? <ExpertDetail expert={selectedExpert} /> : null}
                {view === "companies" ? <CompanyDetail company={selectedCompany} /> : null}
                {view === "gaps" ? <GapDetail gap={selectedGap} /> : null}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function ExpertQueue({
  experts,
  selectedId,
  onSelect,
}: {
  experts: ExpertDiscoveryCandidate[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!experts.length) return <EmptyQueue />;
  return (
    <div className="overflow-x-auto">
      <table className="ee-table min-w-[1060px]">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Expert</th>
            <th>Type</th>
            <th>Relationship path</th>
            <th>Companies unlocked</th>
            <th>Evidence</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {experts.slice(0, 40).map((expert) => (
            <tr
              key={expert.candidate_id}
              className={selectedId === expert.candidate_id ? "bg-[#f4f8ff]" : "hover:bg-[#fbfcff]"}
            >
              <td className="whitespace-nowrap">
                <PriorityScore value={expert.scores.research_priority} />
              </td>
              <td className="min-w-[230px]">
                <button
                  type="button"
                  onClick={() => onSelect(expert.candidate_id)}
                  className="text-left font-semibold text-accent hover:underline"
                >
                  {expert.name}
                </button>
                <div className="mt-0.5 text-[11px] text-ink-soft">{expert.headline}</div>
              </td>
              <td>
                <Badge className={EXPERT_TYPE_STYLE[expert.expert_type]}>
                  {EXPERT_TYPE_LABEL[expert.expert_type]}
                </Badge>
              </td>
              <td className="max-w-[190px] text-[11px] text-ink-soft">
                {formatAccessPath(expert.access_path)}
              </td>
              <td className="max-w-[280px] text-[11px] leading-relaxed text-ink-soft">
                <span className="line-clamp-2">
                  {expert.connected_companies
                    .slice(0, 5)
                    .map((company) => `${company.name} (${company.relationship})`)
                    .join(", ")}
                </span>
              </td>
              <td className="whitespace-nowrap text-[11px] text-ink-soft">
                {expert.sources.length} sources · {expert.deal_roles.length} deals
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(expert.candidate_id)}
                  className="ee-button ee-button-secondary min-h-8 px-3"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompanyQueue({
  companies,
  selectedId,
  onSelect,
}: {
  companies: DerivedCompanyCandidate[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!companies.length) return <EmptyQueue />;
  return (
    <div className="overflow-x-auto">
      <table className="ee-table min-w-[1060px]">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Company</th>
            <th>Category</th>
            <th>Ownership</th>
            <th>Expert density</th>
            <th>Evidence deals</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {companies.slice(0, 40).map((company) => (
            <tr
              key={company.candidate_id}
              className={selectedId === company.candidate_id ? "bg-[#f4f8ff]" : "hover:bg-[#fbfcff]"}
            >
              <td className="whitespace-nowrap">
                <PriorityScore value={company.scores.research_priority} />
              </td>
              <td className="min-w-[240px]">
                <button
                  type="button"
                  onClick={() => onSelect(company.candidate_id)}
                  className="text-left font-semibold text-accent hover:underline"
                >
                  {company.name}
                </button>
                <div className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                  <span className="line-clamp-2">{company.why_interesting}</span>
                </div>
              </td>
              <td>
                <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                  {COMPANY_CATEGORY_LABEL[company.category]}
                </Badge>
              </td>
              <td className="max-w-[180px] text-[11px] text-ink-soft">
                {company.ownership_status}
                {company.owner ? <span> · {company.owner}</span> : null}
              </td>
              <td className="text-[11px] text-ink-soft">
                {company.expert_connections.length} named experts
              </td>
              <td className="max-w-[250px] text-[11px] leading-relaxed text-ink-soft">
                <span className="line-clamp-2">
                  {company.deal_connections.map((deal) => deal.name).join(", ")}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(company.candidate_id)}
                  className="ee-button ee-button-secondary min-h-8 px-3"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GapQueue({
  gaps,
  selectedId,
  onSelect,
}: {
  gaps: AdvisorExpertGap[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!gaps.length) return <EmptyQueue />;
  return (
    <div className="overflow-x-auto">
      <table className="ee-table min-w-[980px]">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Advisor organization</th>
            <th>Needed person</th>
            <th>Deal evidence</th>
            <th>Coverage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {gaps.slice(0, 40).map((gap) => (
            <tr
              key={gap.gap_id}
              className={selectedId === gap.gap_id ? "bg-[#f4f8ff]" : "hover:bg-[#fbfcff]"}
            >
              <td className="whitespace-nowrap">
                <PriorityScore value={gap.search_priority} />
              </td>
              <td className="min-w-[240px]">
                <button
                  type="button"
                  onClick={() => onSelect(gap.gap_id)}
                  className="text-left font-semibold text-accent hover:underline"
                >
                  {gap.organization}
                </button>
                <div className="mt-0.5 text-[11px] text-ink-soft">{gap.advisor_role}</div>
              </td>
              <td>
                <Badge className={EXPERT_TYPE_STYLE[gap.expert_type_sought]}>
                  {EXPERT_TYPE_LABEL[gap.expert_type_sought]}
                </Badge>
              </td>
              <td className="max-w-[320px] text-[11px] leading-relaxed text-ink-soft">
                <span className="line-clamp-2">
                  {gap.deals.map((deal) => `${deal.target}: ${deal.deal_name}`).join(", ")}
                </span>
              </td>
              <td className="text-[11px] text-ink-soft">
                {gap.coverage_status.replaceAll("-", " ")}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(gap.gap_id)}
                  className="ee-button ee-button-secondary min-h-8 px-3"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpertDetail({ expert }: { expert?: ExpertDiscoveryCandidate }) {
  if (!expert) return <EmptyDetail />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">{expert.name}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">{expert.headline}</p>
          </div>
          <Badge className={EXPERT_TYPE_STYLE[expert.expert_type]}>
            {EXPERT_TYPE_LABEL[expert.expert_type]}
          </Badge>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">{expert.why_relevant}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {expert.themes.map((theme) => (
            <ThemeTag key={theme} id={theme} small />
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailPanel title="Companies this expert can unlock">
            <ul className="space-y-2">
              {expert.connected_companies.slice(0, 8).map((company) => (
                <li key={`${company.name}-${company.relationship}`} className="text-[12px]">
                  <span className="font-semibold">{company.name}</span>
                  <span className="text-ink-faint"> · {company.relationship}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
          <DetailPanel title="Deal role evidence">
            <ul className="space-y-2">
              {expert.deal_roles.slice(0, 4).map((deal) => (
                <li key={`${deal.deal_id}-${deal.role}`} className="text-[12px] leading-relaxed">
                  <span className="font-semibold">{deal.target}</span>
                  <span className="text-ink-soft"> · {deal.role} via {deal.organization}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
        </div>

        <DetailPanel title="Action plan" className="mt-4">
          <ol className="grid gap-3 text-[12px] leading-relaxed text-ink-soft md:grid-cols-3">
            <li>
              <span className="block font-semibold text-ink">1. Verify</span>
              Confirm current role, LinkedIn, availability and conflicts.
            </li>
            <li>
              <span className="block font-semibold text-ink">2. Prepare</span>
              Ask for market map, competitor set and investable company referrals.
            </li>
            <li>
              <span className="block font-semibold text-ink">3. Derive</span>
              Promote companies and public-source paths that repeat across the source trail.
            </li>
          </ol>
        </DetailPanel>
      </div>
      <EvidenceRail sources={expert.sources} missing={expert.missing_profile_facts} />
    </div>
  );
}

function CompanyDetail({ company }: { company?: DerivedCompanyCandidate }) {
  if (!company) return <EmptyDetail />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">{company.name}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              {company.why_interesting}
            </p>
          </div>
          <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
            {COMPANY_CATEGORY_LABEL[company.category]}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {company.themes.map((theme) => (
            <ThemeTag key={theme} id={theme} small />
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MiniMetric label="Ownership" value={company.ownership_status} detail={company.owner ?? "No owner mapped"} />
          <MiniMetric label="Expert edges" value={company.expert_connections.length} detail="Named people" />
          <MiniMetric label="Priority" value={company.scores.research_priority} detail="Research score" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailPanel title="Best expert paths">
            <ul className="space-y-2">
              {company.expert_connections.slice(0, 8).map((expert) => (
                <li key={expert.expert_candidate_id} className="flex items-start justify-between gap-3 text-[12px]">
                  <span>
                    <span className="font-semibold">{expert.name}</span>
                    <span className="text-ink-faint"> · {EXPERT_TYPE_LABEL[expert.expert_type]}</span>
                  </span>
                  <span className="tabular-nums text-ink-faint">{expert.expert_priority}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
          <DetailPanel title="Deal context">
            <ul className="space-y-2">
              {company.deal_connections.slice(0, 5).map((deal) => (
                <li key={deal.id} className="text-[12px] leading-relaxed">
                  <span className="font-semibold">{deal.name}</span>
                  <span className="text-ink-soft"> · {deal.lane} · {THEME_BY_ID[deal.theme].shortName}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
        </div>

        <DetailPanel title="Next diligence questions" className="mt-4">
          <ul className="grid gap-2 text-[12px] leading-relaxed text-ink-soft md:grid-cols-2">
            {defaultCompanyQuestions(company).map((question) => (
              <li key={question}>• {question}</li>
            ))}
          </ul>
        </DetailPanel>
      </div>
      <EvidenceRail sources={"sources" in company ? company.sources ?? [] : []} />
    </div>
  );
}

function GapDetail({ gap }: { gap?: AdvisorExpertGap }) {
  if (!gap) return <EmptyDetail />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">{gap.organization}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">
              Find the named {EXPERT_TYPE_LABEL[gap.expert_type_sought].toLowerCase()} behind{" "}
              {gap.advisor_role.replaceAll("-", " ")} work.
            </p>
          </div>
          <PriorityScore value={gap.search_priority} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {gap.themes.map((theme) => (
            <ThemeTag key={theme} id={theme} small />
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailPanel title="Deals that created the gap">
            <ul className="space-y-2">
              {gap.deals.map((deal) => (
                <li key={deal.deal_id} className="text-[12px] leading-relaxed">
                  <span className="font-semibold">{deal.target}</span>
                  <span className="text-ink-soft"> · {deal.deal_name}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
          <DetailPanel title="Search strings to run">
            <ul className="space-y-2">
              {gap.search_queries.slice(0, 4).map((search) => (
                <li key={search} className="rounded-md bg-paper p-2 font-mono text-[11px] leading-relaxed text-ink-soft">
                  {search}
                </li>
              ))}
            </ul>
          </DetailPanel>
        </div>

        <DetailPanel title="Success condition" className="mt-4">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Identify at least one senior named person with source-grounded evidence for the exact
            transaction role, then promote the person into the expert queue with a call objective.
          </p>
        </DetailPanel>
      </div>
      <EvidenceRail sources={"sources" in gap ? gap.sources ?? [] : []} />
    </div>
  );
}

function EvidenceRail({
  sources,
  missing = [],
}: {
  sources: { title: string; publisher?: string; url: string; evidence: string }[];
  missing?: string[];
}) {
  return (
    <aside className="space-y-4">
      <DetailPanel title="Source evidence">
        <ul className="space-y-3">
          {sources.slice(0, 6).map((source) => (
            <li key={`${source.url}-${source.title}`} className="text-[12px] leading-relaxed">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="ee-link font-semibold">
                {source.title}
              </a>
              {source.publisher ? <div className="text-[11px] text-ink-faint">{source.publisher}</div> : null}
              <p className="mt-1 text-ink-soft">{source.evidence}</p>
            </li>
          ))}
          {!sources.length ? (
            <li className="text-[12px] text-ink-faint">No source snippets are mapped yet.</li>
          ) : null}
        </ul>
      </DetailPanel>
      {missing.length ? (
        <DetailPanel title="Facts still missing">
          <div className="flex flex-wrap gap-2">
            {missing.map((fact) => (
              <Badge key={fact} className="border-amber-200 bg-amber-50 text-amber-700">
                {fact.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        </DetailPanel>
      ) : null}
    </aside>
  );
}

function InsightMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="ee-insight-metric">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[26px] font-semibold tabular-nums">{value}</div>
      <p className="mt-1 text-[12px] text-ink-soft">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="ee-label">{label}</div>
      <div className="mt-1 text-[16px] font-semibold">{value}</div>
      <p className="mt-1 text-[11px] text-ink-faint">{detail}</p>
    </div>
  );
}

function DetailPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-line bg-white p-4 ${className}`}>
      <div className="ee-label">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function PriorityScore({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-semibold tabular-nums">
      <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
      {value}
    </span>
  );
}

function EmptyQueue() {
  return (
    <div className="p-8 text-center text-[13px] text-ink-soft">
      No leads match the current filters. Broaden the theme or clear the search.
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded-md border border-line bg-paper p-6 text-[13px] text-ink-soft">
      Select a lead above to see public evidence, relationship paths and next actions.
    </div>
  );
}

function formatAccessPath(path: ExpertDiscoveryCandidate["access_path"]) {
  const labels: Record<ExpertDiscoveryCandidate["access_path"], string> = {
    "direct-towerbrook-dealmaker": "Public TowerBrook dealmaker",
    "towerbrook-deal-participant": "Public TowerBrook deal participant",
    "peer-deal-participant": "Peer deal participant",
  };
  return labels[path];
}

function defaultCompanyQuestions(company: DerivedCompanyCandidate) {
  const sourceQuestions =
    "next_questions" in company && Array.isArray(company.next_questions)
      ? (company.next_questions as string[])
      : [];
  return sourceQuestions.length
    ? sourceQuestions.slice(0, 4)
    : [
        "Is this company actionable despite its current ownership?",
        "Which expert can provide the strongest introduction or diligence path?",
        "Which adjacent companies should be mapped next?",
        "What has changed since the most recent transaction?",
      ];
}

function buildJobRequest(
  lead: ExpertDiscoveryCandidate | DerivedCompanyCandidate | AdvisorExpertGap | undefined,
  currentTheme: ThemeFocus,
) {
  if (!lead) {
    return {
      themeId: currentTheme,
      jobType: "deep_discovery",
      query: `Find public-source PE deals, named experts, advisors, counsel, lenders, and target companies across ${THEME_LABEL[currentTheme]}.`,
    };
  }

  const themeId = pickTheme(lead.themes, currentTheme);

  if ("gap_id" in lead) {
    return {
      themeId,
      jobType: "advisor_expert_gap",
      query: `${lead.organization} ${lead.advisor_role} named senior professional public source deal team ${lead.deals
        .map((deal) => deal.target)
        .join(" ")}`,
    };
  }

  if ("expert_type" in lead) {
    return {
      themeId,
      jobType: "identity_resolution",
      query: `${lead.name} ${lead.organizations.join(" ")} public profile current role employment history deal role ${lead.connected_companies
        .map((company) => company.name)
        .join(" ")}`,
    };
  }

  return {
    themeId,
    jobType: "founder_origination",
    query: `${lead.name} public sources competitors founders operators acquisitions investments board advisors ${lead.expert_connections
      .slice(0, 5)
      .map((expert) => expert.name)
      .join(" ")}`,
  };
}

function pickTheme(themes: ThemeId[], focus: ThemeFocus): ThemeFocus {
  if (focus !== "all" && themes.includes(focus)) return focus;
  return themes[0] ?? "all";
}

const THEME_LABEL: Record<ThemeFocus, string> = {
  all: "all themes",
  "clean-energy-advisory": "Clean Energy Advisory",
  "grid-infrastructure": "Grid Infrastructure",
  "smart-water": "Smart Water",
};
