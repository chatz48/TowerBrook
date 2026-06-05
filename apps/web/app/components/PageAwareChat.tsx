"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { AskResponse, PageContext } from "@/app/components/copilot/types";
import { readThemeFocusCookie } from "@/lib/theme-focus";
import { readIncludeTowerBrookEmployeesCookie } from "@/lib/employee-scope";

const DEFAULT_PROMPT = "What should I pay attention to on this page?";

export default function PageAwareChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(DEFAULT_PROMPT);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageLabel = useMemo(() => labelForPath(pathname), [pathname]);
  const relationshipHref = useMemo(() => relationshipHrefForPath(pathname), [pathname]);

  if (pathname === "/ask") return null;

  async function submit(nextQuestion = question) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || loading) return;

    setQuestion(cleanQuestion);
    setLoading(true);
    setError("");

    try {
      const pageContext = collectPageContext(pathname);
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          filters: {
            objective: inferObjective(cleanQuestion),
            theme: inferThemeFromPath(pathname),
            geography: "Global / Europe priority",
            archetypes: [],
            sourceScope: "Current page + sourced directory",
            includeTowerBrookEmployees: readIncludeTowerBrookEmployeesCookie(),
          },
          pageContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setAnswer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open ? (
        <section className="w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line-strong bg-white shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-line bg-[#fbfcfe] p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Ask this page
              </div>
              <div className="mt-1 text-xs text-ink-faint">{pageLabel}</div>
            </div>
            <a
              href={relationshipHref}
              className="rounded border border-line bg-white px-2 py-1 text-[11px] font-semibold text-accent hover:border-accent"
            >
              Relationship graph
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-sm text-ink-soft hover:bg-paper"
              aria-label="Close page chat"
            >
              ×
            </button>
          </div>

          <form
            className="border-b border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="sr-only" htmlFor="page-aware-chat-question">
              Ask about this page
            </label>
            <textarea
              id="page-aware-chat-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              className="w-full resize-none rounded border border-line-strong bg-[#fbfcfe] px-3 py-2 text-sm outline-none focus:border-accent focus:bg-white"
              placeholder="Ask about visible experts, companies, deals, sources, or gaps..."
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-ink-faint">
                Uses route, headings, selected text, and visible page text.
              </div>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
              >
                {loading ? "Running" : "Ask"}
              </button>
            </div>
          </form>

          <div className="max-h-[56vh] overflow-y-auto p-3">
            {error ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {answer ? (
              <PageAnswer answer={answer} onPrompt={(prompt) => void submit(prompt)} />
            ) : (
              <PromptStarters onPrompt={(prompt) => void submit(prompt)} />
            )}
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg hover:border-accent hover:text-accent"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] text-white">
            AI
          </span>
          Ask this page
        </button>
      )}
    </div>
  );
}

function PageAnswer({
  answer,
  onPrompt,
}: {
  answer: AskResponse;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="space-y-3">
      {answer.input_context.page_context ? (
        <div className="rounded border border-[#d8dee8] bg-[#fbfcfe] p-2 text-[11px] text-ink-faint">
          Context: {answer.input_context.page_context.title}
        </div>
      ) : null}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Answer
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{answer.answer_summary}</p>
      </div>

      {answer.ranked_experts.length ? (
        <MiniBlock title="Relevant experts">
          <div className="space-y-2">
            {answer.ranked_experts.slice(0, 3).map((expert) => (
              <div key={expert.expert_id} className="rounded border border-line bg-white p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-accent">{expert.name}</div>
                    <div className="mt-0.5 text-[11px] text-ink-faint">{expert.archetype}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-faint">
                    {expert.citations.length} source{expert.citations.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                  {expert.why}
                </p>
              </div>
            ))}
          </div>
        </MiniBlock>
      ) : null}

      {answer.gaps.length ? (
        <MiniBlock title="Gaps to check">
          <ul className="space-y-1 text-xs leading-relaxed text-ink-soft">
            {answer.gaps.slice(0, 3).map((gap) => (
              <li key={gap} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </MiniBlock>
      ) : null}

      <MiniBlock title="Sources">
        <div className="space-y-1.5">
          {answer.sources_used.slice(0, 4).map((source) => (
            <a
              key={source.source_id}
              href={source.url || undefined}
              target={source.url ? "_blank" : undefined}
              rel="noreferrer"
              className="block rounded border border-line bg-white p-2 text-xs text-accent hover:border-accent"
            >
              <span className="font-mono text-[11px] text-ink-faint">[{source.source_id}] </span>
              {source.title}
            </a>
          ))}
        </div>
      </MiniBlock>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        {answer.follow_up_actions.slice(0, 3).map((action) => (
          <button
            key={action.action}
            type="button"
            onClick={() => onPrompt(action.prompt)}
            className="rounded border border-line-strong bg-white px-2.5 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-accent"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PromptStarters({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const prompts = [
    "What is the main takeaway from this page?",
    "What should I ask next based on this page?",
    "Find more information about the top company on this page.",
    "Where are the evidence gaps on this page?",
  ];

  return (
    <div className="space-y-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPrompt(prompt)}
          className="w-full rounded border border-line bg-white px-3 py-2 text-left text-xs text-ink-soft hover:border-accent hover:text-accent"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

function MiniBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {title}
      </div>
      {children}
    </section>
  );
}

function collectPageContext(pathname: string): PageContext {
  const main = document.querySelector("main");
  const headings = Array.from(document.querySelectorAll("main h1, main h2"))
    .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean)
    .slice(0, 12);
  const selectedText = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
  const visibleText = (main?.textContent ?? document.body.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 7000);

  return {
    title: document.title,
    pathname,
    url: window.location.href,
    headings,
    selectedText: selectedText.slice(0, 1200),
    visibleText,
  };
}

function inferThemeFromPath(pathname: string): string {
  if (pathname.includes("clean-energy-advisory")) return "clean-energy-advisory";
  if (pathname.includes("grid-infrastructure")) return "grid-infrastructure";
  if (pathname.includes("smart-water")) return "smart-water";
  return readThemeFocusCookie();
}

function inferObjective(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes("company") || lower.includes("target")) return "Map companies";
  if (lower.includes("risk") || lower.includes("gap") || lower.includes("red")) return "Red-team thesis";
  if (lower.includes("call") || lower.includes("prep")) return "Prepare calls";
  return "Find experts";
}

function labelForPath(pathname: string) {
  if (pathname === "/") return "Home command centre";
  const clean = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "))
    .join(" / ");
  return clean || "Current page";
}

function relationshipHrefForPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "experts" && parts[1]) return `/graph?focus=expert:${parts[1]}`;
  if (parts[0] === "companies" && parts[1]) return `/graph?focus=company:${parts[1]}`;
  if (parts[0] === "deals" && parts[1]) return `/graph?focus=deal:${parts[1]}`;
  return "/graph";
}
