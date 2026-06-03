"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfidenceBars } from "@/app/components/ui";

interface DraftFact {
  id: string;
  factType: string;
  factValue: string;
  confidence: number;
  reviewStatus: string;
  evidenceText?: string;
}

interface DraftDeal {
  name: string;
  geography: string;
  status: string;
  dealType: string;
  completionScore: number;
  confidence: number;
  missingFacts: string[];
  followUpSearches: string[];
  investmentRelevance: string;
}

interface IngestResult {
  deal: DraftDeal;
  facts: DraftFact[];
  reviewCandidates: DraftFact[];
  relationshipCandidates: string[];
  note: string;
}

const SAMPLE_TEXT =
  "Badger Meter acquired SmartCover Systems from XPV Water Partners for $185m in 2025. Houlihan Lokey advised SmartCover Systems on the transaction.";

export default function IngestPage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState(SAMPLE_TEXT);
  const [file, setFile] = useState<File | null>(null);
  const [enrich, setEnrich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<IngestResult | null>(null);

  async function ingest() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.set("url", url);
      body.set("title", title);
      body.set("text", text);
      body.set("enrich", String(enrich));
      if (file) body.set("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ingestion failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ee-shell grid lg:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-white p-5 lg:border-b-0 lg:border-r">
        <div className="ee-label text-ink">User deal ingestion</div>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight">Extract a deal rubric</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Paste a press release, advisor page, company statement or extracted PDF text.
          The draft output stays review-gated until a user approves facts.
        </p>

        <label className="mt-5 block text-[12px] font-medium text-ink-soft">
          Source URL
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>

        <label className="mt-3 block text-[12px] font-medium text-ink-soft">
          Source title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Deal press release title"
            className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>

        <label className="mt-3 block text-[12px] font-medium text-ink-soft">
          Source text
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className="mt-1 w-full resize-y rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent"
          />
        </label>

        <label className="mt-3 block text-[12px] font-medium text-ink-soft">
          Upload file
          <input
            type="file"
            accept=".txt,.md,.html,.pdf,text/plain,text/markdown,text/html,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <span className="mt-1 block text-[11px] text-ink-faint">
            Supports text, Markdown, HTML and PDF extraction.
          </span>
        </label>

        <label className="mt-3 flex items-center gap-2 text-[12px] font-medium text-ink-soft">
          <input
            type="checkbox"
            checked={enrich}
            onChange={(event) => setEnrich(event.target.checked)}
            className="accent-accent"
          />
          Find missing facts after persistence
        </label>

        <button
          type="button"
          onClick={ingest}
          disabled={loading}
          className="ee-button ee-button-primary mt-4 w-full disabled:opacity-50"
        >
        {loading ? "Extracting..." : "Extract and persist deal facts"}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/deals" className="ee-button ee-button-secondary">
            Open deals
          </Link>
          <Link href="/discover" className="ee-button ee-button-secondary">
            Review queue
          </Link>
        </div>
      </aside>

      <main className="min-w-0 p-5">
        {error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {!result ? (
          <section className="ee-panel rounded-lg p-5">
            <div className="ee-label text-ink">Expected output</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                "Deal scorecard",
                "Extracted parties",
                "Advisor and counsel checks",
                "Missing facts checklist",
                "Follow-up search queries",
                "Reviewable relationship candidates",
              ].map((item) => (
                <div key={item} className="rounded-md border border-line bg-paper p-4 text-[13px] font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="ee-panel rounded-lg p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="ee-label text-ink">Draft scorecard</div>
                  <h2 className="mt-2 text-[22px] font-semibold">{result.deal.name}</h2>
                  <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                    {result.deal.investmentRelevance}
                  </p>
                  <p className="mt-3 text-[12px] text-ink-faint">{result.note}</p>
                </div>
                <div className="grid min-w-[320px] grid-cols-2 overflow-hidden rounded-lg border border-line max-md:min-w-0">
                  <DraftMetric label="Completeness" value={`${Math.round(result.deal.completionScore * 100)}%`} />
                  <DraftMetric label="Confidence" value={`${(result.deal.confidence * 100).toFixed(0)}%`} />
                  <DraftMetric label="Missing" value={String(result.deal.missingFacts.length)} />
                  <DraftMetric label="Review facts" value={String(result.reviewCandidates.length)} />
                </div>
              </div>
            </section>

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Extracted facts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="ee-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th>Fact</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Confidence</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.facts.map((fact) => (
                      <tr key={fact.id}>
                        <td>{fact.factType.replaceAll("_", " ")}</td>
                        <td>{fact.factValue}</td>
                        <td>{fact.reviewStatus.replaceAll("_", " ")}</td>
                        <td>
                          <div className="font-semibold tabular-nums">{(fact.confidence * 100).toFixed(0)}%</div>
                          <ConfidenceBars value={fact.confidence} />
                        </td>
                        <td className="max-w-[420px] text-[12px] leading-relaxed text-ink-soft">
                          {fact.evidenceText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <Checklist title="Missing facts" items={result.deal.missingFacts.map((item) => item.replaceAll("_", " "))} />
              <Checklist title="Follow-up searches" items={result.deal.followUpSearches} />
              <Checklist title="Relationship candidates" items={result.relationshipCandidates} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function DraftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-b border-line px-4 py-3 even:border-r-0">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[18px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="ee-panel rounded-lg p-5">
      <div className="ee-label text-ink">{title}</div>
      <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
        {(items.length ? items : ["No items"]).map((item) => (
          <li key={item} className="rounded-md border border-line bg-paper px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
