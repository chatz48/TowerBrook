"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ThemeBrief } from "@/lib/brief";

export default function PointOfView({ brief }: { brief: ThemeBrief }) {
  const [narrative, setNarrative] = useState(brief.narrative);
  const [loading, setLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const claims = useMemo(() => {
    const topCluster = brief.hotSpecialties[0]?.name ?? "core infrastructure";
    const topCall = brief.callList[0]?.expert.name ?? "the highest-ranked experts";
    const exitText = brief.exitComps.length
      ? `${brief.exitComps.length} recorded exit comps indicate active strategic and sponsor demand.`
      : "The current graph has limited recorded exits, so call evidence matters more than transaction volume.";

    return [
      narrative,
      `${brief.stats.targets} independent companies remain actionable; ${brief.stats.advisers} advisors and service providers provide deal-process context.`,
      `${topCluster} is the densest coverage area, but undercovered specialties should feed the discovery review queue.`,
      `Start with ${topCall} and sequence calls across operators, founders, investors, bankers and lawyers to avoid a single-perspective thesis.`,
      exitText,
    ];
  }, [brief, narrative]);

  async function sharpen() {
    setLoading(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: brief.theme.id }),
      });
      const data = await res.json();
      if (data.narrative) {
        setNarrative(data.narrative);
        setAiDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ee-panel rounded-lg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="ee-label text-ink">Theme thesis</h2>
        <button
          onClick={sharpen}
          disabled={loading}
          className="text-[12px] font-medium text-accent disabled:text-muted"
        >
          {loading ? "Synthesising..." : aiDone ? "Regenerate synthesis" : "Sharpen with AI"}
        </button>
      </div>
      <div className="px-5 py-4">
        <ul className="space-y-3 text-[13px] leading-relaxed text-ink">
          {claims.map((claim, index) => (
            <li key={`${claim}-${index}`} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              <span>
                {claim}{" "}
                <a href="#source-register" className="ee-link">
                  [{(index % 4) + 1}]
                </a>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t border-line pt-3 text-[12px] text-ink-faint">
          Sources:{" "}
          {brief.callList.slice(0, 3).map((item, index) => (
            <span key={item.expert.id}>
              <Link href={`/experts/${item.expert.id}`} className="ee-link">
                [{index + 1}] {item.expert.name}
              </Link>
              {index < Math.min(brief.callList.length, 3) - 1 ? "  " : ""}
            </span>
          ))}
          {!aiDone ? (
            <span> · Baseline synthesis from deterministic graph facts.</span>
          ) : (
            <span> · AI synthesis grounded in graph facts.</span>
          )}
        </div>
        <Link href="/reports" className="mt-4 inline-flex text-[13px] text-accent">
          View full thesis memo →
        </Link>
      </div>
    </section>
  );
}
