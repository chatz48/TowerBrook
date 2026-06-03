import type { ReportModel, ReportSection, ReportSource } from "@/lib/report";
import ReportExportControls from "./ReportExportControls";

export default function ReportWorkspace({ report }: { report: ReportModel }) {
  const activeTemplate = report.templates.find((template) => template.id === report.templateId);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#111827]">
      <div className="mx-auto grid max-w-[1560px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="border-b border-[#dbe2ec] bg-white lg:min-h-[calc(100vh-57px)] lg:border-b-0 lg:border-r">
          <div className="p-4">
            <div className="text-[12px] font-black uppercase tracking-[0.08em] text-[#0f172a]">
              Reports / Memo Builder
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[#475569]">
              Create data-backed, citable memos.
            </p>
            <button className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded bg-[#075bea] text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(7,91,234,0.18)]">
              <span className="text-base leading-none">+</span>
              New report
            </button>
          </div>

          <RailBlock title="Templates">
            <div className="space-y-1">
              {report.templates.map((template) => (
                <div
                  key={template.id}
                  className={`rounded border p-3 ${
                    template.id === report.templateId
                      ? "border-[#075bea] bg-[#f7faff] shadow-[inset_3px_0_0_#075bea]"
                      : "border-transparent bg-white"
                  }`}
                >
                  <div className="flex gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-[#cbd5e1] font-mono text-[10px] text-[#075bea]">
                      {template.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-[#0f172a]">{template.name}</div>
                      <div className="mt-0.5 text-[11px] text-[#64748b]">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RailBlock>

          <RailBlock title="My reports">
            <div className="space-y-3">
              {report.savedReports.map((saved) => (
                <div key={saved.name} className="grid grid-cols-[18px_1fr] gap-2">
                  <span className="mt-0.5 font-mono text-[10px] text-[#64748b]">DOC</span>
                  <div>
                    <div className="text-[11px] font-semibold text-[#0f172a]">{saved.name}</div>
                    <div className="text-[10px] text-[#64748b]">
                      {saved.updated} / {saved.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RailBlock>

          <div className="m-4 rounded border border-[#dbe2ec] bg-[#fbfdff] p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.08em]">
                Auto-refresh
              </div>
              <span className="h-5 w-9 rounded-full bg-[#075bea] p-0.5">
                <span className="block h-4 w-4 translate-x-4 rounded-full bg-white" />
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-[#64748b]">Frequency</span>
              <span className="text-right font-semibold">Weekly</span>
              <span className="text-[#64748b]">Next run</span>
              <span className="text-right font-semibold">Jun 9, 2026</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 border-b border-[#dbe2ec] lg:border-b-0">
          <section className="border-b border-[#dbe2ec] bg-white px-4 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[18px] font-black tracking-[-0.01em] text-[#0f172a]">
                    {report.reportName}
                  </h1>
                  <span className="rounded border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-[11px] font-bold text-[#15803d]">
                    Draft
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#475569]">
                  Last updated: {report.generatedAt} / {report.wordCount.toLocaleString()} words /{" "}
                  {activeTemplate?.name}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <button className="h-8 rounded border border-[#d6deea] bg-white px-3 font-semibold text-[#334155]">
                  History
                </button>
                <button className="h-8 rounded border border-[#d6deea] bg-white px-3 font-semibold text-[#334155]">
                  Share
                </button>
                <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
              </div>
            </div>
          </section>

          <section className="bg-[#f7f9fc] p-3 md:p-4">
            <div className="overflow-hidden rounded border border-[#dbe2ec] bg-white">
              {report.sections.map((section) => (
                <ReportSectionRow
                  key={section.id}
                  section={section}
                  sources={report.sources}
                />
              ))}
            </div>

            <SourceRegister sources={report.sources} />
          </section>
        </main>

        <aside className="bg-white lg:min-h-[calc(100vh-57px)] lg:border-l lg:border-[#dbe2ec]">
          <SettingsRail report={report} />
        </aside>
      </div>
    </div>
  );
}

function RailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#dbe2ec] p-4">
      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#334155]">
        {title}
      </div>
      {children}
    </div>
  );
}

function ReportSectionRow({
  section,
  sources,
}: {
  section: ReportSection;
  sources: ReportSource[];
}) {
  const sourceCount = uniqueRefs(section.citations).length;

  return (
    <article className="grid border-b border-[#dbe2ec] last:border-b-0 md:grid-cols-[46px_150px_minmax(0,1fr)_154px_170px]">
      <div className="hidden border-r border-[#eef2f7] px-3 py-4 text-center font-mono text-[12px] text-[#94a3b8] md:block">
        ::
      </div>
      <div className="border-b border-[#eef2f7] px-4 py-4 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[16px] font-black">{section.order}</span>
          <span className="text-[13px] font-black text-[#0f172a]">{section.title}</span>
        </div>
        <div className="mt-2 inline-flex rounded border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-[#15803d]">
          {section.status}
        </div>
        <div className="mt-2 font-mono text-[11px] text-[#64748b]">{section.wordCount} words</div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <p className="text-[13px] leading-6 text-[#1f2937]">
          {section.summary} <CitationMarkers ids={section.citations} sources={sources} />
        </p>

        {section.rows?.length ? (
          <div className="overflow-hidden rounded border border-[#e2e8f0]">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-[0.04em] text-[#475569]">
                <tr>
                  <th className="border-b border-[#e2e8f0] px-2 py-2 font-black">Name</th>
                  <th className="border-b border-[#e2e8f0] px-2 py-2 font-black">Signal</th>
                  <th className="border-b border-[#e2e8f0] px-2 py-2 font-black">Evidence</th>
                  <th className="border-b border-[#e2e8f0] px-2 py-2 text-right font-black">
                    Metric
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={`${section.id}-${row.label}`} className="align-top">
                    <td className="border-b border-[#eef2f7] px-2 py-2 font-bold text-[#075bea]">
                      {row.label}
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-2 text-[#334155]">
                      {row.value}
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-2 text-[#475569]">
                      {row.detail} <CitationMarkers ids={row.citations} sources={sources} />
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-2 text-right font-mono font-bold text-[#0f172a]">
                      {row.metric ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section.bullets?.length ? (
          <ul className="grid gap-1.5 text-[12px] leading-5 text-[#334155]">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#075bea]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex items-start gap-2 border-t border-[#eef2f7] px-4 py-4 md:block md:border-l md:border-t-0">
        <ConfidencePill value={section.confidence} />
        <div className="mt-0 md:mt-2">
          <span className="rounded border border-[#dbe2ec] bg-white px-2 py-1 font-mono text-[11px] text-[#475569]">
            {sourceCount} sources
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#eef2f7] px-4 py-4 md:block md:space-y-2 md:border-l md:border-t-0">
        {section.actions.map((action) => (
          <button
            key={`${section.id}-${action}`}
            className="h-8 rounded border border-[#d6deea] bg-white px-3 text-[12px] font-semibold text-[#075bea] transition hover:border-[#075bea] hover:bg-[#f7faff]"
          >
            {action}
          </button>
        ))}
      </div>
    </article>
  );
}

function SettingsRail({ report }: { report: ReportModel }) {
  return (
    <div>
      <RailBlock title="Report settings">
        <div className="space-y-4 text-[12px]">
          <SettingField label="Report name" value={report.reportName} />
          <SettingField label="Theme" value={report.themeName} />
          <SettingField label="Audience" value="Investment Committee" />
          <SettingField label="Length" value="~10 pages" />
          <SettingField label="Tone" value="Analytical and evidence-backed" />
        </div>
      </RailBlock>

      <RailBlock title="Included sources">
        <div className="grid gap-3 text-[12px]">
          <MetricLine label="All sources" value={report.stats.sources} />
          <MetricLine label="High confidence only" value={report.stats.highConfidenceSources} />
          <MetricLine label="Experts mapped" value={report.stats.experts} />
          <MetricLine label="Companies mapped" value={report.stats.companies} />
        </div>
      </RailBlock>

      <RailBlock title="Citation style">
        <div className="rounded border border-[#d6deea] bg-[#fbfdff] px-3 py-2 text-[12px] font-semibold text-[#334155]">
          Numeric [1]
        </div>
      </RailBlock>

      <RailBlock title="Export options">
        <div className="space-y-2 text-[12px] text-[#334155]">
          {[
            "Include source register",
            "Include confidence labels",
            "Include evidence links",
            "Include internal notes",
          ].map((option, index) => (
            <label key={option} className="flex items-center gap-2">
              <span
                className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${
                  index < 3
                    ? "border-[#075bea] bg-[#075bea] text-white"
                    : "border-[#cbd5e1] bg-white"
                }`}
              >
                {index < 3 ? "x" : ""}
              </span>
              {option}
            </label>
          ))}
        </div>
      </RailBlock>

      <RailBlock title="Export / share">
        <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
      </RailBlock>
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black text-[#334155]">{label}</span>
      <span className="block rounded border border-[#d6deea] bg-[#fbfdff] px-3 py-2 font-semibold text-[#334155]">
        {value}
      </span>
    </label>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#475569]">{label}</span>
      <span className="font-mono font-black text-[#075bea]">{value}</span>
    </div>
  );
}

function SourceRegister({ sources }: { sources: ReportSource[] }) {
  const shown = sources.slice(0, 12);

  return (
    <section className="mt-4 overflow-hidden rounded border border-[#dbe2ec] bg-white">
      <div className="flex items-center justify-between border-b border-[#dbe2ec] px-3 py-2">
        <h2 className="text-[12px] font-black uppercase tracking-[0.08em] text-[#0f172a]">
          Source register ({sources.length})
        </h2>
        <span className="text-[11px] text-[#64748b]">Showing 1-{shown.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-[11px]">
          <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-[0.04em] text-[#475569]">
            <tr>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">#</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Source title</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Publisher</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Date</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Type</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Entities</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Confidence</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2 font-black">Cited in</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((source) => (
              <tr key={source.id} className="align-top">
                <td className="border-b border-[#eef2f7] px-3 py-2 font-mono font-bold">
                  {source.ref}
                </td>
                <td className="max-w-[340px] border-b border-[#eef2f7] px-3 py-2">
                  <a
                    href={source.url}
                    className="font-semibold text-[#075bea] hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title}
                  </a>
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 text-[#334155]">
                  {source.publisher}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 text-[#475569]">
                  {source.date}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 text-[#475569]">
                  {source.type}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 text-[#475569]">
                  {source.entities.slice(0, 3).join(", ")}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2">
                  <ConfidenceBars value={source.confidence} />
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 font-mono text-[#075bea]">
                  {source.citedIn.length ? source.citedIn.join(", ") : "Register"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CitationMarkers({ ids, sources }: { ids: string[]; sources: ReportSource[] }) {
  return (
    <>
      {uniqueRefs(ids).map((id) => {
        const source = sources.find((item) => item.id === id);
        if (!source) return null;
        return (
          <a
            key={id}
            href={source.url}
            className="ml-1 font-mono text-[11px] font-bold text-[#075bea] hover:underline"
            target="_blank"
            rel="noreferrer"
            title={source.title}
          >
            [{source.ref}]
          </a>
        );
      })}
    </>
  );
}

function ConfidencePill({ value }: { value: number }) {
  const label = value >= 0.82 ? "High confidence" : value >= 0.72 ? "Medium confidence" : "Needs evidence";
  const tone =
    value >= 0.82
      ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"
      : value >= 0.72
        ? "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
        : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";

  return (
    <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${tone}`}>
      <span className="mr-1.5 mt-1 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ConfidenceBars({ value }: { value: number }) {
  const active = Math.max(1, Math.round(value * 4));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 4 }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 w-5 rounded-full ${
            index < active ? "bg-[#15803d]" : "bg-[#e2e8f0]"
          }`}
        />
      ))}
      <span className="ml-1 font-mono text-[10px] text-[#475569]">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function uniqueRefs(ids: string[]): string[] {
  return [...new Set(ids)];
}
