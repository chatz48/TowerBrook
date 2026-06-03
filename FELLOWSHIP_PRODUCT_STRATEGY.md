# TowerBrook AI Builder Fellowship: Product Strategy

## Product Thesis

Build a graph-backed people intelligence engine for thematic private equity sourcing.

The product should help a time-constrained investment professional answer:

- Who are the highest-value experts for this investment theme?
- Why are they credible?
- What companies, deals, funds, advisors, bankers, and lawyers are they connected to?
- Who should we call first?
- What should we ask them?
- Which companies should we investigate next?

The strongest version is not a static spreadsheet and not a generic chatbot. It is a prebuilt, source-backed expert and company graph with an agentic research layer that can generate call prep, company briefs, relationship paths, and theme memos on demand.

## Core User Journey

The product should follow the natural PE workflow:

```text
Theme -> Experts -> Calls -> Companies -> More Experts -> Better Thesis
```

The primary demo flow should be:

1. Select one of the three TowerBrook themes.
2. Review the highest-priority expert clusters and top experts.
3. Click into an expert to see why they matter, source evidence, and connected companies.
4. Generate call prep, outreach, questions, and "what to listen for."
5. Open a surfaced company and see why it may be investable.
6. Use the relationship graph to explain how people, companies, deals, and advisors connect.
7. Export a one-page brief or memo-style output.

## The Three Themes

- Clean Energy Advisory & Development
- Grid Infrastructure & Connection
- Smart Water Infrastructure & Analytics

## What The Tool Should Produce

For each theme, the tool should produce:

- Ranked experts
- Expert clusters and archetypes
- Companies surfaced through those experts
- Relevant deals, advisors, law firms, bankers, and peer funds
- Source-backed relationship evidence
- Investment hypotheses
- Suggested expert call plans
- Call prep and outreach drafts
- Company briefs and diligence questions
- Relationship paths between people, companies, and deals

## UX Principles

The interface should feel like an investment workflow, not a database query tool.

Every screen should push toward an action:

- Call this person
- Ask these questions
- Investigate this company
- Validate this thesis
- Red-team this market
- Export this memo

The main UX should be table/card-based and highly scannable. The graph should support the workflow, not dominate it.

## Key Product Views

### 1. Theme Command Center

The starting point for each investment theme.

Show:

- Top expert clusters
- Top call-worthy experts
- Companies surfaced through experts
- Recent market signals
- Relevant deal activity
- Key diligence questions
- Recommended next actions

Example actions:

- View top experts
- Build call plan
- Show emerging companies
- Generate theme memo
- Refresh latest signals

### 2. Expert Explorer

The core people intelligence view.

Each expert card should include:

- Name
- Current and former roles
- Expert type: founder, operator, banker, lawyer, advisor, investor, regulator, consultant
- Theme coverage
- Relevance score
- Momentum score
- Connected companies
- Connected deals
- Why they matter
- Source evidence
- Best use case

Useful best-use labels:

- Market mapping
- Customer diligence
- Company discovery
- Deal process intelligence
- Regulatory context
- Technical diligence
- Commercial diligence
- Founder referrals
- Competitive landscape
- Skeptical thesis testing

### 3. Company Explorer

This view should answer: which companies were surfaced by the expert network?

Each company should include:

- What it does
- Why it surfaced
- Which experts are connected to it
- Whether it looks like a target, advisory, competitor, strategic acquirer, or service provider
- Relevant transactions
- Momentum signals
- Investment angle
- Comparable companies
- Suggested diligence questions

The company list should not just be search results. Companies should be ranked by relationship evidence and investment relevance.

### 4. Relationship Graph

The underlying data should be modeled as a graph because the problem is relationship-driven.

Useful graph questions:

- How is this expert connected to this company?
- Which experts bridge two themes?
- Which companies are mentioned by multiple independent experts?
- Which advisors appear across multiple relevant deals?
- Which peer funds are active in this market?
- What is the relationship path from an expert to a target company?

The graph view should include:

- People
- Companies
- Funds
- Advisors
- Law firms
- Banks
- Deals
- Events
- Themes
- Sources

Edges should be labeled and source-backed:

- founded
- formerly led
- advises
- advised on
- invested in
- acquired
- board member of
- spoke at
- mentioned in
- competes with
- partners with
- belongs to theme
- source supports

### 5. Call Prep And Report Builder

This should be the "wow" workflow.

For an expert, generate:

- Background
- Why this person matters
- Relevant companies and deals
- Potential biases or conflicts
- Suggested outreach email
- Call agenda
- Questions to ask
- What to listen for
- Red flags
- Follow-up people and companies to request

For a company, generate:

