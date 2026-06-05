"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import { Badge, ThemeTag } from "@/app/components/ui";
import {
  COMPANY_CATEGORY_LABEL,
  EXPERT_TYPE_LABEL,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import { THEME_BY_ID, THEMES } from "@/lib/themes";
import type { CompanyCategory, ExpertType, RelationshipType, ThemeId } from "@/lib/types";

type FactStatus = "verified" | "partial" | "missing";
type WorkspaceTab = "dashboard" | "experts" | "companies" | "actions";

export interface WorkspaceMetrics {
  experts: number;
  companies: number;
  discoveryExperts: number;
  derivedCompanies: number;
  missingCompanyFacts: number;
  warmPaths: number;
}

export interface WorkspaceCompany {
  id: string;
  name: string;
  href: string;
  description: string;
  whyInteresting: string;
  category: CompanyCategory;
  themes: ThemeId[];
  stage: string;
  ownershipStatus: string;
  owner?: string;
  website?: string;
  domain?: string;
  logoUrl?: string;
  facts: { label: string; value: string; status: FactStatus }[];
  sourceCount: number;
  confidence: number;
  expertCount: number;
  missingFacts: number;
  towerBrookPath: string;
}

export interface WorkspaceExpert {
  id: string;
  name: string;
  href: string;
  type: ExpertType;
  headline: string;
  org?: string;
  location?: string;
  themes: ThemeId[];
  specialties: string[];
  whyRelevant: string;
  bio?: string;
  score: number;
  scoreParts: {
    base: number;
    companyEdges: number;
    signals: number;
    access: number;
  };
  relationshipPath: string;
  relationshipReasons: string[];
  confidence: number;
  sourceCount: number;
  linkedin?: string;
  email?: string;
  linkedCompanies: {
    id: string;
    name: string;
    href: string;
    relationship: RelationshipType;
    note: string;
  }[];
  nextAction: string;
}

interface PeopleExpertWorkspaceProps {
  initialTheme: ThemeId | "all";
  metrics: WorkspaceMetrics;
  experts: WorkspaceExpert[];
  companies: WorkspaceCompany[];
}

const TAB_LABEL: Record<WorkspaceTab, string> = {
  dashboard: "Dashboard",
  experts: "Expert pool",
  companies: "Company map",
  actions: "AI actions",
};

interface AgentLane {
  name: string;
  lane: string;
  status: string;
  job: string;
  queue: number;
  blocked: number;
  latest: string;
  href: string;
  cta: string;
}

const AGENT_BASE = [
  {
    name: "Data gathering agent",
    lane: "Data",
    job: "Find people, companies, funding, launch dates, websites, evidence and missing facts.",
  },
  {
    name: "UX workflow agent",
    lane: "Workflow",
    job: "Prioritize call queues, company validation, warm-intro paths and review states.",
  },
  {
    name: "AI functionality agent",
    lane: "AI",
    job: "Generate call prep, outreach, meeting briefings, research prompts and CRM updates.",
  },
];

function buildAgentLanes(metrics: WorkspaceMetrics): AgentLane[] {
  return [
    {
      ...AGENT_BASE[0],
      status: metrics.missingCompanyFacts > 0 ? "Needs enrichment" : "Ready",
      queue: metrics.discoveryExperts + metrics.derivedCompanies,
      blocked: metrics.missingCompanyFacts,
      latest: "Static graph loaded",
      href: "/discover",
      cta: "Open data queue",
    },
    {
      ...AGENT_BASE[1],
      status: metrics.warmPaths > 0 ? "Call queue ready" : "Needs intro paths",
      queue: metrics.experts,
      blocked: Math.max(0, metrics.experts - metrics.warmPaths),
      latest: "Ranked by theme fit",
      href: "/experts",
      cta: "Review call queue",
    },
    {
      ...AGENT_BASE[2],
      status: "Ready to generate",
      queue: metrics.experts + metrics.companies,
      blocked: metrics.missingCompanyFacts,
      latest: "Grounded actions available",
      href: "/ask",
      cta: "Ask the graph",
    },
  ];
}

function matchesTheme(themes: ThemeId[], theme: ThemeId | "all") {
  return theme === "all" || themes.includes(theme);
}

function statusClass(status: FactStatus) {
  if (status === "verified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-line bg-paper text-ink-faint";
}

function expertTriage(expert: WorkspaceExpert) {
  if (expert.sourceCount < 2 || expert.confidence < 0.75) return "Needs enrichment";
  if (!expert.linkedin && !expert.email) return "Find contact path";
  if (expert.relationshipPath.startsWith("No public")) return "Need intro";
  return "Ready to call";
}

function expertTriageClass(expert: WorkspaceExpert) {
  const triage = expertTriage(expert);
  if (triage === "Ready to call") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (triage === "Need intro" || triage === "Find contact path") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-line bg-white text-ink-soft";
}

function companyTriage(company: WorkspaceCompany) {
  if (company.missingFacts >= 3) return "Needs enrichment";
  if (company.expertCount === 0) return "Find expert";
  if (company.confidence >= 0.8) return "Ready to validate";
  return "Review evidence";
}

function companyTriageClass(company: WorkspaceCompany) {
  const triage = companyTriage(company);
  if (triage === "Ready to validate") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (triage === "Needs enrichment" || triage === "Find expert") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-line bg-white text-ink-soft";
}

function faviconUrl(company: WorkspaceCompany) {
  if (company.logoUrl) return company.logoUrl;
  if (!company.domain) return undefined;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(company.domain)}&sz=64`;
}

export default function PeopleExpertWorkspace({
  initialTheme,
  metrics,
  experts,
  companies,
}: PeopleExpertWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>("dashboard");
  const [theme, setTheme] = useState<ThemeId | "all">(initialTheme);
  const [query, setQuery] = useState("");
  const [selectedExpertId, setSelectedExpertId] = useState(experts[0]?.id ?? "");
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id ?? "");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredExperts = useMemo(
    () =>
      experts
        .filter((expert) => matchesTheme(expert.themes, theme))
        .filter((expert) => {
          if (!normalizedQuery) return true;
          return [
            expert.name,
            expert.headline,
            expert.org ?? "",
            expert.whyRelevant,
            expert.specialties.join(" "),
            expert.linkedCompanies.map((company) => company.name).join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        }),
    [experts, normalizedQuery, theme],
  );
  const filteredCompanies = useMemo(
    () =>
      companies
        .filter((company) => matchesTheme(company.themes, theme))
        .filter((company) => {
          if (!normalizedQuery) return true;
          return [
            company.name,
            company.description,
            company.whyInteresting,
            company.stage,
            company.owner ?? "",
            company.domain ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        }),
    [companies, normalizedQuery, theme],
  );

  const selectedExpert =
    filteredExperts.find((expert) => expert.id === selectedExpertId) ?? filteredExperts[0];
  const selectedCompany =
    filteredCompanies.find((company) => company.id === selectedCompanyId) ?? filteredCompanies[0];
  const agentLanes = useMemo(() => buildAgentLanes(metrics), [metrics]);
  const currentThemeLabel =
    theme === "all" ? "All three themes" : THEME_BY_ID[theme]?.name ?? "Selected theme";

  const callFirst = filteredExperts.slice(0, 5);
  const factGaps = filteredCompanies
    .filter((company) => company.missingFacts > 0)
    .slice(0, 5);

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1600px]">
        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-6">
              <div className="ee-label text-accent">People expert workspace</div>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="max-w-4xl text-[30px] font-semibold tracking-tight">
                    Run expert discovery, company mapping and AI prep in one place
                  </h1>
                  <p className="mt-3 max-w-4xl text-[13px] leading-relaxed text-ink-soft">
                    Built for a time-constrained investment professional: pick a theme, review
                    the best people to call, inspect material company facts, and push the next
                    action into the investor workspace.
                  </p>
                </div>
                <Link href="/discover" className="ee-button ee-button-primary shrink-0">
                  Run live enrichment
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Expert profiles" value={metrics.experts} detail={`${metrics.warmPaths} warm/public paths`} />
                <MetricCard label="Companies" value={metrics.companies} detail={`${metrics.derivedCompanies} derived candidates`} />
                <MetricCard label="People to verify" value={metrics.discoveryExperts} detail="Research queue leads" />
                <MetricCard label="Missing facts" value={metrics.missingCompanyFacts} detail="Funding, launch, status gaps" tone="warning" />
              </div>
            </div>
            <div className="border-t border-line bg-[#fbfcff] p-5 xl:border-l xl:border-t-0">
              <div className="ee-label text-ink">Parallel agent lanes</div>
              <div className="mt-3 space-y-3">
                {agentLanes.map((agent) => (
                  <article key={agent.name} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-semibold">{agent.name}</div>
                      <span className="rounded-full border border-line bg-paper px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                        {agent.lane}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">{agent.job}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <LaneMetric label="Queue" value={agent.queue} />
                      <LaneMetric label="Blocked" value={agent.blocked} warning={agent.blocked > 0} />
                      <LaneMetric label="Latest" value={agent.latest} text />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-accent">{agent.status}</span>
                      <Link href={agent.href} className="text-[11px] font-semibold text-accent hover:underline">
                        {agent.cta}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 ee-panel rounded-lg">
          <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex overflow-x-auto rounded-md border border-line bg-paper p-1">
              {(Object.keys(TAB_LABEL) as WorkspaceTab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`min-h-9 shrink-0 rounded px-3 text-[12px] font-semibold ${
                    tab === item ? "bg-white text-accent shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {TAB_LABEL[item]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeId | "all")}
                className="min-h-9 rounded-md border border-line-strong bg-white px-3 text-[12px] font-semibold text-ink"
                aria-label="Theme"
              >
                <option value="all">All three themes</option>
                {THEMES.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search experts, companies, funding, specialties..."
                className="min-h-9 w-full rounded-md border border-line-strong bg-white px-3 text-[12px] text-ink outline-none focus:border-accent sm:w-[360px]"
              />
            </div>
          </div>

          {tab === "dashboard" ? (
            <DashboardView
              themeLabel={currentThemeLabel}
              experts={filteredExperts}
              companies={filteredCompanies}
              callFirst={callFirst}
              factGaps={factGaps}
            />
          ) : null}
          {tab === "experts" ? (
            <ExpertPoolView
              experts={filteredExperts}
              selectedExpert={selectedExpert}
              onSelect={setSelectedExpertId}
            />
          ) : null}
          {tab === "companies" ? (
            <CompanyMapView
              companies={filteredCompanies}
              selectedCompany={selectedCompany}
              onSelect={setSelectedCompanyId}
            />
          ) : null}
          {tab === "actions" ? (
            <ActionsView
              selectedExpert={selectedExpert}
              selectedCompany={selectedCompany}
              experts={filteredExperts}
              companies={filteredCompanies}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function LaneMetric({
  label,
  value,
  warning = false,
  text = false,
}: {
  label: string;
  value: number | string;
  warning?: boolean;
  text?: boolean;
}) {
  return (
    <div className={`rounded border px-2 py-1 ${warning ? "border-amber-200 bg-amber-50" : "border-line bg-paper"}`}>
      <div className={`${text ? "truncate text-[10px]" : "text-[13px]"} font-semibold tabular-nums text-ink`}>
        {value}
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-faint">{label}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className={`rounded-lg border p-4 ${tone === "warning" ? "border-amber-200 bg-amber-50" : "border-line bg-white"}`}>
      <div className="text-[24px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</div>
      <div className="mt-2 text-[11px] text-ink-faint">{detail}</div>
    </div>
  );
}

function DashboardView({
  themeLabel,
  experts,
  companies,
  callFirst,
  factGaps,
}: {
  themeLabel: string;
  experts: WorkspaceExpert[];
  companies: WorkspaceCompany[];
  callFirst: WorkspaceExpert[];
  factGaps: WorkspaceCompany[];
}) {
  const highConfidenceCompanies = companies.filter((company) => company.confidence >= 0.8).length;
  return (
    <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_440px]">
      <main className="min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="ee-label text-ink">Command center</div>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight">{themeLabel}</h2>
          </div>
          <div className="text-[12px] text-ink-soft">
            {experts.length} experts · {companies.length} companies · {highConfidenceCompanies} high-confidence company records
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <WorkflowColumn title="Call first" subtitle="Highest utility experts">
            {callFirst.map((expert) => (
              <ExpertMiniCard key={expert.id} expert={expert} />
            ))}
          </WorkflowColumn>
          <WorkflowColumn title="Company fact gaps" subtitle="Data agent should complete these">
            {factGaps.map((company) => (
              <CompanyMiniCard key={company.id} company={company} />
            ))}
          </WorkflowColumn>
          <WorkflowColumn title="This week" subtitle="Suggested operating rhythm">
            <ActionCard title="Monday meeting pack" body="Summarize new experts, high-confidence companies, missing facts and call queue changes." href="/reports" />
            <ActionCard title="Theme call block" body="Schedule first five expert calls and capture company referrals back into the map." href="/experts" />
            <ActionCard title="Enrichment pass" body="Run live discovery for launch dates, funding history, websites and profile gaps." href="/discover" />
          </WorkflowColumn>
        </div>
      </main>
      <aside className="border-t border-line bg-[#fbfcff] p-4 sm:p-5 xl:border-l xl:border-t-0">
        <div className="ee-label text-ink">How PE users should operate it</div>
        <ol className="mt-3 space-y-3 text-[12px] leading-relaxed text-ink-soft">
          <li><strong className="text-ink">1. Start with people.</strong> Pick the expert most likely to explain market structure or unlock non-obvious companies.</li>
          <li><strong className="text-ink">2. Validate companies.</strong> Review funding, ownership, launch date, product status and source confidence before adding to pipeline.</li>
          <li><strong className="text-ink">3. Use AI for prep.</strong> Generate call briefs and outreach from sourced context, then save outputs to the workspace.</li>
          <li><strong className="text-ink">4. Feed the graph.</strong> After every call, add mentioned companies and people back into the review queue.</li>
        </ol>
      </aside>
    </div>
  );
}

function ExpertPoolView({
  experts,
  selectedExpert,
  onSelect,
}: {
  experts: WorkspaceExpert[];
  selectedExpert?: WorkspaceExpert;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="overflow-x-auto">
        <table className="ee-table min-w-[1160px]">
          <thead>
            <tr>
              <th>Expert</th>
              <th>Theme fit</th>
              <th>Why relevant</th>
              <th>Companies unlocked</th>
              <th>Status</th>
              <th>Relationship</th>
              <th>Reachability</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {experts.map((expert) => (
              <tr
                key={expert.id}
                className={selectedExpert?.id === expert.id ? "bg-[#f7fbff]" : "hover:bg-[#fbfcff]"}
              >
                <td className="min-w-[250px]">
                  <button type="button" onClick={() => onSelect(expert.id)} className="text-left">
                    <span className="ee-link">{expert.name}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-soft">{expert.headline}</span>
                  </button>
                </td>
                <td>
                  <div className="text-[22px] font-semibold tabular-nums">{expert.score}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">score</div>
                </td>
                <td className="max-w-[360px] text-[11px] leading-relaxed text-ink-soft">
                  <span className="line-clamp-3">{expert.whyRelevant}</span>
                </td>
                <td className="max-w-[260px] text-[11px] text-ink-soft">
                  {expert.linkedCompanies.slice(0, 3).map((company) => company.name).join(", ") || "Ask for referrals"}
                </td>
                <td>
                  <Badge className={expertTriageClass(expert)}>
                    {expertTriage(expert)}
                  </Badge>
                </td>
                <td>
                  <Badge className={expert.relationshipPath.startsWith("No public") ? "border-line bg-white text-ink-soft" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                    {expert.relationshipPath}
                  </Badge>
                </td>
                <td className="text-[11px] text-ink-soft">
                  <div>{expert.linkedin ? "LinkedIn available" : "LinkedIn missing"}</div>
                  <div>{expert.email ? "Email available" : "Email to enrich"}</div>
                </td>
                <td>
                  <WorkspaceActionButton
                    item={{
                      id: expert.id,
                      kind: "call",
                      name: expert.name,
                      sub: expert.headline,
                      href: expert.href,
                      theme: expert.themes[0],
                      note: expert.nextAction,
                    }}
                  >
                    Save call
                  </WorkspaceActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ExpertDetailPanel expert={selectedExpert} />
    </div>
  );
}

function ExpertDetailPanel({ expert }: { expert?: WorkspaceExpert }) {
  const [pendingContact, setPendingContact] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [contactError, setContactError] = useState("");

  async function enrichContact(fact: "linkedin" | "email") {
    if (!expert) return;
    setPendingContact(fact);
    setContactMessage("");
    setContactError("");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId: expert.themes[0],
          jobType: "missing_fact_enrichment",
          targetType: "expert",
          targetId: expert.id,
          targetName: expert.name,
          missingFact: fact,
          metadata: {
            category: "expert-contact-completion",
            missing_fact_types: [fact],
            target_name: expert.name,
            expert_id: expert.id,
            headline: expert.headline,
            organization: expert.org,
            review_gated: true,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not queue contact enrichment.");
      setContactMessage(enrichmentMessage(data, fact === "linkedin" ? "LinkedIn" : "email"));
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "Could not run contact enrichment.");
    } finally {
      setPendingContact(null);
    }
  }

  if (!expert) {
    return <aside className="border-t border-line p-5 text-[13px] text-ink-soft xl:border-l xl:border-t-0">No expert selected.</aside>;
  }
  return (
    <aside className="border-t border-line bg-[#fbfcff] p-5 xl:border-l xl:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="ee-label text-ink">Selected expert</div>
          <h2 className="mt-2 text-[20px] font-semibold">{expert.name}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{expert.headline}</p>
        </div>
        <div className="rounded-lg border border-line bg-white px-3 py-2 text-center">
          <div className="text-[22px] font-semibold tabular-nums">{expert.score}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">fit</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="border-line bg-white text-ink-soft">{EXPERT_TYPE_LABEL[expert.type]}</Badge>
        <Badge className={expertTriageClass(expert)}>{expertTriage(expert)}</Badge>
        {expert.themes.map((theme) => <ThemeTag key={theme} id={theme} small />)}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink">{expert.bio ?? expert.whyRelevant}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ScorePart label="Base" value={expert.scoreParts.base} />
        <ScorePart label="Company edges" value={expert.scoreParts.companyEdges} />
        <ScorePart label="Signals" value={expert.scoreParts.signals} />
        <ScorePart label="Access" value={expert.scoreParts.access} />
      </div>
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="ee-label text-ink">Access and contactability</div>
        <div className="mt-3 space-y-2 text-[12px] text-ink-soft">
          <div><strong className="text-ink">Relationship:</strong> {expert.relationshipPath}</div>
          <div>
            <strong className="text-ink">LinkedIn:</strong>{" "}
            {expert.linkedin ? (
              <a href={expert.linkedin} className="ee-link" target="_blank" rel="noopener noreferrer">Open profile</a>
            ) : (
              <button
                type="button"
                onClick={() => enrichContact("linkedin")}
                disabled={pendingContact === "linkedin"}
                className="font-semibold text-accent hover:underline disabled:opacity-50"
              >
                {pendingContact === "linkedin" ? "Queueing..." : "Find LinkedIn"}
              </button>
            )}
          </div>
          <div>
            <strong className="text-ink">Email:</strong>{" "}
            {expert.email ? (
              <a href={`mailto:${expert.email}`} className="ee-link">{expert.email}</a>
            ) : (
              <button
                type="button"
                onClick={() => enrichContact("email")}
                disabled={pendingContact === "email"}
                className="font-semibold text-accent hover:underline disabled:opacity-50"
              >
                {pendingContact === "email" ? "Queueing..." : "Find email"}
              </button>
            )}
          </div>
        </div>
        {contactMessage || contactError ? (
          <div
            className={`mt-3 rounded border px-3 py-2 text-[11px] ${
              contactError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {contactError || contactMessage}
          </div>
        ) : null}
      </section>
      <section className="mt-5">
        <div className="ee-label text-ink">Companies this person points to</div>
        <div className="mt-3 space-y-2">
          {expert.linkedCompanies.slice(0, 5).map((company) => (
            <Link key={`${expert.id}-${company.id}`} href={company.href} className="block rounded-lg border border-line bg-white p-3 hover:border-line-strong">
              <span className="text-[13px] font-semibold text-accent">{company.name}</span>
              <span className="mt-1 block text-[11px] text-ink-soft">{RELATIONSHIP_LABEL[company.relationship]} · {company.note}</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href={expert.href} className="ee-button ee-button-primary">Open profile</Link>
        <Link href={`/ask?expert=${expert.id}`} className="ee-button ee-button-secondary">Ask AI</Link>
      </div>
    </aside>
  );
}

function CompanyMapView({
  companies,
  selectedCompany,
  onSelect,
}: {
  companies: WorkspaceCompany[];
  selectedCompany?: WorkspaceCompany;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="overflow-x-auto">
        <table className="ee-table min-w-[1160px]">
          <thead>
            <tr>
              <th>Company</th>
              <th>Material facts</th>
              <th>Why interesting</th>
              <th>Expert evidence</th>
              <th>Status</th>
              <th>Ownership</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                className={selectedCompany?.id === company.id ? "bg-[#f7fbff]" : "hover:bg-[#fbfcff]"}
              >
                <td className="min-w-[250px]">
                  <button type="button" onClick={() => onSelect(company.id)} className="flex items-center gap-3 text-left">
                    <CompanyLogo company={company} />
                    <span>
                      <span className="ee-link">{company.name}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-soft">{company.domain ?? "Website to enrich"}</span>
                    </span>
                  </button>
                </td>
                <td className="min-w-[300px]">
                  <div className="flex flex-wrap gap-1.5">
                    {company.facts.slice(0, 4).map((fact) => (
                      <span key={fact.label} className={`rounded border px-2 py-1 text-[10px] font-semibold ${statusClass(fact.status)}`}>
                        {fact.label}: {fact.value}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="max-w-[360px] text-[11px] leading-relaxed text-ink-soft">
                  <span className="line-clamp-3">{company.whyInteresting}</span>
                </td>
                <td>
                  <div className="text-[18px] font-semibold tabular-nums">{company.expertCount}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">experts</div>
                </td>
                <td>
                  <Badge className={companyTriageClass(company)}>
                    {companyTriage(company)}
                  </Badge>
                </td>
                <td className="text-[11px] text-ink-soft">
                  <div>{company.ownershipStatus}</div>
                  {company.owner ? <div>{company.owner}</div> : null}
                </td>
                <td>
                  <WorkspaceActionButton
                    item={{
                      id: company.id,
                      kind: "target",
                      name: company.name,
                      sub: company.whyInteresting,
                      href: company.href,
                      theme: company.themes[0],
                    }}
                  >
                    Save target
                  </WorkspaceActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CompanyDetailPanel company={selectedCompany} />
    </div>
  );
}

function CompanyDetailPanel({ company }: { company?: WorkspaceCompany }) {
  const [pendingFact, setPendingFact] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState("");
  const [jobError, setJobError] = useState("");

  async function enrichFact(fact: WorkspaceCompany["facts"][number]) {
    if (!company) return;
    setPendingFact(fact.label);
    setJobMessage("");
    setJobError("");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId: company.themes[0],
          jobType: "missing_fact_enrichment",
          targetType: "company",
          targetId: company.id,
          targetName: company.name,
          targetWebsite: company.website,
          missingFact: factTypeForLabel(fact.label),
          metadata: {
            category: "company-fact-completion",
            missing_fact_types: [factTypeForLabel(fact.label)],
            target_name: company.name,
            target_company_id: company.id,
            target_website: company.website,
            review_gated: true,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not queue enrichment.");
      setJobMessage(enrichmentMessage(data, fact.label.toLowerCase()));
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Could not run enrichment.");
    } finally {
      setPendingFact(null);
    }
  }

  if (!company) {
    return <aside className="border-t border-line p-5 text-[13px] text-ink-soft xl:border-l xl:border-t-0">No company selected.</aside>;
  }
  return (
    <aside className="border-t border-line bg-[#fbfcff] p-5 xl:border-l xl:border-t-0">
      <div className="flex items-start gap-3">
        <CompanyLogo company={company} large />
        <div>
          <div className="ee-label text-ink">Selected company</div>
          <h2 className="mt-2 text-[20px] font-semibold">{company.name}</h2>
          <p className="mt-1 text-[12px] text-ink-soft">{COMPANY_CATEGORY_LABEL[company.category]} · {company.stage}</p>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink">{company.description}</p>
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="ee-label text-ink">Material fact checklist</div>
        <div className="mt-3 space-y-2">
          {company.facts.map((fact) => (
            <div key={fact.label} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-b-0 last:pb-0">
              <div>
                <div className="text-[12px] font-semibold">{fact.label}</div>
                <div className="mt-0.5 text-[11px] text-ink-soft">{fact.value}</div>
                {fact.status !== "verified" ? (
                  <button
                    type="button"
                    onClick={() => enrichFact(fact)}
                    disabled={pendingFact === fact.label}
                    className="mt-1 inline-block text-[11px] font-semibold text-accent hover:underline disabled:opacity-50"
                  >
                    {pendingFact === fact.label
                      ? "Queueing..."
                      : fact.status === "missing"
                        ? "Find this fact"
                        : "Verify this fact"}
                  </button>
                ) : null}
              </div>
              <span className={`rounded border px-2 py-1 text-[10px] font-semibold ${statusClass(fact.status)}`}>{fact.status}</span>
            </div>
          ))}
        </div>
        {jobMessage || jobError ? (
          <div
            className={`mt-3 rounded border px-3 py-2 text-[11px] ${
              jobError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {jobError || jobMessage}
          </div>
        ) : null}
      </section>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ScorePart label="Sources" value={company.sourceCount} />
        <ScorePart label="Experts" value={company.expertCount} />
        <ScorePart label="Confidence" value={Math.round(company.confidence * 100)} suffix="%" />
      </div>
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="ee-label text-ink">Relationship path</div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{company.towerBrookPath}</p>
      </section>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href={company.href} className="ee-button ee-button-primary">Open profile</Link>
        {company.website ? (
          <a href={company.website} target="_blank" rel="noopener noreferrer" className="ee-button ee-button-secondary">Open website</a>
        ) : (
          <Link href={`/discover?company=${company.id}`} className="ee-button ee-button-secondary">Find website</Link>
        )}
      </div>
    </aside>
  );
}

function enrichmentMessage(data: unknown, label: string) {
  const processing =
    data && typeof data === "object" && "processing" in data
      ? (data as { processing?: Record<string, unknown> }).processing
      : undefined;
  if (!processing) return `Started ${label} enrichment job.`;
  if (processing.error) return `Ran ${label} enrichment but it needs review: ${String(processing.error)}`;
  const facts = Number(processing.fact_candidates ?? 0);
  const companies = Number(processing.company_candidates ?? 0);
  const people = Number(processing.people_candidates ?? 0);
  const sources = Number(processing.sources ?? 0);
  if (processing.processed === false) return `Started ${label} enrichment job.`;
  return `Ran ${label} enrichment now: ${facts} facts, ${companies + people} entities, ${sources} sources.`;
}

function factTypeForLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("seed")) return "seed_round";
  if (normalized.includes("last funding")) return "last_funding";
  if (normalized.includes("total")) return "total_funding";
  if (normalized.includes("launch")) return "launch_date";
  if (normalized.includes("product")) return "product_live_status";
  if (normalized.includes("logo")) return "logo_url";
  if (normalized.includes("website")) return "website";
  return normalized.replaceAll(" ", "_");
}

function ActionsView({
  selectedExpert,
  selectedCompany,
  experts,
  companies,
}: {
  selectedExpert?: WorkspaceExpert;
  selectedCompany?: WorkspaceCompany;
  experts: WorkspaceExpert[];
  companies: WorkspaceCompany[];
}) {
  const firstExpert = selectedExpert ?? experts[0];
  const firstCompany = selectedCompany ?? companies[0];
  return (
    <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-3">
      <ActionBuilder
        title="Call prep agent"
        body={`Creates a sourced one-page call brief${firstExpert ? ` for ${firstExpert.name}` : ""}, including why call, smart questions and watch-outs.`}
        href={firstExpert ? `${firstExpert.href}#call-actions` : "/experts"}
        cta={firstExpert ? `Prep ${firstExpert.name}` : "Choose expert"}
      />
      <ActionBuilder
        title="Outreach agent"
        body="Drafts a concise expert outreach note grounded only in known profile and company-edge evidence."
        href={firstExpert ? `${firstExpert.href}#call-actions` : "/experts"}
        cta="Draft outreach"
      />
      <ActionBuilder
        title="Data enrichment agent"
        body={`Builds the next search task${firstCompany ? ` for ${firstCompany.name}` : ""}: missing funding, launch date, product status, website, LinkedIn and email fields.`}
        href={firstCompany ? `/discover?company=${firstCompany.id}` : "/discover"}
        cta={firstCompany ? `Enrich ${firstCompany.name}` : "Open queue"}
      />
      <ActionBuilder
        title="Meeting briefing"
        body="Combines CRM context, external research and theme evidence into a partner-ready briefing."
        href="/reports"
        cta="Build memo"
      />
      <ActionBuilder
        title="Intro path finder"
        body="Uses relationship paths and company edges to identify who can reach a person or company."
        href="/graph"
        cta="Open graph"
      />
      <ActionBuilder
        title="Post-call extractor"
        body="After a call, convert notes into new people, companies, facts and follow-up actions."
        href="/ingest"
        cta="Ingest notes"
      />
    </div>
  );
}

function WorkflowColumn({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-[#fbfcff] p-3">
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <p className="mt-1 text-[11px] text-ink-faint">{subtitle}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ExpertMiniCard({ expert }: { expert: WorkspaceExpert }) {
  return (
    <Link href={expert.href} className="block rounded-lg border border-line bg-white p-3 hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-accent">{expert.name}</div>
          <div className="mt-1 line-clamp-2 text-[11px] text-ink-soft">{expert.headline}</div>
        </div>
        <div className="rounded bg-paper px-2 py-1 text-[12px] font-semibold tabular-nums">{expert.score}</div>
      </div>
    </Link>
  );
}

function CompanyMiniCard({ company }: { company: WorkspaceCompany }) {
  return (
    <Link href={company.href} className="flex gap-3 rounded-lg border border-line bg-white p-3 hover:border-line-strong">
      <CompanyLogo company={company} />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-accent">{company.name}</span>
        <span className="mt-1 block text-[11px] text-ink-soft">{company.missingFacts} missing facts · {company.expertCount} experts</span>
      </span>
    </Link>
  );
}

function ActionCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-line bg-white p-3 hover:border-line-strong">
      <div className="text-[13px] font-semibold text-accent">{title}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{body}</p>
    </Link>
  );
}

function ActionBuilder({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="ee-label text-accent">AI workflow</div>
      <h3 className="mt-2 text-[16px] font-semibold">{title}</h3>
      <p className="mt-2 min-h-[56px] text-[12px] leading-relaxed text-ink-soft">{body}</p>
      <Link href={href} className="ee-button ee-button-secondary mt-4 w-full">{cta}</Link>
    </article>
  );
}

function ScorePart({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="text-[18px] font-semibold tabular-nums">{value}{suffix}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</div>
    </div>
  );
}

function CompanyLogo({ company, large = false }: { company: WorkspaceCompany; large?: boolean }) {
  const favicon = faviconUrl(company);
  const initials = company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const sizeClass = large ? "h-14 w-14" : "h-10 w-10";
  return (
    <span className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white text-[12px] font-semibold text-accent`}>
      {favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="h-6 w-6" />
      ) : (
        initials
      )}
    </span>
  );
}
