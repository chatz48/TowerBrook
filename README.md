# TowerBrook People Expert Engine

TowerBrook Expert Engine is a graph-backed people intelligence workflow for
thematic private equity sourcing.

The product helps an investment professional move from a theme to the people
most likely to reveal investable companies: founders, ex-founders, operators,
bankers, lawyers, diligence providers, advisors, peer funds and dealmakers.
Those expert relationships then drive target discovery, call prep, outreach,
relationship paths, evidence-backed memos and review-gated live research.

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

## What This Builds For TowerBrook

This is a people-first expert engine for thematic private-equity sourcing. It is
designed around the assignment brief:

- identify experts across the three themes: founders, ex-founders, operators,
  bankers, lawyers, diligence providers, advisors, peer funds and dealmakers;
- use those experts to derive interesting companies and new investment targets;
- give a time-constrained investment professional a usable interface for
  expert discovery, call preparation, company exploration and evidence review.

The key product decision is to make experts the primary object. Deals, sources,
companies and research jobs are supporting evidence that help answer:

```text
Who should TowerBrook call, why are they credible, what companies can they lead
us to, and what evidence supports that view?
```

The discovery method prioritizes private-equity transactions, especially
TowerBrook and peer-fund deals. Large and recent deals are used as the spine for
finding named founders, advisors, lenders, lawyers and service providers. A
separate founder-origination lane follows previously funded founders into new
companies, board roles, angel investments and referral paths.

## How This Helps Find New Deals

The product is deliberately built around the origination question:

```text
Which credible people should TowerBrook speak to this week, and what companies
or referrals could those conversations produce?
```

Workflow:

1. Start with one of the three themes.
2. Use major and recent PE transactions as the discovery spine.
3. Extract the named people around those transactions: founders, operators,
   advisors, lenders, lawyers, consultants, peer-fund dealmakers and board
   members.
4. Rank experts by theme relevance, PE evidence, recency, TowerBrook
   relationship path, access quality and source confidence.
5. Reverse-derive companies from the expert graph: current companies, former
   companies, portfolio companies, board seats, advisory clients, investments
   and referrals.
6. Generate call prep, outreach and memo outputs so the user can act on the
   expert pool immediately.

The strongest demo path is:

```text
/experts -> founder-led opportunity jobs -> expert profile -> call prep
         -> linked companies -> graph path -> report
```

This makes the product more than a searchable database. It is an expert-led
sourcing workflow where every new source, deal, expert call or review approval
can compound into more people and more company targets.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

The app can run as a static demo without credentials. Live discovery uses:

```bash
cp .env.example .env
# set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL,
# DEEPSEEK_API_KEY and KEIROLABS_API_KEY

pnpm origination:jobs
pnpm origination:dry-run:advisors
pnpm origination:run:advisors
```

Live discovery is intentionally review-gated:

```text
Keiro search/fetch -> DeepSeek extraction -> Supabase discovery_candidates
and entity_match_candidates -> human approval -> canonical people/company graph
```

The system does not mutate canonical experts from live web output until a
candidate is approved.

## Deploy To Vercel

Deploy the repository as two separate Vercel projects:

