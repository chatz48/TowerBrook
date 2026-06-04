import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, getExperts, getExpert, resolveExpert } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate } from "@/lib/deals";
import { listDealsForExpert } from "@/lib/deal-repository";
import { scoreExpert } from "@/lib/score";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import {
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import {
  Badge,
  BackLink,
  Chip,
  Confidence,
  ConfidenceBars,
  NewsFeed,
  SourceLinks,
  ThemeTag,
} from "@/app/components/ui";
import ExpertActions from "@/app/components/ExpertActions";
import {
  CallPrepChecklist,
  NextActionPanel,
  WorkflowRail,
} from "@/app/components/InvestorWorkflow";

export function generateStaticParams() {
  return getExperts().map((e) => ({ id: e.id }));
}

export default async function ExpertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const base = getExpert(id);
  if (!base) notFound();
  const expert = resolveExpert(base);
  const score = scoreExpert(base);
  const companiesById = new Map(getCompanies().map((company) => [company.id, company]));
  const towerBrook = towerBrookExpertScore(base, companiesById);
  const relatedDeals = await listDealsForExpert(expert.id);

  return (
    <div className="ee-shell px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1540px]">
        <BackLink href={`/themes/${expert.themes[0]}`}>Back to experts</BackLink>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-5">
            <header className="ee-panel rounded-lg p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-semibold tracking-tight">
                      {expert.name}
                    </h1>
                    <span className="text-muted" aria-hidden="true">♡</span>
                    <Badge className={EXPERT_TYPE_STYLE[expert.type]}>
                      {EXPERT_TYPE_LABEL[expert.type]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[15px] font-medium text-ink-soft">
                    {expert.headline}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-ink-faint">
                    {expert.org ? <span>{expert.org}</span> : null}
                    {expert.location ? <span>{expert.location}</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expert.themes.map((t) => (
                      <ThemeTag key={t} id={t} small />
                    ))}
                    {expert.specialties?.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                </div>
                <div className="grid min-w-[440px] grid-cols-4 overflow-hidden rounded-lg border border-line max-lg:min-w-0 max-lg:grid-cols-2">
                  <ProfileMetric label="Confidence" value={`${(expert.confidence * 100).toFixed(0)}%`} sub={<Confidence value={expert.confidence} />} />
                  <ProfileMetric label="Priority score" value={score.total} sub="Top scored" />
                  <ProfileMetric label="Access" value={expert.access === "proprietary" ? "Warm" : "Known"} sub={expert.access ?? "Review"} />
                  <ProfileMetric label="TowerBrook" value={towerBrook.score} sub={towerBrook.label} />
                </div>
              </div>
            </header>

            <section className="ee-panel rounded-lg p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="ee-label text-ink">Call objective</h2>
                  <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                    Treat this as a sourcing call: validate the theme, ask for
                    named companies, and request the next skeptical or
                    highly-connected expert.
                  </p>
                </div>
                <Link href="/reports" className="ee-button ee-button-secondary">
                  Add to memo
                </Link>
              </div>
              <div className="mt-4">
                <WorkflowRail
                  steps={[
                    {
                      label: "Open",
                      title: "Why now?",
                      body: expert.signals?.[0] ?? "Ask what has changed in budgets, regulation, customer urgency or deal activity.",
                    },
                    {
                      label: "Derive",
                      title: expert.resolvedCompanies[0]?.company.name ?? "Named companies",
                      body: expert.resolvedCompanies[0]
                        ? `Use the ${RELATIONSHIP_LABEL[expert.resolvedCompanies[0].relationship].toLowerCase()} relationship as the first company thread.`
                        : "Ask for investable companies, non-obvious advisors and comparable deals.",
                      href: expert.resolvedCompanies[0]
                        ? `/companies/${expert.resolvedCompanies[0].company.id}`
                        : "/companies",
                    },
                    {
                      label: "Extend",
                      title: "Next people to call",
                      body: "Ask who disagrees with the thesis and who sees the most proprietary deal flow.",
                      href: "/experts",
                    },
                  ]}
                />
              </div>
            </section>

            <section className="ee-panel rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Why {expert.name.split(" ")[0]} is relevant</h2>
              </div>
              <div className="px-5 py-4">
                <ul className="space-y-2 text-[13px] leading-relaxed text-ink">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                    <span>{expert.whyRelevant} <a className="ee-link" href="#sources">[1]</a></span>
                  </li>
                  {expert.bio ? (
                    <li className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                      <span>{expert.bio} <a className="ee-link" href="#sources">[2]</a></span>
                    </li>
                  ) : null}
                  {expert.signals?.slice(0, 2).map((signal, index) => (
                    <li key={signal} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-success" />
                      <span>{signal} <a className="ee-link" href="#sources">[{index + 3}]</a></span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Company / deal connections ({expert.resolvedCompanies.length})</h2>
              </div>
              <table className="ee-table">
                <thead>
                  <tr>
                    <th>Company / deal</th>
                    <th>Relationship</th>
                    <th>Evidence</th>
                    <th>Sources</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {expert.resolvedCompanies.map((rc, index) => (
                    <tr key={`${rc.company.id}-${rc.relationship}`}>
                      <td>
                        <Link href={`/companies/${rc.company.id}`} className="ee-link">
                          {rc.company.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {rc.company.category}
                        </div>
                      </td>
                      <td>{RELATIONSHIP_LABEL[rc.relationship]}</td>
                      <td className="max-w-[320px] text-[12px] text-ink-soft">
                        {rc.note ?? rc.company.whyInteresting ?? rc.company.description}
                      </td>
                      <td>
                        <a className="ee-link" href="#sources">[{index + 1}]</a>
                      </td>
                      <td>
                        <span className="text-success">High</span>
                        <div className="mt-1"><ConfidenceBars value={rc.company.confidence} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {expert.news?.length ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="mb-3 ee-label text-ink">News & momentum signals</div>
                <NewsFeed items={expert.news} />
              </section>
            ) : null}

            {relatedDeals.length ? (
              <section className="ee-panel overflow-hidden rounded-lg">
                <div className="border-b border-line px-4 py-3">
                  <h2 className="ee-label text-ink">Deal involvement ({relatedDeals.length})</h2>
                </div>
                <table className="ee-table">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Why call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedDeals.map((deal) => {
                      const partyRole =
                        deal.parties.find((party) => party.personId === expert.id)?.role ??
                        "surfaced expert";
                      return (
                        <tr key={deal.id}>
                          <td>
                            <Link href={`/deals/${deal.id}`} className="ee-link">
                              {deal.name}
                            </Link>
                            <div className="mt-0.5 text-[11px] text-ink-faint">
                              Completeness {Math.round(deal.completionScore * 100)}%
                            </div>
                          </td>
                          <td>{partyRole.replaceAll("-", " ")}</td>
                          <td>{DEAL_TYPE_LABEL[deal.dealType]}</td>
                          <td>{dealDate(deal) ?? "Missing"}</td>
                          <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                            Ask who advised the deal, what diligence mattered, and which similar companies should be mapped next.
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}

            <section className="ee-panel rounded-lg p-5" id="sources">
              <div className="mb-3 ee-label text-ink">Sources used</div>
              <SourceLinks sources={expert.sources} />
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="ee-label text-ink">Generated call prep</h2>
                  <p className="mt-1 text-[12px] text-ink-faint">
                    Built from sourced profile, relationships and news signals.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="ee-button ee-button-secondary">Regenerate</button>
                  <button className="ee-button ee-button-secondary">Download</button>
                </div>
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <CallPrepChecklist
                  title="Before the call"
                  items={[
                    "Review linked companies and decide which names need validation.",
                    "Pick one disconfirming question that tests the investment thesis.",
                    "Prepare a referral ask for founders, advisors and skeptical operators.",
                  ]}
                />
                <CallPrepChecklist
                  title="During the call"
                  items={[
                    "Capture specific company names, buyers, advisors and recent deal processes.",
                    "Separate budgeted customer pain from general market enthusiasm.",
                    "Ask which diligence point would stop an investment committee.",
                  ]}
                />
                <CallPrepChecklist
                  title="After the call"
                  items={[
                    "Promote verified companies into the target list.",
                    "Create follow-up expert calls from named referrals.",
                    "Attach source-backed notes to the theme memo.",
                  ]}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CallPrepCard title="Snapshot" items={[expert.whyRelevant, `${expert.resolvedCompanies.length} company or deal relationships in the graph.`, `Priority score ${score.total}, confidence ${(expert.confidence * 100).toFixed(0)}%.`]} />
                <CallPrepCard title="Why this call" items={["Validate where the theme is investable now.", "Ask for the companies, buyers and advisors that recur.", "Use relationship evidence to request warm follow-up names."]} />
                <CallPrepCard title="Biases / conflicts" items={["May overemphasize companies connected to their own career path.", "Confirm whether current commercial incentives shape answers.", "Push for disconfirming data, not just positive market stories."]} />
                <CallPrepCard title="Questions to ask" items={["Which bottleneck is worsening fastest?", "Which companies have durable buyer pull?", "Who are the best skeptical experts to call next?"]} />
                <CallPrepCard title="What to listen for" items={["Evidence of budgeted customer demand.", "Specific deal names and advisor recurrence.", "Signals that timelines, pricing or regulation are changing."]} />
                <CallPrepCard title="Follow-up people / companies" items={expert.resolvedCompanies.slice(0, 4).map((rc) => rc.company.name)} />
              </div>
            </section>
          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">TowerBrook score</div>
              <div className="mt-4 rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold">{towerBrook.label}</span>
                  <span className="text-[22px] font-semibold tabular-nums">
                    {towerBrook.score}
                  </span>
                </div>
                <div className="mt-2"><ConfidenceBars value={towerBrook.score / 100} /></div>
                <ul className="mt-3 space-y-1 text-[12px] leading-relaxed text-ink-soft">
                  {(towerBrook.reasons.length
                    ? towerBrook.reasons
                    : ["Theme-adjacent expert fit"]
                  ).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </section>
            <NextActionPanel
              title="Next best actions"
              description="Use the sourced profile before asking AI to draft anything."
              actions={[
                {
                  title: "Generate call prep",
                  body: "Create a sourced brief with thesis checks, questions and follow-up asks.",
                  href: "#call-actions",
                  action: "Use panel",
                  tone: "primary",
                },
                {
                  title: "Inspect first company link",
                  body: expert.resolvedCompanies[0]
                    ? `Open ${expert.resolvedCompanies[0].company.name} and review the relationship evidence.`
                    : "Review the company explorer for adjacent targets.",
                  href: expert.resolvedCompanies[0]
                    ? `/companies/${expert.resolvedCompanies[0].company.id}`
                    : "/companies",
                  action: "Open",
                },
                {
                  title: "Build memo appendix",
                  body: "Carry sourced expert, company and deal links into a report-ready output.",
                  href: "/reports",
                  action: "Memo",
                },
              ]}
            />
            <div id="call-actions">
              <ExpertActions expertId={expert.id} expertName={expert.name} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <div className="border-r border-line px-4 py-3 last:border-r-0">
      <div className="ee-label">{label}</div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[12px] text-ink-faint">{sub}</div>
    </div>
  );
}

function CallPrepCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="ee-label text-ink">{title}</h3>
      <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-ink-soft" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <a href="#sources" className="mt-3 inline-flex text-[12px] text-accent">
        Open source drawer →
      </a>
    </section>
  );
}