- Business summary
- Investment angle
- Market tailwinds
- Relevant experts
- Relevant deals
- Comparable companies
- Diligence questions
- Risks and disconfirming evidence

For a theme, generate:

- Market map
- Expert call plan
- Company list
- Investment hypotheses
- Key risks
- Recommended next research steps

## Most Creative Features To Include

### Expert Call Plan

Do not just list experts. Recommend a call sequence.

Example:

```text
Phase 1: Market Orientation
- Former founder
- Sector consultant
- Industry conference speaker

Phase 2: Buyer Validation
- Utility procurement executive
- Former customer
- Implementation partner

Phase 3: Deal Intelligence
- Banker
- Lawyer
- Peer fund investor
```

This helps the investment team learn efficiently rather than calling experts at random.

### What To Listen For

For each call, show:

- What claim the expert can validate
- What answer would increase conviction
- What answer would reduce conviction
- Which companies to ask about
- Which people to ask for introductions to

This turns expert discovery into a diligence workflow.

### Expert Archetype Map

Classify experts by use case:

- Market mappers
- Company finders
- Customer validators
- Deal process insiders
- Regulatory translators
- Technical diligence experts
- Commercial diligence experts
- Introducers
- Skeptics

The "skeptics" category is important. PE teams need experts who can disprove weak theses.

### People-Surfaced Company Score

Rank companies based on expert-network evidence.

Signals:

- Multiple independent experts connected to the company
- Operators or founders mention the company
- The company appears in relevant deals, events, or press
- Advisors, bankers, or lawyers are connected to the company
- The company sits at the intersection of multiple subthemes

This creates a proprietary-sourcing feel.

### Relationship Path To Target

For any company, show how TowerBrook could learn about or reach it.

Example:

```text
Former utility executive -> spoke with Company A at industry event -> knows CEO
Law firm partner -> advised acquisition in same segment -> knows active banker
Peer fund partner -> invested in adjacent platform -> likely has market map
```

This makes the graph directly useful to investors.

### Blank Spaces View

Show where the research graph is weak.

Example:

```text
Strong coverage:
- Founders and operators
- Grid software vendors
- Recent transaction advisors

Weak coverage:
- Municipal utility buyers
- Regulatory experts
- European operators
- Infrastructure software bankers
```

This tells the user what research to do next.

### Red Team Thesis

For any theme or company, generate:

- Why the market may be less attractive than it appears
- Adoption barriers
- Buyer budget constraints
- Regulatory delays
- Margin pressure
- Integration risks
- Reasons PE may struggle to deploy capital
- Questions that could disconfirm the thesis

This is more valuable than a purely promotional AI summary.

### Call Notes To Graph

After an expert call, the user should be able to paste notes. The system extracts:

- New companies mentioned
- New people mentioned
- Claims
- Confidence level
- Follow-up questions
- Recommended next calls

This turns expert calls into reusable firm memory. It can be described as a production extension even if only lightly prototyped.

## Historical Data Vs Forward-Looking Signals

The system should combine both.

Recommended balance:

- 60% historical and factual evidence
- 40% current momentum and forward-looking interpretation

Historical evidence establishes credibility:

- Founder and operator roles
- Prior transactions
- Advisor, banker, and lawyer involvement
- Board roles
- Conference history
- Company affiliations
- Past investments

Forward-looking signals help prioritize investment work:

- Recent funding and M&A
- Recent hiring
- Recent partnerships
- Regulatory tailwinds
- Conference activity
- Customer wins
- Market pain points
- Recent expert commentary

Each expert and company should have two separate scores:

- Relevance score: historical/factual connection to the theme
- Momentum score: recent activity and forward-looking market signal

## GraphRAG Positioning

The product should be GraphRAG-inspired, but the business outcome should be the headline.

Recommended phrasing:

> A graph-backed expert discovery engine with AI-generated call prep and company briefs.

Technical explanation:

> The architecture borrows from GraphRAG: public sources are used to extract entities and relationships, those entities are normalized into a graph, and the app retrieves source-backed graph context before generating summaries, call prep, company briefs, and relationship explanations.

The LLM should not be the source of truth. The source documents and graph should be.

## Data Strategy

The data pipeline should pull relationship evidence, not just pages.

Pipeline:

```text
Source discovery
-> Page ingestion
-> Entity and relationship extraction
-> Deduplication
-> Graph construction
-> Scoring
-> App and agent workflows
```

Prioritize source types that expose people, companies, deals, and relationships:

- Company websites
- Transaction announcements
- Advisor and banker deal pages
- Law firm deal pages
- PE and infrastructure fund portfolio pages
- Conference and webinar speaker pages
- Trade press
- Regulatory and government materials
- Public filings and structured company databases where useful

