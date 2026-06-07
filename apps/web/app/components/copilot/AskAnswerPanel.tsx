"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import { PROMPTS } from "./constants";
import type { AskResponse } from "./types";
import { collectCitations, formatTime, themeLabel } from "./utils";

export function AskAnswerPanel({
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
              {answer.model_refined
                ? "Model refined"
                : answer.backend_enriched
                  ? "Backend enriched"
                  : "Directory synthesis"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#344054]">{answer.answer_summary}</p>
          {answer.agentic_answer ? (
            <div className="mt-3 rounded-lg border border-[#d8dee8] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
                Live research synthesis
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#344054]">{answer.agentic_answer}</p>
              {answer.tool_calls?.length ? (
                <p className="mt-2 text-[11px] text-[#667085]">
                  Tools used: {answer.tool_calls.length} backend research step
                  {answer.tool_calls.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          ) : null}
          {answer.backend_error ? (
            <p className="mt-2 text-[11px] text-amber-700">
              Live research unavailable: {answer.backend_error}
            </p>
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
