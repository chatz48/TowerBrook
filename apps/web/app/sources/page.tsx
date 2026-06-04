import sourceRegister from "@/data/source-register.json";
import candidates from "@/data/candidates.json";
import deals from "@/data/deals.json";
import { ConfidenceBars } from "@/app/components/ui";
import { getThemeFocus } from "@/lib/theme-focus-server";

export default async function SourcesPage() {
  const themeFocus = await getThemeFocus();
  const visibleSources = sourceRegister.sources.filter(
    (source) => themeFocus === "all" || source.theme === themeFocus || source.theme === "all",
  );
  const candidateBySource = new Map(
    candidates.candidates.map((candidate) => [candidate.source.source_id, candidate]),
  );
  const dealFactsByUrl = new Map<string, { deal: string; facts: string[] }[]>();

  for (const deal of deals) {
    for (const source of deal.sources) {
      const rows = dealFactsByUrl.get(source.url) ?? [];
      rows.push({
        deal: deal.name,
        facts: deal.facts
          .filter((fact) => fact.sourceId && deal.sourceIds.includes(fact.sourceId))
          .slice(0, 4)
          .map((fact) => fact.factType.replaceAll("_", " ")),
      });
      dealFactsByUrl.set(source.url, rows);
    }
  }

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Source Register</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Audit source quality, extracted entities, evidence snippets and
              candidate review status before any graph mutation.
            </p>
          </div>
          <div className="text-[12px] text-ink-faint">
            Production mutation: {sourceRegister.meta.production_mutation ? "enabled" : "disabled"}
          </div>
        </header>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">
              Registered sources ({visibleSources.length})
            </h2>
            <span className="text-[12px] text-ink-faint">
              Research jobs: /discover
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Theme</th>
                  <th>Type</th>
                  <th>Publisher</th>
                  <th>Date</th>
                  <th>Expected entities</th>
                  <th>Review status</th>
                  <th>Confidence</th>
                  <th>Deal facts</th>
                  <th>Why useful</th>
                </tr>
              </thead>
              <tbody>
                {visibleSources.map((source) => {
                  const candidate = candidateBySource.get(source.source_id);
                  return (
                    <tr key={source.source_id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[260px]">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ee-link"
                        >
                          {source.title}
                        </a>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {source.source_id}
                        </div>
                      </td>
                      <td>{source.theme}</td>
                      <td>{source.source_type}</td>
                      <td>{source.publisher}</td>
                      <td>{source.date}</td>
                      <td className="max-w-[180px]">
                        {source.expected_entities.join(", ")}
                      </td>
                      <td>{(candidate?.review.status ?? source.status ?? "unprocessed").replaceAll("_", " ")}</td>
                      <td>
                        {candidate ? (
                          <>
                            <div className="font-semibold tabular-nums">
                              {Math.round(candidate.confidence * 100)}%
                            </div>
                            <ConfidenceBars value={candidate.confidence} />
                          </>
                        ) : (
                          <span className="text-ink-faint">n/a</span>
                        )}
                      </td>
                      <td className="max-w-[260px] text-[12px] leading-relaxed text-ink-soft">
                        {dealFactsByUrl.get(source.url)?.map((row) => (
                          <span key={row.deal} className="line-clamp-2">
                            {row.deal}: {row.facts.join(", ") || "source evidence"}
                          </span>
                        )) ?? <span className="text-ink-faint">No mapped deal facts</span>}
                      </td>
                      <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-2">{source.why_useful}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
