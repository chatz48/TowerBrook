import Link from "next/link";
import { THEMES } from "@/lib/themes";
import {
  companiesWithLinks,
  getCompanies,
  getExperts,
  expertsForTheme,
  themeStats,
} from "@/lib/data";
import { rankExperts } from "@/lib/score";
import { buildTowerBrookLens } from "@/lib/towerbrook";
import SearchBox, { type SearchItem } from "./components/SearchBox";
import TowerBrookFocus from "./components/TowerBrookFocus";
import { NextActionPanel, WorkflowRail } from "./components/InvestorWorkflow";
import { ConfidenceBars } from "./components/ui";

export default function Home() {
  const experts = getExperts();
  const companies = getCompanies();
  const towerBrookLens = buildTowerBrookLens(experts, companiesWithLinks());

  const index: SearchItem[] = [
    ...experts.map((expert) => ({
      id: expert.id,
      name: expert.name,
      sub: expert.headline,
      kind: "expert" as const,
      href: `/experts/${expert.id}`,
      keywords: `${expert.name} ${expert.headline} ${expert.org ?? ""} ${expert.whyRelevant}`.toLowerCase(),
    })),
    ...companies.map((company) => ({
      id: company.id,
      name: company.name,
      sub: company.description,
      kind: "company" as const,
      href: `/companies/${company.id}`,
      keywords: `${company.name} ${company.description}`.toLowerCase(),
    })),
  ];

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="ee-panel rounded-lg p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight">
                  People-led deal origination
                </h1>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                  Start with TowerBrook&apos;s three themes, identify the people
                  most likely to reveal investable companies, prepare the call,
                  and trace each opportunity back to sourced expert evidence.
                </p>
              </div>
              <div className="min-w-[360px] max-xl:min-w-0">
                <SearchBox index={index} />
              </div>
            </div>
          </section>

          <section className="ee-panel rounded-lg p-5">
            <div className="ee-label text-ink">Origination coverage</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatusMetric value={experts.length} label="canonical experts" />
              <StatusMetric value={companies.length} label="expert-derived companies" />
              <StatusMetric value={THEMES.length} label="priority themes" />
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/experts" className="ee-button ee-button-primary flex-1">
                Find experts
              </Link>
              <Link href="/discover" className="ee-button ee-button-secondary flex-1">
                Review live discovery
              </Link>
            </div>
          </section>
        </div>

        <section className="mb-5">
          <TowerBrookFocus lens={towerBrookLens} />
        </section>

        <section className="ee-panel mb-5 rounded-lg p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ee-label text-ink">Investor workflow</h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                Use the engine as a short-cycle sourcing desk: pick one theme,
                call the right people, pull out named companies, and turn the
                evidence into a call plan or memo.
              </p>
            </div>
            <Link href="/companies" className="ee-button ee-button-secondary">
              View derived targets
            </Link>
          </div>
          <div className="mt-4">
            <WorkflowRail
              steps={[
                {
                  label: "Pick a theme",
                  title: "Start from the taxonomy",
                  body: "Open one of the three priority themes and see coverage, blank spaces and the first people worth calling.",
                  href: "/themes/grid-infrastructure",
                },
                {
                  label: "Prioritize calls",
                  title: "Use the expert pool",
                  body: "Rank founders, operators, advisors, lawyers, bankers and peer-fund dealmakers by call objective and access path.",
                  href: "/experts",
                },
                {
                  label: "Derive targets",
                  title: "Turn people into companies",
                  body: "Follow expert relationships to companies, boards, advisory clients, service providers and PE-backed comparables.",
                  href: "/companies",
                },
                {
                  label: "Act on evidence",
                  title: "Prepare outreach and memos",
                  body: "Generate sourced call prep, outreach drafts and memo-ready evidence trails for the next diligence step.",
                  href: "/reports",
                },
              ]}
            />
          </div>
        </section>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Investment themes</h2>
            <span className="text-[12px] text-ink-faint">Select a command center</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Theme</th>
                  <th>Experts</th>
                  <th>Companies</th>
                  <th>Top expert</th>
                  <th>Coverage</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {THEMES.map((theme) => {
                  const stats = themeStats(theme.id);
                  const top = rankExperts(expertsForTheme(theme.id))[0];
                  const coverage = Math.min(1, stats.expertCount / 16);
                  return (
                    <tr key={theme.id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[360px]">
                        <Link href={`/themes/${theme.id}`} className="ee-link text-[14px]">
                          {theme.name}
                        </Link>
                        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-soft">
                          {theme.description}
                        </p>
                      </td>
                      <td className="text-[18px] font-semibold tabular-nums">{stats.expertCount}</td>
                      <td className="text-[18px] font-semibold tabular-nums">{stats.companyCount}</td>
                      <td>
                        {top ? (
                          <Link href={`/experts/${top.expert.id}`} className="ee-link">
                            {top.expert.name}
                          </Link>
                        ) : (
                          <span className="text-ink-faint">None</span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-success">
                          {coverage > 0.75 ? "Strong" : "Developing"}
                        </div>
                        <ConfidenceBars value={coverage} />
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/themes/${theme.id}`} className="ee-button ee-button-primary min-h-8 px-3">
                            Open
                          </Link>
                          <Link href="/reports" className="ee-button ee-button-secondary min-h-8 px-3">
                            Memo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Expert Origination", "Start with founders, ex-founders and PE deal participants who can reveal new companies.", "/experts"],
            ["Research Copilot", "Ask for a ranked call sequence, diligence questions, risks and companies to investigate.", "/ask"],
            ["Reports / Memo Builder", "Turn sourced expert and company evidence into call plans, briefs and IC-ready appendices.", "/reports"],
          ].map(([title, body, href]) => (
            <Link key={title} href={href} className="ee-panel rounded-lg p-5 hover:border-line-strong">
              <div className="ee-label text-ink">{title}</div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{body}</p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-accent">
                Open →
              </span>
            </Link>
          ))}
          </div>
          <NextActionPanel
            title="Best first hour"
            description="A compact path for a busy deal professional opening the product cold."
            actions={[
              {
                title: "Open Grid Infrastructure",
                body: "Highest-density path to TowerBrook-linked portfolio operators, advisors and connection-service targets.",
                href: "/themes/grid-infrastructure",
                action: "Start",
                tone: "primary",
              },
              {
                title: "Call the first five experts",
                body: "Use the theme call list to validate bottlenecks, budgets and names of companies to map next.",
                href: "/experts",
                action: "Rank",
              },
              {
                title: "Review new company candidates",
                body: "Scan companies reverse-derived from named expert and PE-deal evidence before building a memo.",
                href: "/companies",
                action: "Review",
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}

function StatusMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="text-[22px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-ink-faint">{label}</div>
    </div>
  );
}
