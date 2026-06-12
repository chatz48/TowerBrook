"use client";

import { useEffect, useState } from "react";

type DiscoveryCandidate = {
  id: string;
  candidate_type: "person" | "company" | "relationship" | "fact";
  name: string;
  priority: number;
  review_status: string;
  payload?: Record<string, unknown>;
};

function payloadText(candidate: DiscoveryCandidate) {
  const payload = candidate.payload ?? {};
  return [
    payload.headline,
    payload.current_organization,
    payload.description,
    payload.why_relevant,
    payload.why_interesting,
    payload.fact_type && payload.fact_value ? `${payload.fact_type}: ${payload.fact_value}` : undefined,
    payload.evidence_text,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .slice(0, 2)
    .join(" · ");
}

export default function LiveCandidateReview() {
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/discovery-candidates?review_status=needs_review&limit=12");
      const data = (await res.json()) as { candidates?: DiscoveryCandidate[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load candidates");
      setCandidates(data.candidates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function review(candidate: DiscoveryCandidate, action: "approve" | "reject") {
    setBusyId(candidate.id);
    setError("");
    try {
      const res = await fetch(`/api/discovery-candidates/${candidate.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="ee-panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <div className="ee-label text-ink">Live candidate review</div>
          <h2 className="mt-1 text-[16px] font-semibold">Pending graph updates</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="ee-button ee-button-secondary min-h-8 px-3 text-[12px] disabled:opacity-50"
        >
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </div>
      {error ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">{error}</div> : null}
      {!candidates.length ? (
        <p className="px-4 py-5 text-[13px] text-ink-soft">
          {loading ? "Loading candidates..." : "No pending live candidates. Run a refresh or source ingest to create reviewable updates."}
        </p>
      ) : (
        <div className="divide-y divide-line">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-line bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                    {candidate.candidate_type}
                  </span>
                  <span className="text-[11px] text-ink-faint">{Math.round(candidate.priority)} priority</span>
                </div>
                <h3 className="mt-1 truncate text-[14px] font-semibold text-ink">{candidate.name}</h3>
                {payloadText(candidate) ? (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">{payloadText(candidate)}</p>
                ) : null}
              </div>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => void review(candidate, "approve")}
                  disabled={busyId === candidate.id}
                  className="ee-button ee-button-primary min-h-8 px-3 text-[12px] disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void review(candidate, "reject")}
                  disabled={busyId === candidate.id}
                  className="ee-button ee-button-secondary min-h-8 px-3 text-[12px] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
