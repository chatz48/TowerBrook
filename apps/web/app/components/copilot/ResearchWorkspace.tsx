"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import type { AskResponse, ChatTurn, CopilotFilters, PageContext, SourceRecord } from "./types";
import {
  isThemeFocus,
  publishThemeFocus,
  type ThemeFocus,
} from "@/lib/theme-focus";
import discoveryCandidatesRaw from "@/data/expert-first-pe-discovery-candidates.json";
import type { ExpertDiscoveryCandidate } from "@/lib/expert-discovery";

interface DiscoveryData {
  expert_candidates: ExpertDiscoveryCandidate[];
}
const DISCOVERY_CANDIDATES = (discoveryCandidatesRaw as DiscoveryData).expert_candidates ?? [];

type CopilotTab = "ask" | "queue" | "notes";
type ConversationMessage = { id: string; role: "user" | "assistant"; content: string; answer?: AskResponse };

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

function makeInitialFilters(
  theme: ThemeFocus,
  includeTowerBrookEmployees: boolean,
): CopilotFilters {
  return {
    objective: "Find experts",
    theme,
    geography: "Europe / North America",
    archetypes: ["operator", "advisor", "banker", "ex-founder"],
    sourceScope: "Premium sourced directory",
    includeTowerBrookEmployees,
  };
}

function defaultQuestion(theme: ThemeFocus) {
  if (theme === "clean-energy-advisory") {
    return "Who should I call first to assess clean-energy advisory and development opportunities?";
  }
  if (theme === "grid-infrastructure") {
    return "Who should I call first for grid interconnection bottlenecks?";
  }
  if (theme === "smart-water") {
    return "Who should I call first to assess smart-water infrastructure and analytics opportunities?";
  }
  return "Who should I call first across the three investment themes?";
}

