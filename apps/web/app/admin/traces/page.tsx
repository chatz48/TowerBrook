import { loadTraceDashboard, type TraceGroup } from "@/lib/trace-dashboard";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("en-GB");

export default async function TraceMetricsPage() {
  const dashboard = await loadTraceDashboard();
  const summaryTiles = [
    { label: "Requests", value: dashboard.totalGroups },
    { label: "Records", value: dashboard.totalRecords },
    { label: "Completed", value: dashboard.summary.completed },
    { label: "Baseline only", value: dashboard.summary.baselineOnly },
    { label: "Errors", value: dashboard.summary.errors },
    { label: "Backend enriched", value: dashboard.summary.backendEnriched },
    { label: "Avg total", value: formatMs(dashboard.summary.avgTotalMs) },
    { label: "Hybrid calls", value: dashboard.summary.hybridToolCalls },
    { label: "Reranked calls", value: dashboard.summary.rerankedToolCalls },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line-strong bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Trace metrics
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
              Local Copilot traces grouped by request, including retrieval mode, reranking, category,
              LangGraph node timings, and backend enrichment status.
            </p>
          </div>
          <div className="rounded-md border border-line bg-[#fbfcff] px-3 py-2 text-xs text-ink-soft">
            <span className="font-semibold text-ink">Trace root:</span> {dashboard.root}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {tile.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{formatValue(tile.value)}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Recent traces</h2>
            <p className="text-sm text-ink-soft">
              Latest: {dashboard.latestUpdatedAt ? formatDate(dashboard.latestUpdatedAt) : "none"}
            </p>
          </div>
        </div>

        {dashboard.groups.length ? (
          dashboard.groups.map((group) => <TraceCard key={group.requestId} group={group} />)
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong bg-white p-6 text-sm text-ink-soft">
            No local traces found. Enable request tracing and run Copilot to populate this page.
          </div>
        )}
      </section>
    </main>
  );
}

function TraceCard({ group }: { group: TraceGroup }) {
  return (
    <article className="rounded-lg border border-line-strong bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={group.outcome} tone={group.errors.length ? "bad" : "neutral"} />
            <StatusPill label={`Category: ${group.category}`} tone="neutral" />
            <StatusPill label={`Theme: ${group.theme}`} tone="neutral" />
            {group.retrievalModes.map((mode) => (
              <StatusPill key={mode} label={mode} tone={mode.includes("hybrid") ? "good" : "neutral"} />
            ))}
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-ink">{group.question}</h3>
          <p className="mt-1 break-all text-xs text-ink-faint">{group.requestId}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[420px]">
          <Metric label="Created" value={formatDate(group.createdAt)} />
          <Metric label="Total" value={formatMs(group.totalMs)} />
          <Metric label="Model" value={group.model} />
          <Metric label="Surfaces" value={group.surfaces.join(", ")} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-md border border-line bg-[#fbfcff] p-4">
          <h4 className="text-sm font-semibold text-ink">LangChain / LangGraph path</h4>
          {group.langGraphNodes.length ? (
            <div className="mt-3 flex flex-col gap-2">
              {group.langGraphNodes.map((node) => (
                <div key={node.node} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink-soft">{node.node}</span>
                  <span className="font-mono text-xs text-ink">{formatMs(node.ms)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">No LangGraph node timings recorded.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-[#f6f8fb] text-[11px] uppercase tracking-[0.08em] text-ink-faint">
              <tr>
                <th className="px-3 py-2 font-semibold">Tool</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Mode</th>
                <th className="px-3 py-2 font-semibold">Count</th>
                <th className="px-3 py-2 font-semibold">Reranked</th>
                <th className="px-3 py-2 font-semibold">Trace detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white text-ink-soft">
              {group.tools.length ? (
                group.tools.map((tool, index) => (
                  <tr key={`${tool.tool_name ?? "tool"}-${index}`}>
                    <td className="px-3 py-2 font-medium text-ink">{tool.tool_name ?? "unknown"}</td>
                    <td className="px-3 py-2">{tool.category}</td>
                    <td className="px-3 py-2">{tool.status ?? "unknown"}</td>
                    <td className="px-3 py-2">{tool.mode}</td>
                    <td className="px-3 py-2">{tool.count ?? "-"}</td>
                    <td className="px-3 py-2">{tool.reranked ? "yes" : "no"}</td>
                    <td className="px-3 py-2">{toolDetail(tool.input, tool.output)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-3 text-ink-soft" colSpan={7}>
                    No tool calls recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {group.errors.length ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {group.errors.join(" | ")}
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-[#fbfcff] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</p>
      <p className="mt-1 truncate font-medium text-ink" title={value}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "neutral" | "good" | "bad" }) {
  const classes =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "bad"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-line bg-[#fbfcff] text-ink-soft";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function toolDetail(input?: Record<string, unknown>, output?: Record<string, unknown>): string {
  const details = [
    input?.retrieval_options ? `options ${compactJson(input.retrieval_options)}` : null,
    output?.top_scores ? `scores ${compactJson(output.top_scores)}` : null,
  ].filter(Boolean);
  return details.join(" / ") || "-";
}

function compactJson(value: unknown): string {
  return JSON.stringify(value).slice(0, 120);
}

function formatMs(value: number): string {
  return value > 0 ? `${numberFormat.format(Math.round(value))} ms` : "-";
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatValue(value: string | number): string {
  return typeof value === "number" ? numberFormat.format(value) : value;
}
