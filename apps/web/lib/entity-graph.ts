import type { GraphCompany, GraphExpert, GraphLink } from "@/app/components/ThemeGraph";
import type { GraphModel } from "@/lib/graph-model";
import {
  computeVisibleGraph,
  defaultGraphViewOptions,
} from "@/lib/graph-visible";
import { resolveGraphFocusKey } from "@/lib/graph-normalize";
import { THEME_BY_ID } from "@/lib/themes";
import type { ThemeFocus } from "@/lib/theme-focus";
import type { CompanyWithLinks, ThemeId } from "@/lib/types";

export interface EntityGraphModel {
  experts: GraphExpert[];
  companies: GraphCompany[];
  links: GraphLink[];
  accent: string;
  focusKey: string;
  fullGraphHref: string;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function uniqueCompanyLinks(
  links: { companyId: string; name: string; expertCount: number }[],
) {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.companyId)) return false;
    seen.add(link.companyId);
    return true;
  });
}

function expertCompanyLink(edge: {
  from: string;
  to: string;
  relationship: string;
}): GraphLink | null {
  const [fromKind, fromId] = edge.from.split(":");
  const [toKind, toId] = edge.to.split(":");
  if (fromKind === "expert" && toKind === "company" && fromId && toId) {
    return { expertId: fromId, companyId: toId, relationship: edge.relationship };
  }
  if (fromKind === "company" && toKind === "expert" && fromId && toId) {
    return { expertId: toId, companyId: fromId, relationship: edge.relationship };
  }
  return null;
}

/** Build inline graph data using the same neighborhood logic as /graph. */
export function toEntityGraphModel(
  model: GraphModel,
  focusKey: string,
  theme: ThemeFocus,
): EntityGraphModel {
  const selectedKey = resolveGraphFocusKey(focusKey, model.canonicalMap);
  const visible = computeVisibleGraph(model, defaultGraphViewOptions(theme, selectedKey));

  const experts: GraphExpert[] = uniqueById(
    visible.visibleNodes
      .filter((node) => node.kind === "expert")
      .map((node) => ({ id: node.id, name: node.name, type: node.type })),
  );

  const companies: GraphCompany[] = uniqueById(
    visible.visibleNodes
      .filter((node) => node.kind === "company")
      .map((node) => ({
        id: node.id,
        name: node.name,
        expertCount: visible.filteredEdges.filter(
          (edge) => edge.from === node.key || edge.to === node.key,
        ).length,
      })),
  );

  const links: GraphLink[] = visible.visibleEdges
    .map(expertCompanyLink)
    .filter((link): link is GraphLink => link !== null);

  const focusNode = visible.selectedNode;
  const themeId: ThemeId =
    focusNode?.themes[0] ?? (theme !== "all" ? theme : "grid-infrastructure");

  return {
    experts,
    companies,
    links,
    accent: THEME_BY_ID[themeId]?.accent ?? "#0757d3",
    focusKey:
      focusNode?.kind === "expert"
        ? `e:${focusNode.id}`
        : focusNode?.kind === "company"
          ? `c:${focusNode.id}`
          : selectedKey,
    fullGraphHref: `/graph?focus=${encodeURIComponent(selectedKey)}`,
  };
}

export function graphFromCompany(company: CompanyWithLinks, theme: ThemeFocus): EntityGraphModel {
  const experts: GraphExpert[] = uniqueById(
    company.linkedExperts.map((link) => ({
      id: link.expert.id,
      name: link.expert.name,
      type: link.expert.type,
    })),
  );
  const companies: GraphCompany[] = [
    { id: company.id, name: company.name, expertCount: company.expertCount },
  ];
  const linksByExpert = new Map<string, GraphLink>();
  for (const link of company.linkedExperts) {
    if (!linksByExpert.has(link.expert.id)) {
      linksByExpert.set(link.expert.id, {
        expertId: link.expert.id,
        companyId: company.id,
        relationship: link.relationship,
      });
    }
  }
  const links = [...linksByExpert.values()];
  const themeId = company.themes[0] ?? (theme !== "all" ? theme : "grid-infrastructure");

  return {
    experts,
    companies,
    links,
    accent: THEME_BY_ID[themeId]?.accent ?? "#0757d3",
    focusKey: `c:${company.id}`,
    fullGraphHref: `/graph?focus=${encodeURIComponent(`company:${company.id}`)}`,
  };
}

export function themeAccent(themeId?: ThemeId) {
  return themeId ? (THEME_BY_ID[themeId]?.accent ?? "#0757d3") : "#0757d3";
}
