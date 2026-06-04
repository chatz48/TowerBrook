"use client";

import { useState } from "react";
import Link from "next/link";
import { THEMES } from "@/lib/themes";
import { publishThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { useThemeFocusClient } from "@/lib/theme-focus-client";

interface ResearchJob {
  id: string;
  job_type: string;
  status: string;
  theme_id?: string;
  query?: string;
  progress_completed: number;
  progress_total: number;
  sources_found: number;
  entities_created: number;
  relationships_created: number;
  error?: string;
}

const RESEARCH_MODES = [
  {
    id: "founder_origination",
    label: "Founder opportunity origination",
    description: "Find new companies, boards, investments and referrals around a previously funded founder.",
  },
  {
    id: "advisor_expert_gap",
    label: "Named advisor-person gap",
    description: "Identify the named bankers, lawyers or diligence professionals behind a PE transaction.",
  },
  {
    id: "identity_resolution",
    label: "Expert identity resolution",
    description: "Verify a candidate's current role, employment history, LinkedIn profile and canonical match.",
  },
  {
    id: "deep_discovery",
    label: "Theme-wide PE discovery",
    description: "Find named experts and companies from relevant private-equity activity.",
  },
] as const;

const DISCOVERY_PRESETS = [
  {
    label: "Find founder-led targets",
    themeId: "grid-infrastructure",
    jobType: "founder_origination",
    query: "ex-founders and operators in grid connection services with new companies, board roles, investments or referrals",
  },
  {
    label: "Name the deal advisors",
    themeId: "clean-energy-advisory",
    jobType: "advisor_expert_gap",
    query: "identify named bankers, lawyers and commercial diligence professionals on renewable energy advisory and development deals",
  },
  {
    label: "Map smart-water experts",
    themeId: "smart-water",
    jobType: "deep_discovery",
    query: "smart water analytics leak detection AMI utility software founders operators investors advisors",
  },
] as const;

export default function DiscoverPage() {
  const themeId = useThemeFocusClient();
  const [jobType, setJobType] = useState<(typeof RESEARCH_MODES)[number]["id"]>(
    "founder_origination",
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<ResearchJob | null>(null);

  function changeTheme(focus: ThemeFocus) {
    publishThemeFocus(focus);
  }

  async function createJob() {
    setLoading(true);
    setError("");
    setJob(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId, jobType, query: query || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshJob() {
    if (!job) return;
    const res = await fetch(`/api/research-jobs/${job.id}`);
    const data = await res.json();
    if (res.ok) setJob(data);
  }

  return (
    <div className="ee-shell grid lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-white p-5 lg:border-b-0 lg:border-r">
        <div className="ee-label text-ink">Live origination</div>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight">Expert discovery queue</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Ask the system to find people or companies missing from the current
          map. Use plain-English targets such as a founder, advisor firm, PE
          deal or coverage gap.
        </p>

        <label className="mt-5 block text-[12px] font-medium text-ink-soft">
          Research mode
          <select
            value={jobType}
            onChange={(event) =>
              setJobType(event.target.value as (typeof RESEARCH_MODES)[number]["id"])
            }
            className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
          >
            {RESEARCH_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] leading-relaxed text-ink-faint">
            {RESEARCH_MODES.find((mode) => mode.id === jobType)?.description}
          </span>
        </label>

        <label className="mt-3 block text-[12px] font-medium text-ink-soft">
          Theme
          <select
            value={themeId}
            onChange={(event) => changeTheme(event.target.value as ThemeFocus)}
            className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All themes</option>
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-[12px] font-medium text-ink-soft">
          Focused investor question
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={4}
            placeholder='e.g. "Who can tell us which grid connection service companies are investable now?"'
            className="mt-1 w-full resize-y rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>

        <button
          onClick={createJob}
          disabled={loading}
          className="ee-button ee-button-primary mt-4 w-full disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create discovery job"}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/sources" className="ee-button ee-button-secondary">
            Sources
          </Link>
          <Link href="/ingest" className="ee-button ee-button-secondary">
            Add source
          </Link>
        </div>
      </aside>

      <main className="min-w-0 p-5">
        {error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {job ? (
          <section className="ee-panel rounded-lg p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="ee-label text-ink">Active discovery job</div>
                <h2 className="mt-2 text-[18px] font-semibold">
                  {job.job_type.replaceAll("_", " ")}
                </h2>
                <p className="mt-1 text-[12px] text-ink-faint">
                  {job.theme_id ?? "all themes"} · {job.id}
                </p>
              </div>
              <button onClick={refreshJob} className="ee-button ee-button-secondary">
                Refresh status
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <JobMetric label="Status" value={job.status} />
              <JobMetric label="Progress" value={`${job.progress_completed}/${job.progress_total}`} />
              <JobMetric label="Sources" value={String(job.sources_found)} />
              <JobMetric label="Entities" value={String(job.entities_created)} />
              <JobMetric label="Edges" value={String(job.relationships_created)} />
            </div>
            {job.error ? (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">
                {job.error}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="ee-panel rounded-lg p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="ee-label text-ink">Discovery queue</div>
                <h2 className="mt-2 text-[18px] font-semibold">No active job in this session</h2>
                <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-ink-soft">
                  Launch discovery only when a live investment decision is blocked by a missing person,
                  company, or piece of transaction evidence.
                </p>
              </div>
              <Link href="/experts" className="ee-button ee-button-secondary">
                Return to call list
              </Link>
            </div>
          </section>
        )}

        <section className="mt-5">
          <div className="mb-3">
            <h2 className="text-[16px] font-semibold">Common research gaps</h2>
            <p className="mt-1 text-[12px] text-ink-faint">
              Select a focused preset, review the question in the left panel, then create the job.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {DISCOVERY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  changeTheme(preset.themeId);
                  setJobType(preset.jobType);
                  setQuery(preset.query);
                }}
                className="ee-panel rounded-lg p-5 text-left hover:border-line-strong"
              >
                <div className="ee-label text-ink-faint">
                  {preset.jobType.replaceAll("_", " ")}
                </div>
                <div className="mt-2 text-[14px] font-semibold text-ink">{preset.label}</div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{preset.query}</p>
                <span className="mt-4 inline-flex text-[12px] font-semibold text-accent">
                  Load question →
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="ee-panel mt-5 overflow-hidden rounded-lg">
          <div className="border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Review standard</h2>
          </div>
          <div className="grid md:grid-cols-3">
            {[
              ["Named person", "A specific individual and current role, not an organization-only lead."],
              ["Decision relevance", "A clear reason this person or company changes the next investment step."],
              ["Source evidence", "A reviewable source that supports the role, relationship, or company claim."],
            ].map(([title, body]) => (
              <div key={title} className="border-b border-line p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <div className="text-[13px] font-semibold">{title}</div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function JobMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[18px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
