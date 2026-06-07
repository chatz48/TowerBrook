"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import type {
  CompanyCategory,
  ExpertType,
  RelationshipType,
  ThemeId,
} from "@/lib/types";
import {
  ALL_RELATIONSHIPS,
  computeVisibleGraph,
  DEFAULT_CONFIDENCE_FLOOR,
  filterGraphEdges,
} from "@/lib/graph-visible";
import { matchesThemeFocus, publishThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import styles from "./GraphExplorer.module.css";

export interface ExplorerTheme {
  id: ThemeFocus;
  name: string;
  shortName: string;
}

export interface ExplorerSource {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  label: string;
}

export interface ExplorerExpertNode {
  key: string;
  id: string;
  kind: "expert";
  name: string;
  subtitle: string;
  type: ExpertType;
  typeLabel: string;
  org?: string;
  location?: string;
  themes: ThemeId[];
  tags: string[];
  confidence: number;
  href: string;
  sourceIds: string[];
  evidence: string;
}

export interface ExplorerCompanyNode {
  key: string;
  id: string;
  kind: "company";
  name: string;
  subtitle: string;
  category: CompanyCategory;
  categoryLabel: string;
  themes: ThemeId[];
  tags: string[];
  confidence: number;
  href: string;
  sourceIds: string[];
  evidence: string;
}

export interface ExplorerDealNode {
  key: string;
  id: string;
  kind: "deal";
  name: string;
  subtitle: string;
  typeLabel: string;
  themes: ThemeId[];
  tags: string[];
  confidence: number;
  href: string;
  sourceIds: string[];
  evidence: string;
}

export interface ExplorerEdge {
  id: string;
  from: string;
  to: string;
  relationship: RelationshipType;
  relationshipLabel: string;
  note: string;
  themes: ThemeId[];
  confidence: number;
  sourceIds: string[];
}

type ExplorerNode = ExplorerExpertNode | ExplorerCompanyNode | ExplorerDealNode;
function askHref(prompt: string) {
  return `/ask?prompt=${encodeURIComponent(prompt)}`;
}

const RELATIONSHIP_ORDER = ALL_RELATIONSHIPS;

const RELATIONSHIP_COLOR: Record<RelationshipType, string> = {
  founded: "#11843b",
  "co-founded": "#11843b",
  led: "#1667d9",
  partner: "#7248b9",
  board: "#7248b9",
  advised: "#075fe4",
  "invested-in": "#0a8b9b",
  acquired: "#f26a21",
  banked: "#1f64cc",
  "legal-counsel": "#7747bd",
  served: "#64748b",
};

const NODE_KIND_LABEL = {
  expert: "People",
  company: "Companies",
  deal: "Deals",
};

function confidenceText(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function confidenceBand(confidence: number) {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.75) return "Good";
  return "Indicative";
}

function nodeInitials(node: ExplorerNode) {
  return node.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function nodeKindName(node: ExplorerNode) {
  if (node.kind === "expert") return "Person";
  if (node.kind === "company") return "Company";
  return "Deal";
}

function nodeTypeName(node: ExplorerNode) {
  if (node.kind === "expert") return node.typeLabel;
  if (node.kind === "company") return node.categoryLabel;
  return node.typeLabel;
}

function nodeBadgeText(node: ExplorerNode) {
  if (node.kind === "expert") return "P";
  if (node.kind === "company") return "CO";
  return "D";
}

function otherNode(edge: ExplorerEdge, key: string) {
  return edge.from === key ? edge.to : edge.from;
}

function quickJumpNodes(
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[],
  theme: ThemeFocus,
): { node: ExplorerNode; count: number }[] {
  return allNodes
    .filter((node) => matchesThemeFocus(node.themes, theme))
    .map((node) => ({
      node,
      count: edges.filter((edge) => edge.from === node.key || edge.to === node.key).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function expertDomainOptions(experts: ExplorerExpertNode[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const expert of experts) {
    if (!seen.has(expert.type)) {
      seen.add(expert.type);
      options.push({ value: expert.type, label: expert.typeLabel });
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function sortDirectoryNodes(a: ExplorerNode, b: ExplorerNode) {
  if (a.kind !== b.kind) {
    const order: Record<ExplorerNode["kind"], number> = { expert: 0, company: 1, deal: 2 };
    return order[a.kind] - order[b.kind];
  }
  return a.name.localeCompare(b.name);
}

function directoryCountText(nodes: ExplorerNode[]) {
  const counts = nodes.reduce(
    (memo, node) => ({
      ...memo,
      [node.kind]: memo[node.kind] + 1,
    }),
    { expert: 0, company: 0, deal: 0 } as Record<ExplorerNode["kind"], number>,
  );
  return `${counts.expert} experts · ${counts.company} companies · ${counts.deal} deals`;
}

function directoryGroups(nodes: { node: ExplorerNode; connections: number }[]) {
  return (["expert", "company", "deal"] as const)
    .map((kind) => ({
      kind,
      label: NODE_KIND_LABEL[kind],
      items: nodes.filter((item) => item.node.kind === kind).slice(0, 8),
      total: nodes.filter((item) => item.node.kind === kind).length,
    }))
    .filter((group) => group.total > 0);
}

export default function GraphExplorer({
  themes,
  experts,
  companies,
  deals = [],
  edges,
  sources,
  defaultTheme,
  defaultSelected,
  returnContext,
  variant = "full",
}: {
  themes: ExplorerTheme[];
  experts: ExplorerExpertNode[];
  companies: ExplorerCompanyNode[];
  deals?: ExplorerDealNode[];
  edges: ExplorerEdge[];
  sources: ExplorerSource[];
  defaultTheme: ThemeFocus;
  defaultSelected?: string;
  returnContext?: {
    label: string;
    href: string;
    detail: string;
  };
  variant?: "full" | "embed";
}) {
  const [theme, setTheme] = useState<ThemeFocus>(defaultTheme);
  const [query, setQuery] = useState("");
  const [nodeKinds, setNodeKinds] = useState<Record<ExplorerNode["kind"], boolean>>({
    expert: true,
    company: true,
    deal: true,
  });
  const [relationships, setRelationships] = useState<Record<RelationshipType, boolean>>(
    () =>
      Object.fromEntries(
        RELATIONSHIP_ORDER.map((relationship) => [relationship, true]),
      ) as Record<RelationshipType, boolean>,
  );
  const [confidenceFloor, setConfidenceFloor] = useState(DEFAULT_CONFIDENCE_FLOOR);
  const [pathView, setPathView] = useState(true);
  const [expertDomain, setExpertDomain] = useState<ExpertType | "all">("all");
  const [selectedKey, setSelectedKey] = useState(defaultSelected ?? experts[0]?.key ?? companies[0]?.key);
  const [history, setHistory] = useState<string[]>([]);
  const canvasColumnRef = useRef<HTMLElement>(null);

  const allNodes = useMemo(() => [...experts, ...companies, ...deals], [companies, deals, experts]);
  const nodeByKey = useMemo(
    () => new Map(allNodes.map((node) => [node.key, node])),
    [allNodes],
  );
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const relationshipLabels = useMemo(() => {
    const labels = new Map<RelationshipType, string>();
    for (const edge of edges) labels.set(edge.relationship, edge.relationshipLabel);
    return labels;
  }, [edges]);

  const graphViewOptions = useMemo(
    () => ({
      theme,
      selectedKey,
      confidenceFloor,
      pathView,
      nodeKinds,
      relationships,
      expertDomain,
    }),
    [confidenceFloor, expertDomain, nodeKinds, pathView, relationships, selectedKey, theme],
  );

  const filteredEdges = useMemo(
    () => filterGraphEdges(edges, nodeByKey, graphViewOptions),
    [edges, graphViewOptions, nodeByKey],
  );

  const filteredNodeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of filteredEdges) {
      keys.add(edge.from);
      keys.add(edge.to);
    }
    return keys;
  }, [filteredEdges]);

  const visibleGraph = useMemo(
    () =>
      computeVisibleGraph(
        { experts, companies, deals, edges },
        graphViewOptions,
      ),
    [companies, deals, edges, experts, graphViewOptions],
  );

  const selectedNode = visibleGraph.selectedNode;
  const selectedEdges = visibleGraph.selectedEdges;

  const focusMatches = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    if (!searchText) return [];

    return allNodes
      .filter((node) => matchesThemeFocus(node.themes, theme) && nodeKinds[node.kind])
      .filter((node) => `${node.name} ${node.subtitle} ${node.tags.join(" ")}`.toLowerCase().includes(searchText))
      .map((node) => ({
        node,
        connections: filteredEdges.filter((edge) => edge.from === node.key || edge.to === node.key).length,
      }))
      .sort((a, b) => b.connections - a.connections || a.node.name.localeCompare(b.node.name))
      .slice(0, 12);
  }, [allNodes, filteredEdges, nodeKinds, query, theme]);

  const directoryNodes = useMemo(
    () =>
      allNodes
        .filter((node) => matchesThemeFocus(node.themes, theme) && nodeKinds[node.kind])
        .filter((node) => expertDomain === "all" || node.kind !== "expert" || node.type === expertDomain)
        .map((node) => ({
          node,
          connections: filteredEdges.filter((edge) => edge.from === node.key || edge.to === node.key).length,
        }))
        .sort((a, b) => sortDirectoryNodes(a.node, b.node) || b.connections - a.connections),
    [allNodes, expertDomain, filteredEdges, nodeKinds, theme],
  );
  const groupedDirectoryNodes = useMemo(() => directoryGroups(directoryNodes), [directoryNodes]);
  const connectedPreview = useMemo(
    () =>
      selectedEdges
        .slice(0, 6)
        .map((edge) => ({
          edge,
          node: selectedNode ? nodeByKey.get(otherNode(edge, selectedNode.key)) : undefined,
        }))
        .filter((item): item is { edge: ExplorerEdge; node: ExplorerNode } => Boolean(item.node)),
    [nodeByKey, selectedEdges, selectedNode],
  );

  const visibleEdges = visibleGraph.visibleEdges;
  const visibleNodes = visibleGraph.visibleNodes;

  const metrics = useMemo(() => {
    const bridgeExperts = experts
      .map((expert) => ({
        expert,
        count: filteredEdges.filter((edge) => edge.from === expert.key || edge.to === expert.key).length,
      }))
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const denseTargets = companies
      .map((company) => ({
        company,
        count: filteredEdges.filter((edge) => edge.from === company.key || edge.to === company.key).length,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const repeatedAdvisors = RELATIONSHIP_ORDER.map((relationship) => ({
      relationship,
      label: relationshipLabels.get(relationship) ?? relationship,
      count: filteredEdges.filter((edge) => edge.relationship === relationship).length,
    }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const coveredTags = new Map<string, number>();
    for (const node of visibleNodes) {
      for (const tag of node.tags.slice(0, 3)) coveredTags.set(tag, (coveredTags.get(tag) ?? 0) + 1);
    }

    return {
      bridgeExperts,
      denseTargets,
      repeatedAdvisors,
      weakCoverage: [...coveredTags]
        .filter(([, count]) => count === 1)
        .slice(0, 3)
        .map(([tag]) => tag),
    };
  }, [companies, experts, filteredEdges, relationshipLabels, visibleNodes]);

  function selectNode(key: string) {
    setSelectedKey((current) => {
      if (current && current !== key) setHistory((items) => [...items.slice(-5), current]);
      return key;
    });
    setQuery("");
  }

  function selectNodeAndReveal(key: string) {
    selectNode(key);
    window.requestAnimationFrame(() => {
      canvasColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function stepBack() {
    const previous = history.at(-1);
    if (!previous) return;
    setSelectedKey(previous);
    setHistory((items) => items.slice(0, -1));
  }

  function resetExplorer() {
    setTheme(defaultTheme);
    setQuery("");
    setNodeKinds({ expert: true, company: true, deal: true });
    setRelationships(
      Object.fromEntries(
        RELATIONSHIP_ORDER.map((relationship) => [relationship, true]),
      ) as Record<RelationshipType, boolean>,
    );
    setConfidenceFloor(DEFAULT_CONFIDENCE_FLOOR);
    setPathView(true);
    setExpertDomain("all");
    setSelectedKey(defaultSelected ?? experts[0]?.key ?? companies[0]?.key ?? deals[0]?.key);
    setHistory([]);
  }

  function runQuery() {
    const next = focusMatches[0]?.node;
    if (next) {
      setHistory([]);
      setSelectedKey(next.key);
      setQuery("");
    }
  }

  function changeTheme(nextTheme: ThemeFocus) {
    setTheme(nextTheme);
    publishThemeFocus(nextTheme);
    setQuery("");
    setHistory([]);

    const next = allNodes
      .filter((node) => matchesThemeFocus(node.themes, nextTheme) && nodeKinds[node.kind])
      .map((node) => ({
        node,
        connections: edges.filter((edge) => {
          const from = nodeByKey.get(edge.from);
          const to = nodeByKey.get(edge.to);
          return Boolean(
            from &&
              to &&
              matchesThemeFocus(edge.themes, nextTheme) &&
              relationships[edge.relationship] &&
              edge.confidence >= confidenceFloor &&
              nodeKinds[from.kind] &&
              nodeKinds[to.kind] &&
              (edge.from === node.key || edge.to === node.key),
          );
        }).length,
      }))
      .sort((a, b) => b.connections - a.connections)[0]?.node;

    if (next) setSelectedKey(next.key);
  }

  const selectedSources =
    selectedNode?.sourceIds
      .map((id) => sourceById.get(id))
      .filter((source): source is ExplorerSource => Boolean(source)) ?? [];

  const path = buildPath(selectedNode, visibleEdges, nodeByKey);
  const graphStats = {
    nodes: filteredNodeKeys.size,
    edges: filteredEdges.length,
    sources: new Set(filteredEdges.flatMap((edge) => edge.sourceIds)).size,
  };

  return (
    <div className={variant === "embed" ? styles.embedShell : styles.shell}>
      <div className={variant === "embed" ? styles.embedWorkspace : styles.workspace}>
        {variant === "full" ? (
        <aside className={styles.queryPanel}>
          <PanelHeader title="Relationship Graph" caption="Start with a company or person, then follow the relationship layers that matter." />

          <section className={styles.panelSection}>
            <div className={styles.sectionLine}>
              <strong>Focus</strong>
              <button type="button" onClick={resetExplorer}>
                Reset
              </button>
            </div>
            {selectedNode ? (
              <div className={styles.currentFocus}>
                <span className={styles.focusGlyph} data-kind={selectedNode.kind}>
                  {nodeBadgeText(selectedNode)}
                </span>
                <div>
                  <small>Current focus</small>
                  <strong>{selectedNode.name}</strong>
                  <span>{selectedEdges.length} direct mapped relationship{selectedEdges.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Quick jump
              </span>
              <div className="mt-2 grid gap-1.5">
                {quickJumpNodes(allNodes, filteredEdges, theme).map(({ node, count }) => (
                  <button
                    key={node.key}
                    type="button"
                    onClick={() => selectNode(node.key)}
                    className={`flex items-center gap-2 rounded border px-2.5 py-2 text-left text-[12px] transition-colors ${
                      selectedNode?.key === node.key
                        ? "border-accent bg-[#f4f8ff]"
                        : "border-line bg-white hover:border-line-strong"
                    }`}
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: node.kind === "company" ? "#e6f4ea" : "#eef5ff",
                        color: node.kind === "company" ? "#11843b" : "#075fe4",
                      }}
                    >
                      {nodeBadgeText(node)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
                    <span className="shrink-0 text-[10px] text-ink-faint">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.fieldLabel} htmlFor="graph-theme">
              Theme
            </label>
            <select
              id="graph-theme"
              className={styles.select}
              value={theme}
              onChange={(event) => {
                changeTheme(event.target.value as ThemeFocus);
              }}
            >
              {themes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label className={styles.fieldLabel} htmlFor="graph-query">
              Change focus
            </label>
            <input
              id="graph-query"
              className={styles.select}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runQuery();
              }}
              placeholder="Find a person, company, or deal"
            />
            {query.trim() ? (
              <div className={styles.focusMatches}>
                {focusMatches.length ? (
                  focusMatches.map(({ node, connections }) => (
                    <button key={node.key} type="button" onClick={() => selectNode(node.key)}>
                      <span className={styles.focusGlyph} data-kind={node.kind}>
                        {nodeBadgeText(node)}
                      </span>
                      <span>
                        <strong>{node.name}</strong>
                        <small>{connections} relationship{connections === 1 ? "" : "s"} · {node.kind}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p>No matching nodes in this theme.</p>
                )}
              </div>
            ) : null}
          </section>

          <section className={styles.panelSection}>
            <div className={styles.sectionLine}>
              <strong>Nearest nodes</strong>
              <span className={styles.directoryMeta}>{directoryCountText(directoryNodes.map(({ node }) => node))}</span>
            </div>
            <p className={styles.directoryHint}>
              Search for the full graph. This panel caps each type so the default view stays path-led.
            </p>
            <div className={styles.directoryList} aria-label="Grouped graph node shortlist">
              {groupedDirectoryNodes.map((group) => (
                <details key={group.kind} open={group.kind !== "deal"} className={styles.directoryGroup}>
                  <summary>
                    <span>{group.label}</span>
                    <small>{group.items.length} shown / {group.total}</small>
                  </summary>
                  <div>
                    {group.items.map(({ node, connections }) => (
                      <button
                        key={node.key}
                        type="button"
                        onClick={() => selectNode(node.key)}
                        className={selectedNode?.key === node.key ? styles.activeDirectoryItem : undefined}
                      >
                        <span className={styles.focusGlyph} data-kind={node.kind}>
                          {nodeBadgeText(node)}
                        </span>
                        <span>
                          <strong>{node.name}</strong>
                          <small>{nodeKindName(node)} · {connections} relationship{connections === 1 ? "" : "s"}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className={styles.panelSection}>
            <div className={styles.sectionLine}>
              <strong>Node types</strong>
              <button
                type="button"
                onClick={() => setNodeKinds({ expert: true, company: true, deal: true })}
              >
                Select all
              </button>
            </div>
            {(["expert", "company", "deal"] as const).map((kind) => (
              <label key={kind} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={nodeKinds[kind]}
                  onChange={(event) =>
                    setNodeKinds((current) => ({
                      ...current,
                      [kind]: event.target.checked,
                    }))
                  }
                />
                <span className={styles.nodeGlyph} data-kind={kind}>
                  {kind === "expert" ? "P" : kind === "deal" ? "D" : "CO"}
                </span>
                {NODE_KIND_LABEL[kind]}
              </label>
            ))}
          </section>

          <section className={styles.panelSection}>
            <div className={styles.sectionLine}>
              <strong>Relationship types</strong>
              <button
                type="button"
                onClick={() =>
                  setRelationships(
                    Object.fromEntries(
                      RELATIONSHIP_ORDER.map((relationship) => [relationship, true]),
                    ) as Record<RelationshipType, boolean>,
                  )
                }
              >
                Select all
              </button>
            </div>
            {RELATIONSHIP_ORDER.filter((relationship) =>
              edges.some((edge) => edge.relationship === relationship),
            ).map((relationship) => (
              <label key={relationship} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={relationships[relationship]}
                  onChange={(event) =>
                    setRelationships((current) => ({
                      ...current,
                      [relationship]: event.target.checked,
                    }))
                  }
                />
                <span
                  className={styles.edgeLegend}
                  style={{ "--edge-color": RELATIONSHIP_COLOR[relationship] } as CSSProperties}
                />
                {relationshipLabels.get(relationship) ?? relationship}
              </label>
            ))}
          </section>

          <section className={styles.panelSection}>
            <label className={styles.fieldLabel} htmlFor="confidence">
              Source confidence
            </label>
            <input
              id="confidence"
              className={styles.range}
              type="range"
              min="0.6"
              max="0.95"
              step="0.01"
              value={confidenceFloor}
              onChange={(event) => setConfidenceFloor(Number(event.target.value))}
            />
            <div className={styles.rangeScale}>
              <span>All</span>
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </section>

          <section className={styles.panelSection}>
            <div className={styles.statsGrid}>
              <Metric label="Nodes" value={graphStats.nodes} />
              <Metric label="Edges" value={graphStats.edges} />
              <Metric label="Sources" value={graphStats.sources} />
            </div>
          </section>

          <div className={styles.panelActions}>
            <button type="button" className={styles.primaryButton} onClick={runQuery} disabled={!focusMatches.length}>
              Focus top match
            </button>
            <button type="button" className={styles.secondaryButton} onClick={resetExplorer}>
              Reset
            </button>
          </div>
        </aside>
        ) : null}

        <main
          ref={canvasColumnRef}
          className={variant === "embed" ? styles.embedCanvasColumn : styles.canvasColumn}
        >
          {variant === "full" && returnContext ? (
            <div className={styles.returnContext}>
              <Link href={returnContext.href}>← Back to {returnContext.label}</Link>
              <span>{returnContext.detail}</span>
            </div>
          ) : null}

          {variant === "full" ? (
            <GraphCommandBar
              selectedNode={selectedNode}
              selectedEdges={selectedEdges}
              connectedPreview={connectedPreview}
              onFocus={selectNodeAndReveal}
            />
          ) : null}

          <div className={variant === "embed" ? styles.embedGraphToolbar : styles.graphToolbar}>
            <div className={styles.toolbarFocus}>
              <span>Focused on</span>
              <strong>{selectedNode?.name ?? "No matching node"}</strong>
            </div>
            <div className={styles.toolbarButtons}>
              {variant === "full" ? (
                <select
                  className={styles.select}
                  value={expertDomain}
                  onChange={(event) => {
                    const nextDomain = event.target.value as ExpertType | "all";
                    setExpertDomain(nextDomain);
                    if (nextDomain !== "all") {
                      const topExpert = experts
                        .filter((e) => e.type === nextDomain && matchesThemeFocus(e.themes, theme))
                        .sort((a, b) => {
                          const aEdges = filteredEdges.filter((edge) => edge.from === a.key || edge.to === a.key).length;
                          const bEdges = filteredEdges.filter((edge) => edge.from === b.key || edge.to === b.key).length;
                          return bEdges - aEdges;
                        })[0];
                      if (topExpert) selectNode(topExpert.key);
                    }
                  }}
                  style={{ minWidth: 160, height: 32, fontSize: 12 }}
                >
                  <option value="all">All expert domains</option>
                  {expertDomainOptions(experts).map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                className={!pathView ? styles.activeToolbarButton : undefined}
                onClick={() => setPathView(false)}
              >
                Direct network
              </button>
              <button
                type="button"
                className={pathView ? styles.activeToolbarButton : undefined}
                onClick={() => setPathView(true)}
              >
                Layered map
              </button>
              <button type="button" onClick={stepBack} disabled={history.length === 0}>
                Previous focus
              </button>
            </div>
          </div>

          <section className={styles.graphCard} aria-label="Interactive graph canvas">
            <GraphLegend />
            <div className={styles.graphScroller}>
              <GraphCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedKey={selectedNode?.key}
                nodeByKey={nodeByKey}
                onSelect={selectNode}
              />
            </div>
            <PathStrip path={path} selectedNode={selectedNode} onSelect={selectNodeAndReveal} />
          </section>

          {variant === "full" ? (
            <GraphInsights metrics={metrics} onFocus={selectNodeAndReveal} />
          ) : null}
        </main>

        {variant === "full" ? (
        <aside className={styles.inspector}>
          {selectedNode ? (
            <>
              <div className={styles.inspectorHeader}>
                <div>
                  <span className={styles.kindPill}>
                    {selectedNode.kind === "expert"
                      ? selectedNode.typeLabel
                      : selectedNode.kind === "company"
                        ? selectedNode.categoryLabel
                        : selectedNode.typeLabel}
                  </span>
                  <h2>{selectedNode.name}</h2>
                  <p>{selectedNode.subtitle}</p>
                </div>
                <button type="button" aria-label="Reset selected graph node" onClick={resetExplorer}>
                  ×
                </button>
              </div>

              <section className={styles.confidenceBox}>
                <span>Record confidence</span>
                <strong>{confidenceText(selectedNode.confidence)}</strong>
                <em>{confidenceBand(selectedNode.confidence)}</em>
              </section>

              <section className={styles.inspectSection}>
                <div className={styles.sectionLine}>
                  <strong>Mapped relationships ({selectedEdges.length})</strong>
                  <button type="button" onClick={() => setPathView(false)}>
                    Show all direct
                  </button>
                </div>
                <ul className={styles.relationshipList}>
                  {selectedEdges.slice(0, 8).map((edge) => {
                    const neighbor = nodeByKey.get(otherNode(edge, selectedNode.key));
                    return (
                      <li key={edge.id}>
                        <span
                          className={styles.edgeArrow}
                          style={{ "--edge-color": RELATIONSHIP_COLOR[edge.relationship] } as CSSProperties}
                        />
                        <button
                          type="button"
                          onClick={() => neighbor && selectNodeAndReveal(neighbor.key)}
                        >
                          <strong>{edge.relationshipLabel}</strong>
                          <small>{neighbor?.name ?? "Unknown node"}</small>
                        </button>
                        <em>{edge.sourceIds.length} related</em>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={styles.inspectSection}>
                <div className={styles.sectionLine}>
                  <strong>Related evidence snapshots</strong>
                </div>
                <ul className={styles.evidenceList}>
                  <li>
                    <span>•</span>
                    <p>
                      {selectedNode.evidence}{" "}
                      {selectedNode.sourceIds[0] ? <SourceMarker id={selectedNode.sourceIds[0]} /> : null}
                    </p>
                  </li>
                  {selectedEdges.slice(0, 3).map((edge) => (
                    <li key={edge.id}>
                      <span>•</span>
                      <p>
                        {edge.note} {edge.sourceIds[0] ? <SourceMarker id={edge.sourceIds[0]} /> : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.inspectSection}>
                <strong className={styles.blockTitle}>Top citations</strong>
                <ol className={styles.citationList}>
                  {selectedSources.slice(0, 5).map((source) => (
                    <li key={source.id} id={`source-${source.id}`}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        [{source.id}] {source.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>

              <div className={styles.inspectorActions}>
                <Link href={selectedNode.href} className={styles.primaryButton}>
                  Open {selectedNode.kind} profile
                </Link>
                {selectedNode.kind !== "deal" ? (
                  <WorkspaceActionButton
                    item={{
                      id: selectedNode.id,
                      kind: selectedNode.kind === "expert" ? "call" : "target",
                      name: selectedNode.name,
                      sub: selectedNode.subtitle,
                      href: selectedNode.href,
                      theme: selectedNode.themes[0],
                      note: selectedNode.evidence,
                      status: "graph shortlist",
                    }}
                    className={styles.secondaryButton}
                  >
                    Save to basket
                  </WorkspaceActionButton>
                ) : null}
                <Link
                  href={askHref(
                    `Use the relationship graph to prepare next steps for ${selectedNode.name}. Summarise the mapped relationships, likely intro paths, evidence strength, and recommended outreach or diligence actions.`,
                  )}
                  className={styles.secondaryButton}
                >
                  Ask AI
                </Link>
              </div>
            </>
          ) : (
            <div className={styles.emptyInspector}>No mapped node matches this query.</div>
          )}
        </aside>
        ) : null}
      </div>
    </div>
  );
}

function PanelHeader({ title, caption }: { title: string; caption: string }) {
  return (
    <div className={styles.panelHeader}>
      <h1>{title}</h1>
      <p>{caption}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span>
      <i style={{ background: color }} />
      {label}
    </span>
  );
}

function GraphLegend() {
  return (
    <div className={styles.legend}>
      <LegendDot color="#075fe4" label="People" />
      <LegendDot color="#10843e" label="Targets" />
      <LegendDot color="#0a8b9b" label="Investors" />
      <LegendDot color="#7248b9" label="Advisors" />
      <LegendDot color="#f26a21" label="Acquirers" />
    </div>
  );
}

function GraphCommandBar({
  selectedNode,
  selectedEdges,
  connectedPreview,
  onFocus,
}: {
  selectedNode?: ExplorerNode;
  selectedEdges: ExplorerEdge[];
  connectedPreview: { edge: ExplorerEdge; node: ExplorerNode }[];
  onFocus: (key: string) => void;
}) {
  if (!selectedNode) return null;

  return (
    <section className={styles.commandBar} aria-label="Graph command center">
      <div className={styles.commandPrimary}>
        <span className={styles.focusGlyph} data-kind={selectedNode.kind}>
          {nodeBadgeText(selectedNode)}
        </span>
        <div>
          <span>{nodeKindName(selectedNode)} focus</span>
          <strong>{selectedNode.name}</strong>
          <small>
            {selectedEdges.length} direct path{selectedEdges.length === 1 ? "" : "s"} · {confidenceText(selectedNode.confidence)} confidence
          </small>
        </div>
      </div>

      <div className={styles.commandActions}>
        <Link href={selectedNode.href} className={styles.commandLink}>
          Open profile
        </Link>
        <Link
          href={askHref(
            `Use the relationship graph to prepare a concise action plan for ${selectedNode.name}. Include best intro paths, evidence strength, and next diligence steps.`,
          )}
          className={styles.commandLink}
        >
          Ask AI
        </Link>
      </div>

      {connectedPreview.length ? (
        <div className={styles.connectedRail} aria-label="Connected now">
          <span>Connected now</span>
          {connectedPreview.map(({ edge, node }) => (
            <button key={edge.id} type="button" onClick={() => onFocus(node.key)}>
              <i style={{ "--edge-color": RELATIONSHIP_COLOR[edge.relationship] } as CSSProperties} />
              <b>{node.name}</b>
              <em>{edge.relationshipLabel}</em>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function GraphInsights({
  metrics,
  onFocus,
}: {
  metrics: {
    bridgeExperts: { expert: ExplorerExpertNode; count: number }[];
    denseTargets: { company: ExplorerCompanyNode; count: number }[];
    repeatedAdvisors: { relationship: RelationshipType; label: string; count: number }[];
    weakCoverage: string[];
  };
  onFocus: (key: string) => void;
}) {
  return (
    <section className={styles.insights}>
      <InsightCard
        title="Bridge experts"
        onFocus={onFocus}
        items={metrics.bridgeExperts.map(({ expert, count }, index) => ({
          id: expert.id,
          rank: index + 1,
          label: expert.name,
          sub: `Connects ${count} mapped relationships`,
          value: count,
          focusKey: expert.key,
        }))}
      />
      <InsightCard
        title="Repeated relationship patterns"
        items={metrics.repeatedAdvisors.map(({ relationship, label, count }) => ({
          id: relationship,
          label,
          sub: `${count} mapped edge${count === 1 ? "" : "s"}`,
          value: count,
        }))}
      />
      <InsightCard
        title="High-density targets"
        onFocus={onFocus}
        items={metrics.denseTargets.map(({ company, count }) => ({
          id: company.id,
          label: company.name,
          sub: `${count} linked expert${count === 1 ? "" : "s"}`,
          value: count,
          focusKey: company.key,
        }))}
      />
      <InsightCard
        title="Weak coverage areas"
        items={(metrics.weakCoverage.length ? metrics.weakCoverage : ["Unmapped buyer interviews", "Recent exits", "Advisor overlap"]).map((label, index) => ({
          id: label,
          label,
          sub: index === 0 ? "Needs another verified relationship" : "Limited visible coverage",
          value: index === 0 ? 1 : 0,
        }))}
      />
    </section>
  );
}

function SourceMarker({ id }: { id: string }) {
  return <a className={styles.sourceMarker} href={`#source-${id}`}>[{id}]</a>;
}

function nodeColor(node: ExplorerNode) {
  if (node.kind === "expert") return "#075fe4";
  if (node.kind === "deal") return "#9a4b00";
  if (node.category === "target") return "#10843e";
  if (node.category === "investor") return "#0a8b9b";
  if (node.category === "advisory" || node.category === "service-provider") return "#7248b9";
  return "#f26a21";
}

function GraphCanvas({
  nodes,
  edges,
  selectedKey,
  nodeByKey,
  onSelect,
}: {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  selectedKey?: string;
  nodeByKey: Map<string, ExplorerNode>;
  onSelect: (key: string) => void;
}) {
  const selected = selectedKey ? nodeByKey.get(selectedKey) : undefined;
  const others = nodes.filter((node) => node.key !== selectedKey);
  const positions = new Map<string, { x: number; y: number }>();

  function edgeBetween(node: ExplorerNode) {
    if (!selected) return undefined;
    return edges.find(
      (edge) =>
        (edge.from === selected.key && edge.to === node.key) ||
        (edge.to === selected.key && edge.from === node.key),
    );
  }

  function layerFor(node: ExplorerNode) {
    const edge = edgeBetween(node);
    if (selected?.kind === "company") {
      if (
        node.kind === "expert" &&
        (node.type === "ex-founder" ||
          edge?.relationship === "founded" ||
          edge?.relationship === "co-founded")
      ) {
        return "Founder layer";
      }
      if (
        node.kind === "expert" &&
        (node.type === "operator" ||
          edge?.relationship === "led" ||
          edge?.relationship === "board" ||
          edge?.relationship === "served")
      ) {
        return "Operators and board";
      }
      return "Advisors, investors and deals";
    }

    if (selected?.kind === "expert") {
      if (node.kind === "company") return "Companies they work with";
      if (node.kind === "deal") return "Connected deals";
      return "Other connected experts";
    }

    if (selected?.kind === "deal") {
      if (node.kind === "company" && edge?.relationship === "acquired") return "Buyers and investors";
      if (node.kind === "company") return "Companies and advisors";
      return "People and leadership";
    }

    if (node.kind === "company") return "Companies";
    if (node.kind === "deal") return "Deals";
    if (node.kind === "expert" && (node.type === "advisor" || node.type === "banker" || node.type === "lawyer")) {
      return "Advisors";
    }
    return "Other people";
  }

  const yByLayer: Record<string, number> = selected?.kind === "company"
    ? {
        "Founder layer": 238,
        "Operators and board": 398,
        "Advisors, investors and deals": 558,
      }
    : selected?.kind === "expert"
    ? {
        "Companies they work with": 238,
        "Connected deals": 398,
        "Other connected experts": 558,
      }
    : selected?.kind === "deal"
      ? {
          "Buyers and investors": 238,
          "Companies and advisors": 398,
          "People and leadership": 558,
        }
      : {
          Companies: 238,
          "Other people": 398,
          Advisors: 398,
          Deals: 558,
        };
  const layers = new Map<string, ExplorerNode[]>();
  for (const node of others) {
    const layer = layerFor(node);
    layers.set(layer, [...(layers.get(layer) ?? []), node]);
  }

  const maxLayerSize = Math.max(1, ...[...layers.values()].map((layerNodes) => layerNodes.length));
  const width = Math.max(1120, maxLayerSize * 222 + 220);
  const height = 680;

  if (selected) positions.set(selected.key, { x: width / 2, y: 98 });

  for (const [layer, layerNodes] of layers) {
    const y = yByLayer[layer] ?? 558;
    const gap = Math.min(176, 720 / Math.max(layerNodes.length - 1, 1));
    const total = gap * (layerNodes.length - 1);
    layerNodes.forEach((node, index) => {
      positions.set(node.key, {
        x: width / 2 - total / 2 + index * gap,
        y,
      });
    });
  }
  const layerLabels = [
    selected ? { label: selected.kind === "company" ? "Company focus" : selected.kind === "expert" ? "Expert focus" : selected.kind === "deal" ? "Deal focus" : "Selected focus", y: 98 } : undefined,
    ...Object.entries(yByLayer).map(([label, y]) => ({ label, y })),
  ].filter((item): item is { label: string; y: number } => Boolean(item));

  return (
    <svg className={styles.graphSvg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapped relationship graph">
      <defs>
        <filter id="graph-node-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.1" />
        </filter>
        {RELATIONSHIP_ORDER.map((relationship) => (
          <marker
            key={relationship}
            id={`arrow-${relationship}`}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={RELATIONSHIP_COLOR[relationship]} />
          </marker>
        ))}
      </defs>
      <rect width={width} height={height} rx="0" fill="#ffffff" />
      <g>
        {layerLabels.map((layer) => (
          <g key={layer.label}>
            <line x1="48" y1={layer.y} x2={width - 48} y2={layer.y} stroke="#edf2f7" />
            <rect x="56" y={layer.y - 17} width="154" height="22" rx="11" fill="#f8fafc" stroke="#e4eaf2" />
            <text x="74" y={layer.y - 2} className={styles.layerText}>
              {layer.label}
            </text>
          </g>
        ))}
      </g>
      {edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const color = RELATIONSHIP_COLOR[edge.relationship];
        const bend = Math.abs(from.x - to.x) > 120 ? 42 : 20;
        return (
          <g key={edge.id}>
            <path
              d={`M ${from.x} ${from.y + 34} C ${from.x} ${midY - bend}, ${to.x} ${midY + bend}, ${to.x} ${to.y - 34}`}
              fill="none"
              stroke={color}
              strokeWidth="1.55"
              markerEnd={`url(#arrow-${edge.relationship})`}
              opacity={edge.confidence >= 0.8 ? 0.92 : 0.58}
            />
            <g transform={`translate(${midX - 36} ${midY - 15})`}>
              <rect width="72" height="21" rx="10.5" fill="#ffffff" stroke="#e4e9f1" />
              <text x="36" y="14" textAnchor="middle" className={styles.edgeText} fill={color}>
                {edge.relationshipLabel}
              </text>
            </g>
          </g>
        );
      })}
      {selected ? (
        <circle
          className={styles.selectedHalo}
          cx={positions.get(selected.key)?.x}
          cy={positions.get(selected.key)?.y}
          r="58"
        />
      ) : null}
      {nodes.map((node) => {
        const point = positions.get(node.key);
        if (!point) return null;
        const isSelected = node.key === selectedKey;
        const color = nodeColor(node);
        const cardWidth = isSelected ? 214 : 180;
        const cardHeight = isSelected ? 80 : 68;
        const kindName = nodeKindName(node);
        const typeName = nodeTypeName(node);
        const displayName =
          node.name.length > (isSelected ? 27 : 22)
            ? `${node.name.slice(0, isSelected ? 25 : 20)}…`
            : node.name;
        return (
          <g
            key={node.key}
            className={`${styles.svgNode} ${isSelected ? styles.selectedSvgNode : ""}`}
            transform={`translate(${point.x} ${point.y})`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node.key)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.key);
              }
            }}
            aria-label={`${node.name}, ${node.kind}. Select node.`}
          >
            <title>{`${node.name} · ${kindName} · ${typeName}`}</title>
            <rect
              className={styles.nodeCard}
              x={-cardWidth / 2}
              y={-cardHeight / 2}
              width={cardWidth}
              height={cardHeight}
              rx={node.kind === "expert" ? cardHeight / 2 : node.kind === "deal" ? 4 : 9}
              fill={isSelected ? "#f4f8ff" : "#ffffff"}
              stroke={color}
              strokeWidth={isSelected ? 2.4 : 1.4}
              filter={isSelected ? "url(#graph-node-shadow)" : undefined}
            />
            <rect
              x={-cardWidth / 2 + 11}
              y={-16}
              width="32"
              height="32"
              rx={node.kind === "deal" ? 5 : 16}
              fill={color}
            />
            <text
              x={-cardWidth / 2 + 27}
              y="4"
              textAnchor="middle"
              className={styles.nodeBadge}
            >
              {node.kind === "expert" ? nodeInitials(node).slice(0, 2) : node.kind === "company" ? "CO" : "D"}
            </text>
            <text x={-cardWidth / 2 + 52} y="-7" className={styles.nodeTitle}>
              {displayName}
            </text>
            <text x={-cardWidth / 2 + 52} y="12" className={styles.nodeSub}>
              {kindName} · {typeName.length > 18 ? `${typeName.slice(0, 16)}…` : typeName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function buildPath(
  selectedNode: ExplorerNode | undefined,
  edges: ExplorerEdge[],
  nodeByKey: Map<string, ExplorerNode>,
) {
  if (!selectedNode) return [];
  const direct = edges.find((edge) => edge.from === selectedNode.key || edge.to === selectedNode.key);
  if (!direct) return [selectedNode];
  const first = nodeByKey.get(otherNode(direct, selectedNode.key));
  if (!first) return [selectedNode];
  const secondEdge = edges.find(
    (edge) =>
      edge.id !== direct.id &&
      (edge.from === first.key || edge.to === first.key) &&
      otherNode(edge, first.key) !== selectedNode.key,
  );
  const second = secondEdge ? nodeByKey.get(otherNode(secondEdge, first.key)) : undefined;
  return [selectedNode, first, second].filter((node): node is ExplorerNode => Boolean(node));
}

function PathStrip({
  path,
  selectedNode,
  onSelect,
}: {
  path: ExplorerNode[];
  selectedNode?: ExplorerNode;
  onSelect: (key: string) => void;
}) {
  return (
    <div className={styles.pathStrip}>
      <div>
        <strong>Example relationship path ({Math.max(path.length - 1, 0)} hops)</strong>
        <span>Selected-node evidence: {selectedNode ? confidenceBand(selectedNode.confidence) : "Indicative"}</span>
      </div>
      <ol>
        {path.map((node, index) => (
          <li key={node.key}>
            <button type="button" onClick={() => onSelect(node.key)}>
              <span className={styles.pathNode} data-kind={node.kind}>
                {nodeBadgeText(node)}
              </span>
              <span>{node.name}</span>
            </button>
            {index < path.length - 1 ? <em>→</em> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function InsightCard({
  title,
  items,
  onFocus,
}: {
  title: string;
  items: { id: string; rank?: number; label: string; sub: string; value: number; focusKey?: string }[];
  onFocus?: (key: string) => void;
}) {
  return (
    <article className={styles.insightCard}>
      <div className={styles.sectionLine}>
        <strong>{title}</strong>
      </div>
      <ul>
        {items.slice(0, 3).map((item) => {
          const content = (
            <>
              <span>{item.rank ?? "!"}</span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.sub}</small>
              </div>
              <em>{item.value || ""}</em>
            </>
          );
          return (
            <li key={item.id}>
              {item.focusKey && onFocus ? (
                <button
                  type="button"
                  aria-label={`Focus on ${item.label}`}
                  onClick={() => onFocus(item.focusKey!)}
                >
                  {content}
                </button>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
