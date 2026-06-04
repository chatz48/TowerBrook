import Link from "next/link";
import type { ReportModel, ReportSection, ReportSource } from "@/lib/report";
import ReportExportControls from "./ReportExportControls";

export default function ReportWorkspace({ report }: { report: ReportModel }) {
  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="ee-panel rounded-lg p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="ee-label text-accent">Evidence-backed draft</div>
              <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
                {report.reportName}
              </h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                A reviewable memo assembled from the current expert, company,
                deal, and source graph. Treat generated synthesis as a starting
                point and verify claims before circulation.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-ink-faint">
                <span>Generated {report.generatedAt}</span>
                <span>{report.stats.sources} source records</span>
                <span>{report.stats.experts} experts mapped</span>
                <span>{report.stats.companies} companies mapped</span>
              </div>
            </div>
            <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
          </div>
        </header>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5">
            {report.sections.map((section) => (
              <ReportSectionCard
                key={section.id}
                section={section}
                sources={report.sources}
              />
            ))}
          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Review before circulation</div>
              <ul className="mt-4 space-y-3 text-[12px] leading-relaxed text-ink-soft">
                <li>Confirm every material claim has a source that supports that exact claim.</li>
                <li>Validate ownership, scale, and recent activity directly with named experts.</li>
                <li>Separate graph coverage from a complete market census.</li>
                <li>Record disconfirming evidence and unresolved diligence gaps.</li>
              </ul>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Continue diligence</div>
              <div className="mt-4 space-y-2">
                <Link href="/themes/grid-infrastructure" className="ee-button ee-button-secondary w-full">
                  Open theme workspace
                </Link>
                <Link href="/experts" className="ee-button ee-button-secondary w-full">
                  Review call list
                </Link>
                <Link href="/companies" className="ee-button ee-button-secondary w-full">
                  Review targets
                </Link>
                <Link href="/discover" className="ee-button ee-button-primary w-full">
                  Fill evidence gaps
                </Link>
              </div>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Evidence coverage</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <EvidenceMetric label="Sources" value={report.stats.sources} />
                <EvidenceMetric label="High confidence" value={report.stats.highConfidenceSources} />
                <EvidenceMetric label="Experts" value={report.stats.experts} />
                <EvidenceMetric label="Companies" value={report.stats.companies} />
              </div>
            </section>
          </aside>
        </section>

        <SourceRegister sources={report.sources} />
      </div>
    </div>
  );
}

function ReportSectionCard({
  section,
  sources,
}: {
  section: ReportSection;
  sources: ReportSource[];
}) {
  const citedSources = uniqueRefs(section.citations)
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ReportSource => Boolean(source));

  return (
    <article className="ee-panel overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="ee-label text-ink-faint">Section {section.order}</div>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">{section.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={section.status} />
          <span className="rounded-md border border-line bg-paper px-2 py-1 text-[10px] font-semibold text-ink-soft">
            {Math.round(section.confidence * 100)}% record confidence
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-[13px] leading-relaxed text-ink">{section.summary}</p>

        {section.bullets?.length ? (
          <ul className="mt-4 space-y-2 text-[12px] leading-relaxed text-ink-soft">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {section.rows?.length ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-line">
            <table className="ee-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Signal</th>
                  <th>Evidence / implication</th>
                  <th>Metric</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={`${section.id}-${row.label}`}>
                    <td className="font-semibold text-accent">{row.label}</td>
                    <td className="text-[11px] text-ink-soft">{row.value}</td>
                    <td className="max-w-[420px] text-[11px] leading-relaxed text-ink-soft">
                      {row.detail}
                    </td>
                    <td className="whitespace-nowrap text-[11px] font-semibold text-ink">
                      {row.metric ?? "Review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 border-t border-line pt-3">
          <div className="ee-label text-ink-faint">Cited evidence</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {citedSources.length ? citedSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-semibold text-accent hover:border-line-strong"
                title={source.title}
              >
                [{source.ref}] {source.publisher}
              </a>
            )) : (
              <span className="text-[11px] text-danger">No section-level evidence linked.</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ReportSection["status"] }) {
  const style =
    status === "Needs evidence"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "Analyst review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${style}`}>{status}</span>;
}

function EvidenceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="text-[20px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] text-ink-faint">{label}</div>
    </div>
  );
}

function SourceRegister({ sources }: { sources: ReportSource[] }) {
  return (
    <section className="ee-panel mt-5 overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="ee-label text-ink">Source register</h2>
        <span className="text-[11px] text-ink-faint">{sources.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="ee-table min-w-[980px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Source</th>
              <th>Publisher</th>
              <th>Type</th>
              <th>Entities</th>
              <th>Confidence</th>
              <th>Cited in</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td className="font-semibold tabular-nums">{source.ref}</td>
                <td className="max-w-[360px]">
                  <a href={source.url} target="_blank" rel="noreferrer" className="ee-link">
                    {source.title}
                  </a>
                </td>
                <td>{source.publisher}</td>
                <td>{source.type}</td>
                <td className="max-w-[260px] text-[11px] text-ink-soft">
                  {source.entities.slice(0, 3).join(", ")}
                </td>
                <td>{Math.round(source.confidence * 100)}%</td>
                <td className="max-w-[260px] text-[11px] text-ink-soft">
                  {source.citedIn.join(", ") || "Register only"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function uniqueRefs(ids: string[]): string[] {
  return [...new Set(ids)];
}
