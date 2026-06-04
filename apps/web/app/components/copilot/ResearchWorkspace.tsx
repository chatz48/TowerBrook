"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { AskResponse, CopilotFilters, SourceRecord } from "./types";

const DEFAULT_QUESTION = "Who should I call first for grid interconnection bottlenecks?";

const OBJECTIVES = [
  { label: "Find experts", value: "Find experts" },
  { label: "Map companies", value: "Map companies" },
  { label: "Red-team thesis", value: "Red-team thesis" },
  { label: "Prepare calls", value: "Prepare calls" },
];

const THEMES = [
  { label: "All themes", value: "all" },
  { label: "Grid Infrastructure & Connection", value: "grid-infrastructure" },
  { label: "Clean Energy Advisory", value: "clean-energy-advisory" },
  { label: "Smart Water Infrastructure", value: "smart-water" },
];

const ARCHETYPES = [
  { label: "Founder", value: "ex-founder" },
  { label: "Operator", value: "operator" },
  { label: "Advisor", value: "advisor" },
  { label: "Banker", value: "banker" },
  { label: "Investor", value: "investor" },
  { label: "Lawyer", value: "lawyer" },
];

const PROMPTS = [
  "Compare PJM vs ERCOT interconnection rules",
  "Find more utility software operators to call",
  "Which companies are most actionable?",
  "What are investors saying?",
];

const INITIAL_FILTERS: CopilotFilters = {
  objective: "Find experts",
  theme: "grid-infrastructure",
  geography: "Europe / North America",
  archetypes: ["operator", "advisor", "banker", "ex-founder"],
  sourceScope: "Premium sourced directory",
};

