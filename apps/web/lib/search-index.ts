import type { SearchItem } from "@/app/components/SearchBox";
import type { Company, Expert } from "@/lib/types";

function keywordsForExpert(expert: Expert): string {
  return [
    expert.name,
    expert.headline,
    expert.org,
    expert.location,
    expert.type,
    expert.whyRelevant,
    ...(expert.specialties ?? []),
    ...expert.themes,
    ...expert.companies.map((link) => link.companyId),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function keywordsForCompany(company: Company): string {
  return [
    company.name,
    company.description,
    company.whyInteresting,
    company.category,
    company.owner,
    company.hq,
    ...(company.specialties ?? []),
    ...company.themes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildSearchIndex(experts: Expert[], companies: Company[]): SearchItem[] {
  const expertItems: SearchItem[] = experts.map((expert) => ({
    id: expert.id,
    name: expert.name,
    sub: expert.headline,
    kind: "expert",
    href: `/experts/${expert.id}`,
    keywords: keywordsForExpert(expert),
  }));
  const companyItems: SearchItem[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    sub: company.description,
    kind: "company",
    href: `/companies/${company.id}`,
    keywords: keywordsForCompany(company),
  }));
  return [...expertItems, ...companyItems];
}