Avoid relying on LinkedIn scraping. In production, the tool could integrate paid sources such as PitchBook, Capital IQ, Preqin, expert networks, CRM data, and internal call notes.

## Source Register

Before building a broad scraper, create a curated source register.

Suggested columns:

```text
source_id
theme
url
source_type
publisher
date
why_useful
expected_entities
expected_relationships
priority
```

Target source mix for the prototype:

```text
40% transaction and deal pages
25% conference and speaker pages
20% company pages
10% regulatory and market reports
5% trade press
```

## Graph Schema

Recommended node types:

- Person
- Company
- Fund
- Advisor
- LawFirm
- Bank
- Deal
- Event
- Source
- Theme

Recommended edge types:

- founded
- works_at
- formerly_worked_at
- led
- formerly_led
- board_member_of
- advised
- advised_on
- invested_in
- acquired
- acquired_by
- spoke_at
- mentioned_in
- competes_with
- partners_with
- customer_of
- belongs_to_theme
- source_supports

Every edge should include:

```json
{
  "edge_type": "advised_on",
  "confidence": 0.86,
  "evidence_text": "Short source-backed evidence snippet",
  "source_url": "https://example.com/source",
  "date": "2025-01-15"
}
```

## Agentic Workflows

The agent should be tool-driven and grounded in the graph.

Useful internal tools:

```text
search_graph(query)
get_entity_profile(entity_id)
find_experts_for_theme(theme_id)
find_connected_companies(person_id)
find_relationship_path(entity_a, entity_b)
retrieve_source_evidence(entity_or_edge_id)
refresh_web_signals(company_or_theme)
generate_call_prep(person_id)
generate_company_brief(company_id)
generate_theme_memo(theme_id)
red_team_thesis(entity_or_theme_id)
```

Example user prompts:

- Who should I call first for grid interconnection?
- Prepare me for a call with this expert.
- What companies are connected to these experts?
- Which smart water companies look most PE-relevant?
- Show me lawyers and bankers active in clean energy development deals.
- How is this expert connected to this company?
- Generate a one-page memo on this theme.
- Red-team this company as a PE target.

## MVP Scope

For the fellowship, keep the prototype focused but complete.

Target:

- Three themes
- 50-100 high-quality experts
- 75-150 companies
- 200-500 source pages
- 500-1,500 graph edges
- Source-backed expert and company profiles
- Theme dashboard
- Expert explorer
- Company explorer
- Relationship graph
- AI call prep
- AI company brief
- AI theme memo
- Red-team thesis workflow

The goal is not exhaustive coverage. The goal is a credible, repeatable engine with enough data to demonstrate the workflow.

## Technical Approach

Recommended prototype stack:

- Data ingestion: Python or Node scripts
- Search: Tavily, Exa, SerpAPI, Bing Search API, or manually curated seed URLs
- Crawling: requests and BeautifulSoup, with Playwright only where needed
- Extraction: LLM structured outputs
- Storage: JSON or SQLite
- Graph logic: NetworkX or equivalent
- Retrieval: graph queries plus optional vector search over source snippets
- Frontend: Next.js or Streamlit
- Reports: Markdown/HTML exports

Neo4j is not required for the prototype. SQLite/JSON plus graph utilities is easier for reviewers to run locally. Neo4j can be mentioned as a production option.

## Demo Story

The two-minute video should emphasize business value first.

Suggested structure:

1. Investment teams waste time manually mapping experts and companies for new themes.
2. This tool turns a theme into a source-backed network of experts, companies, deals, advisors, and funds.
3. Select a theme and see who to call first.
4. Open an expert and see why they matter, which companies they connect to, and the evidence.
5. Generate expert call prep: outreach, questions, what to listen for, and follow-up companies.
6. Open a surfaced company and view the investment angle, related experts, and diligence questions.
7. Show the relationship graph and explain that AI is grounded in source-backed graph context.
8. Close with how this becomes a firm memory system as calls and internal notes are added.

## With More Time

Strong extensions:

- Integrate internal CRM and relationship data
- Add paid data sources such as PitchBook, Capital IQ, Preqin, and expert networks
- Add call-note ingestion to continuously update the graph
- Add human review workflows for entity resolution and confidence scoring
- Add email/CRM export for call plans and outreach
- Add scheduled market monitoring for new deals, executive moves, and company signals
- Add richer relationship path ranking and bridge-expert detection
- Add permissioning and audit trails for sensitive internal data

## Success Criteria

The submission should feel like something a TowerBrook associate or VP could use on Monday morning.

It should demonstrate:

- Practical PE workflow understanding
- High-quality people and company discovery
- Source-backed relationship intelligence
- Graph-based reasoning
- AI used for extraction and synthesis, not unsupported claims
- Clear next actions for investors
- A polished, non-technical user experience

