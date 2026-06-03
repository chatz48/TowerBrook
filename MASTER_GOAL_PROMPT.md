# TowerBrook Expert Engine Master Goal Prompt

Use this prompt to orchestrate a full refactor and extension of the TowerBrook Expert Engine application.

---

## Master Objective

You are the lead coding agent for the TowerBrook Expert Engine project.

Your objective is to refactor and extend the existing application into a credible, high-quality demo of a workflow-driven **people expert engine** for thematic private equity sourcing.

The final product should help a time-constrained, non-technical TowerBrook investment professional go from an investment theme to:

1. A ranked pool of relevant experts.
2. A derived list of interesting companies.
3. An explainable relationship graph.
4. Structured research-copilot answers.
5. Expert call prep and outreach workflows.
6. Evidence-backed reports and memos.
7. A repeatable data ingestion and graph-building path.

The three investment themes are:

- Clean Energy Advisory & Development
- Grid Infrastructure & Connection
- Smart Water Infrastructure & Analytics

Core product principle:

> The LLM is not the database. The graph is the database. Sources are the evidence. The LLM is the extraction, synthesis, and workflow layer.

Core engineering principle:

> Code quality will be assessed. The codebase must be legible, traversable, and thoughtfully engineered. Prefer clear domain models, small focused components, explicit data flows, reusable primitives, and simple abstractions that match the existing codebase. Do not create a tangled demo with giant components, hidden state, brittle string parsing, or unclear scripts.

---

## Before Editing

Before making changes:

- Read `AGENTS.md`.
- Read `SPEC.md`, `FELLOWSHIP_PRODUCT_STRATEGY.md`, `PRODUCT_UI_MOCKUPS.md`, and `README.md`.
- Inspect the existing app, data model, graph logic, API routes, and components.
- Because this repo uses Next.js 16, read the relevant docs under `node_modules/next/dist/docs` before making framework-specific changes.
- Identify existing patterns and preserve them where they are good.

Use subagents only for disjoint work. The lead agent owns the architecture, integration, shared types, final polish, and verification. Do not let multiple agents edit the same files unless the lead explicitly coordinates it.

Shared files reserved for the lead unless explicitly delegated:

- `lib/types.ts`
- `lib/data.ts`
- `lib/themes.ts`
- `lib/score.ts`
- `app/components/ui.tsx`
- `app/globals.css`
- `package.json`
- `README.md`
- `SPEC.md`

---

## Phase 1: Product/UI Refactor

Refactor the application to visually and structurally align with `PRODUCT_UI_MOCKUPS.md` and `docs/mockups`.

Required surfaces:

- Theme Command Center
- Research Copilot
- Expert Explorer / Expert Profile
- Company Explorer / Company Profile
- Standalone Graph Explorer
- Reports / Memo Builder
- Discovery Review Queue or a clear prototype path for it

The UI should feel like an institutional research terminal:

- Dense but readable.
- Table-forward.
- Citation-forward.
- Light theme.
- No marketing-site framing.
- No decorative filler.
- No generic chatbot wall of prose.

Replace card-heavy surfaces where appropriate with dense, sortable, evidence-backed tables.

---

## Phase 2: Session-Aware Ranking

Add a session calibration pattern.

The app should ask the user:

- What are you trying to learn?
- Which expert types matter most?
- What should we optimize for?

Example objectives:

- Understand market structure.
- Validate buyer pain.
- Find investable companies.
- Understand deal process.
- Find founder introductions.
- Red-team the thesis.

Expert ranking should support:

- Base priority score.
- Session-specific priority score.
- Visible explanation of score components.

Ranking should consider:

- Theme relevance.
- Relationship strength.
- Access quality.
- Momentum.
- Source confidence.
- Non-obviousness.
- Selected session objective.
- Expert archetype fit.
- Geography fit where available.

---

## Phase 3: Graph Explorer

Build or refactor toward a standalone `/graph` route and reusable graph components.

The graph should support:

- Click node -> center node.
- Reveal direct connections.
- Click neighbor -> traverse to that node.
- Back / reset.
- Relationship labels.
- Source-backed edge metadata where available.
- Selected-node inspector.
- Explicit profile navigation.

The graph should not be decorative network noise. It should answer:

- How is this expert connected to this company?
- Which experts bridge themes?
- Which companies have multiple independent expert links?
- Which advisors, banks, lawyers, funds, or deals recur?
- What path explains why this company surfaced?

---

## Phase 4: Research Copilot

Refactor `/ask` into a structured research workspace, not a generic chat page.

The copilot should render structured blocks such as:

- Ranked experts.
- Ranked companies.
- Suggested call sequence.
- What to listen for.
- Gaps / blank spaces.
- Red-team risks.
- Source evidence.

The API should prefer structured JSON outputs that the UI renders into deterministic components. If no API key is present, preserve deterministic fallbacks.

Every answer should expose:

- Sources used.
- Confidence.
- Assumptions.
- Follow-up actions.

Useful actions:

- Add to shortlist.
- Build call plan.
- Open graph path.
- Export answer.
- Ask follow-up.

---

## Phase 5: Reports / Memo Builder

Create an evidence-backed report surface.

Reports should be assembled section-by-section, not as one blob of prose.

Report templates:

- Theme memo.
- Expert call plan.
- Company brief.
- Red-team thesis.
- IC appendix.

Each section should show:

- Generated status.
- Confidence.
- Citations.
- Source count.
- Regenerate action.
- Open evidence action.

Exports can be lightweight for the demo:

