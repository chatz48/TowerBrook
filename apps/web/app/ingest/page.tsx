"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ConfidenceBars } from "@/app/components/ui";
import { getTheme } from "@/lib/themes";
import { useThemeFocusClient } from "@/lib/theme-focus-client";

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

interface ExtractedPerson {
  name: string;
  headline?: string | null;
  current_organization?: string | null;
  expert_type?: string;
  summary?: string | null;
  confidence?: number;
}

interface ExtractedCompany {
  name: string;
  category?: string;
  description?: string | null;
  why_interesting?: string | null;
  confidence?: number;
}

interface ExtractedRelationship {
  from_name: string;
  from_type: string;
  relationship_type: string;
  to_name: string;
  to_type: string;
  evidence_text?: string;
  confidence?: number;
}

interface ExtractedFact {
  subject_name: string;
  subject_type: string;
  fact_type: string;
  fact_value: string;
  evidence_text?: string;
  confidence?: number;
}

interface ExtractedCitation {
  title?: string;
  url?: string;
  evidence?: string;
}

interface IngestResult {
  deal?: DraftDeal;
  facts?: DraftFact[];
  reviewCandidates?: DraftFact[];
  relationshipCandidates?: string[];
  note?: string;
  review_gated?: boolean;
  ingest_meta?: {
    source_text_chars?: number;
    chunks_created?: number;
    embedding_mode?: "semantic" | "hash";
  };
  source?: {
    title: string;
    url?: string;
    source_type?: string;
    raw_text?: string | null;
    publisher?: string | null;
  };
  extraction?: {
    people?: ExtractedPerson[];
    companies?: ExtractedCompany[];
    relationships?: ExtractedRelationship[];
    facts?: ExtractedFact[];
    citations?: ExtractedCitation[];
  };
  persisted?: {
    people_created?: number;
    companies_created?: number;
    relationships_created?: number;
    facts_created?: number;
    chunks_created?: number;
  };
}

const INITIAL_VISIBLE = 5;

const SAMPLE_TEXT =
  "Badger Meter acquired SmartCover Systems from XPV Water Partners for $185m in 2025. Houlihan Lokey advised SmartCover Systems on the transaction.";

