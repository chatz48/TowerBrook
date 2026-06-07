export type GraphFocusKind = "expert" | "company" | "deal";

export function graphFocusKey(kind: GraphFocusKind, id: string) {
  return `${kind}:${id}`;
}

export function graphHref(kind: GraphFocusKind, id: string) {
  return `/graph?focus=${encodeURIComponent(graphFocusKey(kind, id))}`;
}

export function graphHrefForTheme(themeId?: string) {
  return themeId && themeId !== "all" ? `/graph?theme=${themeId}` : "/graph";
}
