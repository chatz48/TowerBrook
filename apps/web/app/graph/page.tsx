import { getCompanies, getExperts } from "@/lib/data";
import { DEAL_ADVISOR_LABEL, DEAL_TYPE_LABEL } from "@/lib/deals";
import { listDeals } from "@/lib/deal-repository";
import {
  COMPANY_CATEGORY_LABEL,
  EXPERT_TYPE_LABEL,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import { THEMES } from "@/lib/themes";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import type { Company, Deal, Expert, RelationshipType, Source } from "@/lib/types";
import GraphExplorer, {
  type ExplorerCompanyNode,
  type ExplorerDealNode,
  type ExplorerEdge,
  type ExplorerExpertNode,
  type ExplorerSource,
  type ExplorerTheme,
} from "@/app/components/graph/GraphExplorer";

function sourceKey(source: Source) {
  return source.url || `${source.publisher ?? "source"}:${source.title}`;
}

function sourceLabel(source: Source) {
  return source.publisher ? `${source.publisher} · ${source.title}` : source.title;
}

function buildSourceRegister(experts: Expert[], companies: Company[], deals: Deal[]) {
  const ids = new Map<string, string>();
  const sources: ExplorerSource[] = [];

  function add(source: Source) {
    const key = sourceKey(source);
    const existing = ids.get(key);
    if (existing) return existing;

    const id = String(sources.length + 1);
    ids.set(key, id);
    sources.push({
      id,
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      label: sourceLabel(source),
    });
    return id;
  }

  for (const expert of experts) {
    for (const source of expert.sources) add(source);
  }
  for (const company of companies) {
    for (const source of company.sources) add(source);
  }
  for (const deal of deals) {
    for (const source of deal.sources) add(source);
  }

  return { add, sources };
}

export default async function GraphPage() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const experts = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  const companies = getCompanies();
  const deals = await listDeals();
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const expertById = new Map(experts.map((expert) => [expert.id, expert]));
  const { add, sources } = buildSourceRegister(experts, companies, deals);

  const expertNodes: ExplorerExpertNode[] = experts.map((expert) => ({
    key: `expert:${expert.id}`,
    id: expert.id,
    kind: "expert",
    name: expert.name,
    subtitle: expert.headline,
    type: expert.type,
    typeLabel: EXPERT_TYPE_LABEL[expert.type],
    org: expert.org,
    location: expert.location,
    themes: expert.themes,
    tags: expert.specialties ?? [],
    confidence: expert.confidence,
    href: `/experts/${expert.id}`,
    sourceIds: expert.sources.map(add),
    evidence:
      expert.whyRelevant ||
      expert.bio ||
      `${expert.name} has ${expert.companies.length} mapped relationship${
        expert.companies.length === 1 ? "" : "s"
      }.`,
  }));

  const companyNodes: ExplorerCompanyNode[] = companies.map((company) => ({
    key: `company:${company.id}`,
    id: company.id,
    kind: "company",
    name: company.name,
    subtitle: company.whyInteresting ?? company.description,
    category: company.category,
    categoryLabel: COMPANY_CATEGORY_LABEL[company.category],
    themes: company.themes,
    tags: company.specialties ?? [],
    confidence: company.confidence,
    href: `/companies/${company.id}`,
    sourceIds: company.sources.map(add),
    evidence:
      company.whyInteresting ||
      `${company.name} surfaced from mapped expert relationships and source-backed company records.`,
  }));

  const dealNodes: ExplorerDealNode[] = deals.map((deal) => ({
    key: `deal:${deal.id}`,
    id: deal.id,
    kind: "deal",
    name: deal.name,
    subtitle: deal.investmentRelevance,
    typeLabel: DEAL_TYPE_LABEL[deal.dealType],
    themes: [deal.theme],
    tags: [DEAL_TYPE_LABEL[deal.dealType], deal.status, deal.geography],
    confidence: deal.confidence,
    href: `/deals/${deal.id}`,
    sourceIds: deal.sources.map(add),
    evidence: deal.investmentRelevance,
  }));

  const expertCompanyEdges: ExplorerEdge[] = experts.flatMap((expert) =>
    expert.companies.flatMap((link, index) => {
      const company = companyById.get(link.companyId);
      if (!company) return [];

      const relationshipLabel = RELATIONSHIP_LABEL[link.relationship];
      const edgeSourceIds = [...expert.sources, ...company.sources].map(add);
      return [
        {
          id: `${expert.id}:${link.companyId}:${link.relationship}:${index}`,
          from: `expert:${expert.id}`,
          to: `company:${company.id}`,
          relationship: link.relationship,
          relationshipLabel,
          note:
            link.note ??
            `${expert.name} ${relationshipLabel} ${company.name}.`,
          themes: expert.themes.filter((theme) => company.themes.includes(theme)),
          confidence: Math.min(expert.confidence, company.confidence),
          sourceIds: Array.from(new Set(edgeSourceIds)),
        },
      ];
    }),
  );

  const dealEdges: ExplorerEdge[] = deals.flatMap((deal) => {
    const baseSourceIds = deal.sources.map(add);
    const partyEdges = deal.parties.flatMap((party, index) => {
      const to =
        party.companyId && companyById.has(party.companyId)
          ? `company:${party.companyId}`
          : party.personId && expertById.has(party.personId)
            ? `expert:${party.personId}`
            : undefined;
      if (!to) return [];
      const relationship: RelationshipType =
        party.role === "buyer" || party.role === "investor"
          ? "acquired"
          : party.role === "management" || party.role === "board"
            ? "served"
            : "advised";
      return [
        {
          id: `${deal.id}:party:${party.role}:${party.name}:${index}`,
          from: `deal:${deal.id}`,
          to,
          relationship,
          relationshipLabel: party.role.replaceAll("-", " "),
          note: party.note ?? `${party.name} is ${party.role.replaceAll("-", " ")} on ${deal.name}.`,
          themes: [deal.theme],
          confidence: deal.confidence,
          sourceIds: baseSourceIds,
        },
      ];
    });

    const advisorEdges = deal.advisors.flatMap((advisor, index) => {
      if (!advisor.companyId || !companyById.has(advisor.companyId)) return [];
      const relationship: RelationshipType = advisor.role.startsWith("legal-counsel") ? "legal-counsel" : "banked";
      return [
        {
          id: `${deal.id}:advisor:${advisor.role}:${advisor.name}:${index}`,
          from: `company:${advisor.companyId}`,
          to: `deal:${deal.id}`,
          relationship,
          relationshipLabel: DEAL_ADVISOR_LABEL[advisor.role],
          note: advisor.note ?? `${advisor.name} served as ${DEAL_ADVISOR_LABEL[advisor.role]} on ${deal.name}.`,
          themes: [deal.theme],
          confidence: deal.confidence,
          sourceIds: baseSourceIds,
        },
      ];
    });

    return [...partyEdges, ...advisorEdges];
  });

  const edges = [...expertCompanyEdges, ...dealEdges];

  const defaultSelected =
    companyNodes
      .filter((company) => matchesThemeFocus(company.themes, themeFocus))
      .map((company) => ({
        company,
        edges: edges.filter(
          (edge) =>
            (edge.from === company.key || edge.to === company.key) &&
            matchesThemeFocus(edge.themes, themeFocus),
        ).length,
      }))
      .sort((a, b) => b.edges - a.edges || b.company.confidence - a.company.confidence)[0]
      ?.company.key ??
    companyNodes[0]?.key ??
    expertNodes[0]?.key;

  const themes: ExplorerTheme[] = [
    { id: "all", name: "All themes", shortName: "All" },
    ...THEMES.map((theme) => ({
      id: theme.id,
      name: theme.name,
      shortName: theme.shortName,
    })),
  ];

  return (
    <GraphExplorer
      key={themeFocus}
      themes={themes}
      experts={expertNodes}
      companies={companyNodes}
      deals={dealNodes}
      edges={edges}
      sources={sources}
      defaultTheme={themeFocus}
      defaultSelected={defaultSelected}
    />
  );
}