- Copy markdown.
- Print-friendly view.
- Downloadable markdown or HTML if feasible.

Include a source register table for reports.

---

## Phase 6: Data Ingestion And Graph Building

Create a repeatable pipeline that proves how the graph would compound.

Do not build an autonomous scraper that writes directly into production data.

Build toward:

```text
source register -> fetch/clean -> LLM extraction -> candidate JSON -> human review queue -> graph build -> app-ready data
```

Source types:

- Company websites.
- Transaction announcements.
- Advisor/banker deal pages.
- Law firm deal pages.
- Conference and webinar speaker pages.
- Trade press.
- Regulatory materials.
- Public filings where useful.
- Expert transcripts or internal notes as future source types.

Data outputs should support:

- Extracted people.
- Extracted companies.
- Extracted funds.
- Extracted advisors.
- Extracted law firms.
- Extracted banks.
- Extracted deals.
- Extracted events.
- Extracted sources.
- Proposed relationships.
- Confidence.
- Evidence snippets.
- Source URLs.
- Review status.

The ingestion system should produce candidates, not final truth. A human review step should accept, reject, or merge candidates.

---

## Phase 7: LLM Usage

Use LLMs deliberately.

Use LLMs for:

- Extracting structured entities and relationships from provided documents.
- Generating candidate experts and companies from explicit source material.
- Deduplication suggestions.
- Grounded synthesis.
- Call prep.
- Outreach drafts.
- Memo sections.
- Red-team analysis.

Use LLM web search only as candidate discovery, not as truth. Web-search outputs must include source URLs, evidence snippets, confidence, and review status before entering the graph.

Do not allow unsupported LLM claims into expert, company, or graph records.

---

## Subagent Plan

Use subagents only where work is independent and file ownership is clear.

### Subagent 1: UI Command Center

Own:

- Theme Command Center refactor.
- Dense expert/company tables.
- Session calibration UI components.
- Visual alignment with mockups.

Suggested files:

- `app/themes/[theme]/page.tsx`
- `app/components/*` table/calibration components

Do not edit shared model files unless asked.

### Subagent 2: Graph Explorer

Own:

- Standalone `/graph` route.
- Reusable graph explorer components.
- Node traversal behavior.
- Selected-node inspector.

Suggested files:

- `app/graph/page.tsx`
- `app/components/ThemeGraph.tsx` or new graph components

### Subagent 3: Research Copilot

Own:

- `/ask` page refactor.
- Structured answer rendering.
- Evidence rail.
- Fallback behavior.

Suggested files:

- `app/ask/page.tsx`
- `app/api/ask/route.ts`
- `app/components/copilot/*`

### Subagent 4: Reports

Own:

- `/reports` route.
- Report templates.
- Sectioned memo UI.
- Source register display.
- Export-ready markdown view.

Suggested files:

- `app/reports/page.tsx`
- `app/components/reports/*`
- `lib/report.ts` if needed

### Subagent 5: Data Pipeline

Own:

- Source register format.
- Ingestion/extraction candidate scripts.
- Graph build scripts.
- Documentation for pipeline.

Suggested files:

- `scripts/*`
- `data/source-register.*`
- `data/candidates.*`
- `docs/data-pipeline.md`

### Lead Agent Responsibilities

The lead agent must:

- Own shared types and scoring.
- Integrate subagent outputs.
- Resolve conflicts.
- Ensure consistent component patterns.
- Run lint/build.
- Verify core workflow.
- Update README/SPEC.

---

## Acceptance Criteria

### Product

- A user can select a theme and immediately see a partner-ready command center.
- A user can calibrate what kind of expert matters for their session.
- Expert rankings visibly change or explain session fit.
- A user can open an expert and generate structured call prep.
- A user can traverse a graph from expert to company to related expert.
- A user can ask a research question and receive structured, cited output.
- A user can assemble or view an evidence-backed report/memo.
- Sources and confidence are visible throughout.

### Data

- Existing curated data still works.
- New ingestion scripts produce reviewable candidates rather than silently mutating final data.
- Graph-building logic remains deterministic.
- Candidate records include source URL, evidence text, confidence, and review status.

### Engineering

- TypeScript types are clear and domain-specific.
- Components are small and named by product function.
- Shared UI primitives are reused.
- API routes are grounded and have deterministic fallbacks.
- No giant monolithic page components unless unavoidable.
- No hidden magic string parsing where structured data is feasible.
- No unnecessary heavy dependencies.
- No broken routes.
- No client-side exposure of API keys.
- Lint and build pass.

### Documentation

- README explains the product flow.
- SPEC reflects shipped surfaces and limitations.
- Data pipeline docs explain how source register, extraction, candidates, review, and graph build work.

---

## Do Not Build In This Pass

Do not build:

- Full authentication.
- Real CRM integration.
- Paid data provider integrations.
- Autonomous scraping that mutates production data.
- Neo4j or heavy graph infrastructure unless absolutely justified.
- Full email sending.
- Complex permissions.
- Production deployment automation.

The goal is a credible path to production, not all of production at once.

---

## Final Verification

Run:

```bash
pnpm lint
pnpm build
pnpm dev
```

Verify the core demo flow:

1. Home -> theme.
2. Theme -> session calibration.
3. Theme -> expert profile.
4. Expert -> call prep.
5. Theme or `/graph` -> graph traversal.
6. `/ask` -> structured answer.
7. `/reports` -> memo/report view.

If browser tooling is available, use it to inspect desktop and mobile layouts.

Report:

- What was implemented.
- What remains incomplete.
- Known risks.
- Verification results.

