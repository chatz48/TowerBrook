export interface OutreachItemState {
  owner: string;
  status: string;
  note: string;
  /** User-edited call objective; empty string falls back to the generated default. */
  objective: string;
}

export type OutreachPlanState = Record<string, OutreachItemState>;

export const OUTREACH_OWNERS = [
  "Unassigned",
  "Arun",
  "Danielle",
  "Deal team",
  "Operating partner",
] as const;

export const OUTREACH_STATUSES = [
  "Not started",
  "Owner assigned",
  "Outreach sent",
  "Scheduled",
  "Completed",
  "Promoted",
  "Rejected",
] as const;

export const ACTIVE_OUTREACH_STATUSES = new Set([
  "Outreach sent",
  "Scheduled",
  "Completed",
]);

export const CLOSED_OUTREACH_STATUSES = new Set([
  "Completed",
  "Promoted",
  "Rejected",
]);

export const DEFAULT_OUTREACH_STATE: OutreachItemState = {
  owner: "Unassigned",
  status: "Not started",
  note: "",
  objective: "",
};

export function effectiveCallObjective(
  state: OutreachPlanState,
  expertId: string,
  defaultObjective: string,
) {
  const custom = outreachRowState(state, expertId).objective.trim();
  return custom || defaultObjective;
}

export function outreachItemKey(expertId: string) {
  return `expert:${expertId}`;
}

export function outreachStorageKey(themeFocus: string, includeTowerBrookEmployees: boolean) {
  return `towerbrook-campaign-v1:${themeFocus}:${includeTowerBrookEmployees}`;
}

export function readOutreachState(storageKey: string): OutreachPlanState {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as OutreachPlanState) : {};
  } catch {
    return {};
  }
}

export function writeOutreachState(storageKey: string, state: OutreachPlanState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function outreachRowState(state: OutreachPlanState, expertId: string) {
  return state[outreachItemKey(expertId)] ?? DEFAULT_OUTREACH_STATE;
}

export function outreachStats(state: OutreachPlanState, expertIds: string[]) {
  const items = expertIds.map((id) => outreachRowState(state, id));
  return {
    assigned: items.filter(
      (item) => item.owner !== "Unassigned" || item.status !== "Not started",
    ).length,
    active: items.filter((item) => ACTIVE_OUTREACH_STATUSES.has(item.status)).length,
    closed: items.filter((item) => CLOSED_OUTREACH_STATUSES.has(item.status)).length,
  };
}

