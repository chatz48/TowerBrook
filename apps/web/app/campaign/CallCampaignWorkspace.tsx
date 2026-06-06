"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const DEFAULT_STATE: CampaignState = {
  owner: "Unassigned",
  status: "Not started",
  note: "",
};

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

export default function CallCampaignWorkspace({
  themeLabel,
  storageKey,
  metrics,
  experts,
  companies,
  gaps,
  sourceCompanyCount,
}: CallCampaignWorkspaceProps) {
  const [state, setState] = useState<Record<string, CampaignState>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let nextState: Record<string, CampaignState> = {};
    try {
      const stored = window.localStorage.getItem(storageKey);
      nextState = stored ? JSON.parse(stored) : {};
    } catch {
      nextState = {};
    }
    const timeout = window.setTimeout(() => setState(nextState), 0);
    return () => window.clearTimeout(timeout);
  }, [storageKey]);

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
    setState({});
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

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <section className="ee-panel rounded-lg p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <div className="ee-label text-accent">Origination desk</div>
              <h1 className="mt-3 max-w-4xl text-[30px] font-semibold tracking-tight">
                Turn the map into an assigned origination plan
              </h1>
              <p className="mt-3 max-w-4xl text-[13px] leading-relaxed text-ink-soft">
                Assign owners, track outreach status, capture notes, and export a
                Monday-ready origination pack. This closes the loop from expert discovery
                to calls, referrals, company validation, and memo prep.
              </p>
              <div className="mt-4 text-[12px] font-semibold text-ink-soft">
                Scope: {themeLabel}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
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
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">1. Expert calls to run this week</h2>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Prioritized by readiness, source confidence and company edges. Capture owner,
                  status and the ask for each call.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="ee-table min-w-[1120px]">
                  <thead>
                    <tr>
                      <th>Expert</th>
                      <th>Readiness</th>
                      <th>Call objective</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Notes / referral asks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experts.map((expert) => {
                      const id = `expert:${expert.id}`;
                      const current = rowState(state, id);
                      return (
                        <tr key={expert.id}>
                          <td className="min-w-[260px]">
                            <Link href={expert.href} className="ee-link">
                              {expert.name}
                            </Link>
                            <div className="mt-0.5 text-[11px] text-ink-soft">
                              {expert.headline}
                            </div>
                          </td>
                          <td className="min-w-[170px]">
                            <div className="text-[12px] font-semibold text-ink">
                              {expert.readiness}
                            </div>
                            <div className="mt-1 text-[11px] text-ink-faint">
                              {expert.confidence}
                            </div>
                          </td>
                          <td className="max-w-[330px] text-[11px] leading-relaxed text-ink-soft">
                            {expert.objective}
                          </td>
                          <td>
                            <SelectControl
                              value={current.owner}
                              options={OWNERS}
                              label={`Owner for ${expert.name}`}
                              onChange={(owner) => update(id, { owner })}
                            />
                          </td>
                          <td>
                            <SelectControl
                              value={current.status}
                              options={STATUSES}
                              label={`Status for ${expert.name}`}
                              onChange={(status) => update(id, { status })}
                            />
                          </td>
                          <td className="min-w-[260px]">
                            <input
                              value={current.note}
                              onChange={(event) => update(id, { note: event.target.value })}
                              placeholder="Add ask, blocker, referral or call note"
                              className="h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[12px] text-ink outline-none focus:border-accent"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="targets" className="ee-panel overflow-hidden rounded-lg scroll-mt-28">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">2. Target companies to validate</h2>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Track ownership, scale and commercial-diligence verification before
                  promoting a company to memo-ready.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="ee-table min-w-[1080px]">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>PE score</th>
                      <th>Next diligence action</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Notes / blockers</th>
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
                          <td className="min-w-[155px]">
                            <div className="text-[20px] font-semibold tabular-nums">
                              {company.score}
                            </div>
                            <div className="mt-1 text-[11px] text-ink-faint">
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
                          <td className="min-w-[260px]">
                            <input
                              value={current.note}
                              onChange={(event) => update(id, { note: event.target.value })}
                              placeholder="Add diligence blocker or next step"
                              className="h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[12px] text-ink outline-none focus:border-accent"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </main>

          <aside className="space-y-5">
            <section className="ee-panel rounded-lg p-4">
              <div className="ee-label text-ink">Coverage gaps to close</div>
              <div className="mt-3 space-y-2">
                {gaps.filter((gap) => gap.severity !== "low").length ? (
                  gaps
                    .filter((gap) => gap.severity !== "low")
                    .map((gap) => <GapCard key={gap.archetype} gap={gap} />)
                ) : (
                  <div className="rounded-md border border-line bg-white p-3 text-[12px] text-ink-soft">
                    No high-priority taxonomy gaps flagged in this scope.
                  </div>
                )}
              </div>
              <Link href="/discover" className="ee-button ee-button-secondary mt-4 w-full">
                Open research queue
              </Link>
            </section>

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
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: CampaignMetric }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-[24px] font-semibold tabular-nums">{metric.value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {metric.label}
      </div>
      <div className="mt-2 text-[11px] text-ink-faint">{metric.detail}</div>
    </div>
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
      className="h-10 min-w-[150px] rounded-md border border-line-strong bg-white px-3 text-[12px] text-ink outline-none focus:border-accent"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
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
