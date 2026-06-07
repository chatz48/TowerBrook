"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import OperatorWorkflowRail from "@/app/components/OperatorWorkflowRail";
import { PageShell } from "@/app/components/ui";

export interface CampaignMetric {
  label: string;
  value: number;
  detail: string;
}

export interface CampaignExpert {
  id: string;
  name: string;
  href: string;
  headline: string;
  readiness: string;
  confidence: string;
  objective: string;
  phase: "Market orientation" | "Buyer validation" | "Deal intelligence";
  sourceCount: number;
  companyEdges: number;
}

export interface CampaignCompany {
  id: string;
  name: string;
  href: string;
  score: number;
  label: string;
  ownership: string;
  stage: string;
  expertCount: number;
  nextAction: string;
}

export interface CampaignGap {
  archetype: string;
  total: number;
  verified: number;
  contactable: number;
  severity: "high" | "medium" | "low";
}

interface CampaignState {
  owner: string;
  status: string;
  note: string;
}

interface CallCampaignWorkspaceProps {
  themeLabel: string;
  storageKey: string;
  metrics: CampaignMetric[];
  experts: CampaignExpert[];
  companies: CampaignCompany[];
  gaps: CampaignGap[];
  sourceCompanyCount: number;
  selectedExpertIds: string[];
}

const OWNERS = ["Unassigned", "Arun", "Danielle", "Deal team", "Operating partner"];
const STATUSES = [
  "Not started",
  "Owner assigned",
  "Outreach sent",
  "Scheduled",
  "Completed",
  "Promoted",
  "Rejected",
];
const ACTIVE_STATUSES = new Set(["Outreach sent", "Scheduled", "Completed"]);
const CLOSED_STATUSES = new Set(["Completed", "Promoted", "Rejected"]);
const PHASES: CampaignExpert["phase"][] = [
  "Market orientation",
  "Buyer validation",
  "Deal intelligence",
];

const DEFAULT_STATE: CampaignState = {
  owner: "Unassigned",
  status: "Not started",
  note: "",
};

function seedCampaignState(experts: CampaignExpert[], companies: CampaignCompany[]) {
  const seeded: Record<string, CampaignState> = {};
  const owners = ["Arun", "Danielle", "Deal team", "Operating partner"];
  const statuses = ["Scheduled", "Outreach sent", "Owner assigned", "Completed"];

  experts.slice(0, 4).forEach((expert, index) => {
    seeded[`expert:${expert.id}`] = {
      owner: owners[index % owners.length],
      status: statuses[index % statuses.length],
      note:
        index === 0
          ? "Use as first orientation call; ask for two named referrals."
          : index === 1
            ? "Confirm availability and strongest company edge."
            : "",
    };
  });
  companies.slice(0, 3).forEach((company, index) => {
    seeded[`company:${company.id}`] = {
      owner: owners[(index + 1) % owners.length],
      status: index === 0 ? "Owner assigned" : "Not started",
      note: index === 0 ? "Validate ownership and sponsor angle before memo." : "",
    };
  });

  return seeded;
}

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function rowState(state: Record<string, CampaignState>, id: string) {
  return state[id] ?? DEFAULT_STATE;
}

