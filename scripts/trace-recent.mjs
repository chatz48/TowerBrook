#!/usr/bin/env node
/**
 * List recent copilot / ask request traces from .traces/
 *
 * Usage:
 *   node scripts/trace-recent.mjs [limit]
 *   node scripts/trace-recent.mjs --id <request-id>
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tracesRoot = process.env.REQUEST_TRACE_DIR ?? join(root, ".traces");
const args = process.argv.slice(2);

function collectJsonFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) collectJsonFiles(full, acc);
    else if (entry.endsWith(".json")) acc.push({ full, mtime: stat.mtimeMs });
  }
  return acc;
}

if (args[0] === "--id") {
  const id = args[1];
  if (!id) {
    console.error("Usage: node scripts/trace-recent.mjs --id <request-id>");
    process.exit(1);
  }
  const files = collectJsonFiles(tracesRoot);
  const match = files.find((f) => f.full.endsWith(`/${id}.json`));
  if (!match) {
    console.error(`No trace found for request_id=${id}`);
    process.exit(1);
  }
  console.log(readFileSync(match.full, "utf8"));
  process.exit(0);
}

const limit = Number(args[0] ?? 15);
const files = collectJsonFiles(tracesRoot)
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, limit);

if (!files.length) {
  console.log(`No traces in ${tracesRoot} (set REQUEST_TRACES=1 or run in development)`);
  process.exit(0);
}

for (const { full } of files) {
  const trace = JSON.parse(readFileSync(full, "utf8"));
  const rel = full.replace(`${tracesRoot}/`, "");
  const total = trace.durations_ms?.total ?? "?";
  const outcome = trace.outcome ?? "unknown";
  const surface = trace.surface ?? "unknown";
  const question = (trace.question ?? "").replace(/\s+/g, " ").slice(0, 72);
  console.log(
    `${trace.request_id}  ${surface.padEnd(16)}  ${String(outcome).padEnd(14)}  ${String(total).padStart(5)}ms  ${question}`,
  );
  console.log(`  ${rel}`);
}
