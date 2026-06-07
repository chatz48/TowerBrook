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
}: {
  filters: CopilotFilters;
  resetFilters: CopilotFilters;
  onFiltersChange: (filters: CopilotFilters) => void;
  onQuestionChange: (question: string) => void;
  onRun: (filters: CopilotFilters) => void;
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
    <aside className="space-y-7 border-b border-[#dfe3eb] bg-[#fbfcfe] p-4 md:min-h-[calc(100vh-6.5rem)] md:border-b-0">
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
                  ? "border-[#0b5bd3] bg-white text-[#0b5bd3] shadow-sm"
                  : "border-[#e0e5ed] bg-white text-[#344054] hover:border-[#c8d0dc]"
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
            className="text-[11px] font-medium text-[#0b5bd3]"
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
            className="w-full rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs outline-none"
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
            className="w-full rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs outline-none"
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
                    ? "border-[#0b5bd3] bg-[#eef5ff] text-[#0b5bd3]"
                    : "border-[#e0e5ed] bg-white text-[#344054]"
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
            className="w-full rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs outline-none"
          >
            <option>Premium sourced directory</option>
            <option>Primary sources first</option>
            <option>Include indicative records</option>
          </select>
        </ControlLabel>
      </RailSection>

      <section className="rounded border border-[#dfe3eb] bg-white p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#344054]">
          Evidence standard
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#667085]">
          Use Copilot to prioritize calls and identify gaps. Open the underlying
          profiles and sources before outreach or circulation.
        </p>
      </section>

      <section className="rounded border border-[#dfe3eb] bg-white p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#344054]">
          Memo and follow-up
        </div>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => onRun(patch({ objective: "Prepare calls" }))}
            className="rounded border border-[#d8dee8] bg-[#fbfcfe] px-3 py-2 text-left text-xs font-medium text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
          >
            Build call brief from current answer
          </button>
          <button
            type="button"
            onClick={() => onRun(patch({ objective: "Red-team thesis" }))}
            className="rounded border border-[#d8dee8] bg-[#fbfcfe] px-3 py-2 text-left text-xs font-medium text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
          >
            Draft partner memo risks and gaps
          </button>
          <Link
            href="/discover"
            className="rounded border border-[#d8dee8] bg-[#fbfcfe] px-3 py-2 text-left text-xs font-medium text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
          >
            Review Discover candidates
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
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#344054]">
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
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
        {label}
      </span>
      {children}
    </label>
  );
}