function severityClass(severity: CampaignGap["severity"]) {
  if (severity === "high") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function askHref(prompt: string) {
  return `/ask?prompt=${encodeURIComponent(prompt)}`;
}

export default function CallCampaignWorkspace({
  themeLabel,
  storageKey,
  metrics,
  experts,
  companies,
  gaps,
  sourceCompanyCount,
  selectedExpertIds,
}: CallCampaignWorkspaceProps) {
  const [state, setState] = useState<Record<string, CampaignState>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let nextState: Record<string, CampaignState> = {};
    try {
      const stored = window.localStorage.getItem(storageKey);
      nextState = stored ? JSON.parse(stored) : seedCampaignState(experts, companies);
    } catch {
      nextState = seedCampaignState(experts, companies);
    }
    const timeout = window.setTimeout(() => setState(nextState), 0);
    return () => window.clearTimeout(timeout);
  }, [companies, experts, storageKey]);

  function update(id: string, patch: Partial<CampaignState>) {
    setState((current) => {
      const next = {
        ...current,
        [id]: {
          ...rowState(current, id),
          ...patch,
        },
      };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  function reset() {
    const seeded = seedCampaignState(experts, companies);
    setState(seeded);
    window.localStorage.removeItem(storageKey);
  }

  const itemIds = useMemo(
    () => [
      ...experts.map((expert) => `expert:${expert.id}`),
      ...companies.map((company) => `company:${company.id}`),
    ],
    [companies, experts],
  );
  const assignedCount = itemIds.filter((id) => {
    const item = rowState(state, id);
    return item.owner !== "Unassigned" || item.status !== "Not started";
  }).length;
  const activeCount = itemIds.filter((id) => ACTIVE_STATUSES.has(rowState(state, id).status)).length;
  const closedCount = itemIds.filter((id) => CLOSED_STATUSES.has(rowState(state, id).status)).length;

  const csvHref = useMemo(() => {
    const rows = [
      ["kind", "name", "readiness_or_score", "owner", "status", "note", "href"],
      ...experts.map((expert) => {
        const current = rowState(state, `expert:${expert.id}`);
        return [
          "call",
          expert.name,
          expert.readiness,
          current.owner,
          current.status,
          current.note,
          expert.href,
        ];
      }),
      ...companies.map((company) => {
        const current = rowState(state, `company:${company.id}`);
        return [
          "target",
          company.name,
          `${company.score}/100 ${company.label}`,
          current.owner,
          current.status,
          current.note,
          company.href,
        ];
      }),
    ];
    return `data:text/csv;charset=utf-8,${encodeURIComponent(
      rows.map((row) => row.map(csvEscape).join(",")).join("\n"),
    )}`;
  }, [companies, experts, state]);

  function meetingPack() {
    const expertLines = experts.map((expert, index) => {
      const current = rowState(state, `expert:${expert.id}`);
      return `${index + 1}. ${expert.name} - ${expert.readiness}; owner: ${current.owner}; status: ${current.status}; ask: ${expert.objective}${current.note ? `; note: ${current.note}` : ""}`;
    });
    const companyLines = companies.map((company, index) => {
      const current = rowState(state, `company:${company.id}`);
      return `${index + 1}. ${company.name} - ${company.score}/100 ${company.label}; owner: ${current.owner}; status: ${current.status}; next: ${company.nextAction}${current.note ? `; note: ${current.note}` : ""}`;
    });
    const gapLines = gaps
      .filter((gap) => gap.severity !== "low")
      .map(
        (gap) =>
          `- ${gap.archetype}: ${gap.total} mapped, ${gap.verified} verified, ${gap.contactable} contactable (${gap.severity})`,
      );
    return [
      `TowerBrook People Expert Origination Plan - ${themeLabel}`,
      "",
      "Expert calls to run this week:",
      ...expertLines,
      "",
      "Target companies to validate:",
      ...companyLines,
      "",
      "Coverage gaps:",
      ...(gapLines.length ? gapLines : ["- No high-priority taxonomy gaps flagged in this scope."]),
      "",
      `Scope note: ${sourceCompanyCount} companies are available in the source graph before origination plan filtering.`,
    ].join("\n");
  }

  async function copyMeetingPack() {
    try {
      await navigator.clipboard.writeText(meetingPack());
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  const planReviewPrompt = [
    `Review this TowerBrook origination plan for ${themeLabel}.`,
    "Prioritise the next 5 actions, flag missing expert coverage, suggest which companies should be validated first, and draft partner-meeting talking points.",
    `Experts: ${experts.slice(0, 6).map((expert) => expert.name).join("; ")}`,
    `Companies: ${companies.slice(0, 6).map((company) => `${company.name} (${company.score}/100)`).join("; ")}`,
    `Open gaps: ${gaps.filter((gap) => gap.severity !== "low").slice(0, 5).map((gap) => `${gap.archetype} ${gap.severity}`).join("; ") || "No high-priority gaps"}`,
    `Progress: ${assignedCount} assigned or started, ${activeCount} active, ${closedCount} closed.`,
  ].join("\n");
  const selectedExpertSet = useMemo(() => new Set(selectedExpertIds), [selectedExpertIds]);

  return (
    <PageShell>
        <section className="ee-panel rounded-lg p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>
              <div className="ee-label text-accent">Origination desk</div>
              <h1 className="mt-1 max-w-4xl text-[20px] font-semibold tracking-tight">
                Turn the map into an assigned origination plan
              </h1>
              <p className="mt-1.5 max-w-4xl text-[11px] leading-relaxed text-ink-soft">
                Assign owners, track outreach status, capture notes, and export a
                Monday-ready origination pack.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-ink-soft">
                Scope: {themeLabel}
              </div>
              {selectedExpertIds.length ? (
                <div className="mt-3 inline-flex rounded-md border border-accent/25 bg-[#f4f8ff] px-3 py-2 text-[12px] font-semibold text-accent">
                  {selectedExpertIds.length} selected expert{selectedExpertIds.length === 1 ? "" : "s"} pinned from the call list
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href={askHref(planReviewPrompt)} className="ee-button ee-button-primary">
                Ask AI to review plan
              </Link>
              <button type="button" onClick={copyMeetingPack} className="ee-button ee-button-primary">
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy meeting pack"}
              </button>
              <a href={csvHref} download="towerbrook-origination-plan.csv" className="ee-button ee-button-secondary">
                Export CSV
              </a>
              <button type="button" onClick={reset} className="ee-button ee-button-secondary">
                Reset statuses
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
            <MetricCard
              metric={{
                label: "Assigned / started",
                value: assignedCount,
                detail: "Owner or status set",
              }}
            />
            <MetricCard
              metric={{
                label: "Outreach active",
                value: activeCount,
                detail: "Sent, scheduled or done",
              }}
            />
            <MetricCard
              metric={{
                label: "Closed loop",
                value: closedCount,
                detail: "Completed / promoted / rejected",
              }}
            />
          </div>
        </section>

        <OperatorWorkflowRail
          title="Run the week, then feed the evidence back"
          subtitle="The campaign is the execution layer: assign each call or target, record the result, and turn completed work into memo evidence or new research gaps."
          steps={[
            {
              label: "Assign",
              detail: "Put an owner and status on every call or company before outreach.",
            },
            {
              label: "Capture",
              detail: "Use notes to record referrals, target claims and objections.",
            },
            {
              label: "Decide",
              detail: "Promote, reject or return items to research before the meeting pack.",
            },
          ]}
          actions={[
            { label: "Review with AI", href: askHref(planReviewPrompt), primary: true },
            { label: "Open memo", href: "/reports" },
            { label: "Research gaps", href: "/discover?severity=high" },
          ]}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-3 py-2.5">
                <h2 className="ee-label text-ink">1. Expert calls to run this week</h2>
                <p className="mt-0.5 text-[10px] text-ink-faint">
                  Sequenced into practical call phases. Capture owner, status and the ask for
                  each call; selected experts from the call list stay pinned at the top.
                </p>
              </div>
              <div className="divide-y divide-line">
                {PHASES.map((phase, phaseIndex) => {
                  const phaseExperts = experts.filter((expert) => expert.phase === phase);
                  return (
                    <div key={phase} className="p-3">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-semibold text-ink">
                            Phase {phaseIndex + 1}: {phase}
                          </div>
                          <p className="mt-0.5 text-[10px] text-ink-faint">
                            {phase === "Market orientation"
                              ? "Start with operators and founders to define pain, budgets and referral routes."
                              : phase === "Buyer validation"
                                ? "Use bankers, investors and lenders to test buyer appetite and ownership facts."
                                : "Finish with advisors, lawyers and diligence providers to verify transaction evidence."}
                          </p>
                        </div>
                        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                          {phaseExperts.length} call{phaseExperts.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {phaseExperts.length ? (
                        <>
                          <div className="hidden overflow-x-auto lg:block">
                            <table className="ee-table min-w-[1020px]">
                              <thead>
                                <tr>
                                  <th>Expert</th>
                                  <th>Call objective</th>
                                  <th>Owner</th>
                                  <th>Status</th>
                                  <th>Notes / referral asks</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {phaseExperts.map((expert) => (
                                  <ExpertPlanRow
                                    key={expert.id}
                                    expert={expert}
                                    current={rowState(state, `expert:${expert.id}`)}
                                    themeLabel={themeLabel}
                                    pinned={selectedExpertSet.has(expert.id)}
                                    onUpdate={(patch) => update(`expert:${expert.id}`, patch)}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="space-y-3 lg:hidden">
                            {phaseExperts.map((expert) => (
                              <ExpertPlanCard
                                key={expert.id}
                                expert={expert}
                                current={rowState(state, `expert:${expert.id}`)}
                                themeLabel={themeLabel}
                                pinned={selectedExpertSet.has(expert.id)}
                                onUpdate={(patch) => update(`expert:${expert.id}`, patch)}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md border border-dashed border-line-strong bg-[#fbfcff] px-3 py-4 text-[12px] text-ink-soft">
                          No experts in this phase yet. Add advisors, lawyers, diligence providers or other service
                          providers from the expert list to close this part of the call sequence.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="targets" className="ee-panel overflow-hidden rounded-lg scroll-mt-28">
              <div className="border-b border-line px-3 py-2.5">
                <h2 className="ee-label text-ink">2. Target companies to validate</h2>
                <p className="mt-0.5 text-[10px] text-ink-faint">
                  Track ownership, scale and commercial-diligence verification before
                  promoting a company to memo-ready.
                </p>
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="ee-table min-w-[1220px]">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>PE score</th>
                      <th>Next diligence action</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Notes / blockers</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => {
                      const id = `company:${company.id}`;
                      const current = rowState(state, id);
                      return (
                        <tr key={company.id}>
                          <td className="min-w-[240px]">
                            <Link href={company.href} className="ee-link">
                              {company.name}
                            </Link>
                            <div className="mt-0.5 text-[11px] text-ink-soft">
                              {company.stage} / {company.ownership}
                            </div>
                          </td>
                          <td className="min-w-[140px]">
                            <div className="text-[17px] font-semibold tabular-nums">
                              {company.score}
                            </div>
                            <div className="mt-0.5 text-[10px] text-ink-faint">
                              {company.label}
                            </div>
                          </td>
                          <td className="max-w-[360px] text-[11px] leading-relaxed text-ink-soft">
                            {company.nextAction}
                          </td>
                          <td>
                            <SelectControl
                              value={current.owner}
                              options={OWNERS}
                              label={`Owner for ${company.name}`}
                              onChange={(owner) => update(id, { owner })}
                            />
                          </td>
                          <td>
                            <SelectControl
                              value={current.status}
                              options={STATUSES}
                              label={`Status for ${company.name}`}
                              onChange={(status) => update(id, { status })}
                            />
                          </td>
                          <td className="min-w-[240px]">
                            <input
                              value={current.note}
                              onChange={(event) => update(id, { note: event.target.value })}
                              placeholder="Add diligence blocker or next step"
                              className="h-8 w-full rounded-md border border-line-strong bg-white px-2 text-[11px] text-ink outline-none focus:border-accent"
                            />
                          </td>
                          <td className="min-w-[150px]">
                            <div className="flex flex-wrap gap-2">
                              <WorkspaceActionButton
                                item={{
                                  id: company.id,
                                  kind: "target",
                                  name: company.name,
                                  sub: `${company.score}/100 ${company.label}`,
                                  href: company.href,
                                  theme: themeLabel,
                                  note: `${company.nextAction}${current.note ? ` Note: ${current.note}` : ""}`,
                                  status: current.status === "Not started" ? "origination plan" : current.status.toLowerCase(),
                                }}
                                className="ee-button ee-button-secondary min-h-8 px-3"
                              >
                                Save
                              </WorkspaceActionButton>
                              <Link
                                href={askHref(
                                  `Prepare a company validation brief for ${company.name} in ${themeLabel}. PE score: ${company.score}/100 ${company.label}. Next diligence action: ${company.nextAction}. Current owner: ${current.owner}. Current status: ${current.status}. Note: ${current.note || "None"}. Include people to call, evidence gaps, and memo implications.`,
                                )}
                                className="ee-button ee-button-secondary min-h-8 px-3"
                              >
                                Ask AI
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 lg:hidden">
                {companies.map((company) => {
                  const id = `company:${company.id}`;
                  return (
                    <CompanyPlanCard
                      key={company.id}
                      company={company}
                      current={rowState(state, id)}
                      themeLabel={themeLabel}
                      onUpdate={(patch) => update(id, patch)}
                    />
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="space-y-5">


            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Coverage by archetype</h2>
              </div>
              <div className="divide-y divide-line">
                {gaps.map((gap) => (
                  <div key={gap.archetype} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-semibold">{gap.archetype}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityClass(gap.severity)}`}>
                        {gap.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-ink-faint">
                      {gap.total} total / {gap.verified} verified / {gap.contactable} contactable
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ee-panel rounded-lg p-4">
              <div className="ee-label text-ink">Support evidence</div>
              <div className="mt-3 grid gap-2">
                <SupportLink href="/graph" title="Relationship graph" body="Explain intro paths and company edges." />
                <SupportLink href="/deals" title="Deal evidence" body="Review PE transactions and advisor signals." />
                <SupportLink href="/ingest" title="Post-call notes" body="Convert call notes into new people, targets and facts." />
              </div>
            </section>
          </aside>
        </div>
    </PageShell>
  );
}

function MetricCard({ metric }: { metric: CampaignMetric }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="text-[20px] font-semibold tabular-nums">{metric.value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {metric.label}
      </div>
      <div className="mt-1.5 text-[10px] text-ink-faint">{metric.detail}</div>
    </div>
  );
}

function ExpertPlanRow({
  expert,
  current,
  themeLabel,
  pinned,
  onUpdate,
}: {
  expert: CampaignExpert;
  current: CampaignState;
  themeLabel: string;
  pinned: boolean;
  onUpdate: (patch: Partial<CampaignState>) => void;
}) {
  return (
    <tr className={pinned ? "bg-[#f8fbff]" : undefined}>
      <td className="min-w-[220px]">
        <Link href={expert.href} className="ee-link">
          {expert.name}
        </Link>
        {pinned ? (
          <span className="ml-2 rounded-full border border-accent/25 bg-[#eef5ff] px-2 py-0.5 text-[10px] font-semibold text-accent">
            Pinned
          </span>
        ) : null}
        <div className="mt-0.5 text-[11px] text-ink-soft">{expert.headline}</div>
      </td>
      <td className="min-w-[400px] max-w-[520px] text-[11px] leading-relaxed text-ink-soft">{expert.objective}</td>
      <td>
        <SelectControl value={current.owner} options={OWNERS} label={`Owner for ${expert.name}`} onChange={(owner) => onUpdate({ owner })} />
      </td>
      <td>
        <SelectControl value={current.status} options={STATUSES} label={`Status for ${expert.name}`} onChange={(status) => onUpdate({ status })} />
      </td>
      <td className="min-w-[260px]">
        <NoteInput value={current.note} placeholder="Add ask, blocker, referral or call note" onChange={(note) => onUpdate({ note })} />
      </td>
      <td className="min-w-[150px]">
        <ExpertActions expert={expert} current={current} themeLabel={themeLabel} />
      </td>
    </tr>
  );
}

function ExpertPlanCard({
  expert,
  current,
  themeLabel,
  pinned,
  onUpdate,
}: {
  expert: CampaignExpert;
  current: CampaignState;
  themeLabel: string;
  pinned: boolean;
  onUpdate: (patch: Partial<CampaignState>) => void;
}) {
  return (
    <article className={`rounded-lg border bg-white p-4 ${pinned ? "border-accent/35" : "border-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={expert.href} className="ee-link text-[14px] font-semibold">{expert.name}</Link>
          <p className="mt-1 text-[12px] text-ink-soft">{expert.headline}</p>
        </div>
        {pinned ? <span className="rounded-full border border-accent/25 bg-[#eef5ff] px-2 py-1 text-[10px] font-semibold text-accent">Pinned</span> : null}
      </div>
      <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-1">
        <div>
          <div className="ee-label text-ink-faint">Edges</div>
          <div className="mt-1 font-semibold">{expert.companyEdges} companies · {expert.sourceCount} sources</div>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">{expert.objective}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SelectControl value={current.owner} options={OWNERS} label={`Owner for ${expert.name}`} onChange={(owner) => onUpdate({ owner })} />
        <SelectControl value={current.status} options={STATUSES} label={`Status for ${expert.name}`} onChange={(status) => onUpdate({ status })} />
      </div>
      <div className="mt-2">
        <NoteInput value={current.note} placeholder="Add ask, blocker, referral or call note" onChange={(note) => onUpdate({ note })} />
      </div>
      <div className="mt-3">
        <ExpertActions expert={expert} current={current} themeLabel={themeLabel} />
      </div>
    </article>
  );
}

function ExpertActions({
  expert,
  current,
  themeLabel,
}: {
  expert: CampaignExpert;
  current: CampaignState;
  themeLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <WorkspaceActionButton
        item={{
          id: expert.id,
          kind: "call",
          name: expert.name,
          sub: expert.headline,
          href: expert.href,
          theme: themeLabel,
          note: `${expert.objective}${current.note ? ` Note: ${current.note}` : ""}`,
          status: current.status === "Not started" ? "origination plan" : current.status.toLowerCase(),
        }}
        className="ee-button ee-button-secondary min-h-8 px-3"
      >
        Save
      </WorkspaceActionButton>
      <Link
        href={askHref(
          `Prepare an expert call brief for ${expert.name} in ${themeLabel}. Objective: ${expert.objective}. Current owner: ${current.owner}. Current status: ${current.status}. Note: ${current.note || "None"}. Include outreach angle, questions, likely referrals, and companies to validate.`,
        )}
        className="ee-button ee-button-secondary min-h-8 px-3"
      >
        Ask AI
      </Link>
    </div>
  );
}

function CompanyPlanCard({
  company,
  current,
  themeLabel,
  onUpdate,
}: {
  company: CampaignCompany;
  current: CampaignState;
  themeLabel: string;
  onUpdate: (patch: Partial<CampaignState>) => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={company.href} className="ee-link text-[14px] font-semibold">{company.name}</Link>
          <p className="mt-1 text-[12px] text-ink-soft">{company.stage} / {company.ownership}</p>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-semibold tabular-nums">{company.score}</div>
          <div className="text-[10px] text-ink-faint">{company.label}</div>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">{company.nextAction}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SelectControl value={current.owner} options={OWNERS} label={`Owner for ${company.name}`} onChange={(owner) => onUpdate({ owner })} />
        <SelectControl value={current.status} options={STATUSES} label={`Status for ${company.name}`} onChange={(status) => onUpdate({ status })} />
      </div>
      <div className="mt-2">
        <NoteInput value={current.note} placeholder="Add diligence blocker or next step" onChange={(note) => onUpdate({ note })} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <WorkspaceActionButton
          item={{
            id: company.id,
            kind: "target",
            name: company.name,
            sub: `${company.score}/100 ${company.label}`,
            href: company.href,
            theme: themeLabel,
            note: `${company.nextAction}${current.note ? ` Note: ${current.note}` : ""}`,
            status: current.status === "Not started" ? "origination plan" : current.status.toLowerCase(),
          }}
          className="ee-button ee-button-secondary min-h-8 px-3"
        >
          Save
        </WorkspaceActionButton>
        <Link
          href={askHref(
            `Prepare a company validation brief for ${company.name} in ${themeLabel}. PE score: ${company.score}/100 ${company.label}. Next diligence action: ${company.nextAction}. Current owner: ${current.owner}. Current status: ${current.status}. Note: ${current.note || "None"}. Include people to call, evidence gaps, and memo implications.`,
          )}
          className="ee-button ee-button-secondary min-h-8 px-3"
        >
          Ask AI
        </Link>
      </div>
    </article>
  );
}

function SelectControl({
  value,
  options,
  label,
  onChange,
}: {
  value: string;
  options: string[];
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="h-8 min-w-[120px] w-full rounded-md border border-line-strong bg-white px-2 text-[11px] text-ink outline-none focus:border-accent"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function NoteInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-8 w-full rounded-md border border-line-strong bg-white px-2 text-[11px] text-ink outline-none focus:border-accent"
    />
  );
}

function GapCard({ gap }: { gap: CampaignGap }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold">{gap.archetype}</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityClass(gap.severity)}`}>
          {gap.severity}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-ink-faint">
        {gap.total} mapped, {gap.verified} verified, {gap.contactable} contactable.
      </p>
    </div>
  );
}

function SupportLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="block rounded-md border border-line bg-white p-3 hover:border-line-strong">
      <span className="text-[12px] font-semibold text-accent">{title}</span>
      <span className="mt-1 block text-[11px] text-ink-soft">{body}</span>
    </Link>
  );
}
