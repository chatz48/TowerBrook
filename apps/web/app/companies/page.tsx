import Link from "next/link";
import { companiesWithLinks } from "@/lib/data";
import { dealCoverage } from "@/lib/deal-repository";
import { getDerivedCompanyCandidates } from "@/lib/expert-discovery";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  OWNERSHIP_LABEL,
  OWNERSHIP_STYLE,
} from "@/lib/labels";
import { THEME_BY_ID } from "@/lib/themes";
import { Badge, ConfidenceBars, PageShell } from "@/app/components/ui";
import {
  WorkspaceActionButton,
  WorkspaceSavedBadge,
} from "@/app/components/InvestorWorkspaceTray";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { companyReadiness, targetScorecard } from "@/lib/investment-readiness";
import ReadinessBadge from "@/app/components/ReadinessBadge";
import OperatorWorkflowRail from "@/app/components/OperatorWorkflowRail";
import { singleParam } from "@/lib/url-params";

function askHref(prompt: string) {
  return `/ask?prompt=${encodeURIComponent(prompt)}`;
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const query = (singleParam(params.q) ?? "").trim().toLowerCase();
  const selectedCategory = singleParam(params.category) ?? "all";
  const selectedReadiness = singleParam(params.readiness) ?? "all";
  const allCompanies = companiesWithLinks(
    themeFocus === "all" ? undefined : themeFocus,
    includeTowerBrookEmployees,
  );
  const companies = allCompanies
    .filter((company) => selectedCategory === "all" || company.category === selectedCategory)
    .filter((company) => {
      const readiness = companyReadiness(company);
      if (selectedReadiness === "all") return true;
      if (selectedReadiness === "actionable") return readiness.level === "target-ready" || readiness.level === "verify-ownership" || readiness.level === "verify-scale";
      return readiness.level === selectedReadiness;
    })
    .filter((company) => {
      if (!query) return true;
      return [
        company.name,
        company.description,
        company.whyInteresting ?? "",
        company.owner ?? "",
        company.hq ?? "",
        company.website ?? "",
        company.specialties?.join(" ") ?? "",
        company.linkedExperts.map((link) => link.expert.name).join(" "),
      ].join(" ").toLowerCase().includes(query);
    });
  const actionableTargets = companies
    .filter(
      (company) =>
        company.category === "target" &&
        company.ownershipStatus === "independent",
    )
    .slice(0, 12);
  const derivedCandidates = getDerivedCompanyCandidates().filter((company) =>
    matchesThemeFocus(company.themes, themeFocus),
  );
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const dealCounts = await dealCoverage();
  const themeLabel = themeFocus === "all" ? "All three themes" : THEME_BY_ID[themeFocus].name;
  const targetReviewPrompt = [
    `Prioritise the company validation workflow for ${themeLabel}.`,
    `Actionable targets: ${actionableTargets.slice(0, 8).map((company) => `${company.name} (${company.expertCount} expert links)`).join("; ")}`,
    `Research candidates awaiting review: ${derivedCandidates.slice(0, 8).map((company) => company.name).join("; ") || "None"}`,
    "Recommend which companies should go into the basket, which experts to call first, and what evidence gaps block a memo.",
  ].join("\n");

  return (
    <PageShell>
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Company Watchlist</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Companies surfaced through the expert graph, ranked by named people evidence,
              validation paths, and investment relevance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={askHref(targetReviewPrompt)} className="ee-button ee-button-primary">
              Ask AI to rank targets
            </Link>
            <Link href="/campaign#targets" className="ee-button ee-button-secondary">
              Add to plan
            </Link>
            <Link href="/#theme-memo" className="ee-button ee-button-secondary">
              Theme memo
            </Link>
            <Link href="/experts" className="ee-button ee-button-secondary">
              Review experts
            </Link>
          </div>
        </header>

        <form className="ee-panel mb-5 rounded-lg p-4" action="/companies">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto] lg:items-end">
            <label className="block">
              <span className="ee-label text-ink-faint">Search companies, experts or angles</span>
              <input
                name="q"
                defaultValue={singleParam(params.q) ?? ""}
                placeholder="e.g. independent, leak detection, JSM, grid"
                className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="ee-label text-ink-faint">Company type</span>
              <select
                name="category"
                defaultValue={selectedCategory}
                className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
              >
                <option value="all">All company types</option>
                <option value="target">Targets</option>
                <option value="advisory">Advisory firms</option>
                <option value="service-provider">Service providers</option>
                <option value="investor">Investors</option>
                <option value="incumbent">Incumbents</option>
              </select>
            </label>
            <label className="block">
              <span className="ee-label text-ink-faint">Readiness</span>
              <select
                name="readiness"
                defaultValue={selectedReadiness}
                className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
              >
                <option value="all">All readiness states</option>
                <option value="actionable">Actionable diligence</option>
                <option value="target-ready">Target-ready</option>
                <option value="verify-ownership">Verify ownership</option>
                <option value="verify-scale">Verify scale</option>
                <option value="monitor">Monitor / comp</option>
                <option value="research-needed">Research needed</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button className="ee-button ee-button-primary h-10 px-4" type="submit">Search</button>
              <Link href="/companies" className="ee-button ee-button-secondary h-10 px-4">Reset</Link>
            </div>
          </div>
          <div className="mt-3 border-t border-line pt-3 text-[11px] text-ink-faint">
            <strong className="text-ink">{companies.length}</strong> mapped companies visible in the current scope.
          </div>
        </form>

        <OperatorWorkflowRail
          title="Turn company interest into a diligence decision"
          subtitle="Work each target the way an operator would: validate the pain, find the expert path, then promote or red-team before it enters the memo."
          steps={[
            {
              label: "Validate",
              detail: "Check ownership, scale, funding and named expert access.",
            },
            {
              label: "Challenge",
              detail: "Use red-team prompts before promoting a company into the plan.",
            },
            {
              label: "Handoff",
              detail: "Move the strongest targets into campaign and the meeting memo.",
            },
          ]}
          actions={[
            { label: "Open campaign", href: "/campaign#targets", primary: true },
            { label: "Rank with AI", href: askHref(targetReviewPrompt) },
            { label: "Source memo", href: "/reports" },
          ]}
        />

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">Actionable targets</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Independent target companies with named expert links and source evidence.
              </p>
            </div>
            <Link href="/graph" className="ee-link text-[12px]">
              Explain relationship paths
            </Link>
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="ee-table min-w-[1280px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Why investigate</th>
                  <th>Named experts</th>
                  <th>Evidence</th>
                  <th>Readiness</th>
                  <th>PE score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {actionableTargets.length ? actionableTargets.map((company) => {
                  const readiness = companyReadiness(company);
                  const scorecard = targetScorecard(company);
                  return (
                  <tr key={company.id}>
                    <td className="min-w-[220px]">
                      <Link href={`/companies/${company.id}`} className="ee-link">
                        {company.name}
                      </Link>
                      <WorkspaceSavedBadge id={company.id} kind="target" className="ml-2 align-middle" />
                      <div className="mt-0.5 text-[11px] text-ink-soft">
                        {company.hq ?? company.sizeBand ?? "Independent target"}
                      </div>
                    </td>
                    <td className="max-w-[420px] text-[11px] leading-relaxed text-ink-soft">
                      <span className="line-clamp-3">
                        {company.whyInteresting ?? company.description}
                      </span>
                    </td>
                    <td className="max-w-[300px] text-[11px] text-ink-soft">
                      <span className="line-clamp-3">
                        {company.linkedExperts
                          .map((link) => link.expert.name)
                          .slice(0, 5)
                          .join(", ") || "No named expert yet"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[11px] text-ink-soft">
                      {company.expertCount} expert link{company.expertCount === 1 ? "" : "s"} · {company.sources.length} source{company.sources.length === 1 ? "" : "s"}
                    </td>
                    <td className="max-w-[160px]">
                      <ReadinessBadge badge={readiness} compact />
                      <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-faint">
                        {readiness.reasons[0]}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[11px] text-ink-soft">
                      <div className="text-[15px] font-semibold tabular-nums text-ink">{scorecard.total}</div>
                      <div className="text-[10px]">{scorecard.label}</div>
                    </td>
                    <td>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/companies/${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                            Review
                          </Link>
                          <Link href={`/graph?focus=company:${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                            View relationships
                          </Link>
                          <Link
                            href={askHref(
                              `Prepare a diligence brief for ${company.name} in ${themeLabel}. Explain why it is interesting, which named experts to call, what source evidence supports it, and what gaps block memo readiness.`,
                            )}
                            className="ee-button ee-button-secondary min-h-8 px-3"
                          >
                            Ask AI
                          </Link>
                          <WorkspaceActionButton
                            item={{
                              id: company.id,
                              kind: "target",
                              name: company.name,
                              sub: company.whyInteresting ?? company.description,
                              href: `/companies/${company.id}`,
                              theme: company.themes[0],
                            }}
                          >
                            Promote
                          </WorkspaceActionButton>
                        </div>
                      </td>
                  </tr>
                );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="mx-auto max-w-xl">
                        <div className="text-[13px] font-semibold text-ink">No actionable targets in this filtered scope.</div>
                        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                          Broaden the company filters or open the research queue to validate derived companies before promoting them.
                        </p>
                        <div className="mt-3 flex justify-center gap-2">
                          <Link href="/companies" className="ee-button ee-button-secondary min-h-8 px-3">Clear filters</Link>
                          <Link href="/discover?severity=high" className="ee-button ee-button-primary min-h-8 px-3">Open research queue</Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 lg:hidden">
            {actionableTargets.length ? actionableTargets.map((company) => {
              const readiness = companyReadiness(company);
              const scorecard = targetScorecard(company);
              return (
                <article key={company.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/companies/${company.id}`} className="ee-link text-[15px] font-semibold">
                        {company.name}
                      </Link>
                      <WorkspaceSavedBadge id={company.id} kind="target" className="ml-2 align-middle" />
                      <p className="mt-1 text-[12px] text-ink-soft">
                        {company.hq ?? company.sizeBand ?? "Independent target"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-semibold tabular-nums">{scorecard.total}</div>
                      <div className="text-[10px] text-ink-faint">{scorecard.label}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
                    {company.whyInteresting ?? company.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ReadinessBadge badge={readiness} compact />
                    <span className="rounded-full border border-line bg-paper px-2 py-1 text-[11px] text-ink-soft">
                      {company.expertCount} expert link{company.expertCount === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full border border-line bg-paper px-2 py-1 text-[11px] text-ink-soft">
                      {company.sources.length} source{company.sources.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[11px] text-ink-faint">
                    {company.linkedExperts.map((link) => link.expert.name).slice(0, 5).join(", ") || "No named expert yet"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/companies/${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Review
                    </Link>
                    <Link href={`/graph?focus=company:${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Relationships
                    </Link>
                    <WorkspaceActionButton
                      item={{
                        id: company.id,
                        kind: "target",
                        name: company.name,
                        sub: company.whyInteresting ?? company.description,
                        href: `/companies/${company.id}`,
                        theme: company.themes[0],
                      }}
                      className="ee-button ee-button-secondary min-h-8 px-3"
                    >
                      Promote
                    </WorkspaceActionButton>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-lg border border-dashed border-line-strong bg-white p-4 text-center">
                <div className="text-[13px] font-semibold text-ink">No actionable targets in this filtered scope.</div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  Broaden filters or validate derived companies in the research queue.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Link href="/companies" className="ee-button ee-button-secondary min-h-8 px-3">Clear filters</Link>
                  <Link href="/discover?severity=high" className="ee-button ee-button-primary min-h-8 px-3">Open queue</Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="ee-panel mb-5 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="ee-label text-ink">
                Research candidates awaiting review ({derivedCandidates.length})
              </h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                Non-canonical companies surfaced from named expert and PE-deal connections.
              </p>
            </div>
            <Link href="/experts" className="ee-link text-[12px]">
              Inspect expert evidence
            </Link>
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="ee-table min-w-[1240px]">
              <thead>
                <tr>
                  <th>Company candidate</th>
                  <th>Category</th>
                  <th>Ownership</th>
                  <th>Named experts</th>
                  <th>PE deals</th>
                  <th>Why surfaced</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {derivedCandidates.slice(0, 40).map((company) => {
                  const canonicalCompany = company.canonical_match.company_id
                    ? companyById.get(company.canonical_match.company_id)
                    : undefined;
                  return (
                    <tr key={company.candidate_id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[220px]">
                        {canonicalCompany ? (
                          <Link href={`/companies/${canonicalCompany.id}`} className="ee-link">
                            {company.name}
                          </Link>
                        ) : (
                          <span className="font-semibold">{company.name}</span>
                        )}
                        {canonicalCompany ? (
                          <WorkspaceSavedBadge id={canonicalCompany.id} kind="target" className="ml-2 align-middle" />
                        ) : null}
                        <div className="mt-0.5 text-[11px] text-ink-soft">{company.owner ?? "Ownership to verify"}</div>
                      </td>
                      <td>
                        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                          {COMPANY_CATEGORY_LABEL[company.category]}
                        </Badge>
                      </td>
                      <td className="text-[11px] text-ink-soft">{company.ownership_status.replaceAll("-", " ")}</td>
                      <td className="max-w-[280px] text-[11px] text-ink-soft">
                        <span className="line-clamp-2">
                          {company.expert_connections.map((expert) => expert.name).join(", ") || "No named expert yet"}
                        </span>
                      </td>
                      <td className="font-semibold tabular-nums">{company.deal_connections.length}</td>
                      <td className="max-w-[360px] text-[11px] text-ink-soft">
                        <span className="line-clamp-2">{company.why_interesting}</span>
                      </td>
                      <td className="min-w-[150px]">
                        <div className="flex flex-wrap gap-2">
                          {canonicalCompany ? (
                            <WorkspaceActionButton
                              item={{
                                id: canonicalCompany.id,
                                kind: "target",
                                name: canonicalCompany.name,
                                sub: company.why_interesting,
                                href: `/companies/${canonicalCompany.id}`,
                                theme: canonicalCompany.themes[0],
                                status: "research candidate",
                              }}
                              className="ee-button ee-button-secondary min-h-8 px-3"
                            >
                              Save
                            </WorkspaceActionButton>
                          ) : (
                            <Link href="/discover" className="ee-button ee-button-secondary min-h-8 px-3">
                              Verify
                            </Link>
                          )}
                          <Link
                            href={askHref(
                              `Review company candidate ${company.name} for ${themeLabel}. It surfaced because: ${company.why_interesting}. Named experts: ${company.expert_connections.map((expert) => expert.name).join(", ") || "none"}. PE deal connections: ${company.deal_connections.length}. Recommend verification steps, experts to call, and whether it belongs in the target basket.`,
                            )}
                            className="ee-button ee-button-secondary min-h-8 px-3"
                          >
                            Ask AI
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 lg:hidden">
            {derivedCandidates.slice(0, 20).map((company) => {
              const canonicalCompany = company.canonical_match.company_id
                ? companyById.get(company.canonical_match.company_id)
                : undefined;
              return (
                <article key={company.candidate_id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {canonicalCompany ? (
                        <Link href={`/companies/${canonicalCompany.id}`} className="ee-link text-[15px] font-semibold">
                          {company.name}
                        </Link>
                      ) : (
                        <div className="text-[15px] font-semibold text-ink">{company.name}</div>
                      )}
                      {canonicalCompany ? (
                        <WorkspaceSavedBadge id={canonicalCompany.id} kind="target" className="mt-1" />
                      ) : null}
                      <p className="mt-1 text-[12px] text-ink-soft">{company.owner ?? "Ownership to verify"}</p>
                    </div>
                    <div className="text-right text-[11px] text-ink-soft">
                      <div className="font-semibold tabular-nums text-ink">{company.deal_connections.length} deals</div>
                      <div>{company.expert_connections.length} experts</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                      {COMPANY_CATEGORY_LABEL[company.category]}
                    </Badge>
                    <span className="rounded-full border border-line bg-paper px-2 py-1 text-[11px] text-ink-soft">
                      {company.ownership_status.replaceAll("-", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
                    {company.why_interesting}
                  </p>
                  <p className="mt-3 line-clamp-2 text-[11px] text-ink-faint">
                    {company.expert_connections.map((expert) => expert.name).join(", ") || "No named expert yet"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canonicalCompany ? (
                      <WorkspaceActionButton
                        item={{
                          id: canonicalCompany.id,
                          kind: "target",
                          name: canonicalCompany.name,
                          sub: company.why_interesting,
                          href: `/companies/${canonicalCompany.id}`,
                          theme: canonicalCompany.themes[0],
                          status: "research candidate",
                        }}
                        className="ee-button ee-button-secondary min-h-8 px-3"
                      >
                        Save
                      </WorkspaceActionButton>
                    ) : (
                      <Link href="/discover" className="ee-button ee-button-secondary min-h-8 px-3">
                        Verify
                      </Link>
                    )}
                    <Link
                      href={askHref(
                        `Review company candidate ${company.name} for ${themeLabel}. It surfaced because: ${company.why_interesting}. Named experts: ${company.expert_connections.map((expert) => expert.name).join(", ") || "none"}. PE deal connections: ${company.deal_connections.length}. Recommend verification steps, experts to call, and whether it belongs in the target basket.`,
                      )}
                      className="ee-button ee-button-secondary min-h-8 px-3"
                    >
                      Ask AI
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">Company directory ({companies.length})</h2>
            <span className="text-[12px] text-ink-faint">Canonical mapped companies</span>
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="ee-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Category</th>
                  <th>Ownership</th>
                  <th>Expert links</th>
                  <th>Deals</th>
                  <th>Relationship path</th>
                  <th>Record confidence</th>
                  <th>Investment angle</th>
                  <th>Linked experts</th>
                  <th>Sources</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const towerBrook = towerBrookCompanyScore(company, company.expertCount);
                  return (
                    <tr key={company.id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[220px]">
                        <Link href={`/companies/${company.id}`} className="ee-link">
                          {company.name}
                        </Link>
                        <WorkspaceSavedBadge id={company.id} kind="target" className="ml-2 align-middle" />
                        <div className="mt-0.5 text-[11px] text-ink-soft">
                          {company.hq ?? company.website ?? "Mapped company"}
                        </div>
                      </td>
                      <td>
                        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                          {COMPANY_CATEGORY_LABEL[company.category]}
                        </Badge>
                      </td>
                      <td>
                        {company.ownershipStatus ? (
                          <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
                            {OWNERSHIP_LABEL[company.ownershipStatus]}
                          </Badge>
                        ) : (
                          <span className="text-ink-faint">Review</span>
                        )}
                      </td>
                      <td className="font-semibold tabular-nums">{company.expertCount}</td>
                      <td className="font-semibold tabular-nums">
                        {dealCounts.get(company.id) ?? 0}
                      </td>
                      <td>
                        <span className={towerBrook.isDirect ? "text-success" : "text-ink-faint"}>
                          {towerBrook.isDirect ? towerBrook.label : "Path not mapped"}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold tabular-nums">
                          {Math.round(company.confidence * 100)}%
                        </div>
                        <ConfidenceBars value={company.confidence} />
                      </td>
                      <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-2">
                          {company.whyInteresting ?? company.description}
                        </span>
                      </td>
                      <td className="max-w-[240px]">
                        <span className="line-clamp-2">
                          {company.linkedExperts.map((link) => link.expert.name).join(", ") || "No direct links"}
                        </span>
                      </td>
                      <td>
                        {company.sources.slice(0, 4).map((source, i) => (
                          <a
                            key={`${source.url}-${i}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ee-link mr-1"
                          >
                            [{i + 1}]
                          </a>
                        ))}
                      </td>
                      <td className="min-w-[150px]">
                        <div className="flex flex-wrap gap-2">
                          <WorkspaceActionButton
                            item={{
                              id: company.id,
                              kind: "target",
                              name: company.name,
                              sub: company.whyInteresting ?? company.description,
                              href: `/companies/${company.id}`,
                              theme: company.themes[0],
                              status: company.category === "target" ? "promoted target" : "watchlist",
                            }}
                            className="ee-button ee-button-secondary min-h-8 px-3"
                          >
                            {company.category === "target" ? "Promote" : "Save"}
                          </WorkspaceActionButton>
                          <Link
                            href={askHref(
                              `Red-team ${company.name} as a TowerBrook target or comparable in ${themeLabel}. Identify why it may not be actionable, which experts can confirm the risk, and what evidence would change the view.`,
                            )}
                            className="ee-button ee-button-secondary min-h-8 px-3"
                          >
                            Red-team
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 lg:hidden">
            {companies.map((company) => {
              const towerBrook = towerBrookCompanyScore(company, company.expertCount);
              return (
                <article key={company.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/companies/${company.id}`} className="ee-link text-[15px] font-semibold">
                        {company.name}
                      </Link>
                      <WorkspaceSavedBadge id={company.id} kind="target" className="ml-2 align-middle" />
                      <p className="mt-1 text-[12px] text-ink-soft">
                        {company.hq ?? company.website ?? "Mapped company"}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-ink-soft">
                      <div className="font-semibold tabular-nums text-ink">{company.expertCount} experts</div>
                      <div>{dealCounts.get(company.id) ?? 0} deals</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                      {COMPANY_CATEGORY_LABEL[company.category]}
                    </Badge>
                    {company.ownershipStatus ? (
                      <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
                        {OWNERSHIP_LABEL[company.ownershipStatus]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
                    {company.whyInteresting ?? company.description}
                  </p>
                  <p className="mt-2 line-clamp-2 text-[11px] text-ink-faint">
                    {towerBrook.isDirect ? towerBrook.label : "Path not mapped"} · {Math.round(company.confidence * 100)}% confidence
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/companies/${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Review
                    </Link>
                    <WorkspaceActionButton
                      item={{
                        id: company.id,
                        kind: "target",
                        name: company.name,
                        sub: company.whyInteresting ?? company.description,
                        href: `/companies/${company.id}`,
                        theme: company.themes[0],
                        status: company.category === "target" ? "promoted target" : "watchlist",
                      }}
                      className="ee-button ee-button-secondary min-h-8 px-3"
                    >
                      {company.category === "target" ? "Promote" : "Save"}
                    </WorkspaceActionButton>
                    <Link
                      href={askHref(
                        `Red-team ${company.name} as a TowerBrook target or comparable in ${themeLabel}. Identify why it may not be actionable, which experts can confirm the risk, and what evidence would change the view.`,
                      )}
                      className="ee-button ee-button-secondary min-h-8 px-3"
                    >
                      Red-team
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
    </PageShell>
  );
}
