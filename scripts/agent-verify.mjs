#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const smokeOnly = flags.has("--smoke-only");
const basketOnly = flags.has("--basket");
const copilotOnly = flags.has("--copilot");
const workflowsOnly = flags.has("--workflows");
const skipBuild = flags.has("--skip-build");
const targeted = smokeOnly || basketOnly || copilotOnly || workflowsOnly;

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function runStep(name, command, commandArgs, options = {}) {
  const started = Date.now();
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
  return { name, ok: result.status === 0, durationMs: Date.now() - started };
}

function probe(url) {
  const result = spawnSync("curl", ["-fsS", url], { encoding: "utf8" });
  return result.status === 0;
}

loadEnv();

const baseUrl = process.env.ASK_TEST_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
const backendUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
const results = [];

if (!probe(baseUrl)) {
  console.error(`\nWeb app not reachable at ${baseUrl}. Start with: pnpm dev\n`);
  process.exit(1);
}

if (!smokeOnly && (copilotOnly || workflowsOnly || !targeted)) {
  if (!backendUrl) {
    console.error("\nBACKEND_API_URL is not set in .env — required for @copilot and @workflow tests.\n");
    process.exit(1);
  }
  if (!probe(`${backendUrl}/health`)) {
    console.error(`\nBackend not reachable at ${backendUrl}/health. Start with: pnpm api:dev\n`);
    process.exit(1);
  }
}

if (!targeted) {
  if (!skipBuild) {
    results.push(runStep("lint", "pnpm", ["lint"]));
    if (!results.at(-1).ok) finish(results);
    results.push(runStep("typecheck", "pnpm", ["typecheck"]));
    if (!results.at(-1).ok) finish(results);
    results.push(runStep("build", "pnpm", ["build"]));
    if (!results.at(-1).ok) finish(results);
  }
  results.push(runStep("unit", "pnpm", ["--dir", "apps/web", "test:unit"]));
  if (!results.at(-1).ok) finish(results);
  results.push(runStep("api:test", "pnpm", ["api:test"]));
  if (!results.at(-1).ok) finish(results);
  results.push(
    runStep("ask-contract", "node", ["apps/web/tests/ask-contract.test.mjs"], {
      env: { ASK_TEST_BASE_URL: baseUrl },
    }),
  );
  if (!results.at(-1).ok) finish(results);
}

const e2eEnv = { BASE_URL: baseUrl };

if (!targeted || smokeOnly) {
  results.push(
    runStep("e2e:smoke", "pnpm", ["--dir", "apps/web", "test:e2e:ci", "--grep", "@smoke"], {
      env: e2eEnv,
    }),
  );
  if (!results.at(-1).ok) finish(results);
}

if (!targeted || basketOnly) {
  results.push(
    runStep("e2e:basket", "pnpm", ["--dir", "apps/web", "test:e2e:ci", "--grep", "@basket"], {
      env: e2eEnv,
    }),
  );
  if (!results.at(-1).ok) finish(results);
}

if (!targeted || copilotOnly) {
  results.push(
    runStep("e2e:copilot", "pnpm", ["--dir", "apps/web", "test:e2e:ci", "--grep", "@copilot"], {
      env: { ...e2eEnv, PLAYWRIGHT_GREP: "@copilot" },
    }),
  );
  if (!results.at(-1).ok) finish(results);
}

if (!targeted || workflowsOnly) {
  results.push(
    runStep("e2e:workflows", "pnpm", ["--dir", "apps/web", "test:e2e:ci", "--grep", "@workflow"], {
      env: { ...e2eEnv, PLAYWRIGHT_GREP: "@workflow" },
    }),
  );
  if (!results.at(-1).ok) finish(results);
}

finish(results);

function finish(steps) {
  const reportPath = resolve(root, "agent-verify-report.md");
  const lines = [
    "# Agent verification report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Suite | Result | Duration |",
    "|-------|--------|----------|",
  ];
  for (const step of steps) {
    lines.push(`| ${step.name} | ${step.ok ? "PASS" : "FAIL"} | ${(step.durationMs / 1000).toFixed(1)}s |`);
  }
  lines.push("");
  const allOk = steps.every((step) => step.ok);
  lines.push(allOk ? "**Overall: PASS**" : "**Overall: FAIL**");
  if (!allOk) {
    lines.push("");
    lines.push("See `apps/web/playwright-report/` for E2E failures.");
  }
  writeFileSync(reportPath, lines.join("\n"));
  console.log(`\nReport written to ${reportPath}\n`);
  process.exit(allOk ? 0 : 1);
}
