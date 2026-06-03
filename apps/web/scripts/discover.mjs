#!/usr/bin/env node
/**
 * Live discovery / data-generation script.
 *
 * This is the engine that produced (and can extend) data/experts.json. Given a
 * theme, it asks Claude to find real experts using its server-side web_search
 * tool, and prints them as JSON in our Expert schema — each with a real source
 * URL. The curated dataset in data/ was seeded and hand-verified this way.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/discover.mjs clean-energy-advisory
 *   ANTHROPIC_API_KEY=sk-... node scripts/discover.mjs smart-water > /tmp/new.json
 *
 * Themes: clean-energy-advisory | grid-infrastructure | smart-water
 *
 * Note: this prints candidates for human review rather than writing to data/
 * directly — sourcing decisions for a PE audience should stay human-in-the-loop.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const THEMES = {
  "clean-energy-advisory": {
    name: "Clean Energy Advisory & Development",
    keywords: ["renewable energy development", "clean energy advisory", "renewables M&A"],
    specialties: ["Solar development", "Offshore wind", "Battery storage (BESS)", "PPAs & offtake", "Project finance", "M&A advisory", "Energy market analytics"],
  },
  "grid-infrastructure": {
    name: "Grid Infrastructure & Connection",
    keywords: ["grid connection", "grid edge software", "energy flexibility"],
    specialties: ["Grid connection", "Flexibility & DER markets", "Grid-edge software", "Storage optimisation & trading", "EV charging infrastructure", "Network analytics"],
  },
  "smart-water": {
    name: "Smart Water Infrastructure & Analytics",
    keywords: ["smart water", "leak detection", "water analytics"],
    specialties: ["Leak detection", "Water quality monitoring", "Network & pressure analytics", "Flood & climate risk", "Wastewater & treatment", "Digital twin & utility software"],
  },
};

async function main() {
  const themeId = process.argv[2];
  const theme = THEMES[themeId];
  if (!theme) {
    console.error(`Usage: node scripts/discover.mjs <${Object.keys(THEMES).join(" | ")}>`);
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY to run discovery.");
    process.exit(1);
  }

  // Exclude experts we already have for this theme.
  const existing = JSON.parse(readFileSync(join(root, "data/experts.json"), "utf8"))
    .filter((e) => e.themes.includes(themeId))
    .map((e) => e.name);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.error(`Searching the web for experts on "${theme.name}"…`);

  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 3000,
    system:
      "You are a sourcing agent for a private equity firm. Find REAL, named experts on a theme — ex-founders, advisors, bankers, lawyers, peer-fund dealmakers. Use web search; never invent anyone. Capture a real source URL you actually saw. Return ONLY a JSON array.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    messages: [
      {
        role: "user",
        content: `Theme: ${theme.name}
Search terms: ${theme.keywords.join(", ")}
Sub-specialties to spread across: ${theme.specialties.join(", ")}
Exclude (already covered): ${existing.join(", ") || "(none)"}

Find 5-6 experts, preferring people with a recent datable event. Return ONLY a JSON array of:
{ "name", "type", "headline", "company", "specialty", "whyRelevant", "recentNews", "sourceUrl", "confidence" }`,
      },
    ],
  });

  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) {
    console.error("No JSON array found in model output. Raw:\n" + text);
    process.exit(2);
  }
  // Print clean JSON to stdout for piping / review.
  console.log(JSON.stringify(JSON.parse(text.slice(start, end + 1)), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
