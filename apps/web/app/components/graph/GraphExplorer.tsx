"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type {
  CompanyCategory,
  ExpertType,
  RelationshipType,
  ThemeId,
} from "@/lib/types";
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

const RELATIONSHIP_ORDER: RelationshipType[] = [
  "founded",
  "co-founded",
  "led",
  "advised",
  "board",
  "invested-in",
  "acquired",
  "banked",
  "legal-counsel",
  "partner",
  "served",
];

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

export default function GraphExplorer({
  themes,
  experts,
  companies,
  deals = [],
  edges,
  sources,
  defaultTheme,
  defaultSelected,
}: {
  themes: ExplorerTheme[];
  experts: ExplorerExpertNode[];
  companies: ExplorerCompanyNode[];
  deals?: ExplorerDealNode[];
  edges: ExplorerEdge[];
  sources: ExplorerSource[];
  defaultTheme: ThemeFocus;
  defaultSelected?: string;
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
  const [confidenceFloor, setConfidenceFloor] = useState(0.72);
  const [pathView, setPathView] = useState(true);
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

  const filteredEdges = useMemo(
    () =>
      edges.filter((edge) => {
        const from = nodeByKey.get(edge.from);
        const to = nodeByKey.get(edge.to);
        if (!from || !to) return false;
        if (!matchesThemeFocus(edge.themes, theme)) return false;
        if (!relationships[edge.relationship]) return false;
        if (edge.confidence < confidenceFloor) return false;
        if (!nodeKinds[from.kind] || !nodeKinds[to.kind]) return false;
        return true;
      }),
    [confidenceFloor, edges, nodeByKey, nodeKinds, relationships, theme],
  );

  const filteredNodeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of filteredEdges) {
      keys.add(edge.from);
      keys.add(edge.to);
    }
    return keys;
  }, [filteredEdges]);

  const selectedNode =
    nodeByKey.get(selectedKey) ??
    [...filteredNodeKeys].map((key) => nodeByKey.get(key)).find(Boolean) ??
    allNodes[0];

  const selectedEdges = useMemo(
    () =>
      filteredEdges
        .filter((edge) => edge.from === selectedNode?.key || edge.to === selectedNode?.key)
        .sort((a, b) => b.confidence - a.confidence || b.sourceIds.length - a.sourceIds.length),
    [filteredEdges, selectedNode?.key],
  );

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
      .slice(0, 6);
  }, [allNodes, filteredEdges, nodeKinds, query, theme]);

  const visibleEdges = useMemo(() => {
    if (!selectedNode) return filteredEdges.slice(0, 10);
    const selected = selectedNode.key;
    const firstHop = selectedEdges.slice(0, pathView ? 7 : 12);
    if (!pathView) return firstHop;

    const firstHopKeys = new Set(firstHop.flatMap((edge) => [edge.from, edge.to]));
    const secondHop = filteredEdges
      .filter(
        (edge) =>
          !firstHop.some((first) => first.id === edge.id) &&
          (firstHopKeys.has(edge.from) || firstHopKeys.has(edge.to)),
      )
      .filter((edge) => edge.from !== selected && edge.to !== selected)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return [...firstHop, ...secondHop];
  }, [filteredEdges, pathView, selectedEdges, selectedNode]);

  const visibleNodes = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of visibleEdges) {
      keys.add(edge.from);
      keys.add(edge.to);
    }
    if (selectedNode) keys.add(selectedNode.key);
    return [...keys]
      .map((key) => nodeByKey.get(key))
      .filter((node): node is ExplorerNode => Boolean(node));
  }, [nodeByKey, selectedNode, visibleEdges]);

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
    setConfidenceFloor(0.72);
    setPathView(true);
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
    <div className={styles.shell}>
      <div className={styles.workspace}>
        <aside className={styles.queryPanel}>
          <PanelHeader title="Graph Explorer" caption="Choose a focus, then follow the relationships that matter." />

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
                  style={{ "--edge-color": RELATIONSHIP_COLOR[relationship] } as React.CSSProperties}
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

        <main ref={canvasColumnRef} className={styles.canvasColumn}>
          <div className={styles.graphToolbar}>
            <div className={styles.toolbarFocus}>
              <span>Focused on</span>
              <strong>{selectedNode?.name ?? "No matching node"}</strong>
            </div>
            <div className={styles.toolbarButtons}>
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
                Relationship paths
              </button>
              <button type="button" onClick={stepBack} disabled={history.length === 0}>
                Previous focus
              </button>
            </div>
          </div>

          <section className={styles.graphCard} aria-label="Interactive graph canvas">
            <div className={styles.legend}>
              <LegendDot color="#075fe4" label="People" />
              <LegendDot color="#10843e" label="Targets" />
              <LegendDot color="#0a8b9b" label="Investors" />
              <LegendDot color="#7248b9" label="Advisors" />
              <LegendDot color="#f26a21" label="Acquirers" />
            </div>
            <GraphCanvas
              nodes={visibleNodes}
              edges={visibleEdges}
              selectedKey={selectedNode?.key}
              nodeByKey={nodeByKey}
              onSelect={selectNode}
            />
            <PathStrip path={path} selectedNode={selectedNode} />
          </section>

          <section className={styles.insights}>
            <InsightCard
              title="Bridge experts"
              onFocus={selectNodeAndReveal}
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
              onFocus={selectNodeAndReveal}
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
        </main>

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
                          style={{ "--edge-color": RELATIONSHIP_COLOR[edge.relationship] } as React.CSSProperties}
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
              </div>
            </>
          ) : (
            <div className={styles.emptyInspector}>No mapped node matches this query.</div>
          )}
        </aside>
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
  const width = 960;
  const height = 520;
  const selected = selectedKey ? nodeByKey.get(selectedKey) : undefined;
  const others = nodes.filter((node) => node.key !== selectedKey);
  const left = others.filter((node) => node.kind === "expert");
  const right = others.filter((node) => node.kind === "company");
  const overflow = others.filter(
    (node) =>
      !left.some((item) => item.key === node.key) && !right.some((item) => item.key === node.key),
  );

  const positions = new Map<string, { x: number; y: number }>();
  if (selected) positions.set(selected.key, { x: width / 2, y: height / 2 });

  left.forEach((node, index) => {
    positions.set(node.key, {
      x: 180 + (index % 2) * 92,
      y: 112 + (height - 220) * ((index + 0.5) / Math.max(left.length, 1)),
    });
  });
  right.forEach((node, index) => {
    positions.set(node.key, {
      x: width - 180 - (index % 2) * 92,
      y: 112 + (height - 220) * ((index + 0.5) / Math.max(right.length, 1)),
    });
  });
  overflow.forEach((node, index) => {
    positions.set(node.key, {
      x: 330 + index * 110,
      y: height - 82,
    });
  });

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
      <g opacity="0.52">
        {Array.from({ length: 14 }).map((_, index) => (
          <line key={`v-${index}`} x1={60 + index * 68} y1="44" x2={60 + index * 68} y2={height - 44} stroke="#eef2f7" />
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <line key={`h-${index}`} x1="52" y1={70 + index * 62} x2={width - 52} y2={70 + index * 62} stroke="#eef2f7" />
        ))}
      </g>
      {edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const color = RELATIONSHIP_COLOR[edge.relationship];
        const bend = Math.abs(from.y - to.y) > 80 ? 36 : 0;
        return (
          <g key={edge.id}>
            <path
              d={`M ${from.x} ${from.y} C ${midX} ${from.y - bend}, ${midX} ${to.y + bend}, ${to.x} ${to.y}`}
              fill="none"
              stroke={color}
              strokeWidth="1.35"
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
      {nodes.map((node) => {
        const point = positions.get(node.key);
        if (!point) return null;
        const selected = node.key === selectedKey;
        const color = nodeColor(node);
        const cardWidth = selected ? 214 : 180;
        const cardHeight = selected ? 80 : 68;
        const kindName = nodeKindName(node);
        const typeName = nodeTypeName(node);
        const displayName =
          node.name.length > (selected ? 27 : 22)
            ? `${node.name.slice(0, selected ? 25 : 20)}…`
            : node.name;
        return (
          <g
            key={node.key}
            className={styles.svgNode}
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
              fill={selected ? "#f4f8ff" : "#ffffff"}
              stroke={color}
              strokeWidth={selected ? 2.4 : 1.4}
              filter={selected ? "url(#graph-node-shadow)" : undefined}
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
}: {
  path: ExplorerNode[];
  selectedNode?: ExplorerNode;
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
            <span className={styles.pathNode} data-kind={node.kind}>
              {nodeBadgeText(node)}
            </span>
            <span>{node.name}</span>
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
