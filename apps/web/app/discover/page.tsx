"use client";

import { useState } from "react";
import Link from "next/link";
import candidatesRaw from "@/data/candidates.json";
import dealsRaw from "@/data/deals.json";
import { THEMES } from "@/lib/themes";
import { ConfidenceBars } from "@/app/components/ui";

interface LiveCandidate {
  name: string;
  type: string;
  headline: string;
  company: string;
  specialty?: string;
  whyRelevant: string;
  recentNews?: string;
  sourceUrl: string;
  confidence: number;
}

type ReviewCandidate = (typeof candidatesRaw.candidates)[number];
type ReviewDeal = (typeof dealsRaw)[number];

const STATUS_CLASS: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_review: "border-blue-200 bg-blue-50 text-blue-700",
  needs_more_evidence: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  merge: "border-violet-200 bg-violet-50 text-violet-700",
};

export default function DiscoverPage() {
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [selected, setSelected] = useState<ReviewCandidate>(candidatesRaw.candidates[0]);
  const [loading, setLoading] = useState(false);
  const [liveCandidates, setLiveCandidates] = useState<LiveCandidate[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<ReviewDeal>(dealsRaw[0]);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    setLiveCandidates([]);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      setLiveCandidates(data.candidates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const reviewSummary = candidatesRaw.candidates.reduce<Record<string, number>>(
    (summary, candidate) => {
      const status = candidate.review.status;
      summary[status] = (summary[status] ?? 0) + 1;
      return summary;
    },
    {},
  );

  return (
    <div className="ee-shell grid lg:grid-cols-[290px_minmax(0,1fr)_380px]">
      <aside className="border-b border-line bg-white p-4 lg:border-b-0 lg:border-r">
        <div className="ee-label text-ink">Discovery review queue</div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          Candidates are proposals. Human approval is required before graph-ready
          output can include nodes or relationships.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {Object.entries(reviewSummary).map(([status, count]) => (
            <div key={status} className="rounded-md border border-line bg-paper p-3">
              <div className="text-[18px] font-semibold tabular-nums">{count}</div>
              <div className="mt-1 text-[11px] text-ink-faint">{status.replaceAll("_", " ")}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <div className="ee-label text-ink">Live discovery</div>
          <label className="mt-3 block text-[12px] font-medium text-ink-soft">
            Theme
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value as typeof themeId)}
              className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={run}
            disabled={loading}
            className="ee-button ee-button-primary mt-3 w-full disabled:opacity-50"
          >
            {loading ? "Searching..." : "Run live discovery"}
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Live results are shown below as draft candidates and are not written
            to production data.
          </p>
        </div>

        <Link href="/sources" className="mt-6 inline-flex text-[12px] text-accent">
          Open source register →
        </Link>
        <Link href="/ingest" className="mt-2 inline-flex text-[12px] text-accent">
          Ingest deal material →
        </Link>
      </aside>

      <main className="min-w-0 p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">Candidate review</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
              Source register → fetch/clean → candidate JSON → human review → graph-ready output.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="ee-button ee-button-secondary">Reject</button>
            <button className="ee-button ee-button-secondary">Merge</button>
            <button className="ee-button ee-button-primary">Approve</button>
          </div>
        </div>

        <section className="ee-panel overflow-hidden rounded-lg">
          <table className="ee-table min-w-[920px]">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Theme</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Entities</th>
                <th>Relationships</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {candidatesRaw.candidates.map((candidate) => (
                <tr
                  key={candidate.candidate_id}
                  onClick={() => setSelected(candidate)}
                  className={`cursor-pointer hover:bg-[#fbfcff] ${
                    selected.candidate_id === candidate.candidate_id ? "bg-[#f7fbff]" : ""
                  }`}
                >
                  <td>
                    <div className="font-semibold text-accent">
                      {candidate.terminal_ui.primary_row_label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-faint">
                      {candidate.candidate_id}
                    </div>
                  </td>
                  <td>{candidate.theme}</td>
                  <td>
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[candidate.review.status] ?? "border-line bg-paper text-ink-soft"}`}>
                      {candidate.review.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div className="font-semibold tabular-nums">{(candidate.confidence * 5).toFixed(1)}</div>
                    <ConfidenceBars value={candidate.confidence} />
                  </td>
                  <td>{candidate.proposed_entities.length}</td>
                  <td>{candidate.proposed_relationships.length}</td>
                  <td>
                    <a
                      href={candidate.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ee-link"
                    >
                      [{candidate.source.source_id}]
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {error ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {liveCandidates.length ? (
          <section className="ee-panel mt-4 overflow-hidden rounded-lg">
            <div className="border-b border-line px-4 py-3">
              <h2 className="ee-label text-ink">Live discovery results</h2>
            </div>
            <table className="ee-table">
              <tbody>
                {liveCandidates.map((candidate, index) => (
                  <tr key={`${candidate.name}-${index}`}>
                    <td>
                      <div className="font-semibold">{candidate.name}</div>
                      <div className="text-[11px] text-ink-faint">{candidate.headline}</div>
                    </td>
                    <td>{candidate.type}</td>
                    <td>{candidate.company}</td>
                    <td>
                      <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="ee-link">
                        Source
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="ee-panel mt-4 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Deal fact review</h2>
            <span className="text-[12px] text-ink-faint">{dealsRaw.length} tracked deals</span>
          </div>
          <table className="ee-table min-w-[920px]">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Theme</th>
                <th>Facts</th>
                <th>Missing</th>
                <th>Confidence</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {dealsRaw.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className={`cursor-pointer hover:bg-[#fbfcff] ${
                    selectedDeal.id === deal.id ? "bg-[#f7fbff]" : ""
                  }`}
                >
                  <td>
                    <Link href={`/deals/${deal.id}`} className="ee-link">
                      {deal.name}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-ink-faint">{deal.status}</div>
                  </td>
                  <td>{deal.theme}</td>
                  <td>{deal.facts.length}</td>
                  <td>{deal.missingFacts.length}</td>
                  <td>
                    <div className="font-semibold tabular-nums">{(deal.confidence * 5).toFixed(1)}</div>
                    <ConfidenceBars value={deal.confidence} />
                  </td>
                  <td className="max-w-[280px] text-[12px] text-ink-soft">
                    {deal.followUpSearches[0] ?? "Generate deal brief"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <aside className="border-t border-line bg-white p-4 lg:border-l lg:border-t-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-semibold">
              {selected.terminal_ui.primary_row_label}
            </h2>
            <p className="mt-1 text-[12px] text-ink-faint">
              {selected.source.publisher} · {selected.source.date}
            </p>
          </div>
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[selected.review.status] ?? "border-line bg-paper text-ink-soft"}`}>
            {selected.review.status.replaceAll("_", " ")}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <div className="ee-label">Evidence</div>
          {selected.evidence.map((evidence) => (
            <blockquote key={evidence.evidence_id} className="mt-3 text-[13px] leading-relaxed text-ink-soft">
              “{evidence.evidence_text}”
              <div className="mt-2 text-[11px] text-ink-faint">
                Confidence {(evidence.confidence * 100).toFixed(0)}% · Found in clean text: {evidence.found_in_clean_text ? "yes" : "no"}
              </div>
            </blockquote>
          ))}
        </div>

        <div className="mt-5">
          <div className="ee-label">Proposed entities</div>
          <div className="mt-3 space-y-2">
            {selected.proposed_entities.map((entity) => (
              <div key={entity.entity_id} className="rounded-md border border-line p-3">
                <div className="font-semibold">{entity.name}</div>
                <div className="mt-0.5 text-[11px] text-ink-faint">
                  {entity.entity_type} · {entity.entity_id}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  {entity.proposed_profile}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="ee-label">Proposed relationships</div>
          <div className="mt-3 space-y-2">
            {selected.proposed_relationships.map((relationship, index) => (
              <div key={`${relationship.label}-${index}`} className="rounded-md border border-line p-3">
                <div className="font-semibold">{relationship.label}</div>
                <div className="mt-1 text-[11px] text-ink-faint">
                  {relationship.relationship_type} · confidence {(relationship.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <a
          href={selected.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ee-button ee-button-secondary mt-5 w-full"
        >
          Open source URL
        </a>

        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <div className="ee-label">Selected deal gaps</div>
          <h3 className="mt-2 font-semibold">{selectedDeal.name}</h3>
          <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-ink-soft">
            {selectedDeal.missingFacts.slice(0, 6).map((fact) => (
              <li key={fact}>{fact.replaceAll("_", " ")}</li>
            ))}
          </ul>
          <Link href={`/deals/${selectedDeal.id}`} className="ee-button ee-button-secondary mt-4 w-full">
            Open deal scorecard
          </Link>
        </div>
      </aside>
    </div>
  );
}