export default function ResearchWorkspace({
  initialTheme,
  includeTowerBrookEmployees,
  initialPrompt,
}: {
  initialTheme: ThemeFocus;
  includeTowerBrookEmployees: boolean;
  initialPrompt?: string;
}) {
  const startingFilters = useMemo(
    () => makeInitialFilters(initialTheme, includeTowerBrookEmployees),
    [includeTowerBrookEmployees, initialTheme],
  );
  const startingQuestion = useMemo(() => initialPrompt ?? defaultQuestion(initialTheme), [initialPrompt, initialTheme]);
  const [question, setQuestion] = useState(startingQuestion);
  const [filters, setFilters] = useState<CopilotFilters>(startingFilters);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuestion, setLoadingQuestion] = useState(startingQuestion);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState("");
  const workspaceItems = useWorkspaceItems();

  async function submit(nextQuestion = question, nextFilters = filters) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || loading) return;
    const chatHistory = toChatHistory(conversation);
    const userMessage: ConversationMessage = {
      id: makeMessageId("user"),
      role: "user",
      content: cleanQuestion,
    };
    setQuestion("");
    setLoadingQuestion(cleanQuestion);
    setConversation((current) => [...current, userMessage]);
    setLoading(true);
    setProgressStep(0);
    setError("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          filters: nextFilters,
          chatHistory,
          pageContext: buildWorkspacePageContext(workspaceItems, nextFilters),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setAnswer(data);
      setConversation((current) => [
        ...current,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          content: data.answer_summary,
          answer: data,
        },
      ]);
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
      setQuestion(startingQuestion);
      setLoadingQuestion(startingQuestion);
      setLoading(true);
      setProgressStep(0);
      setError("");
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: startingQuestion,
            filters: startingFilters,
            chatHistory: [],
            pageContext: buildWorkspacePageContext(readWorkspaceItemsSnapshot(), startingFilters),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        if (!cancelled) {
          setAnswer(data);
          setConversation([
            {
              id: makeMessageId("user"),
              role: "user",
              content: startingQuestion,
            },
            {
              id: makeMessageId("assistant"),
              role: "assistant",
              content: data.answer_summary,
              answer: data,
            },
          ]);
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
  }, [startingFilters, startingQuestion]);

  useEffect(() => {
    if (!loading) return;
    const timers = [900, 2400, 5200].map((delay, index) =>
      window.setTimeout(() => setProgressStep(index + 1), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [loading, loadingQuestion]);

  const selectedSource = useMemo(() => {
    if (!answer?.sources_used.length) return null;
    return (
      answer.sources_used.find((source) => source.source_id === selectedSourceId) ??
      answer.sources_used[0]
    );
  }, [answer, selectedSourceId]);

  const [tab, setTab] = useState<CopilotTab>("ask");

  const queueCandidates = useMemo(
    () =>
      DISCOVERY_CANDIDATES.filter(
        (candidate) =>
          initialTheme === "all" || candidate.themes.includes(initialTheme),
      ).sort((a, b) => b.scores.research_priority - a.scores.research_priority),
    [initialTheme],
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f7f8fb] text-[#111827]">
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <SessionRail
          filters={filters}
          resetFilters={startingFilters}
          onFiltersChange={setFilters}
          onRun={(nextFilters) => submit(question || answer?.input_context.question || loadingQuestion, nextFilters)}
        />

        <main className="min-w-0 border-x border-[#dfe3eb] bg-white">
          <div className="border-b border-[#e6eaf0] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">AI Copilot</h1>
                <p className="mt-1 text-xs text-[#667085]">
                  Ask questions, action the current basket, and save useful outputs back into the workflow.
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-1 border-b border-[#e6eaf0] pb-0">
              {([
                ["ask", "Ask"],
                ["queue", "Research Queue"],
                ["notes", "Notes"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                    tab === key
                      ? "border-[#0b5bd3] text-[#0b5bd3]"
                      : "border-transparent text-[#667085] hover:text-[#344054]"
                  }`}
                >
                  {label}
                  {key === "queue" && (
                    <span className="ml-1.5 rounded-full bg-[#eef5ff] px-1.5 py-0.5 text-[10px] text-[#0b5bd3]">
                      {queueCandidates.length}
                    </span>
                  )}
                  {key === "notes" && workspaceItems.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#eef5ff] px-1.5 py-0.5 text-[10px] text-[#0b5bd3]">
                      {workspaceItems.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === "ask" ? (
              <>
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
              </>
            ) : null}
          </div>

          {tab === "ask" ? (
            <div className="space-y-3 px-5 py-4">
              <BasketContextPanel
                items={workspaceItems}
                theme={filters.theme}
                onOpenNotes={() => setTab("notes")}
                onPrompt={(prompt) => submit(prompt)}
              />
              {conversation.length > 0 ? (
                <div className="space-y-3">
                  {conversation.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {message.role === "user" ? "You" : "Copilot"}
                      </div>
                      <div className="text-[13px] leading-relaxed text-ink">
                        {message.role === "user"
                          ? message.content
                          : message.answer
                            ? <StructuredAnswer
                                answer={message.answer}
                                onSourceSelect={setSelectedSourceId}
                                onPrompt={(prompt) => submit(prompt)}
                              />
                            : message.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MessageFrame question={answer?.input_context.question ?? question} />
              )}
              {loading ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-ink-faint">
                    {progressStep === 0 ? "Searching expert graph..." :
                     progressStep === 1 ? "Analysing relationships..." :
                     progressStep === 2 ? "Synthesising answer..." :
                     "Preparing response..."}
                  </div>
                  <LoadingBlocks />
                </div>
              ) : null}
              {error ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>
          ) : tab === "queue" ? (
            <ResearchQueueTab
              candidates={queueCandidates}
              theme={initialTheme}
              onPrompt={(prompt) => {
                setTab("ask");
                submit(prompt);
              }}
            />
          ) : (
            <NotesTab items={workspaceItems} />
          )}
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

function toChatHistory(messages: ConversationMessage[]): ChatTurn[] {
  return messages
    .map((message) => ({ role: message.role, content: message.content }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-8);
}

function makeMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function SessionRail({
  filters,
  resetFilters,
  onFiltersChange,
  onRun,
}: {
  filters: CopilotFilters;
  resetFilters: CopilotFilters;
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
    <aside className="space-y-7 border-b border-[#dfe3eb] bg-[#fbfcfe] p-4 md:min-h-[calc(100vh-6.5rem)] md:border-b-0">
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
          Memo and queue
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
          <button
            type="button"
            onClick={() => onRun(patch({ sourceScope: "Include indicative records" }))}
            className="rounded border border-[#d8dee8] bg-[#fbfcfe] px-3 py-2 text-left text-xs font-medium text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
          >
            Review research queue candidates
          </button>
        </div>
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
  const theme = themeLabel(answer.input_context.theme);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
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
        <WorkspaceActionButton
          item={{
            id: `copilot-${answer.generated_at}`,
            kind: "memo",
            name: `AI synthesis: ${theme}`,
            sub: answer.input_context.question,
            href: "/ask",
            theme,
            note: answer.answer_summary,
            status: "memo input",
          }}
          className="rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs font-semibold text-[#344054] transition hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
        >
          Save to basket
        </WorkspaceActionButton>
      </div>

      <Panel
        title="1. Ranked experts"
        meta={`${answer.ranked_experts.length} candidates`}
        citations={collectCitations(answer.ranked_experts)}
        onSourceSelect={onSourceSelect}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6eaf0] bg-[#f8fafc] text-[10px] uppercase tracking-[0.12em] text-[#667085]">
                <th className="w-11 px-3 py-2">#</th>
                <th className="w-[140px] px-3 py-2">Expert</th>
                <th className="w-[190px] px-3 py-2">Role & access</th>
                <th className="px-3 py-2">Why top-ranked</th>
                <th className="w-[90px] px-3 py-2">Evidence</th>
                <th className="w-[82px] px-3 py-2">Basket</th>
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
                    <div className="mt-1 text-[11px] leading-snug text-[#667085]">{expert.access}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="line-clamp-2 max-w-[270px] leading-relaxed text-[#344054]">{expert.why}</div>
                    <CitationList citations={expert.citations} onSourceSelect={onSourceSelect} />
                  </td>
                  <td className="px-3 py-2.5 text-[#344054]">
                    {expert.citations.length} cited source{expert.citations.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-3 py-2.5">
                    <WorkspaceActionButton
                      item={{
                        id: expert.expert_id,
                        kind: "call",
                        name: expert.name,
                        sub: `${expert.title}, ${expert.firm}`,
                        href: `/experts/${expert.expert_id}`,
                        theme,
                        note: expert.why,
                        status: "copilot shortlist",
                      }}
                      className="rounded border border-[#d8dee8] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
                    >
                      Save
                    </WorkspaceActionButton>
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
              <div key={company.company_id} className="grid grid-cols-[26px_minmax(0,1fr)_58px_70px] gap-2 border-b border-[#edf0f5] pb-2 last:border-0 last:pb-0">
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
                <div className="text-right">
                  <WorkspaceActionButton
                    item={{
                      id: company.company_id,
                      kind: "target",
                      name: company.name,
                      sub: `${company.category} / ${company.stage}`,
                      href: `/companies/${company.company_id}`,
                      theme,
                      note: company.why,
                      status: "copilot target",
                    }}
                    className="rounded border border-[#d8dee8] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
                  >
                    Save
                  </WorkspaceActionButton>
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
    <aside className="bg-[#fbfcfe] p-4 md:col-span-2 2xl:col-span-1 2xl:min-h-[calc(100vh-6.5rem)]">
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

function BasketContextPanel({
  items,
  theme,
  onOpenNotes,
  onPrompt,
}: {
  items: WorkspaceItem[];
  theme: string;
  onOpenNotes: () => void;
  onPrompt: (prompt: string) => void;
}) {
  const calls = items.filter((item) => item.kind === "call");
  const targets = items.filter((item) => item.kind === "target");
  const memos = items.filter((item) => item.kind === "memo");
  const selectedItems = items.slice(0, 5);
  const quickActions = [
    {
      label: "Gather research",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Gather the next research needed for these saved experts, companies, and notes. Prioritise missing evidence, source checks, and companies to validate.",
      ),
    },
    {
      label: "Draft outreach",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Draft concise expert outreach for the saved people and explain which saved companies or diligence questions each outreach should mention.",
      ),
    },
    {
      label: "Prepare calls",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Prepare a call plan from the saved basket: call order, objective for each call, questions to ask, and what would raise or reduce conviction.",
      ),
    },
    {
      label: "Draft memo section",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Draft a partner memo section using the saved basket. Include thesis, priority experts, target companies, evidence gaps, and recommended next actions.",
      ),
    },
  ];

  return (
    <section className="rounded border border-[#cfd6e2] bg-[#f8fbff] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#344054]">
            Basket context
          </div>
          <p className="mt-1 text-xs text-[#667085]">
            Current saved context for {themeLabel(theme)} AI actions.
          </p>
        </div>
        <div className="flex overflow-hidden rounded border border-[#d8dee8] bg-white">
          <BasketStat label="Experts" value={calls.length} />
          <BasketStat label="Companies" value={targets.length} />
          <BasketStat label="Notes" value={memos.length} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {items.length ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedItems.map((item) => (
                <Link
                  key={`${item.kind}:${item.id}`}
                  href={item.href}
                  className="rounded border border-[#d8dee8] bg-white px-2 py-1 text-[11px] font-medium text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
                >
                  {workspaceKindLabel(item.kind)}: {item.name}
                </Link>
              ))}
              {items.length > selectedItems.length ? (
                <button
                  type="button"
                  onClick={onOpenNotes}
                  className="rounded border border-[#d8dee8] bg-white px-2 py-1 text-[11px] font-medium text-[#667085] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
                >
                  +{items.length - selectedItems.length} more
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded border border-dashed border-[#cfd6e2] bg-white px-3 py-2 text-xs text-[#667085]">
              Basket is empty. Saved experts, companies, and AI notes will appear here.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onPrompt(action.prompt)}
              className="rounded border border-[#0b5bd3] bg-white px-3 py-2 text-left text-xs font-semibold text-[#0b5bd3] hover:bg-[#eef5ff]"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BasketStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-[#d8dee8] px-3 py-2 text-center last:border-r-0">
      <div className="font-mono text-sm font-semibold text-[#111827]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#667085]">{label}</div>
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

function buildWorkspacePageContext(
  items: WorkspaceItem[],
  filters: CopilotFilters,
): PageContext {
  const saved = items.slice(0, 16).map((item) => {
    const detail = [workspaceKindLabel(item.kind), item.name, item.sub, item.note, item.status]
      .filter(Boolean)
      .join(" | ");
    return `- ${detail}`;
  });
  return {
    title: "AI Copilot",
    pathname: "/ask",
    headings: [
      `Theme: ${themeLabel(filters.theme)}`,
      `Objective: ${filters.objective}`,
      `Saved basket items: ${items.length}`,
    ],
    visibleText: saved.length
      ? `Current basket for this investment workflow:\n${saved.join("\n")}`
      : "Current basket is empty.",
  };
}

function buildBasketPrompt(items: WorkspaceItem[], theme: string, instruction: string): string {
  const saved = items.length
    ? items
        .slice(0, 12)
        .map((item) => `${workspaceKindLabel(item.kind)}: ${item.name}${item.sub ? ` (${item.sub})` : ""}`)
        .join("; ")
    : "No saved basket items yet.";
  return `${instruction}\n\nTheme: ${themeLabel(theme)}\nBasket: ${saved}`;
}

function themeLabel(value: string): string {
  return THEMES.find((theme) => theme.value === value)?.label ?? value;
}

function workspaceKindLabel(kind: string): string {
  if (kind === "call") return "Expert";
  if (kind === "target") return "Company";
  return "Note";
}

// ---- Research Queue Tab ----

function ResearchQueueTab({
  candidates,
  theme,
  onPrompt,
}: {
  candidates: ExpertDiscoveryCandidate[];
  theme: ThemeFocus;
  onPrompt: (prompt: string) => void;
}) {
  const unmatched = candidates.filter(
    (candidate) => candidate.canonical_match.status !== "exact_name_match",
  );
  const matched = candidates.filter(
    (candidate) => candidate.canonical_match.status === "exact_name_match",
  );

  return (
    <div className="space-y-4 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">Research Queue</h2>
        <p className="mt-1 text-xs text-[#667085]">
          Discovery candidates for {themeLabel(theme)} sourced from PE deal evidence, peer fund activity, and market mapping.
          Review and action each candidate to build expert coverage.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-[#dfe3eb] bg-white">
          <div className="border-b border-[#e6eaf0] px-3 py-2.5">
            <span className="text-xs font-semibold">Unmatched candidates</span>
            <span className="ml-2 text-[11px] text-[#667085]">
              {unmatched.length} need verification
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {unmatched.slice(0, 15).map((candidate) => (
              <div
                key={candidate.candidate_id}
                className="border-b border-[#edf0f5] px-3 py-2.5 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{candidate.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#667085]">
                      {candidate.headline} · {candidate.archetypes.join(", ")}
                    </div>
                    <div className="mt-1 text-[11px] text-[#344054] line-clamp-2">
                      {candidate.why_relevant}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {candidate.organizations.slice(0, 2).map((org) => (
                        <span
                          key={org}
                          className="rounded border border-[#d8dee8] bg-[#f8fafc] px-1.5 py-0.5 text-[10px] text-[#667085]"
                        >
                          {org}
                        </span>
                      ))}
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                        {candidate.access_path.replaceAll("-", " ")}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-[#eef5ff] px-2 py-1 text-[10px] font-semibold text-[#0b5bd3]">
                    {Math.round(candidate.scores.research_priority)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onPrompt(
                      `Research ${candidate.name}: ${candidate.why_relevant}. Find their LinkedIn, email, and confirm their current role and organisation.`,
                    )
                  }
                  className="mt-2 text-[11px] font-medium text-[#0b5bd3] hover:underline"
                >
                  Ask Copilot to research →
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-[#dfe3eb] bg-white">
          <div className="border-b border-[#e6eaf0] px-3 py-2.5">
            <span className="text-xs font-semibold">Matched candidates</span>
            <span className="ml-2 text-[11px] text-[#667085]">
              {matched.length} in expert directory
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {matched.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#667085]">
                No matched candidates yet. Run discovery jobs to populate.
              </div>
            ) : (
              matched.slice(0, 10).map((candidate) => (
                <div
                  key={candidate.candidate_id}
                  className="border-b border-[#edf0f5] px-3 py-2.5 last:border-0"
                >
                  <div className="text-xs font-semibold">{candidate.name}</div>
                  <div className="mt-0.5 text-[11px] text-[#667085]">{candidate.headline}</div>
                  {candidate.canonical_match.expert_id && (
                    <Link
                      href={`/experts/${candidate.canonical_match.expert_id}`}
                      className="mt-1 inline-block text-[11px] font-medium text-[#07883f] hover:underline"
                    >
                      View expert profile →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onPrompt(
              "Review the research queue and prioritise which candidates to verify first based on deal relevance and access path.",
            )
          }
          className="rounded border border-[#0b5bd3] bg-[#0b5bd3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#084aa9]"
        >
          Prioritise queue with Copilot
        </button>
        <Link
          href="/experts"
          className="rounded border border-[#d8dee8] bg-white px-4 py-2 text-xs font-medium text-[#344054] hover:border-[#0b5bd3]"
        >
          Open call tray
        </Link>
      </div>
    </div>
  );
}

// ---- Notes Tab ----

interface WorkspaceItem {
  id: string;
  kind: string;
  name: string;
  sub?: string;
  href: string;
  theme?: string;
  note?: string;
  status: string;
  addedAt: string;
}

const WORKSPACE_STORAGE_KEY = "towerbrook-investor-workspace-v1";
const WORKSPACE_EVENT = "towerbrook-investor-workspace-updated";

function useWorkspaceItems(): WorkspaceItem[] {
  const snapshot = useSyncExternalStore(
    (callback) => {
      const handler = () => callback();
      window.addEventListener(WORKSPACE_EVENT, handler);
      return () => window.removeEventListener(WORKSPACE_EVENT, handler);
    },
    () => {
      try {
        return localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );

  return useMemo(() => {
    return parseWorkspaceItems(snapshot);
  }, [snapshot]);
}

function readWorkspaceItemsSnapshot(): WorkspaceItem[] {
  try {
    return parseWorkspaceItems(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function parseWorkspaceItems(value: string): WorkspaceItem[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function NotesTab({ items }: { items: WorkspaceItem[] }) {
  const calls = items.filter((item) => item.kind === "call");
  const targets = items.filter((item) => item.kind === "target");
  const memos = items.filter((item) => item.kind === "memo");

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="text-3xl">📋</div>
        <h3 className="mt-3 text-sm font-semibold">No saved items yet</h3>
        <p className="mt-1 max-w-sm text-xs text-[#667085]">
          Save experts and companies from the call tray and company pages to build your research notes here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">Copilot Notes</h2>
        <p className="mt-1 text-xs text-[#667085]">
          Your saved calls, targets, and research notes. Use these to prepare for partner meetings and diligence sessions.
        </p>
      </div>

      {calls.length > 0 && (
        <SectionBlock title={`Call list (${calls.length})`}>
          {calls.map((item) => (
            <NoteRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </SectionBlock>
      )}

      {targets.length > 0 && (
        <SectionBlock title={`Target watchlist (${targets.length})`}>
          {targets.map((item) => (
            <NoteRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </SectionBlock>
      )}

      {memos.length > 0 && (
        <SectionBlock title={`Memos (${memos.length})`}>
          {memos.map((item) => (
            <NoteRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </SectionBlock>
      )}

      <p className="text-[11px] text-[#667085]">
        Notes persist in your browser. Clear them from the floating tray at the bottom-right of any page.
      </p>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border border-[#dfe3eb] bg-white">
      <div className="border-b border-[#e6eaf0] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
          {title}
        </span>
      </div>
      <div className="divide-y divide-[#edf0f5]">{children}</div>
    </div>
  );
}

function NoteRow({ item }: { item: WorkspaceItem }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <Link href={item.href} className="text-xs font-semibold text-[#0b5bd3] hover:underline">
          {item.name}
        </Link>
        {item.sub && <div className="mt-0.5 text-[11px] text-[#667085]">{item.sub}</div>}
        {item.note && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#344054]">
            {item.note}
          </p>
        )}
        <div className="mt-1 text-[10px] text-[#667085]">
          {item.status} · {new Date(item.addedAt).toLocaleDateString()}
        </div>
      </div>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
          item.kind === "call"
            ? "bg-[#eef5ff] text-[#0b5bd3]"
            : item.kind === "target"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-purple-50 text-purple-700"
        }`}
      >
        {item.kind === "call" ? "Call" : item.kind === "target" ? "Target" : "Memo"}
      </span>
    </div>
  );
}
