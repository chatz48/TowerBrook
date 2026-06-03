# Expert Engine

TowerBrook Expert Engine is a graph-backed people intelligence workflow for
thematic private equity sourcing.

The product helps an investment professional move from a theme to a ranked
expert pool, surfaced companies, relationship paths, call prep, structured
research answers, evidence-backed memos, and a reviewable ingestion path.

Core principle:

```text
The graph is the database.
Sources are the evidence.
The LLM is the extraction, synthesis, and workflow layer.
```

The demo covers three themes:

- Clean Energy Advisory & Development
- Grid Infrastructure & Connection
- Smart Water Infrastructure & Analytics

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Optional AI features use Anthropic server-side route handlers:

```bash
cp .env.example .env.local
# add ANTHROPIC_API_KEY=...
pnpm dev
```

The app remains functional without an API key through deterministic fallbacks.

## Product Flow

| Route | What it does |
|---|---|
| `/` | Command landing page with theme rows, global search, workflow shortcuts, and the TowerBrook lens. |
| `/themes/[theme]` | Theme Command Center: KPI strip, thesis, call list, clusters, blank spaces, TowerBrook score, session-aware expert ranking, companies, graph preview. |
| `/experts` | Dense cross-theme expert explorer with base priority and TowerBrook score. |
| `/experts/[id]` | Expert profile with evidence, company/deal links, TowerBrook score, session call-prep rail, generated call-prep sections. |
| `/companies` | Company explorer ranked by expert density, evidence strength, and TowerBrook relationship fit. |
| `/companies/[id]` | Company profile with linked experts, TowerBrook score, evidence, sources, graph path action. |
| `/deals` | Deal Intelligence table with sourced parties, advisors, lawyers, surfaced experts/companies, fact completeness, and next actions. |
| `/deals/[id]` | Deal scorecard with fact rubric, evidence, parties, advisors/counsel, missing facts, follow-up searches, and related people/companies. |
| `/ingest` | User deal ingestion workflow for pasted deal materials, source URLs, company statements, advisor pages, and extracted document text. |
| `/graph` | Standalone graph explorer with filters, traversal, path view, inspector, source-backed edges. |
| `/ask` | Structured research copilot: ranked experts/companies, call sequence, what to listen for, gaps, risks, evidence rail. |
| `/reports` | Memo builder with templates, section statuses, citations, source register, markdown/export controls. |
| `/discover` | Discovery review queue for human approval of extracted candidates. |
| `/sources` | Source register audit table for ingestion and report provenance. |

## Design System

The UI follows the supplied `docs/mockups` reference system:

- Light institutional research terminal, not a marketing site.
- White global app chrome with compact navigation and command search.
- Pale gray workspace background with thin bordered panels.
- Dense 11-13px table typography and minimal 4-8px radii.
- Blue active states/actions, green confidence/access bars, amber/red risk states.
- Left workflow rails, central tables/canvases, right evidence inspectors.
- Citation markers and source registers are visible in every generated workflow.

See `docs/design-system.md` for implementation details.

## Data And Graph Model

Production demo data is static and sourced:

- `data/experts.json`
- `data/companies.json`
- `data/deals.json`

Current curated graph size after the June 2026 TowerBrook expansion:

- 146 experts
- 176 companies
- Clean Energy Advisory & Development: 69 experts / 85 companies
- Grid Infrastructure & Connection: 76 experts / 94 companies
- Smart Water Infrastructure & Analytics: 67 experts / 81 companies

The source register mirrors the production graph evidence surface with 182
registered public sources, including every source URL cited by expert and
company records. The discovery review queue now contains 15 structured
candidates: 1 approved prototype, 13 `needs_review` records, and 1
`needs_more_evidence` record.

Domain types live in `lib/types.ts`. Experts and companies are graph nodes.
Expert-company relationships are typed edges:

```text
founded, co-founded, led, partner, board, advised, invested-in,
acquired, banked, legal-counsel, served
```

Derived graph helpers live in `lib/data.ts`; base/session scoring lives in
`lib/score.ts`; TowerBrook-specific relationship scoring lives in
`lib/towerbrook.ts`.

## Deal Intelligence

Deals are first-class graph records. Each deal carries a structured rubric:

- Identity: name, theme, geography, status, type, announcement/completion date.
- Parties: target, buyer/investor, seller, management, board, co-investors.
- Transaction details: stake, valuation/economics when disclosed, financing,
  and not-disclosed markers where sources do not provide economics.
- Advisors and service providers: financial advisors, legal counsel, commercial
  diligence, technical diligence, tax/accounting and other advisors.
- Investment relevance: TowerBrook angle, surfaced companies, surfaced experts,
  comparable deals, diligence questions and follow-up searches.