| Project | Root directory | Required production environment variables |
|---|---|---|
| Web | `apps/web` | `BACKEND_API_URL`, `BACKEND_API_TOKEN`; add Supabase, Anthropic, and OpenAI variables for the optional features that use them |
| Backend API | `apps/backend-api` | `BACKEND_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `KEIROLABS_API_KEY`, `CRON_SECRET` |

Deploy the Backend API first, then set its production URL as the web
project's `BACKEND_API_URL`. Set the same random
`BACKEND_API_TOKEN` on both projects so only the web project's server-side
routes can call the API. The authenticated `GET /jobs/process-next` endpoint is
called daily at midnight UTC by the Vercel Hobby-compatible cron schedule. Set
`CRON_SECRET`; Vercel sends it as the scheduled request's bearer token.

The FastAPI deployment runs as one Vercel Function, so each job must complete
within the function duration allowed by the Vercel plan. Supabase holds durable
job and graph state; do not rely on in-memory fallback state in production.

## AI Usage

AI is used in three places:

- DeepSeek extracts structured people, companies, relationships, facts and
  citations from searched/fetched sources.
- The research copilot and report surfaces synthesize graph-grounded call prep,
  diligence questions and memo sections.
- Deterministic scripts generate research queues and review artifacts from the
  curated source/deal graph.

AI output is never treated as final truth. It is stored as review-gated
candidates with source metadata, confidence and auditability.

## Generated Data And Scripts

Important generated artifacts:

- `apps/web/data/private-equity-deal-census-candidates.json`
- `apps/web/data/expert-first-pe-discovery-candidates.json`
- `apps/web/data/origination-research-jobs.json`
- `apps/web/data/government-investment-census-candidates.json`

Regeneration commands:

```bash
pnpm private-equity:census
pnpm expert:census
pnpm origination:jobs
pnpm government-investment:census
pnpm ingest:validate
```

The live advisor-gap and profile-completion passes produced review-gated
Supabase candidates for
Canaccord Genuity, Bridgepoint Credit, EY, PwC, Baringa, Roland Berger, Fried
Frank and Eight Advisory. Only the candidates with enough source-backed identity
evidence were promoted to the canonical graph; weaker leads remain in review.

## More Time

With more time, I would:

- add paid/private datasets such as PitchBook, LinkedIn Sales Navigator,
  MergerMarket and Preqin to improve completeness and identity resolution;
- add CRM/email/calendar overlays so TowerBrook can rank experts by warmest
  relationship path and prior internal interaction;
- build a call-notes ingestion loop so every expert call creates new expert,
  company and referral candidates;
- add a reviewer UI for approving, merging and rejecting Supabase discovery
  candidates directly from the product;
- add scheduled monitors for new PE deals and founder/company activity in the
  three themes.

## Product Flow

| Route | What it does |
|---|---|
| `/` | Command landing page with theme rows, global search, workflow shortcuts, and the TowerBrook lens. |
| `/themes/[theme]` | Theme Command Center: KPI strip, thesis, call list, clusters, blank spaces, TowerBrook score, session-aware expert ranking, companies, graph preview. |
| `/experts` | Main origination workspace: founder opportunity jobs, PE-derived expert candidates, advisor-person gaps, canonical expert ranking. |
| `/experts/[id]` | Expert profile with evidence, company/deal links, TowerBrook score, session call-prep rail, outreach and sourcing-call actions. |
| `/companies` | Target-company workspace: companies reverse-derived from named expert and PE-deal evidence. |
| `/companies/[id]` | Company profile with linked experts, TowerBrook score, evidence, sources, graph path action. |
| `/deals` | Deal Intelligence table with sourced parties, advisors, lawyers, surfaced experts/companies, fact completeness, and next actions. |
| `/deals/[id]` | Deal scorecard with fact rubric, evidence, parties, advisors/counsel, missing facts, follow-up searches, and related people/companies. |
| `/ingest` | User deal ingestion workflow for pasted deal materials, source URLs, company statements, advisor pages, and extracted document text. |
| `/graph` | Standalone graph explorer with filters, traversal, path view, inspector, source-backed edges. |
| `/ask` | Structured research copilot: ranked experts/companies, call sequence, what to listen for, gaps, risks, evidence rail. |
| `/reports` | Memo builder with templates, section statuses, citations, source register, markdown/export controls. |
| `/discover` | Live origination queue: Keiro search/fetch, DeepSeek extraction, Supabase review-gated candidates. |
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
- Live discovery requires KeiroLabs, DeepSeek and Supabase credentials and
  still returns review candidates, not production graph mutations.
- User deal ingestion is deterministic and review-gated; pasted or URL-sourced
  facts are not persisted into production graph data in this demo build.
- Confidence is record-level and hand-curated; no learned source-quality model.
- No paid data provider, email sending, or production deployment automation.
