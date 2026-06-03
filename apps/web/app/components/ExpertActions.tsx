"use client";

import { useState } from "react";

type Mode = "call-prep" | "outreach";

export default function ExpertActions({
  expertId,
  expertName,
}: {
  expertId: string;
  expertName: string;
}) {
  const [mode, setMode] = useState<Mode>("call-prep");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function run(which: Mode) {
    setMode(which);
    setLoading(true);
    setError("");
    setOutput("");
    setCopied(false);
    try {
      const res = await fetch(`/api/${which}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setOutput(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="ee-panel rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold">Build call prep for this expert</h2>
          <p className="mt-1 text-[12px] text-ink-faint">
            Grounded in {expertName}&apos;s sourced background.
          </p>
        </div>
        <button
          onClick={() => {
            setOutput("");
            setError("");
            setContext("");
          }}
          className="text-[12px] text-accent"
        >
          Reset
        </button>
      </div>

      <div className="mt-5">
        <div className="text-[13px] font-semibold">What do you need from this expert?</div>
        <div className="mt-3 space-y-3 text-[12px] text-ink-soft">
          {[
            ["Market orientation", "Trends, size, growth, cycles"],
            ["Customer validation", "Customer needs, budgets, pain"],
            ["Deal process intelligence", "Sourcing, diligence, deal terms"],
            ["Founder referrals", "Introductions to operators/founders"],
            ["Skeptical thesis testing", "Challenge assumptions, risks"],
          ].map(([label, description], index) => (
            <label key={label} className="flex gap-3">
              <input
                type="checkbox"
                defaultChecked={index < 4}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium text-ink">{label}</span>
                <span>{description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="mt-5 block text-[12px] font-medium text-ink-soft">
        Optional angle
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. validate buyer pull in grid software"
          className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </label>

      <div className="mt-5 rounded-lg border border-accent bg-[#f7fbff] p-4">
        <div className="text-[12px] text-accent">Session-specific priority rank</div>
        <div className="mt-2 text-4xl font-semibold tracking-tight">#2</div>
        <div className="mt-1 text-[12px] text-success">Up vs. default ranking</div>
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => run("call-prep")}
          disabled={loading}
          className="ee-button ee-button-primary w-full disabled:opacity-50"
        >
          {loading && mode === "call-prep" ? "Preparing..." : "Generate call prep"}
        </button>
        <button
          onClick={() => run("outreach")}
          disabled={loading}
          className="ee-button ee-button-secondary w-full disabled:opacity-50"
        >
          {loading && mode === "outreach" ? "Drafting..." : "Draft outreach"}
        </button>
        <button className="ee-button ee-button-secondary w-full">
          Add to call plan
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {output ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="ee-label">
              {mode === "call-prep" ? "Call-prep brief" : "Outreach draft"}
            </span>
            <button
              onClick={copy}
              className="text-xs text-accent hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border border-line bg-paper p-3.5 text-sm leading-relaxed whitespace-pre-wrap">
            {output}
          </div>
        </div>
      ) : null}
    </div>
  );
}
