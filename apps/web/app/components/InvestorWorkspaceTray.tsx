"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

export type WorkspaceKind = "call" | "target" | "memo";

interface WorkspaceItem {
  id: string;
  kind: WorkspaceKind;
  name: string;
  sub?: string;
  href: string;
  theme?: string;
  note?: string;
  status: string;
  addedAt: string;
}

interface WorkspaceActionButtonProps {
  item: Omit<WorkspaceItem, "addedAt" | "status"> & { status?: string };
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = "towerbrook-investor-workspace-v1";
const WORKSPACE_EVENT = "towerbrook-investor-workspace-updated";

const DEFAULT_STATUS: Record<WorkspaceKind, string> = {
  call: "shortlisted",
  target: "watchlist",
  memo: "copilot note",
};

const KIND_LABEL: Record<WorkspaceKind, string> = {
  call: "Experts to call",
  target: "Companies to validate",
  memo: "Memo notes",
};

export function WorkspaceActionButton({
  item,
  children,
  className = "ee-button ee-button-secondary min-h-8 px-3",
}: WorkspaceActionButtonProps) {
  const workspaceSnapshot = useSyncExternalStore(
    subscribeWorkspace,
    readWorkspaceSnapshot,
    () => "[]",
  );
  const saved = useMemo(
    () =>
      parseWorkspace(workspaceSnapshot).some(
        (existing) => existing.id === item.id && existing.kind === item.kind,
      ),
    [item.id, item.kind, workspaceSnapshot],
  );

  function save() {
    const current = readWorkspace();
    const nextItem: WorkspaceItem = {
      ...item,
      status: item.status ?? DEFAULT_STATUS[item.kind],
      addedAt: new Date().toISOString(),
    };
    const next = [
      nextItem,
      ...current.filter((existing) => !(existing.id === item.id && existing.kind === item.kind)),
    ].slice(0, 30);
    writeWorkspace(next);
    pulseBasketCounter();
  }

  return (
    <button type="button" onClick={save} className={className} aria-pressed={saved}>
      {saved ? "✓ Saved" : children}
    </button>
  );
}

export function isWorkspaceSaved(id: string, kind: WorkspaceKind): boolean {
  return readWorkspace().some((item) => item.id === id && item.kind === kind);
}

export default function InvestorWorkspaceTray() {
  const [open, setOpen] = useState(false);
  const workspaceSnapshot = useSyncExternalStore(
    subscribeWorkspace,
    readWorkspaceSnapshot,
    () => "[]",
  );
  const items = useMemo(() => parseWorkspace(workspaceSnapshot), [workspaceSnapshot]);

  const counts = useMemo(
    () => ({
      call: items.filter((item) => item.kind === "call").length,
      target: items.filter((item) => item.kind === "target").length,
      memo: items.filter((item) => item.kind === "memo").length,
    }),
    [items],
  );
  const basketPrompt = useMemo(() => {
    const names = items.slice(0, 12).map((item) => `${KIND_LABEL[item.kind]}: ${item.name}`);
    return encodeURIComponent(
      names.length
        ? `Prepare a call plan from the saved basket: call order, objective for each call, questions to ask, and what would raise or reduce conviction. Items: ${names.join("; ")}`
        : "Explain how to use the saved basket for expert calls, company validation and memo prep.",
    );
  }, [items]);

  function exportCsv() {
    const header = "Type,Name,Status,Theme,Note,Link";
    const rows = items.map((item) =>
      [
        KIND_LABEL[item.kind],
        item.name,
        item.status,
        item.theme ?? "",
        item.note ?? item.sub ?? "",
        item.href,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "towerbrook-basket.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    writeWorkspace([]);
  }

  function clearKind(kind: WorkspaceKind) {
    writeWorkspace(items.filter((item) => item.kind !== kind));
  }

  function removeItem(item: WorkspaceItem) {
    writeWorkspace(
      items.filter((existing) => !(existing.kind === item.kind && existing.id === item.id)),
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      {open ? (
        <section className="w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line-strong bg-white shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-line bg-[#fbfcfe] p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Current basket
              </div>
              <div className="mt-1 text-xs text-ink-faint">
                Experts, companies, and AI notes selected for this theme workflow.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-sm text-ink-soft hover:bg-paper"
              aria-label="Close investor workspace"
            >
              x
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-line">
            <WorkspaceCount label="Calls" value={counts.call} />
            <WorkspaceCount label="Targets" value={counts.target} />
            <WorkspaceCount label="Notes" value={counts.memo} />
          </div>

          <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-2">
            <Link href="/campaign" className="ee-button ee-button-secondary min-h-8 px-2 text-[11px]">
              Origination
            </Link>
            <Link href={`/ask?prompt=${basketPrompt}`} className="ee-button ee-button-primary min-h-8 px-2 text-[11px]">
              Generate call plan
            </Link>
            <button type="button" onClick={exportCsv} disabled={!items.length} className="ee-button ee-button-secondary min-h-8 px-2 text-[11px] disabled:opacity-50">
              Export CSV
            </button>
            <button type="button" onClick={clearAll} disabled={!items.length} className="ee-button ee-button-secondary min-h-8 px-2 text-[11px] disabled:opacity-50">
              Clear basket
            </button>
          </div>

          <div className="max-h-[58vh] overflow-y-auto p-3">
            {items.length ? (
              (["call", "target", "memo"] as const).map((kind) => (
                <WorkspaceSection
                  key={kind}
                  kind={kind}
                  items={items.filter((item) => item.kind === kind)}
                  onClear={clearKind}
                  onRemove={removeItem}
                />
              ))
            ) : (
              <div className="rounded-md border border-line bg-paper p-4 text-[13px] leading-relaxed text-ink-soft">
                Add experts, companies, or AI notes from the workflow pages. The basket
                becomes the shared context for Origination Desk, AI Copilot, and the theme memo.
              </div>
            )}
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg transition hover:border-accent hover:text-accent"
        >
          Basket
          <span
            id="towerbrook-basket-counter"
            className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-white transition-transform"
          >
            {items.length}
          </span>
        </button>
      )}
    </div>
  );
}

function WorkspaceCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-line px-3 py-2 last:border-r-0">
      <div className="text-[18px] font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</div>
    </div>
  );
}

function WorkspaceSection({
  kind,
  items,
  onClear,
  onRemove,
}: {
  kind: WorkspaceKind;
  items: WorkspaceItem[];
  onClear: (kind: WorkspaceKind) => void;
  onRemove: (item: WorkspaceItem) => void;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="ee-label text-ink">{KIND_LABEL[kind]}</h2>
        {items.length ? (
          <button type="button" onClick={() => onClear(kind)} className="text-[12px] font-semibold text-accent">
            Clear
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={`${item.kind}:${item.id}`} className="rounded-md border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={item.href} className="ee-link font-semibold">
                    {item.name}
                  </Link>
                  {item.sub ? (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">
                      {item.sub}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    <span>{item.status}</span>
                    {item.theme ? <span>{item.theme}</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-paper text-ink-faint hover:border-line-strong hover:text-ink"
                  aria-label={`Remove ${item.name}`}
                >
                  x
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-line bg-paper p-3 text-[12px] text-ink-faint">
            No {KIND_LABEL[kind].toLowerCase()} saved yet.
          </div>
        )}
      </div>
    </section>
  );
}

function readWorkspace(): WorkspaceItem[] {
  return parseWorkspace(readWorkspaceSnapshot());
}

function readWorkspaceSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function parseWorkspace(value: string): WorkspaceItem[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isWorkspaceItem) : [];
  } catch {
    return [];
  }
}

function subscribeWorkspace(onStoreChange: () => void) {
  window.addEventListener(WORKSPACE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(WORKSPACE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function writeWorkspace(items: WorkspaceItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(WORKSPACE_EVENT));
}

function pulseBasketCounter() {
  const counter = document.getElementById("towerbrook-basket-counter");
  if (!counter) return;
  counter.classList.add("scale-125");
  window.setTimeout(() => counter.classList.remove("scale-125"), 250);
}

function isWorkspaceItem(item: unknown): item is WorkspaceItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<WorkspaceItem>;
  return Boolean(
    candidate.id &&
      candidate.name &&
      candidate.href &&
      candidate.status &&
      candidate.addedAt &&
      (candidate.kind === "call" || candidate.kind === "target" || candidate.kind === "memo"),
  );
}
