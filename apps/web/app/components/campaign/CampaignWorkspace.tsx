"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ExpertType, ThemeId } from "@/lib/types";
import type { ThemeFocus } from "@/lib/investment-readiness";
import { PageShell } from "@/app/components/ui";

type CampaignStatus = "not-started" | "owner-assigned" | "outreach-sent" | "scheduled" | "completed" | "promoted" | "rejected";

type CampaignCall = {
  id: string;
  name: string;
  headline: string;
  href: string;
  readiness: string;
  reasons: string[];
  theme: ThemeId;
  companyCount: number;
};

type CampaignTarget = {
  id: string;
  name: string;
  href: string;
  score: number;
  scoreLabel: string;
  readiness: string;
  nextAction: string;
  theme: ThemeId;
  expertCount: number;
};

type CoverageRow = {
  type: ExpertType;
  label: string;
  total: number;
  verified: number;
  contactable: number;
  towerBrookPath: number;
  gapSeverity: "low" | "medium" | "high";
};

type ItemState = { owner: string; status: CampaignStatus; note: string };
type CampaignState = Record<string, ItemState>;

const STORAGE_PREFIX = "towerbrook-campaign";
const CAMPAIGN_EVENT = "towerbrook-campaign-change";
const DEFAULT_OWNERS = ["Unassigned", "Arun", "Danielle", "Deal team", "Operating partner"];
const STATUS_LABEL: Record<CampaignStatus, string> = {
  "not-started": "Not started",
  "owner-assigned": "Owner assigned",
  "outreach-sent": "Outreach sent",
  scheduled: "Scheduled",
  completed: "Completed",
  promoted: "Promoted",
  rejected: "Rejected",
};