export default function ResearchWorkspace() {
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [filters, setFilters] = useState<CopilotFilters>(INITIAL_FILTERS);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function submit(nextQuestion = question, nextFilters = filters) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion) return;
    setQuestion(cleanQuestion);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, filters: nextFilters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setAnswer(data);
      setSelectedSourceId(data.sources_used?.[0]?.source_id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialAnswer() {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: DEFAULT_QUESTION, filters: INITIAL_FILTERS }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        if (!cancelled) {
          setAnswer(data);
          setSelectedSourceId(data.sources_used?.[0]?.source_id ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialAnswer();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSource = useMemo(() => {
    if (!answer?.sources_used.length) return null;
    return (
      answer.sources_used.find((source) => source.source_id === selectedSourceId) ??
      answer.sources_used[0]
    );
  }, [answer, selectedSourceId]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f7f8fb] text-[#111827]">
      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <SessionRail
          filters={filters}
          onFiltersChange={setFilters}
          onRun={(nextFilters) => submit(question, nextFilters)}
        />

        <main className="min-w-0 border-x border-[#dfe3eb] bg-white">
          <div className="border-b border-[#e6eaf0] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Research Copilot</h1>
                <p className="mt-1 text-xs text-[#667085]">
                  Structured answers over the sourced expert and company graph.
                </p>
              </div>
            </div>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-w-0 flex-1 rounded border border-[#cfd6e2] bg-[#fbfcfe] px-3 py-2.5 text-sm outline-none transition focus:border-[#0b5bd3] focus:bg-white"
                placeholder="Ask over experts, companies, relationships, and sources..."
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded bg-[#0b5bd3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084aa9] disabled:opacity-50"
              >
                {loading ? "Running" : "Ask"}
              </button>
            </form>
          </div>

          <div className="space-y-3 px-5 py-4">
            <MessageFrame question={answer?.input_context.question ?? question} />
            {error ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {answer ? (
              <StructuredAnswer
                answer={answer}
                onSourceSelect={setSelectedSourceId}
                onPrompt={(prompt) => submit(prompt)}
              />
            ) : (
              <LoadingBlocks />
            )}
          </div>
        </main>

        <EvidenceInspector
          sources={answer?.sources_used ?? []}
          selectedSource={selectedSource}
          selectedSourceId={selectedSource?.source_id ?? null}
          onSourceSelect={setSelectedSourceId}
        />
      </div>
    </div>
  );
}

function SessionRail({
  filters,
  onFiltersChange,
  onRun,
}: {
  filters: CopilotFilters;
  onFiltersChange: (filters: CopilotFilters) => void;
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
    <aside className="space-y-7 border-b border-[#dfe3eb] bg-[#fbfcfe] p-4 lg:min-h-[calc(100vh-6.5rem)] lg:border-b-0">
      <RailSection title="Session objective">
        <div className="space-y-2">
          {OBJECTIVES.map((objective) => (
            <button
              key={objective.value}
              onClick={() => {
                const next = patch({ objective: objective.value });
                onRun(next);
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
              onFiltersChange(INITIAL_FILTERS);
              onRun(INITIAL_FILTERS);
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
    </aside>
  );
}

function StructuredAnswer({
  answer,
  onSourceSelect,
  onPrompt,
}: {
  answer: AskResponse;
  onSourceSelect: (sourceId: string) => void;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar label="EE" active />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Expert Engine</span>
            <span className="text-[#667085]">{formatTime(answer.generated_at)}</span>
            <span className="rounded-full border border-[#d8dee8] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#667085]">
              {answer.grounded ? "Model refined" : "Directory synthesis"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#344054]">{answer.answer_summary}</p>
        </div>
      </div>

      <Panel
        title="1. Ranked experts"
        meta={`${answer.ranked_experts.length} candidates`}
        citations={collectCitations(answer.ranked_experts)}
        onSourceSelect={onSourceSelect}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6eaf0] bg-[#f8fafc] text-[10px] uppercase tracking-[0.12em] text-[#667085]">
                <th className="w-11 px-3 py-2">#</th>
                <th className="w-[150px] px-3 py-2">Expert</th>
                <th className="w-[230px] px-3 py-2">Title & firm</th>
                <th className="w-[300px] px-3 py-2">Why top-ranked</th>
                <th className="w-[120px] px-3 py-2">Evidence</th>
                <th className="w-[160px] px-3 py-2">Access note</th>
              </tr>
            </thead>
            <tbody>
              {answer.ranked_experts.map((expert) => (
                <tr key={expert.expert_id} className="border-b border-[#edf0f5] align-top last:border-0">
                  <td className="px-3 py-2.5 font-mono text-sm">{expert.rank}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/experts/${expert.expert_id}`} className="font-semibold text-[#0b5bd3] hover:underline">
                      {expert.name}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-[#667085]">{expert.archetype}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[190px] text-[#344054]">{expert.title}</div>
                    <div className="mt-0.5 text-[11px] text-[#667085]">{expert.firm}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="line-clamp-2 max-w-[270px] leading-relaxed text-[#344054]">{expert.why}</div>
                    <CitationList citations={expert.citations} onSourceSelect={onSourceSelect} />
                  </td>
                  <td className="px-3 py-2.5 text-[#344054]">
                    {expert.citations.length} cited source{expert.citations.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-3 py-2.5 text-[#344054]">
                    {expert.access}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 border-t border-[#edf0f5] pt-3">
          <Link href="/experts" className="text-xs font-medium text-[#0b5bd3] hover:underline">
            Open the full expert call list →
          </Link>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel title="2. Ranked companies" meta="Target evidence" citations={collectCitations(answer.ranked_companies)} onSourceSelect={onSourceSelect}>
          <div className="space-y-2">
            {answer.ranked_companies.map((company) => (
              <div key={company.company_id} className="grid grid-cols-[26px_minmax(0,1fr)_58px] gap-2 border-b border-[#edf0f5] pb-2 last:border-0 last:pb-0">
                <div className="grid h-6 place-items-center rounded bg-[#eef5ff] font-mono text-xs text-[#0b5bd3]">
                  {company.rank}
                </div>
                <div className="min-w-0">
                  <Link href={`/companies/${company.company_id}`} className="truncate font-semibold text-[#0b5bd3] hover:underline">
                    {company.name}
                  </Link>
                  <div className="text-[11px] text-[#667085]">{company.category} / {company.stage}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#344054]">{company.why}</p>
                  <CitationList citations={company.citations} onSourceSelect={onSourceSelect} />
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">{company.expert_density}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#667085]">Edges</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="3. Suggested call sequence" meta="3 phases" citations={collectCitations(answer.call_sequence)} onSourceSelect={onSourceSelect}>
          <div className="space-y-2">
            {answer.call_sequence.map((step, index) => {
              const expertNames = step.expert_ids
                .map((id) => answer.ranked_experts.find((expert) => expert.expert_id === id)?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div key={`${step.phase}-${index}`} className="flex gap-3 rounded border border-[#e6eaf0] bg-[#fbfcfe] p-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#0b5bd3] font-mono text-xs text-[#0b5bd3]">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{step.phase}</div>
                    <div className="mt-0.5 text-[11px] text-[#667085]">{expertNames}</div>
                    <p className="mt-1 text-xs leading-relaxed text-[#344054]">{step.goal}</p>
                    <CitationList citations={step.citations} onSourceSelect={onSourceSelect} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="4. What to listen for" meta="Claims to validate" citations={collectCitations(answer.what_to_listen_for)} onSourceSelect={onSourceSelect}>
          <div className="space-y-3">
            {answer.what_to_listen_for.map((item) => (
              <div key={item.claim} className="border-b border-[#edf0f5] pb-3 last:border-0 last:pb-0">
                <div className="text-xs font-semibold">{item.claim}</div>
                <div className="mt-2 grid gap-2 text-[11px] leading-relaxed text-[#344054]">
                  <div><span className="font-semibold text-[#07883f]">Raises:</span> {item.raises_conviction_if}</div>
                  <div><span className="font-semibold text-[#c2410c]">Reduces:</span> {item.reduces_conviction_if}</div>
                </div>
                <CitationList citations={item.citations} onSourceSelect={onSourceSelect} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="5. Gaps and risks" meta={answer.confidence.label} citations={collectCitations(answer.risks)} onSourceSelect={onSourceSelect}>
          <div className="grid gap-3">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">Gaps to fill</div>
              <ul className="space-y-1.5 text-xs leading-relaxed text-[#344054]">
                {answer.gaps.map((gap) => (
                  <li key={gap} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b5bd3]" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-[#edf0f5] pt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">Risks</div>
              <div className="space-y-2">
                {answer.risks.map((risk) => (
                  <div key={risk.risk} className="rounded border border-[#e6eaf0] bg-[#fbfcfe] p-2">
                    <div className="text-xs font-semibold">{risk.risk}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#344054]">{risk.why_it_matters}</p>
                    <p className="mt-1 text-[11px] text-[#667085]">Ask: {risk.disconfirming_question}</p>
                    <CitationList citations={risk.citations} onSourceSelect={onSourceSelect} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Ask a follow-up" meta="Action chips">
        <div className="flex flex-wrap gap-2">
          {[...PROMPTS, ...answer.follow_up_actions.map((action) => action.prompt)].slice(0, 6).map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs text-[#344054] transition hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </Panel>

      <div className="text-[11px] text-[#667085]">
        Answers can contain directory errors and should be verified before outreach.
      </div>
    </div>
  );
}

function EvidenceInspector({
  sources,
  selectedSource,
  selectedSourceId,
  onSourceSelect,
}: {
  sources: SourceRecord[];
  selectedSource: SourceRecord | null;
  selectedSourceId: string | null;
  onSourceSelect: (sourceId: string) => void;
}) {
  return (
    <aside className="bg-[#fbfcfe] p-4 lg:col-span-2 2xl:col-span-1 2xl:min-h-[calc(100vh-6.5rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#344054]">
            Source evidence ({sources.length})
          </div>
          <div className="mt-1 text-[11px] text-[#667085]">Highest confidence first</div>
        </div>
      </div>

      {selectedSource ? (
        <div className="mb-3 rounded border border-[#cfd6e2] bg-white shadow-sm">
          <div className="border-b border-[#e6eaf0] p-3">
            <div className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-[#eef5ff] font-mono text-xs text-[#0b5bd3]">
                {selectedSource.source_id.replace("S", "")}
              </span>
              <div className="min-w-0">
                <a
                  href={selectedSource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold leading-snug text-[#0b5bd3] hover:underline"
                >
                  {selectedSource.title}
                </a>
                <div className="mt-1 text-xs text-[#667085]">{selectedSource.publisher}</div>
              </div>
              <ConfidencePips confidence={selectedSource.confidence} />
            </div>
          </div>
          <div className="space-y-4 p-3">
            <InspectorBlock title="Evidence">
              <p className="text-sm leading-relaxed text-[#344054]">
                &quot;{selectedSource.snippet}&quot;
              </p>
            </InspectorBlock>
            <InspectorBlock title="Extracted entities">
              <div className="flex flex-wrap gap-1.5">
                {selectedSource.entities.map((entity) => (
                  <span
                    key={entity}
                    className="rounded border border-[#cfe0ff] bg-[#f4f8ff] px-2 py-1 text-[11px] text-[#0b5bd3]"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </InspectorBlock>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {sources.map((source) => (
          <button
            key={source.source_id}
            onClick={() => onSourceSelect(source.source_id)}
            className={`w-full rounded border bg-white p-3 text-left transition ${
              selectedSourceId === source.source_id
                ? "border-[#0b5bd3] shadow-sm"
                : "border-[#e0e5ed] hover:border-[#c8d0dc]"
            }`}
          >
            <div className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[#eef5ff] font-mono text-[11px] text-[#0b5bd3]">
                {source.source_id.replace("S", "")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-xs font-semibold text-[#0b5bd3]">
                  {source.title}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#667085]">
                  <span>{source.publisher}</span>
                  <span>{Math.round(source.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MessageFrame({ question }: { question: string }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar label="AB" />
        <div>
          <div className="text-xs">
            <span className="font-semibold">You</span>
            <span className="ml-2 text-[#667085]">Current question</span>
          </div>
          <p className="mt-1 text-sm text-[#344054]">{question}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  meta,
  citations,
  children,
  onSourceSelect,
}: {
  title: string;
  meta?: string;
  citations?: string[];
  children: ReactNode;
  onSourceSelect?: (sourceId: string) => void;
}) {
  return (
    <section className="rounded border border-[#dfe3eb] bg-white">
      <div className="flex min-h-9 items-center gap-3 border-b border-[#e6eaf0] px-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {meta ? <span className="text-[11px] text-[#667085]">{meta}</span> : null}
        {citations?.length && onSourceSelect ? (
          <div className="ml-auto">
            <CitationList citations={citations} onSourceSelect={onSourceSelect} />
          </div>
        ) : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
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

function CitationList({
  citations,
  onSourceSelect,
}: {
  citations: string[];
  onSourceSelect: (sourceId: string) => void;
}) {
  if (!citations.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {citations.map((citation) => (
        <button
          key={citation}
          onClick={() => onSourceSelect(citation)}
          className="font-mono text-[11px] text-[#0b5bd3] hover:underline"
        >
          [{citation.replace("S", "")}]
        </button>
      ))}
    </div>
  );
}

function ConfidencePips({ confidence }: { confidence: number }) {
  return (
    <div className="ml-auto shrink-0 text-right">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
        Confidence
      </div>
      <div className="mt-1 flex justify-end gap-1">
        {[0.25, 0.5, 0.75, 0.9].map((threshold) => (
          <span
            key={threshold}
            className={`h-1.5 w-5 rounded-full ${confidence >= threshold ? "bg-[#07883f]" : "bg-[#d8dee8]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function InspectorBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Avatar({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
        active ? "bg-[#0b5bd3] text-white" : "border border-[#cfd6e2] bg-[#eef1f6] text-[#344054]"
      }`}
    >
      {label}
    </span>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded border border-[#dfe3eb] bg-[#f5f7fa]" />
      ))}
    </div>
  );
}

function collectCitations(items: { citations: string[] }[]): string[] {
  return [...new Set(items.flatMap((item) => item.citations))].slice(0, 4);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