export default function IngestPage() {
  const themeFocus = useThemeFocusClient();
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
      if (themeFocus !== "all") body.set("themeId", themeFocus);
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
        <div className="ee-label text-ink">Graph source ingestion</div>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight">Add source evidence</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Paste a press release, advisor page, company statement, call note or extracted PDF text.
          The source is parsed, embedded, extracted and sorted into the graph automatically.
        </p>
        <div className="mt-4 rounded-md border border-line bg-paper px-3 py-2 text-[11px] text-ink-soft">
          Evidence focus: {themeFocus === "all" ? "All themes" : getTheme(themeFocus)?.name}
        </div>

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
          Create missing-fact searches after saving to the database
        </label>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
          Extract a reviewable draft and inspect the follow-up searches before committing new
          facts to the graph.
        </p>

        <button
          type="button"
          onClick={ingest}
          disabled={loading}
          className="ee-button ee-button-primary mt-4 w-full disabled:opacity-50"
        >
        {loading ? "Extracting..." : "Extract draft facts"}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/deals" className="ee-button ee-button-secondary">
            Open deals
          </Link>
          <Link href="/discover" className="ee-button ee-button-secondary">
            Research jobs
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
            <div className="ee-label text-ink">Ready for source evidence</div>
            <h2 className="mt-2 text-[18px] font-semibold">Extract reviewable facts, not a finished conclusion</h2>
            <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-ink-soft">
              Submit a source in the left panel. The result will show extracted
              people, companies, relationships, deal facts, and the evidence
              that still requires analyst review before it reaches the graph.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Verify identities", "Confirm named people and their current roles."],
                ["Check relationships", "Ensure each person-company or advisor-deal edge is supported."],
                ["Resolve gaps", "Review missing facts and follow-up searches before persistence."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-md border border-line bg-paper p-4">
                  <div className="text-[13px] font-semibold">{title}</div>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : result.deal ? (
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
                  <DraftMetric label="Facts" value={String(result.reviewCandidates?.length ?? 0)} />
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
                    {(result.facts ?? []).map((fact) => (
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
              <ReviewChecklist facts={result.reviewCandidates ?? []} />
              <Checklist title="Missing facts" items={result.deal.missingFacts.map((item) => item.replaceAll("_", " "))} />
              <Checklist title="Follow-up searches" items={result.deal.followUpSearches} />
            </section>
          </div>
        ) : (
          <GraphIngestionResult result={result} />
        )}
      </main>
    </div>
  );
}

function GraphIngestionResult({ result }: { result: IngestResult }) {
  const people = result.extraction?.people ?? [];
  const companies = [...(result.extraction?.companies ?? [])].sort(
    (left, right) => (right.confidence ?? 0) - (left.confidence ?? 0),
  );
  const relationships = [...(result.extraction?.relationships ?? [])].sort(
    (left, right) => (right.confidence ?? 0) - (left.confidence ?? 0),
  );
  const facts = [...(result.extraction?.facts ?? [])]
    .filter((fact) => !["source_signal", "source_reference"].includes(fact.fact_type))
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));
  const summary = buildSourceSummary(result);

  return (
    <div className="space-y-5">
      <section className="ee-panel rounded-lg p-5">
        <div className="ee-label text-ink">Graph ingestion result</div>
        <h2 className="mt-2 text-[22px] font-semibold">{result.source?.title ?? "Submitted source"}</h2>
        {result.source?.url ? (
          <a
            href={result.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ee-link mt-2 inline-flex text-[13px]"
          >
            {result.source.url}
          </a>
        ) : null}
        {result.source?.publisher ? (
          <p className="mt-2 text-[12px] text-ink-faint">Publisher: {result.source.publisher}</p>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <DraftMetric label="People" value={String(result.persisted?.people_created ?? people.length)} />
          <DraftMetric label="Companies" value={String(result.persisted?.companies_created ?? companies.length)} />
          <DraftMetric
            label="Relationships"
            value={String(result.persisted?.relationships_created ?? relationships.length)}
          />
          <DraftMetric label="Facts" value={String(result.persisted?.facts_created ?? facts.length)} />
          <DraftMetric label="Chunks" value={String(result.persisted?.chunks_created ?? 0)} />
        </div>
      </section>

      <section className="ee-panel rounded-lg p-5">
        <div className="ee-label text-ink">Source summary</div>
        <p className="mt-3 max-w-4xl text-[13px] leading-relaxed text-ink-soft">{summary}</p>
        {result.ingest_meta ? (
          <p className="mt-3 text-[12px] text-ink-faint">
            Parsed {result.ingest_meta.source_text_chars ?? 0} characters into{" "}
            {result.ingest_meta.chunks_created ?? 0} chunks
            {result.ingest_meta.embedding_mode ? ` · ${result.ingest_meta.embedding_mode} embeddings` : ""}.
          </p>
        ) : null}
        {(result.ingest_meta?.source_text_chars ?? 1) === 0 ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            No article text was fetched from the URL on this runtime. Paste the source text manually or confirm
            KEIROLABS_API_KEY is set on the deployed backend API.
          </p>
        ) : null}
        {result.review_gated ? (
          <p className="mt-3 rounded-md border border-line bg-paper px-3 py-2 text-[12px] text-ink-soft">
            Candidates are review-gated. Approve extracted people, companies, relationships and facts before they
            enter the live graph.
          </p>
        ) : null}
      </section>

      <ExpandableSection
        title="Facts uncovered"
        count={facts.length}
        items={facts}
        emptyMessage="No discrete facts were extracted from this source."
        renderItem={(fact) => (
          <article className="rounded-md border border-line bg-paper px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-ink">
                  {formatLabel(fact.fact_type)} · {fact.subject_name}
                </div>
                <div className="mt-1 text-[12px] text-ink-soft">{fact.fact_value}</div>
              </div>
              <ConfidencePill value={fact.confidence ?? 0.5} />
            </div>
            {fact.evidence_text ? (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">{truncateText(fact.evidence_text, 220)}</p>
            ) : null}
          </article>
        )}
      />

      <ExpandableSection
        title="Companies uncovered"
        count={companies.length}
        items={companies}
        emptyMessage="No companies were extracted from this source."
        renderItem={(company) => (
          <article className="rounded-md border border-line bg-paper px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-ink">{company.name}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                  {formatLabel(company.category ?? "company")}
                </div>
              </div>
              <ConfidencePill value={company.confidence ?? 0.5} />
            </div>
            {company.description || company.why_interesting ? (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                {truncateText(company.description ?? company.why_interesting ?? "", 240)}
              </p>
            ) : null}
          </article>
        )}
      />

      <ExpandableSection
        title="Relationships uncovered"
        count={relationships.length}
        items={relationships}
        emptyMessage="No relationships were extracted from this source."
        renderItem={(relationship) => (
          <article className="rounded-md border border-line bg-paper px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-[13px] leading-relaxed text-ink">
                <span className="font-semibold">{relationship.from_name}</span>
                <span className="mx-1 text-ink-faint">({relationship.from_type})</span>
                <span className="font-medium text-accent">{formatLabel(relationship.relationship_type)}</span>
                <span className="mx-1 text-ink-faint">→</span>
                <span className="font-semibold">{relationship.to_name}</span>
                <span className="text-ink-faint"> ({relationship.to_type})</span>
              </div>
              <ConfidencePill value={relationship.confidence ?? 0.5} />
            </div>
            {relationship.evidence_text ? (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
                {truncateText(relationship.evidence_text, 220)}
              </p>
            ) : null}
          </article>
        )}
      />

      {people.length ? (
        <ExpandableSection
          title="People uncovered"
          count={people.length}
          items={people}
          emptyMessage="No people were extracted from this source."
          renderItem={(person) => (
            <article className="rounded-md border border-line bg-paper px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{person.name}</div>
                  <div className="mt-1 text-[12px] text-ink-soft">
                    {[person.current_organization, formatLabel(person.expert_type ?? "expert")]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <ConfidencePill value={person.confidence ?? 0.5} />
              </div>
              {person.summary ? (
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{truncateText(person.summary, 240)}</p>
              ) : null}
            </article>
          )}
        />
      ) : null}
    </div>
  );
}

function ExpandableSection<T>({
  title,
  count,
  items,
  renderItem,
  emptyMessage,
  initialCount = INITIAL_VISIBLE,
}: {
  title: string;
  count: number;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage: string;
  initialCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, initialCount);
  const hiddenCount = Math.max(0, items.length - initialCount);

  return (
    <section className="ee-panel rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="ee-label text-ink">{title}</div>
          <p className="mt-1 text-[12px] text-ink-faint">
            {count} extracted {count === 1 ? "item" : "items"}
            {hiddenCount && !expanded ? ` · showing ${Math.min(initialCount, items.length)}` : ""}
          </p>
        </div>
        {hiddenCount ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="ee-button ee-button-secondary min-h-8 px-3 text-[12px]"
          >
            {expanded ? "Show less" : `Show ${hiddenCount} more`}
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {visibleItems.length
          ? visibleItems.map((item, index) => <div key={`${title}-${index}`}>{renderItem(item, index)}</div>)
          : (
            <p className="rounded-md border border-line bg-paper px-3 py-3 text-[12px] text-ink-soft">
              {emptyMessage}
            </p>
          )}
        {!expanded && hiddenCount ? (
          <p className="px-1 text-[12px] text-ink-faint">… and {hiddenCount} more</p>
        ) : null}
      </div>
    </section>
  );
}

function ConfidencePill({ value }: { value: number }) {
  return (
    <div className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink">
      {(value * 100).toFixed(0)}%
    </div>
  );
}

function buildSourceSummary(result: IngestResult): string {
  const facts = result.extraction?.facts ?? [];
  const sourceSignal = facts.find((fact) => fact.fact_type === "source_signal");
  if (sourceSignal?.fact_value) {
    return truncateText(sourceSignal.fact_value, 420);
  }

  const citation = result.extraction?.citations?.[0];
  if (citation?.evidence) {
    return truncateText(citation.evidence, 420);
  }

  if (result.source?.raw_text?.trim()) {
    return truncateText(result.source.raw_text.trim(), 420);
  }

  const companies = result.extraction?.companies ?? [];
  const relationships = result.extraction?.relationships ?? [];
  if (companies.length || relationships.length) {
    const companyNames = companies.slice(0, 4).map((company) => company.name).join(", ");
    const relationshipSample = relationships[0];
    const relationshipHint = relationshipSample
      ? `${relationshipSample.from_name} ${formatLabel(relationshipSample.relationship_type)} ${relationshipSample.to_name}`
      : null;
    return [
      `Source parsed into ${companies.length} companies, ${relationships.length} relationships, and ${facts.length} facts.`,
      companyNames ? `Notable entities include ${companyNames}${companies.length > 4 ? ", and others" : ""}.` : null,
      relationshipHint ? `Example edge: ${relationshipHint}.` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "Source ingested and parsed. Review extracted entities below before approving graph candidates.";
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function ReviewChecklist({ facts }: { facts: DraftFact[] }) {
  return (
    <section className="ee-panel rounded-lg p-5">
      <div className="ee-label text-ink">Review checklist</div>
      <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
        {(facts.length ? facts : []).slice(0, 6).map((fact) => (
          <li key={fact.id} className="rounded-md border border-line bg-paper px-3 py-2">
            Approve or reject {fact.factType.replaceAll("_", " ")}:{" "}
            <span className="font-semibold text-ink">{fact.factValue}</span>
          </li>
        ))}
        {!facts.length ? (
          <li className="rounded-md border border-line bg-paper px-3 py-2">
            No extracted facts need review.
          </li>
        ) : null}
      </ul>
    </section>
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
