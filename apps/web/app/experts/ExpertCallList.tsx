"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Expert } from "@/lib/types";
import ReadinessBadge from "@/app/components/ReadinessBadge";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import type { ReadinessBadgeModel } from "@/lib/investment-readiness";
import type { ScoreBreakdown } from "@/lib/score";

export interface RankedExpertRow {
  expert: Expert;
  score: ScoreBreakdown;
  readiness: ReadinessBadgeModel;
  companyPreview: string;
  towerBrookLabel: string;
  towerBrookDirect: boolean;
}

function scoreTitle(score: ScoreBreakdown) {
  return `Expert type: ${score.base} pts · Company edges: ${score.edges} pts · Market signals: ${score.signals} pts · Access: ${score.access} pts`;
}

function strengthBars(total: number) {
  const filled = Math.min(5, Math.round((total / 120) * 5));
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 w-2 rounded-sm ${index < filled ? "bg-accent" : "bg-line"}`}
        />
      ))}
    </span>
  );
}

export default function ExpertCallList({ rows }: { rows: RankedExpertRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.expert.id)));
  }

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.expert.id)),
    [rows, selected],
  );

  const batchPrompt = encodeURIComponent(
    selectedRows.length
      ? `Build outreach and call prep for these experts: ${selectedRows.map((row) => row.expert.name).join(", ")}`
      : "",
  );

  if (!rows.length) {
    return (
      <div className="border-t border-line px-5 py-10 text-center">
        <h3 className="text-[15px] font-semibold text-ink">No experts match your filters</h3>
        <p className="mt-2 text-[13px] text-ink-soft">
          Try broadening your theme, specialty, or readiness selection — or clear filters to search
          across all themes.
        </p>
        <Link href="/experts" className="ee-button ee-button-primary mt-4 inline-flex">
          Clear all filters
        </Link>
      </div>
    );
  }

  return (
    <>
      {selected.size ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#fbfcff] px-4 py-3">
          <span className="text-[12px] font-semibold text-ink">{selected.size} selected</span>
          <Link href={`/ask?prompt=${batchPrompt}`} className="ee-button ee-button-primary min-h-8 px-3 text-[11px]">
            Generate outreach for selected
          </Link>
          <Link href="/campaign" className="ee-button ee-button-secondary min-h-8 px-3 text-[11px]">
            Add to call plan
          </Link>
        </div>
      ) : null}

      <div className="hidden overflow-x-auto lg:block">
        <table className="ee-table min-w-[1100px]">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all experts" />
              </th>
              <th className="w-14">#</th>
              <th>Expert</th>
              <th>Why call</th>
              <th>Companies</th>
              <th>Readiness</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.expert.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(row.expert.id)}
                    onChange={() => toggle(row.expert.id)}
                    aria-label={`Select ${row.expert.name}`}
                  />
                </td>
                <td>
                  <span className="inline-grid h-8 w-8 place-items-center rounded bg-[#f1f4f9] text-[16px] font-semibold text-accent ring-2 ring-accent/20">
                    {index + 1}
                  </span>
                </td>
                <td className="min-w-[240px]">
                  <Link href={`/experts/${row.expert.id}`} className="ee-link font-semibold">
                    {row.expert.name}
                  </Link>
                  <div className="mt-0.5 text-[11px] text-ink-soft">{row.expert.headline}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-faint">
                    <span className="font-semibold tabular-nums text-ink">{row.score.total}</span>
                    {strengthBars(row.score.total)}
                    <span title={scoreTitle(row.score)} className="cursor-help">
                      score
                    </span>
                  </div>
                </td>
                <td className="max-w-[360px] text-[11px] leading-relaxed text-ink-soft">
                  <span className="line-clamp-2">
                    {row.expert.news?.[0]?.headline ?? row.expert.signals?.[0] ?? row.expert.whyRelevant}
                  </span>
                </td>
                <td className="max-w-[240px] text-[11px] text-ink-soft">
                  <span className="line-clamp-2">{row.companyPreview}</span>
                </td>
                <td className="max-w-[170px]">
                  <ReadinessBadge badge={row.readiness} compact />
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/experts/${row.expert.id}`} className="ee-button ee-button-primary min-h-8 px-3">
                      Prepare
                    </Link>
                    <Link href={`/graph?focus=expert:${row.expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Graph
                    </Link>
                    <WorkspaceActionButton
                      item={{
                        id: row.expert.id,
                        kind: "call",
                        name: row.expert.name,
                        sub: row.expert.headline,
                        href: `/experts/${row.expert.id}`,
                        theme: row.expert.themes[0],
                        note: row.expert.whyRelevant,
                      }}
                    >
                      Save
                    </WorkspaceActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        {rows.map((row, index) => (
          <article key={row.expert.id} className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold text-accent">#{index + 1}</div>
                <Link href={`/experts/${row.expert.id}`} className="ee-link text-[15px] font-semibold">
                  {row.expert.name}
                </Link>
                <p className="mt-1 text-[12px] text-ink-soft">{row.expert.headline}</p>
              </div>
              <input
                type="checkbox"
                checked={selected.has(row.expert.id)}
                onChange={() => toggle(row.expert.id)}
                aria-label={`Select ${row.expert.name}`}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ReadinessBadge badge={row.readiness} compact />
              <span className="text-[12px] font-semibold tabular-nums">{row.score.total}</span>
              {strengthBars(row.score.total)}
            </div>
            <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
              {row.expert.whyRelevant}
            </p>
            <p className="mt-2 text-[11px] text-ink-faint">{row.companyPreview}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/experts/${row.expert.id}`} className="ee-button ee-button-primary min-h-8 px-3">
                Prepare
              </Link>
              <WorkspaceActionButton
                item={{
                  id: row.expert.id,
                  kind: "call",
                  name: row.expert.name,
                  sub: row.expert.headline,
                  href: `/experts/${row.expert.id}`,
                  theme: row.expert.themes[0],
                }}
              >
                Save
              </WorkspaceActionButton>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
