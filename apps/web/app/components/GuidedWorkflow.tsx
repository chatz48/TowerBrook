import Link from "next/link";
import { coverageMatrix, campaignPlan, type ThemeFocus } from "@/lib/investment-readiness";
import { THEME_BY_ID } from "@/lib/themes";

export default function GuidedWorkflow({
  theme,
  includeTowerBrookEmployees,
}: {
  theme: ThemeFocus;
  includeTowerBrookEmployees: boolean;
}) {
  const campaign = campaignPlan(theme, includeTowerBrookEmployees);
  const coverage = coverageMatrix(theme, includeTowerBrookEmployees);
  const highGaps = coverage.filter((cell) => cell.gapSeverity === "high");
  const themeName = theme === "all" ? "all three themes" : THEME_BY_ID[theme]?.name ?? theme;

  return (
    <section className="mt-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <div className="ee-panel rounded-lg p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <div className="ee-label text-accent">Workflow</div>
            <p className="text-[10px] text-ink-soft">Pick a job — scope carries forward.</p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
            {themeName}
          </span>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <WorkflowCard
            number="01"
            title="Build my call list"
            body={`${campaign.calls.length} call-ready or contact-verification experts, sequenced by evidence and company edges.`}
            href="/experts"
            cta="Open call list"
          />
          <WorkflowCard
            number="02"
            title="Show target companies"
            body={`${campaign.targets.length} priority targets with PE scorecards, ownership checks and linked experts.`}
            href="/companies"
            cta="Open targets"
          />
          <WorkflowCard
            number="03"
            title="Fill coverage gaps"
            body={`${highGaps.length} expert archetype gaps need more research before the map is complete.`}
            href="/discover"
            cta="Open queue"
          />
          <WorkflowCard
            number="04"
            title="Prepare meeting pack"
            body="Convert sources, calls, targets, gaps and next steps into a review-ready memo workspace."
            href="/reports"
            cta="Build pack"
          />
        </div>
      </div>
      <details className="ee-panel overflow-hidden rounded-lg">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 marker:hidden">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <div className="ee-label text-ink">Coverage matrix</div>
            <span className="text-[12px] font-semibold text-ink">By archetype</span>
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-accent">Expand</span>
        </summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="ee-table min-w-[560px]">
            <thead>
              <tr>
                <th>Archetype</th>
                <th>Total</th>
                <th>Verified</th>
                <th>Contactable</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((cell) => (
                <tr key={cell.type}>
                  <td className="font-semibold">{cell.label}</td>
                  <td className="tabular-nums">{cell.total}</td>
                  <td className="tabular-nums">{cell.verified}</td>
                  <td className="tabular-nums">{cell.contactable}</td>
                  <td>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      cell.gapSeverity === "low"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : cell.gapSeverity === "medium"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}>
                      {cell.gapSeverity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-3 py-2">
          <Link href="/discover" className="ee-link text-[11px] font-semibold">Research gaps →</Link>
        </div>
      </details>
    </section>
  );
}

function WorkflowCard({ number, title, body, href, cta }: { number: string; title: string; body: string; href: string; cta: string }) {
  return (
    <Link href={href} className="group rounded-md border border-line bg-white p-2.5 transition hover:border-line-strong">
      <h3 className="text-[12px] font-semibold text-ink">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-accent">{number}</span> {title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-ink-soft">{body}</p>
      <div className="mt-1 text-[11px] font-semibold text-accent group-hover:underline">{cta} →</div>
    </Link>
  );
}
