import fs from "node:fs/promises";
import path from "node:path";

export type TraceToolCall = {
  tool_name?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status?: string;
};

export type TraceRecord = {
  request_id: string;
  surface: "web-ask" | "backend-copilot" | string;
  created_at: string;
  question?: string;
  theme_id?: string;
  intent?: string;
  outcome?: string;
  stream?: boolean;
  backend_enriched?: boolean;
  filters?: Record<string, unknown>;
  durations_ms?: Record<string, number>;
  phases?: Array<Record<string, unknown>>;
  tool_calls?: TraceToolCall[];
  node_timings_ms?: Record<string, number>;
  errors?: string[];
  summary?: Record<string, unknown>;
  file_path?: string;
};

export type TraceGroup = {
  requestId: string;
  createdAt: string;
  question: string;
  category: string;
  theme: string;
  surfaces: string[];
  outcome: string;
  totalMs: number;
  model: string;
  langGraphNodes: Array<{ node: string; ms: number }>;
  retrievalModes: string[];
  tools: Array<TraceToolCall & { category: string; mode: string; count?: number; reranked?: boolean }>;
  records: TraceRecord[];
  errors: string[];
};

export type TraceDashboard = {
  root: string;
  totalGroups: number;
  totalRecords: number;
  latestUpdatedAt?: string;
  summary: {
    completed: number;
    baselineOnly: number;
    errors: number;
    backendEnriched: number;
    avgTotalMs: number;
    hybridToolCalls: number;
    rerankedToolCalls: number;
  };
  groups: TraceGroup[];
};

const MAX_TRACE_FILES = 180;

export async function loadTraceDashboard(): Promise<TraceDashboard> {
  const root = traceRoot();
  const files = await listTraceFiles(root);
  const records = await readTraceRecords(files);
  const groups = groupTraceRecords(records);
  const totals = groups.map((group) => group.totalMs).filter((value) => value > 0);

  return {
    root,
    totalGroups: groups.length,
    totalRecords: records.length,
    latestUpdatedAt: groups[0]?.createdAt,
    summary: {
      completed: groups.filter((group) => group.outcome === "complete").length,
      baselineOnly: groups.filter((group) => group.outcome === "baseline_only").length,
      errors: groups.filter((group) => group.outcome === "error" || group.errors.length > 0).length,
      backendEnriched: groups.filter((group) => group.records.some((record) => record.backend_enriched)).length,
      avgTotalMs: totals.length
        ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length)
        : 0,
      hybridToolCalls: groups.reduce(
        (sum, group) => sum + group.tools.filter((tool) => tool.mode.includes("hybrid")).length,
        0,
      ),
      rerankedToolCalls: groups.reduce(
        (sum, group) => sum + group.tools.filter((tool) => tool.reranked).length,
        0,
      ),
    },
    groups,
  };
}

function traceRoot(): string {
  if (process.env.REQUEST_TRACE_DIR) return process.env.REQUEST_TRACE_DIR;
  const cwd = process.cwd();
  return cwd.endsWith(`${path.sep}apps${path.sep}web`)
    ? path.resolve(cwd, "..", "..", ".traces")
    : path.join(cwd, ".traces");
}

async function listTraceFiles(root: string): Promise<string[]> {
  const found: Array<{ file: string; mtimeMs: number }> = [];

  async function walk(dir: string, depth: number) {
    if (depth > 4) return;
    let entries: Array<import("node:fs").Dirent>;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const stat = await fs.stat(fullPath);
        found.push({ file: fullPath, mtimeMs: stat.mtimeMs });
      }
    }
  }

  await walk(root, 0);
  return found
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, MAX_TRACE_FILES)
    .map((item) => item.file);
}

async function readTraceRecords(files: string[]): Promise<TraceRecord[]> {
  const records: TraceRecord[] = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8")) as TraceRecord;
      if (parsed?.request_id) {
        records.push({ ...parsed, file_path: file });
      }
    } catch {
      // Ignore malformed local trace files.
    }
  }
  return records.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function groupTraceRecords(records: TraceRecord[]): TraceGroup[] {
  const byRequest = new Map<string, TraceRecord[]>();
  for (const record of records) {
    const group = byRequest.get(record.request_id) ?? [];
    group.push(record);
    byRequest.set(record.request_id, group);
  }

  return [...byRequest.entries()]
    .map(([requestId, groupRecords]) => buildTraceGroup(requestId, groupRecords))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function buildTraceGroup(requestId: string, records: TraceRecord[]): TraceGroup {
  const sorted = [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const backend = sorted.find((record) => record.surface === "backend-copilot");
  const web = sorted.find((record) => record.surface === "web-ask");
  const primary = backend ?? web ?? sorted[0];
  const tools = sorted.flatMap((record) => record.tool_calls ?? []).map(enrichToolCall);
  const nodeTimings = backend?.node_timings_ms ?? web?.node_timings_ms ?? {};
  const summary = backend?.summary ?? web?.summary ?? {};

  return {
    requestId,
    createdAt: primary.created_at,
    question: primary.question ?? web?.question ?? "Unknown question",
    category: primary.intent ?? web?.intent ?? "unknown",
    theme: primary.theme_id ?? web?.theme_id ?? "all",
    surfaces: [...new Set(sorted.map((record) => record.surface))],
    outcome: primary.outcome ?? web?.outcome ?? "unknown",
    totalMs: maxDuration(sorted),
    model: stringValue(summary.model_used) ?? stringValue(primary.summary?.model_used) ?? "unknown",
    langGraphNodes: Object.entries(nodeTimings).map(([node, ms]) => ({ node, ms })),
    retrievalModes: unique(
      tools
        .map((tool) => tool.mode)
        .filter((mode) => mode && mode !== "none"),
    ),
    tools,
    records: sorted,
    errors: sorted.flatMap((record) => record.errors ?? []),
  };
}

function enrichToolCall(tool: TraceToolCall): TraceGroup["tools"][number] {
  const output = tool.output ?? {};
  const mode = stringValue(output.mode) ?? "none";
  return {
    ...tool,
    category: toolCategory(tool.tool_name),
    mode,
    count: numberValue(output.count),
    reranked: Boolean(output.reranked),
  };
}

function toolCategory(toolName?: string): string {
  if (!toolName) return "unknown";
  if (toolName.startsWith("rag_search")) return "retrieval";
  if (toolName.includes("web") || toolName.includes("fetch")) return "live source";
  if (toolName.includes("report") || toolName.includes("email")) return "generation";
  if (toolName.includes("discovery")) return "job";
  return "tool";
}

function maxDuration(records: TraceRecord[]): number {
  return Math.max(
    0,
    ...records.map((record) => Number(record.durations_ms?.total ?? record.durations_ms?.complete ?? 0)),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
