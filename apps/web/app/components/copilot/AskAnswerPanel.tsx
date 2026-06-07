"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import { PROMPTS } from "./constants";
import type { AskResponse, ToolTrace } from "./types";
import { collectCitations, formatTime, themeLabel } from "./utils";

export function AskAnswerPanel({
  answer,
  onSourceSelect,
  onPrompt,
  compact = false,
}: {
  answer: AskResponse;
  onSourceSelect: (sourceId: string) => void;
  onPrompt: (prompt: string) => void;
  compact?: boolean;
}) {
  const theme = themeLabel(answer.input_context.theme);
  const [copied, setCopied] = useState(false);

  async function copyCallPack() {
    const lines = [
      answer.answer_summary,
      "",
      "Ranked experts:",
      ...answer.ranked_experts.slice(0, 8).map((expert) => `${expert.rank}. ${expert.name} — ${expert.why}`),
      "",
      "Call sequence:",
      ...answer.call_sequence.map((step, index) => `${index + 1}. ${step.phase}: ${step.goal}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (compact) {
    return (
      <div className="rounded-md border border-line bg-paper px-3 py-2">
        <p className="text-[13px] leading-relaxed text-ink-soft">{answer.answer_summary}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="text-ink-faint">{answer.ranked_experts.length} experts ranked</span>
          <Link href="/experts?readiness=actionable" className="font-semibold text-accent hover:underline">
            Open call list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar label="EE" active />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Expert Engine</span>
            <span className="text-ink-faint">{formatTime(answer.generated_at)}</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {answer.intent
                ? `LangGraph · ${answer.intent.replaceAll("_", " ")}`
                : answer.grounded
                  ? "Directory grounded"
                  : answer.backend_enriched
                    ? "LangGraph enriched"
                    : "Directory synthesis"}
            </span>
            {answer.model_used ? (
              <span className="text-[10px] text-ink-faint">{answer.model_used}</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{answer.answer_summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/experts?readiness=actionable" className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px]">
              Add to call list
            </Link>
            <button
              type="button"
              onClick={() => void copyCallPack()}
              className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px]"
            >
              {copied ? "Copied" : "Copy call pack"}
            </button>
            <Link href="/reports" className="ee-button ee-button-primary min-h-7 px-2.5 text-[11px]">
              Open memo
            </Link>
          </div>
          {answer.enrichment_warnings?.length ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {answer.enrichment_warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
          {answer.structured?.key_findings?.length ? (
            <div className="mt-3 rounded-lg border border-line bg-paper p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Key findings (LangGraph)
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                {answer.structured.key_findings.slice(0, 5).map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {answer.tool_calls?.length ? (
            <div className="mt-3">
              <ToolTracePanel traces={answer.tool_calls} />
            </div>
          ) : null}
          {answer.backend_error ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-800">
              Live research unavailable: {answer.backend_error}
            </p>
          ) : null}
          {answer.request_id ? (
            <p className="mt-2 font-mono text-[10px] text-ink-faint">Request {answer.request_id}</p>
          ) : null}
          {answer.verification_warnings?.length ? (
            <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              {answer.verification_warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
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
          className="ee-button ee-button-secondary min-h-8 px-3 text-xs"
        >
          Save to basket
        </WorkspaceActionButton>
      </div>

      <Panel
        title="1. Ranked experts"
        meta={`${answer.ranked_experts.length} candidates`}
        citations={collectCitations(answer.ranked_experts)}
        onSourceSelect={onSourceSelect}
        defaultOpen
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

function Panel({
  title,
  meta,
  citations,
  children,
  onSourceSelect,
  defaultOpen = false,
}: {
  title: string;
  meta?: string;
  citations?: string[];
  children: ReactNode;
  onSourceSelect?: (sourceId: string) => void;
  defaultOpen?: boolean;
}) {
  return (
    <details className="ee-panel overflow-hidden rounded-lg" open={defaultOpen}>
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-3 border-b border-line px-3 py-2 marker:hidden">
        <h2 className="text-sm font-semibold">{title}</h2>
        {meta ? <span className="text-[11px] text-ink-faint">{meta}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          {citations?.length && onSourceSelect ? (
            <div onClick={(event) => event.stopPropagation()}>
              <CitationList citations={citations} onSourceSelect={onSourceSelect} />
            </div>
          ) : null}
          <span className="text-[11px] font-semibold text-accent">Expand</span>
        </div>
      </summary>
      <div className="p-3">{children}</div>
    </details>
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

function ToolTracePanel({ traces }: { traces: ToolTrace[] }) {
  return (
    <details className="mt-2 rounded border border-line bg-paper px-2 py-1.5">
      <summary className="cursor-pointer text-[11px] font-semibold text-ink-faint">
        Research tool trace ({traces.length} step{traces.length === 1 ? "" : "s"})
      </summary>
      <ol className="mt-2 space-y-2 text-[11px] text-ink-soft">
        {traces.map((trace, index) => (
          <li key={`${trace.tool_name}-${index}`} className="rounded border border-line bg-white px-2 py-1.5">
            <div className="font-semibold text-ink">{trace.tool_name}</div>
            <div className="mt-0.5 text-ink-faint">Input: {summarizeTracePayload(trace.input)}</div>
            <div className="text-ink-faint">Output: {summarizeTracePayload(trace.output)}</div>
          </li>
        ))}
      </ol>
    </details>
  );
}

function summarizeTracePayload(payload: Record<string, unknown>): string {
  const text = JSON.stringify(payload);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
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
