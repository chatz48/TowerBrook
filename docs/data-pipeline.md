# Data Pipeline Prototype

This slice proves the ingestion path without letting automation write to production graph data.

```text
source register -> fetch/clean -> candidate JSON -> Discovery Review Queue -> graph-ready output
```

The deal-intelligence layer adds a parallel review-gated path:

```text
deal source / pasted material -> deal fact rubric -> missing-fact searches -> deal review -> graph-ready deal edges
```

The pipeline writes only prototype artifacts:

- `data/source-register.json`: curated source register for public evidence pages.
- `data/pipeline-clean.json`: cleaned source text cache.
- `data/candidates.json`: review queue records with source URL, evidence text, confidence, review status, proposed entities, and proposed relationships.
- `data/graph-ready.json`: approved-only graph output for downstream UI or import work.
- `data/deals.json`: sourced deal scorecards with parties, advisors, material fact evidence, missing facts, follow-up searches, surfaced experts, and surfaced companies.

It does not mutate `data/experts.json` or `data/companies.json`.

## Commands

Run the full deterministic demo:

```bash
node scripts/data-pipeline.mjs run --offline
```

Run individual stages:

```bash
node scripts/data-pipeline.mjs fetch-clean --offline
node scripts/data-pipeline.mjs build-candidates
node scripts/data-pipeline.mjs build-graph
node scripts/data-pipeline.mjs validate
pnpm ingest:validate
```

Omit `--offline` to fetch live pages with seed evidence as a fallback:

```bash
node scripts/data-pipeline.mjs fetch-clean
```

Update a human review decision:

```bash
node scripts/data-pipeline.mjs review candidate-swm-xylem-idrica approved --reviewer analyst --notes "Evidence checked."
node scripts/data-pipeline.mjs build-graph
```

Allowed statuses are `needs_review`, `approved`, `rejected`, `merge`, and `needs_more_evidence`.

## Review Queue Contract

Each candidate row is shaped for the terminal-style UI described in `docs/mockups` and `PRODUCT_UI_MOCKUPS.md`:

- Center table row: `candidate_id`, `terminal_ui.primary_row_label`, theme, confidence, duplicate warning, and review status.
- Right evidence inspector: source title, publisher, source URL, evidence snippets, confidence, and `found_in_clean_text`.
- Entity drawer: `proposed_entities`.
- Edge drawer: `proposed_relationships`.
- Action rail: accept, reject, merge, or request more evidence by updating `review.status`.

The `/discover` surface should read `data/candidates.json`. The `/sources` surface should read `data/source-register.json` and show ingestion status, source origin, expected entities, and extracted candidate count. The `/graph` surface can read `data/graph-ready.json` as a prototype import, but only approved candidates appear there.

The `/deals` and `/deals/[id]` surfaces read `data/deals.json`. The `/ingest`
surface posts pasted deal material to `/api/ingest`, which creates a draft
rubric response in memory and does not mutate production JSON. Reviewer-approved
deal facts would be the next import step before production graph mutation.

Current seeded queue coverage:

- 178 registered public sources.
- 15 structured review candidates.
- 12 high-priority production graph sources now have `prototype_extractions`
  that regenerate into `/discover`.
- Review status mix: 1 approved prototype, 13 `needs_review`, 1
  `needs_more_evidence`.
- 4 sourced deal records are validated by `scripts/validate-ingest.mjs`.

## Safety Rules

- Extraction output is a proposal, not final truth.
- `build-candidates` preserves existing human review decisions by `candidate_id`.
- `build-graph` includes only `review.status === "approved"`.
- The graph-ready file is an interchange artifact. A separate reviewed import step would be required before touching production JSON.

## Extending The Register

Add a source to `data/source-register.json` with:

- `source_id`, `theme`, `url`, `source_type`, `publisher`, `date`, `why_useful`, `expected_entities`, `expected_relationships`, `priority`.
- `source_origin`: `public`, `licensed`, `internal`, or `user-added`.
- `prototype_extractions`: one or more seed candidates until an LLM extraction stage is wired in.

Each prototype extraction must include source-backed evidence, confidence, review status, proposed entities, and proposed relationships.
