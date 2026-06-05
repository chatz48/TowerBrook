import { getCompanies, getExperts } from "@/lib/data";
import { getExpertDiscoveryCandidates, getDerivedCompanyCandidates } from "@/lib/expert-discovery";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { rankExperts, scoreExpert } from "@/lib/score";
import { towerBrookExpertScore, towerBrookCompanyScore } from "@/lib/towerbrook";
import type { Company, CompanyMaterialFact, Expert, MaterialFactStatus, ThemeId } from "@/lib/types";
import PeopleExpertWorkspace, {
  type WorkspaceCompany,
  type WorkspaceExpert,
  type WorkspaceMetrics,
} from "@/app/components/workspace/PeopleExpertWorkspace";

function domainFromWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function workspaceFactStatus(status: MaterialFactStatus): "verified" | "partial" | "missing" {
  if (status === "verified") return "verified";
  if (status === "partial" || status === "needs_review") return "partial";
  return "missing";
}

function materialFact(company: Company, type: CompanyMaterialFact["type"]) {
  return company.materialFacts?.find((fact) => fact.type === type);
}

function companyFacts(company: Company) {
  const websiteFact = materialFact(company, "website");
  const launchFact = materialFact(company, "launch_date");
  const seedFact = materialFact(company, "seed_round");
  const lastFundingFact = materialFact(company, "last_funding");
  const totalFundingFact = materialFact(company, "total_funding");
  const productLiveFact = materialFact(company, "product_live_status");
  const facts: { label: string; value?: string; status: "verified" | "partial" | "missing" }[] = [
    {
      label: "Website",
      value: websiteFact?.value ?? (company.website ? domainFromWebsite(company.website) ?? company.website : undefined),
      status: websiteFact ? workspaceFactStatus(websiteFact.status) : company.website ? "verified" : "missing",
    },
    {
      label: "Launch date",
      value: launchFact?.value,
      status: launchFact ? workspaceFactStatus(launchFact.status) : "missing",
    },
    {
      label: "Seed round",
      value: seedFact?.value,
      status: seedFact ? workspaceFactStatus(seedFact.status) : "missing",
    },
    {
      label: "Last funding",
      value: lastFundingFact?.value ?? company.funding,
      status: lastFundingFact ? workspaceFactStatus(lastFundingFact.status) : company.funding ? "partial" : "missing",
    },
    {
      label: "Total funding",
      value: totalFundingFact?.value,
      status: totalFundingFact ? workspaceFactStatus(totalFundingFact.status) : "missing",
    },
    {
      label: "Product live",
      value: productLiveFact?.value ?? (company.website ? "Website live" : undefined),
      status: productLiveFact ? workspaceFactStatus(productLiveFact.status) : company.website ? "partial" : "missing",
    },
  ];
  return facts.map((fact) => ({
    ...fact,
    value: fact.value ?? "Needs enrichment",
  }));
}

function mapCompany(company: Company, expertCount: number): WorkspaceCompany {
  const towerBrook = towerBrookCompanyScore(company, expertCount);
  const missingFacts = companyFacts(company).filter((fact) => fact.status === "missing").length;
  return {
    id: company.id,
    name: company.name,
    href: `/companies/${company.id}`,
    description: company.description,
    whyInteresting: company.whyInteresting ?? company.description,
    category: company.category,
    themes: company.themes,
    stage: company.stage ?? "Stage to verify",
    ownershipStatus: company.ownershipStatus ?? "Ownership to verify",
    owner: company.owner,
    website: company.website,
    logoUrl: company.logoUrl ?? materialFact(company, "logo_url")?.value,
    domain: domainFromWebsite(company.website),
    facts: companyFacts(company),
    sourceCount: company.sources.length,
    confidence: company.confidence,
    expertCount,
    missingFacts,
    towerBrookPath: towerBrook.isDirect ? towerBrook.label : "No public TowerBrook path mapped",
  };
}

function mapExpert(expert: Expert, companiesById: Map<string, Company>): WorkspaceExpert {
  const score = scoreExpert(expert);
  const towerBrook = towerBrookExpertScore(expert, companiesById);
  const linkedCompanies = expert.companies
    .map((link) => {
      const company = companiesById.get(link.companyId);
      return company
        ? {
            id: company.id,
            name: company.name,
            href: `/companies/${company.id}`,
            relationship: link.relationship,
            note: link.note ?? company.whyInteresting ?? company.description,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    id: expert.id,
    name: expert.name,
    href: `/experts/${expert.id}`,
    type: expert.type,
    headline: expert.headline,
    org: expert.org,
    location: expert.location,
    themes: expert.themes,
    specialties: expert.specialties ?? [],
    whyRelevant: expert.whyRelevant,
    bio: expert.bio,
    score: score.total,
    scoreParts: {
      base: score.base,
      companyEdges: score.edges,
      signals: score.signals,
      access: score.access,
    },
    relationshipPath: towerBrook.isDirect ? towerBrook.label : "No public TowerBrook path mapped",
    relationshipReasons: towerBrook.reasons,
    confidence: expert.confidence,
    sourceCount: expert.sources.length,
    linkedin: expert.linkedin,
    email: expert.email,
    linkedCompanies,
    nextAction:
      linkedCompanies.length > 0
        ? `Use the call to validate ${linkedCompanies[0].name} and ask for adjacent companies.`
        : "Use the call to identify investable companies and missing specialists.",
  };
}

export default async function WorkspacePage() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const companies = getCompanies().filter((company) => matchesThemeFocus(company.themes, themeFocus));
  const companiesById = new Map(getCompanies().map((company) => [company.id, company]));
  const visibleExperts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
    includeTowerBrookEmployees,
  );
  const rankedExperts = rankExperts(visibleExperts).slice(0, 36).map(({ expert }) =>
    mapExpert(expert, companiesById),
  );

  const expertCountByCompany = new Map<string, number>();
  for (const expert of visibleExperts) {
    for (const link of expert.companies) {
      expertCountByCompany.set(link.companyId, (expertCountByCompany.get(link.companyId) ?? 0) + 1);
    }
  }

  const mappedCompanies = companies
    .map((company) => mapCompany(company, expertCountByCompany.get(company.id) ?? 0))
    .sort((a, b) => b.expertCount - a.expertCount || b.confidence - a.confidence)
    .slice(0, 48);

  const discoveryExperts = getExpertDiscoveryCandidates().filter((candidate) =>
    matchesThemeFocus(candidate.themes, themeFocus),
  );
  const discoveryCompanies = getDerivedCompanyCandidates().filter((candidate) =>
    matchesThemeFocus(candidate.themes, themeFocus),
  );

  const metrics: WorkspaceMetrics = {
    experts: visibleExperts.length,
    companies: companies.length,
    discoveryExperts: discoveryExperts.length,
    derivedCompanies: discoveryCompanies.length,
    missingCompanyFacts: mappedCompanies.reduce((sum, company) => sum + company.missingFacts, 0),
    warmPaths: rankedExperts.filter((expert) => !expert.relationshipPath.startsWith("No public")).length,
  };

  return (
    <PeopleExpertWorkspace
      initialTheme={themeFocus === "all" ? "all" : (themeFocus as ThemeId)}
      metrics={metrics}
      experts={rankedExperts}
      companies={mappedCompanies}
    />
  );
}
