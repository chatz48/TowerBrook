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
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <div className="ee-panel rounded-lg p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="ee-label text-accent">Guided investment workflow</div>
            <h2 className="mt-2 text-[20px] font-semibold tracking-tight">What do you need by the next IC / Monday meeting?</h2>
            <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-ink-soft">
              A simplified path for non-technical investors: pick a job, then the app carries the theme scope,
              saved work, evidence state and call targets through the workflow.
            </p>
          </div>
          <span className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-semibold text-ink-soft">
            Scoped to {themeName}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <WorkflowCard
            number="01"
            title="Build my call list"
            body={`${campaign.calls.length} call-ready or contact-verification experts, sequenced by evidence and company edges.`}
            href="/experts?readiness=actionable"
            cta="Open calls"
          />
          <WorkflowCard
            number="02"
            title="Show target companies"
            body={`${campaign.targets.length} priority targets with PE scorecards, ownership checks and linked experts.`}
            href="/companies?readiness=target-ready"
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
      <div className="ee-panel rounded-lg p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="ee-label text-ink">Coverage matrix</div>
            <p className="mt-1 text-[11px] text-ink-faint">Completeness by expert archetype.</p>
          </div>
          <Link href="/discover" className="ee-link text-[12px]">Research gaps</Link>
        </div>
        <div className="mt-4 overflow-x-auto">
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
      </div>
    </section>
  );
}

function WorkflowCard({ number, title, body, href, cta }: { number: string; title: string; body: string; href: string; cta: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-line bg-white p-4 transition hover:border-line-strong hover:shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">{number}</div>
      <h3 className="mt-2 text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 min-h-14 text-[11px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-4 text-[12px] font-semibold text-accent group-hover:underline">{cta} →</div>
    </Link>
  );
}