export default function CampaignWorkspace({
  theme,
  calls,
  targets,
  gaps,
  coverage,
  nextSteps,
}: {
  theme: ThemeFocus;
  calls: CampaignCall[];
  targets: CampaignTarget[];
  gaps: string[];
  coverage: CoverageRow[];
  nextSteps: string[];
}) {
  const storageKey = `${STORAGE_PREFIX}:${theme}`;
  const snapshot = useSyncExternalStore(subscribeCampaign, () => readSnapshot(storageKey), () => "{}");
  const state = useMemo(() => parseState(snapshot), [snapshot]);
  const [copied, setCopied] = useState(false);
  const callRows = calls.slice(0, 8);
  const targetRows = targets.slice(0, 8);
  const stats = useMemo(() => {
    const values = [
      ...callRows.map((item) => getItemState(state, "call", item.id)),
      ...targetRows.map((item) => getItemState(state, "target", item.id)),
    ];
    return {
      total: values.length,
      assigned: values.filter((item) => item.owner !== "Unassigned" || item.status !== "not-started").length,
      completed: values.filter((item) => ["completed", "promoted", "rejected"].includes(item.status)).length,
      outreach: values.filter((item) => ["outreach-sent", "scheduled", "completed"].includes(item.status)).length,
    };
  }, [callRows, state, targetRows]);

  function updateItem(kind: "call" | "target", id: string, patch: Partial<ItemState>) {
    const key = itemKey(kind, id);
    writeState(storageKey, {
      ...state,
      [key]: { ...getItemState(state, kind, id), ...patch },
    });
  }

  function resetCampaign() {
    writeState(storageKey, {});
  }

  async function copyPack() {
    const payload = buildExport({ theme, calls: callRows, targets: targetRows, gaps, coverage, nextSteps, state });
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const csvHref = useMemo(() => {
    const csv = buildCsv({ calls: callRows, targets: targetRows, state });
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, [callRows, state, targetRows]);

  return (
    <PageShell>
        <header className="ee-panel rounded-lg p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="ee-label text-accent">Call campaign</div>
              <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Turn the map into an assigned outreach plan</h1>
              <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-ink-soft">
                Assign owners, track outreach status, capture notes, and export a Monday-ready campaign pack.
                This closes the loop from expert discovery to calls, referrals, company validation, and memo prep.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyPack} className="ee-button ee-button-primary">
                {copied ? "Copied" : "Copy meeting pack"}
              </button>
              <a href={csvHref} download={`towerbrook-campaign-${theme}.csv`} className="ee-button ee-button-secondary">
                Export CSV
              </a>
              <button type="button" onClick={resetCampaign} className="ee-button ee-button-secondary">
                Reset statuses
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Metric label="Campaign items" value={stats.total} detail="Calls and targets" />
            <Metric label="Assigned / started" value={stats.assigned} detail="Owner or status set" />
            <Metric label="Outreach active" value={stats.outreach} detail="Sent, scheduled or done" />
            <Metric label="Closed loop" value={stats.completed} detail="Completed / promoted / rejected" />
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="space-y-5 min-w-0">
            <CampaignTable
              title="1. Expert calls to run this week"
              description="Prioritised by readiness, source confidence and company edges. Capture owner, status and the ask for each call."
              rows={callRows}
              kind="call"
              state={state}
              onUpdate={updateItem}
            />
            <TargetTable rows={targetRows} state={state} onUpdate={updateItem} />
          </main>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Coverage gaps to close</div>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {(gaps.length ? gaps : ["No high-priority taxonomy gaps flagged in this scope."]).slice(0, 8).map((gap) => (
                  <li key={gap} className="rounded border border-line bg-white p-2">{gap}</li>
                ))}
              </ul>
              <Link href="/discover" className="ee-button ee-button-secondary mt-4 w-full">Open research queue</Link>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Coverage by archetype</div>
              <div className="mt-3 space-y-2">
                {coverage.map((row) => (
                  <div key={row.type} className="rounded border border-line bg-white p-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{row.label}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${gapClass(row.gapSeverity)}`}>{row.gapSeverity}</span>
                    </div>
                    <div className="mt-1 text-ink-faint">
                      {row.total} total · {row.verified} verified · {row.contactable} contactable · {row.towerBrookPath} TB paths
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Meeting pack checklist</div>
              <ol className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {nextSteps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-[#eef5ff] text-[10px] font-semibold text-accent">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Link href="/reports" className="ee-button ee-button-primary mt-4 w-full">Open report workspace</Link>
            </section>
          </aside>
        </div>
    </PageShell>
  );
}

function CampaignTable({
  title,
  description,
  rows,
  kind,
  state,
  onUpdate,
}: {
  title: string;
  description: string;
  rows: CampaignCall[];
  kind: "call";
  state: CampaignState;
  onUpdate: (kind: "call" | "target", id: string, patch: Partial<ItemState>) => void;
}) {
  return (
    <section className="ee-panel overflow-hidden rounded-lg">
      <div className="border-b border-line px-4 py-3">
        <h2 className="ee-label text-ink">{title}</h2>
        <p className="mt-1 text-[11px] text-ink-faint">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="ee-table min-w-[1180px]">
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
            {rows.map((row) => {
              const current = getItemState(state, kind, row.id);
              return (
                <tr key={row.id}>
                  <td className="min-w-[240px]">
                    <Link href={row.href} className="ee-link">{row.name}</Link>
                    <div className="mt-0.5 text-[11px] text-ink-soft">{row.headline}</div>
                  </td>
                  <td className="max-w-[220px] text-[11px] text-ink-soft">
                    <div className="font-semibold text-ink">{row.readiness}</div>
                    <div className="line-clamp-2">{row.reasons[0]}</div>
                  </td>
                  <td className="max-w-[260px] text-[12px] leading-relaxed text-ink-soft">
                    Validate their {row.companyCount} mapped company edge{row.companyCount === 1 ? "" : "s"} and ask for 2 founder/operator referrals.
                  </td>
                  <td><OwnerSelect value={current.owner} onChange={(owner) => onUpdate(kind, row.id, { owner, status: owner === "Unassigned" ? current.status : "owner-assigned" })} /></td>
                  <td><StatusSelect value={current.status} onChange={(status) => onUpdate(kind, row.id, { status })} /></td>
                  <td><NoteInput value={current.note} onChange={(note) => onUpdate(kind, row.id, { note })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TargetTable({ rows, state, onUpdate }: { rows: CampaignTarget[]; state: CampaignState; onUpdate: (kind: "call" | "target", id: string, patch: Partial<ItemState>) => void }) {
  return (
    <section className="ee-panel overflow-hidden rounded-lg">
      <div className="border-b border-line px-4 py-3">
        <h2 className="ee-label text-ink">2. Target companies to validate</h2>
        <p className="mt-1 text-[11px] text-ink-faint">Track ownership, scale and commercial-diligence verification before promoting a company to memo-ready.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="ee-table min-w-[1180px]">
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
            {rows.map((row) => {
              const current = getItemState(state, "target", row.id);
              return (
                <tr key={row.id}>
                  <td className="min-w-[240px]">
                    <Link href={row.href} className="ee-link">{row.name}</Link>
                    <div className="mt-0.5 text-[11px] text-ink-soft">{row.expertCount} linked expert{row.expertCount === 1 ? "" : "s"} · {row.readiness}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="font-semibold tabular-nums">{row.score}/100</div>
                    <div className="text-[10px] text-ink-faint">{row.scoreLabel}</div>
                  </td>
                  <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">{row.nextAction}</td>
                  <td><OwnerSelect value={current.owner} onChange={(owner) => onUpdate("target", row.id, { owner, status: owner === "Unassigned" ? current.status : "owner-assigned" })} /></td>
                  <td><StatusSelect value={current.status} onChange={(status) => onUpdate("target", row.id, { status })} /></td>
                  <td><NoteInput value={current.note} onChange={(note) => onUpdate("target", row.id, { note })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OwnerSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-line-strong bg-white px-2 text-[12px] outline-none focus:border-accent">
      {DEFAULT_OWNERS.map((owner) => <option key={owner}>{owner}</option>)}
    </select>
  );
}

function StatusSelect({ value, onChange }: { value: CampaignStatus; onChange: (value: CampaignStatus) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as CampaignStatus)} className="h-9 rounded-md border border-line-strong bg-white px-2 text-[12px] outline-none focus:border-accent">
      {Object.entries(STATUS_LABEL).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
    </select>
  );
}

function NoteInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Add ask, blocker, referral or call note" className="h-9 min-w-[280px] rounded-md border border-line-strong bg-white px-2 text-[12px] outline-none focus:border-accent" />
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-[22px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 text-[11px] text-ink-soft">{detail}</div>
    </div>
  );
}

function itemKey(kind: "call" | "target", id: string) {
  return `${kind}:${id}`;
}

function getItemState(state: CampaignState, kind: "call" | "target", id: string): ItemState {
  return state[itemKey(kind, id)] ?? { owner: "Unassigned", status: "not-started", note: "" };
}

function readSnapshot(storageKey: string) {
  if (typeof window === "undefined") return "{}";
  return window.localStorage.getItem(storageKey) ?? "{}";
}

function parseState(value: string): CampaignState {
  const fallback: CampaignState = {};
  try {
    const parsed = JSON.parse(value) as CampaignState;
    if (!parsed || typeof parsed !== "object") return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeState(storageKey: string, state: CampaignState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
  window.dispatchEvent(new Event(CAMPAIGN_EVENT));
}

function subscribeCampaign(onStoreChange: () => void) {
  window.addEventListener(CAMPAIGN_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CAMPAIGN_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function gapClass(severity: CoverageRow["gapSeverity"]) {
  if (severity === "low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function buildExport({ theme, calls, targets, gaps, coverage, nextSteps, state }: { theme: ThemeFocus; calls: CampaignCall[]; targets: CampaignTarget[]; gaps: string[]; coverage: CoverageRow[]; nextSteps: string[]; state: CampaignState }) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    theme,
    calls: calls.map((call) => ({ ...call, campaign: getItemState(state, "call", call.id) })),
    targets: targets.map((target) => ({ ...target, campaign: getItemState(state, "target", target.id) })),
    gaps,
    coverage,
    nextSteps,
  }, null, 2);
}

function buildCsv({ calls, targets, state }: { calls: CampaignCall[]; targets: CampaignTarget[]; state: CampaignState }) {
  const rows = [
    ["kind", "name", "readiness_or_score", "owner", "status", "note", "href"],
    ...calls.map((call) => {
      const current = getItemState(state, "call", call.id);
      return ["call", call.name, call.readiness, current.owner, STATUS_LABEL[current.status], current.note, call.href];
    }),
    ...targets.map((target) => {
      const current = getItemState(state, "target", target.id);
      return ["target", target.name, `${target.score}/100 ${target.scoreLabel}`, current.owner, STATUS_LABEL[current.status], current.note, target.href];
    }),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