- Evidence and confidence: every material fact has source IDs, evidence text,
  confidence and review status.

`/ingest` lets a user paste deal material or provide source metadata. The
server route extracts a draft deal rubric, flags missing facts, generates
targeted follow-up searches, and returns reviewable relationship candidates
without mutating production data.

## TowerBrook Lens

TowerBrook is now a first-class graph node and product lens, not just the
intended user of the workflow.

The graph includes TowerBrook, relevant infrastructure portfolio companies
(`JSM Group`, `Envevo`, `GMC Group`, `LiftWerx`), JSM transaction advisor
firms, and named TowerBrook / portfolio people sourced from official
TowerBrook pages. The UI exposes:

- A global TowerBrook lens on `/` with a toggle between `Worked with` and
  `Priority fit`.
- A theme-specific TowerBrook score and network lens on `/themes/[theme]`.
- A TowerBrook score column on expert and company tables.
- A direct-network toggle in theme expert tables for experts TowerBrook has
  worked with via TowerBrook, portfolio, or named advisor relationships.
- Profile-level TowerBrook score explanations for experts and companies.

Score interpretation:

```text
100          TowerBrook itself or direct TowerBrook team link
90-99        TowerBrook portfolio company / portfolio operator
80-89        Named TowerBrook transaction advisor
60-79        High-priority TowerBrook infrastructure fit
<60          Broader theme adjacency
```

## Session-Aware Ranking

Base expert priority still uses transparent graph scoring:

```text
(base role + relationship edges + recency + access + signals + cross-theme) * confidence
```

The Theme Command Center now adds session calibration:

- Objective: market structure, buyer pain, investable companies, deal process,
  founder introductions, red-team thesis.
- Preferred expert archetypes.
- Optimization target: balanced, source confidence, access quality, momentum,
  non-obvious names.

The table displays base score, session score, and fit components so ranking
changes are explainable.

## Research Copilot

`/api/ask` returns structured JSON rather than a single prose string:

- `ranked_experts`
- `ranked_companies`
- `call_sequence`
- `what_to_listen_for`
- `gaps`
- `risks`
- `sources_used`
- `confidence`
- `assumptions`
- `follow_up_actions`

The UI renders those blocks deterministically with an evidence inspector.
Without an API key, the endpoint returns the deterministic graph-grounded
baseline. With a key, the model may refine wording and sequencing but must keep
entity IDs, source IDs, names, URLs, and citations from the baseline.

## Reports

`/reports` builds evidence-backed memo objects, not one blob of prose.

Templates:

- Theme memo
- Expert call plan
- Company brief
- Red-team thesis
- IC appendix
- Deal brief
- Deal relationship map

Each section carries status, confidence, source count, citations, actions, and
export-ready markdown. Report data is generated by `lib/report.ts` from the
same expert/company graph and source register.

## Human-In-The-Loop Data Pipeline

The ingestion prototype proves the compounding path without mutating production
data:

```text
source register -> fetch/clean -> candidate JSON -> human review -> graph-ready output
```

Files:

- `data/source-register.json`
- `data/pipeline-clean.json`
- `data/candidates.json`
- `data/graph-ready.json`
- `scripts/data-pipeline.mjs`
- `docs/data-pipeline.md`

Commands:

```bash
node scripts/data-pipeline.mjs run --offline
node scripts/data-pipeline.mjs validate
node scripts/data-pipeline.mjs review candidate-id approved --reviewer analyst
pnpm ingest:validate
```

Only approved candidates are emitted to `data/graph-ready.json`. The script
does not edit `data/experts.json` or `data/companies.json`.

Current review queue coverage:

- 178 registered sources
- 15 structured review candidates
- 12 high-priority production graph sources seeded for `/discover`

## Verification

```bash
pnpm lint
pnpm exec tsc --noEmit --pretty false
pnpm build
node scripts/data-pipeline.mjs validate
pnpm ingest:validate
```

During final verification, these routes returned HTTP 200 from `pnpm dev`:

```text
/
/themes/grid-infrastructure
/experts/nick-boyle
/companies/lightsource-bp
/deals/bp-lightsource-bp-remaining-stake
/ingest
/graph
/ask
/reports
/discover
/sources
```

## Current Limitations

- No authentication or multi-user state.
- Shortlist, CRM sync, and contacted-state actions are UI prototypes.
- Live discovery requires an Anthropic key and still returns review candidates,
  not production graph mutations.
- User deal ingestion is deterministic and review-gated; pasted or URL-sourced
  facts are not persisted into production graph data in this demo build.
- Confidence is record-level and hand-curated; no learned source-quality model.
- No paid data provider, email sending, or production deployment automation.
