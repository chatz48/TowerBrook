"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { isThemeFocus, publishThemeFocus } from "@/lib/theme-focus";
import { ARCHETYPES, OBJECTIVES, THEMES } from "./constants";
import type { CopilotFilters } from "./types";

export function CopilotFiltersPanel({
  filters,
  resetFilters,
  onFiltersChange,
  onQuestionChange,
  onRun,
  skipBasketAutoRun = false,
  onSkipBasketAutoRunChange,
}: {
  filters: CopilotFilters;
  resetFilters: CopilotFilters;
  onFiltersChange: (filters: CopilotFilters) => void;
  onQuestionChange: (question: string) => void;
  onRun: (filters: CopilotFilters) => void;
  skipBasketAutoRun?: boolean;
  onSkipBasketAutoRunChange?: (skip: boolean) => void;
}) {
  function patch(patchFilters: Partial<CopilotFilters>) {
    const next = { ...filters, ...patchFilters };
    onFiltersChange(next);
    return next;
  }

  function toggleArchetype(value: string) {
    const selected = filters.archetypes.includes(value)
      ? filters.archetypes.filter((item) => item !== value)
      : [...filters.archetypes, value];
    patch({ archetypes: selected });
  }

  return (
    <aside className="max-h-[min(52vh,420px)] space-y-5 overflow-y-auto border-b border-line bg-paper p-3 sm:space-y-7 sm:p-4 md:max-h-none md:min-h-[calc(100vh-6.5rem)] md:border-b-0">
      <RailSection title="Session objective">
        <div className="space-y-2">
          {OBJECTIVES.map((objective) => (
            <button
              key={objective.value}
              onClick={() => {
                patch({ objective: objective.value });
                onQuestionChange(objective.prompt);
              }}
              className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs transition ${
                filters.objective === objective.value
                  ? "border-accent bg-card text-accent shadow-sm"
                  : "border-line bg-card text-ink-soft hover:border-line-strong"
              }`}
            >
              <span>{objective.label}</span>
              <span className="text-[10px]">0{OBJECTIVES.indexOf(objective) + 1}</span>
            </button>
          ))}
        </div>
      </RailSection>

      <RailSection
        title="Filters"
        action={
          <button
            onClick={() => {
              onFiltersChange(resetFilters);
              onRun(resetFilters);
              if (isThemeFocus(resetFilters.theme)) publishThemeFocus(resetFilters.theme);
            }}
            className="text-[11px] font-medium text-accent"
          >
            Reset
          </button>
        }
      >
        <ControlLabel label="Theme">
          <select
            value={filters.theme}
            onChange={(event) => {
              const next = patch({ theme: event.target.value });
              onRun(next);
              if (isThemeFocus(event.target.value)) publishThemeFocus(event.target.value);
            }}
            className="w-full rounded-md border border-line-strong bg-card px-3 py-2 text-xs outline-none focus:border-accent"
          >
            {THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </ControlLabel>
        <ControlLabel label="Geography">
          <select
            value={filters.geography}
            onChange={(event) => {
              const next = patch({ geography: event.target.value });
              onRun(next);
            }}
            className="w-full rounded-md border border-line-strong bg-card px-3 py-2 text-xs outline-none focus:border-accent"
          >
            <option>Europe / North America</option>
            <option>UK / Europe only</option>
            <option>Global / Europe priority</option>
          </select>
        </ControlLabel>
        <ControlLabel label="Expert archetype">
          <div className="grid grid-cols-2 gap-2">
            {ARCHETYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => toggleArchetype(type.value)}
                className={`rounded border px-2 py-1.5 text-xs ${
                  filters.archetypes.includes(type.value)
                    ? "border-accent bg-[#f4f8ff] text-accent"
                    : "border-line bg-card text-ink-soft"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </ControlLabel>
        <ControlLabel label="Data source">
          <select
            value={filters.sourceScope}
            onChange={(event) => {
              const next = patch({ sourceScope: event.target.value });
              onRun(next);
            }}
            className="w-full rounded-md border border-line-strong bg-card px-3 py-2 text-xs outline-none focus:border-accent"
          >
            <option>Premium sourced directory</option>
            <option>Primary sources first</option>
            <option>Include indicative records</option>
          </select>
        </ControlLabel>
      </RailSection>

      {onSkipBasketAutoRunChange ? (
        <section className="ee-panel rounded-lg p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={skipBasketAutoRun}
              onChange={(event) => onSkipBasketAutoRunChange(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5"
            />
            <span>
              <span className="block text-[11px] font-semibold text-ink-soft">
                Don&apos;t auto-run basket
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-faint">
                When saved items exist, Copilot waits for your question instead of auto-asking.
              </span>
            </span>
          </label>
        </section>
      ) : null}

      <section className="ee-panel rounded-lg p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Evidence standard
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
          Use Copilot to prioritize calls and identify gaps. Open the underlying
          profiles and sources before outreach or circulation.
        </p>
      </section>

      <section className="ee-panel rounded-lg p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Memo and follow-up
        </div>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => onRun(patch({ objective: "Prepare calls" }))}
            className="ee-button ee-button-secondary min-h-8 justify-start px-3 text-xs"
          >
            Build call brief from current answer
          </button>
          <button
            type="button"
            onClick={() => onRun(patch({ objective: "Red-team thesis" }))}
            className="ee-button ee-button-secondary min-h-8 justify-start px-3 text-xs"
          >
            Draft partner memo risks and gaps
          </button>
          <Link href="/discover" className="ee-button ee-button-secondary min-h-8 justify-start px-3 text-xs">
            Review Discover candidates
          </Link>
          <Link href="/reports" className="ee-button ee-button-primary min-h-8 justify-start px-3 text-xs">
            Open memo
          </Link>
        </div>
      </section>
    </aside>
  );
}

function RailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ControlLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
