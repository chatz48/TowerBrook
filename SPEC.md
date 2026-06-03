# Expert Engine — Product Specification

_Last updated: June 2026 · status legend: ✅ shipped · ◐ partial · ⬜ planned_

## 1. North Star

**Theme → partner-ready point of view → prioritised reachable call list → sourced
memo, in one workflow.**

Expert Engine is a graph-backed people intelligence product for thematic
private equity sourcing. It is not a generic chatbot and not a prettier
directory.

Core principle:

```text
The graph is the database.
Sources are the evidence.
The LLM is the extraction, synthesis, and workflow layer.
```

## 2. Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4.
- Static sourced graph data in `data/experts.json` and `data/companies.json`.
- Anthropic SDK in server-side route handlers for optional grounded generation.
- Deterministic fallbacks for all AI workflows.

## 3. Data Model

### Expert

`Expert` records include identity, archetype, headline, organization, location,
themes, specialties, access quality, relevance rationale, typed company edges,
signals/news, sources, confidence, and optional LinkedIn.

### Company

`Company` records include theme coverage, category, description, ownership,
stage/scale/funding, comparables, news, sources, and confidence.

### Relationship Edge

Supported production edge types:

```text
founded · co-founded · led · partner · board · advised · invested-in ·
acquired · banked · legal-counsel · served
```

### Deal

`Deal` records include identity, theme, geography, status, transaction type,
announcement/completion date, parties, advisors/counsel, source-backed fact
rubric, surfaced experts/companies, missing facts, follow-up searches,
comparable deals, confidence, and completion score.

Material facts carry source IDs, evidence text, confidence, extraction method,
and review status. Undisclosed economics are represented as `not_disclosed`
rather than guessed values.

## 4. Shipped Surfaces

### 4.1 Home `/` ✅

- Terminal-style command landing page.
- Theme table with expert/company counts, top expert, coverage, and actions.
- Global client-side search across experts and companies.
- Shortcuts to copilot, graph, reports, and review queue.

### 4.2 Theme Command Center `/themes/[theme]` ✅

Mockup-derived institutional research layout:

- Header actions: call plan, memo, discovery queue.
- KPI strip: experts, actionable targets, exits, advisors, companies,
  confidence.
- Theme thesis panel with citation markers and optional grounded AI sharpen.
- "Call this week" dense table.
- Right rail: expert clusters and blank spaces.
- Session-aware expert ranking table.
- Companies-derived table.
- Theme graph preview with link to standalone graph explorer.

### 4.3 Session-Aware Ranking ✅

Base priority remains graph-derived and transparent:

```text
(base role + relationship edges + recency + access + signals + cross-theme) * confidence
```

Session ranking adds:

- Objective fit.
- Preferred expert archetype fit.
- Optimization fit.
- Geography fit.
- Theme fit.

Supported objectives:

- Understand market structure.
- Validate buyer pain.
- Find investable companies.
- Understand deal process.
- Find founder introductions.
- Red-team the thesis.

### 4.4 Expert Explorer `/experts` ✅

- Dense all-expert table.
- Base priority score, momentum, access, connected companies, citations.
- Links into expert profile and downstream workflows.

### 4.5 Expert Profile `/experts/[id]` ✅

- Mockup-style expert profile header and metric strip.
- Evidence-backed relevance bullets.
- Company/deal connection table.
- News and momentum signals.
- Source register.
- Right rail call-prep builder.
- Generated call-prep section grid.

### 4.6 Company Explorer `/companies` ✅

- Dense company table ranked by expert density.
- Category, ownership, confidence, investment angle, linked experts, sources.

### 4.7 Company Profile `/companies/[id]` ✅

- Company profile header and fact strip.
- Why surfaced.
- Linked expert relationship table.
- Related deal table showing company role, date, type and fact completeness.
- News, comparables, source evidence.
- Graph path action.

### 4.8 Deal Intelligence `/deals` and `/deals/[id]` ✅

- Dense deal table covering theme, target, buyer/investor, type, date,
  advisors, lawyers, experts, companies, completeness, confidence and next
  action.
- Deal detail scorecard with rubric facts, parties, advisors/counsel, surfaced
  experts/companies, missing facts, conflicts, follow-up searches and evidence.
- Deal records connect into expert profiles, company profiles, graph nodes and
  report templates.

### 4.9 User Deal Ingest `/ingest` and `/api/ingest` ✅

- Accepts pasted deal material plus optional source URL/title.
- Deterministically extracts a draft deal rubric, advisor/counsel hints,
  missing facts and relationship candidates.
- Keeps draft output review-gated and does not mutate production graph data.
- Generates follow-up searches for advisors, counsel, valuation, completion
  date, seller and financing gaps.

### 4.10 Standalone Graph Explorer `/graph` ✅

- Left query/filter panel.
- Interactive SVG graph canvas.
- Click node to center and reveal direct connections.
- Click neighbor to traverse.
- Back/reset behavior.
- Path/ego toggle.
- Relationship labels and colors.
- Selected-node inspector for experts, companies and deals.
- Source-backed edge metadata.
- Explicit expert/company profile navigation.

### 4.11 Research Copilot `/ask` and `/api/ask` ✅

Structured research workspace:

- Left rail: objective and filters.
- Center: conversation and deterministic structured answer blocks.
- Right rail: evidence inspector.

API returns:

- Ranked experts.
- Ranked companies.
- Suggested call sequence.
- What to listen for.
- Gaps.
- Risks.
- Sources used.
- Confidence.
- Assumptions.
- Follow-up actions.

The model may refine only the deterministic graph-grounded baseline.

### 4.12 Reports / Memo Builder `/reports` ✅

- Templates: theme memo, expert call plan, company brief, red-team thesis,
  IC appendix, deal brief, deal relationship map.
- Section-by-section report object.
- Section status, confidence, source count, citations, and actions.
- Source register table.
- Markdown/export/copy/print controls.

### 4.13 Discovery Review Queue `/discover` ✅

- Human-in-the-loop candidate table.
- Statuses: approved, needs review, rejected, merge, needs more evidence.
- Evidence rail with source URL, extracted entities, proposed relationships,
  confidence, and duplicate warnings.
- Deal fact review table showing missing deal facts and follow-up paths.
- Live discovery action remains available, but results do not mutate production
  data.

### 4.14 Source Register `/sources` ✅

- Source audit table backed by `data/source-register.json`.
- Theme, type, publisher, expected entities, review status, confidence, and
  rationale.
- Deal fact source coverage showing which deal sources fill material facts.

## 5. Data Pipeline ✅

Prototype path:

```text
source register -> fetch/clean -> candidate JSON -> human review -> graph-ready output
```

Files:

- `scripts/data-pipeline.mjs`
- `scripts/validate-ingest.mjs`
- `data/source-register.json`
- `data/pipeline-clean.json`
- `data/candidates.json`
- `data/graph-ready.json`
- `data/deals.json`
- `docs/data-pipeline.md`

The pipeline never mutates production graph data. Only approved candidates are
eligible for graph-ready output.

Deal ingestion validation is available through `pnpm ingest:validate` and
checks required deal facts, linked company/expert IDs, source coverage, and
verified-fact evidence.

## 6. Design System ✅

The implementation follows `docs/mockups`:

- White global app chrome.
- Pale gray workspace.
- Dense tables.
- Left rails, center workspaces, right evidence/settings inspectors.
- Blue active states, green confidence bars, amber/red risk states.
- Compact labels and thin panel borders.

See `docs/design-system.md`.

## 7. API And AI Behavior

Server routes:

- `/api/ask`
- `/api/brief`
- `/api/call-prep`
- `/api/outreach`
- `/api/discover`

No browser route exposes API keys. Without `ANTHROPIC_API_KEY`, all surfaces use
deterministic fallbacks.

## 8. Verification

Required commands:

```bash
pnpm lint
pnpm exec tsc --noEmit --pretty false
pnpm build
node scripts/data-pipeline.mjs validate
```

HTTP smoke flow:

```text
/
/themes/grid-infrastructure
/experts/nick-boyle
/companies/lightsource-bp
/graph
/ask
/reports
/discover
/sources
```

## 9. Limitations

- No auth, permissions, firm-specific user state, or CRM integration.
- Shortlist, contacted state, and CRM/export actions are UI prototypes unless
  otherwise noted.
- News is curated, not live.
- Discovery review queue proves the pipeline but does not merge into
  production data automatically.
- Confidence scores are curated record-level confidence, not learned source
  quality.
- No paid data provider integrations, full email sending, or production
  deployment automation.

## 10. Production Roadmap

1. Warm-path relationship intelligence from firm network data.
2. Saved shortlist and contacted-state workflow.
3. CSV/PDF export and CRM push.
4. Persist approved candidates into production graph data with merge tooling.
5. Add licensed/live signal feeds.
6. Add AI output evals for faithfulness to cited sources.
