# People Expert Engine: Search And Discovery Strategy

## Executive Decision

Do not build this as a broad web-search agent that tries to produce a definitive
list in one pass.

Build it as a continuously improving, evidence-backed graph expansion system:

```text
theme ontology
  -> major and recent investment census
  -> systematic source-lane discovery around priority deals
  -> deal, event, and project extraction
  -> people and company candidates
  -> identity resolution and evidence review
  -> graph expansion from every accepted deal and actor
  -> internal relationship overlay
  -> expert outreach and call-derived referrals
  -> monitoring and refresh
```

The primary definition of completeness should be:

> Complete coverage of the major players and material investments in each
> theme, with especially deep coverage of the largest and most recent
> investments and the people involved in them.

The engine should not claim to identify "all experts." That is not provable for
a hidden and changing population. It should instead report:

- which major and recent investments have been covered;
- whether all material parties, advisors, and named people have been identified;
- which parts of the market and expert universe it has covered;
- which independent discovery methods found each person;
- where discovery has reached saturation;
- which important coverage cells remain weak;
- why each person is relevant, reachable, and useful for the current objective.

The differentiator is not the number of search results. It is the combination
of a deal-led market map, systematic coverage, non-obvious source discovery,
firmwide relationship intelligence, strong identity resolution, and a workflow
that compounds after every call.

## Experts Are The Primary Product Object

Deals are discovery anchors and evidence containers. Experts are the primary
output, ranking object, interaction surface, and expansion node. Companies are
then reverse-derived from the expert graph.

```text
priority PE deal
  -> named founders, operators, dealmakers, bankers, lawyers, and providers
  -> verified person-to-deal and person-to-company roles
  -> ranked expert pool and missing-named-person research queue
  -> companies reverse-derived from expert connections
  -> calls, introductions, referrals, and new company mentions
  -> expanded expert graph
```

Every accepted deal must therefore produce:

- a named-person candidate for every disclosed participant;
- an expert-search gap for every advisor, lender, diligence provider, or other
  organization where the named individual is still unknown;
- typed evidence connecting each expert to the deal and relevant companies;
- follow-up searches for employment history, current role, specialties,
  availability, conflicts, and TowerBrook relationship paths;
- a reverse-derived company queue ranked by expert density and expert quality.

A company must not enter the expert-derived company queue without at least one
named expert connection. Organizations evidenced on a deal but lacking a named
person remain in the expert-search-gap queue until that person is identified.

### Founder-Led Opportunity Origination

Founders and ex-founders who have already raised institutional capital, sold a
company, or partnered with private equity should be treated as recurring
origination nodes rather than historical deal participants.

For each previously funded founder, continuously research:

- new companies founded or being incubated;
- angel investments, venture portfolios, and board roles;
- advisory work and founder referrals;
- former colleagues and management teams starting new platforms;
- views on under-served market segments and likely consolidation targets;
- availability for calls, introductions, chair roles, or operating partnerships.

The live execution path is:

```text
structured origination job
  -> Keiro search and source fetch
  -> DeepSeek person, role, relationship, and opportunity extraction
  -> Supabase discovery_candidates and entity_match_candidates
  -> analyst identity and evidence review
  -> canonical expert graph
  -> new-company and referral expansion jobs
```

Keiro, DeepSeek, and Supabase must all be configured before live jobs execute.
Without all three providers, the system may generate and inspect dry-run queries
but must not claim that live discovery occurred.

## Deal-Led Definition Of Completeness

The engine should use investments as the spine of the graph.

```text
major/recent investment
  -> target, buyer, seller, investors, lenders, and co-investors
  -> founders, management, board, and operating leaders
  -> bankers, lawyers, commercial/technical advisors, and other providers
  -> adjacent and comparable investments
  -> repeated investors, acquirers, advisors, and experts
  -> major-player and expert rankings
```

This is a stronger discovery method than searching directly for experts because
material investments provide concrete evidence of who is active, influential,
and trusted in a theme.

### Make Private Equity Deals The Primary Discovery Lane

The engine should prioritize transactions in this order:

1. TowerBrook investments, exits, add-ons, and active portfolio-company
   acquisition programs;
2. peer private-equity and infrastructure-fund platform investments, especially
   control transactions and secondary buyouts;
3. sponsor-backed add-ons, exits, recapitalizations, and continuation
   transactions;
4. strategic M&A that provides a valuation benchmark or reveals a likely exit
   route;
5. government and public-capital events as a separate supporting lane.

TowerBrook deals are Tier 0. They should always receive the deepest research,
even when the transaction value is undisclosed or the target is smaller than a
peer transaction. For every TowerBrook deal, the engine should identify:

- TowerBrook deal leads, investment-committee participants, portfolio team, and
  board representatives;
- founders, sellers, continuing shareholders, management, and relevant alumni;
- buy-side and sell-side bankers, lawyers, lenders, diligence providers,
  insurance advisors, and specialist consultants;
- post-deal value-creation priorities, add-on targets, and commercial partners;
- existing TowerBrook relationship paths and the strongest route to each
  external expert.

Peer-fund deals should be selected for their ability to reveal major players,
repeat dealmakers, valuation evidence, and credible comparables. Pure strategic
M&A should not displace a relevant PE-backed transaction in the primary
research queue.

### Treat Government And Public Capital As A Separate Investment Lane

Government and regulator-backed capital should be a first-class discovery
source. It often creates the market before private transactions occur and
reveals the utilities, developers, delivery partners, technical providers,
advisors, and program leaders most likely to become important.

The public-capital census should cover:

- direct public equity and state-owned-company investments;
- grants and innovation-fund awards;
- public loans, loan guarantees, and development-bank financing;
- regulated capital allowances and price-control programs;
- procurement and framework awards;
- public-private partnerships and concessions;
- subsidy contracts, tax-credit allocations, and contracts for difference;
- sovereign wealth fund and policy-bank investments.

Keep this lane separate from private M&A. A £104 billion regulated expenditure
allowance, a £610 million public loan, a £43 million grant competition, and a
£150 million equity-investment option are not economically comparable.

Every public-capital event must record:

```text
capital mechanism
amount basis
public amount and private capital mobilized
jurisdiction and sponsor agency
recipient and delivery partners
status and delivery certainty
program envelope versus project-level award
named public, recipient, and delivery leaders
```

Statuses must be explicit:

```text
announced/open
selected
offered
authorized
awarded
contracted
financial close
in delivery
completed/cancelled
```

Budget authorization or selection is not the same as a signed award, financial
close, money spent, or successful delivery. Keep a separate delivery-certainty
score so a large announced program does not automatically outrank a smaller
project that has reached financial close and exposed an actionable delivery
team.

### What Counts As A Priority Investment

Use three overlapping priority sets.

#### Tier 1: Largest and landmark investments

- largest disclosed or credibly estimated transactions in the theme;
- control investments, platform acquisitions, take-privates, and major exits;
- investments that created or validated an important category;
- investments involving a leading strategic acquirer or financial sponsor;
- transactions that materially changed ownership, market structure, or scale.

These investments retain high importance even as they age.

#### Tier 2: Recent investments

- all relevant investments from the last 24 months above a minimum materiality
  threshold;
- announced and pending transactions;
- recent growth investments, acquisitions, refinancings, and platform add-ons;
- investments involving new entrants or repeated activity from major players.

Recent activity should be weighted heavily because it identifies current
decision-makers, active advisors, live valuation signals, and people who are
more likely to be reachable and relevant now.

#### Tier 3: Pattern-building investments

- smaller or older investments that reveal a repeat investor, acquirer,
  advisor, or consolidation strategy;
- investments in emerging subthemes;
- investments that reveal useful comparable companies or important operators;
- undisclosed transactions with strong strategic relevance.

These should not receive the same research depth as Tier 1 and Tier 2 unless
they connect to a major player or close an important coverage gap.

### Separate Structural Importance From Current Activity

Every investment should have two scores.

```text
structural materiality score =
  transaction size
  + strategic significance
  + theme relevance
  + ownership/control significance
  + market-structure impact
  + importance of participating actors

current activity score =
  recency
  + announced/pending status
  + actor activity momentum
  + follow-on investment signals
  + current market relevance
```

Maintain both scores rather than combining everything into one opaque rank.
This prevents a small recent add-on from outranking a landmark platform
investment while still ensuring that the product emphasizes what is happening
now.

An initial scoring calibration can be:

```text
structural materiality, 0-100:
  30 value percentile or credible value band
  20 theme relevance
  15 control/platform significance
  15 strategic or market-structure significance
  10 importance of participating actors
  10 evidence of follow-on impact

current activity, 0-100:
  40 recency
  15 announced/pending or recently completed status
  20 recent follow-on investments or acquisitions
  15 recent activity by the same major actors
  10 fresh financing, leadership, or strategic signals
```

Suggested recency contribution:

```text
announced/completed <= 6 months:  40
announced/completed <= 12 months: 32
announced/completed <= 24 months: 22
announced/completed <= 36 months: 10
older:                              0
```

Use separate "Largest investments" and "Recent investment activity" views.
For the default research queue, a reasonable starting blend is:

```text
45% structural materiality
40% current activity
15% value of missing facts or participants
```

These weights should be calibrated against investment-team decisions rather
than treated as permanent.

### Priority-Investment Research Rubric

For every Tier 1 and Tier 2 investment, capture:

- target, buyer, seller, investor, co-investor, and existing shareholder;
- transaction type, announcement date, completion date, status, and geography;
- disclosed value, stake, financing, valuation, and credible value band where
  exact figures are not disclosed;
- strategic rationale and investment thesis;
- founders, management, board members, and relevant operating leaders;
- individual dealmakers at the investor, buyer, or seller;
- financial advisors and the named bankers involved;
- legal counsel and the named lawyers involved;
- commercial, technical, environmental, accounting, tax, engineering, and
  other service providers;
- lenders, debt advisors, and financing providers where relevant;
- source evidence, confidence, contradictions, and explicitly undisclosed facts;
- related companies, comparable investments, and follow-on activity;
- TowerBrook relationship paths to every important organization and person.

The system should distinguish:

```text
verified fact
credible estimate or value band
not publicly disclosed
not yet researched
conflicting
```

It should never interpret "not found" as "not involved."

### Deriving Major Players From Investments

Major players should be determined primarily from their weighted participation
in material investments, not web visibility.

Maintain separate leaderboards for:

- leading targets and scaled platforms;
- most active financial sponsors and peer-fund dealmakers;
- most active strategic acquirers;
- repeat sellers and company builders;
- leading banks and individual bankers;
- leading law firms and individual lawyers;
- repeat commercial, technical, engineering, and diligence providers;
- founders and operators associated with multiple important outcomes.

A player score should consider:

```text
sum of role-weighted investment materiality
  + recent activity
  + number of independent priority investments
  + repeated collaboration with other major players
  + theme concentration
  + source confidence
```

One very large investment can establish importance. Repeated involvement across
multiple material investments establishes persistent market influence.

## What The Best Systems Actually Do

The strongest CRM and private-market systems do not solve this through better
manual CRM entry or a single data provider.

### Relationship-intelligence CRMs

Affinity and Intapp DealCloud use a similar operating model:

- passively capture email and calendar activity;
- create and update people and company records automatically;
- infer who knows whom;
- score relationship strength using interaction type, volume, recency, and
  momentum;
- enrich records from external providers;
- surface warm paths and trigger next actions;
- retain governance, privacy, and audit controls.

The lesson for TowerBrook is that internal relationship exhaust is a discovery
source, not just a field on a contact record. A less-public expert who exchanged
emails with three TowerBrook colleagues, advised a portfolio company, or
attended a relevant meeting may be more actionable than a famous industry CEO.

### Expert networks

Expert networks combine:

- an existing expert database;
- project-specific custom recruiting;
- exact screening questions tied to the research objective;
- identity, employment, conflict, and eligibility checks;
- structured feedback after each engagement.

The lesson is that public-web discovery alone is insufficient. The engine needs
an active-recruiting lane and should treat every expert call as a new discovery
event. The highest-value question at the end of a call is often:

> Who are the two or three people who understand this better than anyone else?

### Private-market discovery platforms

Private-market platforms combine:

- a broad, structured company universe;
- proprietary and public data;
- transaction, ownership, executive, growth, and event signals;
- semantic search and filters;
- analyst verification;
- watchlists and ongoing monitoring.

The lesson is to construct a candidate universe first and rank second. Searching
only for "experts" misses people whose expertise becomes visible through a
project, procurement, committee, transaction, or company edge.

## Current State And Principal Gaps

The repository has a good foundation:

- graph-first product model;
- typed expert-company relationships;
- source-backed extraction;
- review concepts;
- source, entity, and relationship embeddings;
- user-facing call prep, outreach, graph, and report workflows.

The current live discovery implementation is not yet capable of systematic
coverage:

1. It does not begin from a comprehensive census of major and recent
   investments.
2. It runs three fixed generic queries per theme.
3. It discovers documents, then extracts entities only from each document in
   isolation.
4. It does not generate follow-up queries from accepted investments, companies,
   people, projects, or missing coverage cells.
5. It does not distinguish source lanes or measure source-lane coverage.
6. It writes extracted entities and relationships directly into the graph,
   despite the product's review-gated principle.
7. It resolves identities primarily from a LinkedIn/website URL or normalized
   name, which is insufficient for common names, aliases, job moves, legal
   entities, and subsidiaries.
8. Expert and company scores are calculated before graph density is available,
   so the backend currently passes the default relationship/expert counts of
   zero.
9. Company ranking counts linked experts but not source independence, expert
   quality, relationship type, recency, or negative evidence.
10. The ontology lacks projects/assets, procurements, committees, memberships,
   employment history, and person-level deal participation. These are often the
   best paths to obscure experts.
11. Live discovery writes to the Supabase graph, while the main product views
    still rank static JSON. Until there is one reviewed canonical graph and a
    defined publication path, newly discovered intelligence may not appear in
    the product and the two datasets can diverge.

Current dataset diagnostics also reveal the coverage bias:

- 182 registered public sources, including 75 transaction announcements;
- only one registered regulatory-market signal;
- no explicit procurement-award, project-document, standards-committee, or
  call-referral source lanes;
- 98 of 146 expert records have only one source;
- only three service-provider experts are represented;
- 31 of 176 companies have no expert edge;
- the static product dataset has 146 experts, but only four structured deals,
  which is insufficient for a deal-led view of major players.

This is a credible curated demo, but not yet a repeatable completeness engine.

## Define The Search Space Before Searching

Each theme should be represented as a coverage cube:

```text
theme
  x priority investment tier
  x subtheme/value-chain segment
  x investment/actor role
  x geography
  x evidence/source lane
  x time period
```

Example investment and actor roles:

- target, buyer, seller, investor, co-investor, or lender;
- founder or former founder;
- senior operator;
- customer/procurement leader;
- technical practitioner;
- independent advisor or board member;
- banker;
- lawyer;
- commercial, technical, environmental, tax, or engineering service provider;
- peer-fund investor or dealmaker;
- regulator or former regulator;
- academic, standards contributor, or trade-association leader;
- informed skeptic.

Example time periods:

- current;
- last 24 months;
- 2-5 years;
- 5-10 years;
- historical category builders.

Without this cube, discovery will overproduce visible founders, lawyers, and
transaction participants while underproducing customer-side operators,
implementation specialists, procurement leaders, and quiet technical experts.

The first coverage question should be: "Have we identified and researched the
material investments?" The second should be: "Have we identified the important
people and companies around each of them?"

## Theme Ontology

The three top-level themes are too broad to drive complete discovery. Each
requires a controlled subtheme and vocabulary map containing synonyms,
abbreviations, adjacent terms, role vocabulary, and exclusion terms.

### Clean Energy Advisory & Development

Suggested subthemes:

- project origination and site control;
- development, planning, and permitting;
- grid connection and interconnection;
- PPA, offtake, route-to-market, and power marketing;
- project finance, tax, and capital structuring;
- technical, environmental, and commercial diligence;
- EPC, owner engineering, and asset management;
- solar, wind, BESS, EV infrastructure, and hybrid assets;
- renewable M&A and platform development;
- energy-market analytics and optimization.

### Grid Infrastructure & Connection

Suggested subthemes:

- transmission and distribution development;
- connection applications and queue management;
- grid studies and power-system modelling;
- substations, protection, control, and engineering;
- DERMS, ANM, flexibility, and virtual power plants;
- grid monitoring, sensors, and asset analytics;
- congestion, curtailment, and constraint management;
- utility procurement and delivery partners;
- regulatory planning and price-control programs;
- interconnectors and major capital projects.

### Smart Water Infrastructure & Analytics

Suggested subthemes:

- leakage and pressure management;
- smart metering and consumption analytics;
- sewer and wastewater network monitoring;
- asset condition, predictive maintenance, and digital twins;
- water quality sensing and analytics;
- flood, stormwater, and climate resilience;
- utility operations software;
- industrial water optimization and reuse;
- procurement, pilots, and innovation partnerships;
- AMP planning, regulation, and capital delivery.

## Discovery Architecture

### Loop 0: Major And Recent Investment Census

Start each theme with two linked but separately comparable investment censuses
rather than a people search:

- private transactions and financings;
- government, regulator, and public-capital events.

Build the initial universe from:

- licensed transaction databases where available;
- investor, acquirer, target, and seller announcements;
- regulatory filings and public-company disclosures;
- bank, law-firm, and advisor transaction pages;
- financing and lender announcements;
- credible trade press and transaction roundups;
- existing TowerBrook CRM, portfolio, and deal-team knowledge.

Normalize every candidate investment, deduplicate it, assign it to the theme
ontology, and calculate structural materiality and current activity.

The census should cover:

- at least the last 7-10 years for landmark and largest investments;
- every relevant announced, pending, and completed investment from the last
  24 months;
- older or smaller transactions linked to a major player or important emerging
  pattern.

The output is a priority-investment queue. Tier 1 and Tier 2 investments receive
deep research; Tier 3 investments receive lighter extraction until their
importance increases.

The private-equity queue should use four explicit lanes:

```text
towerbrook
peer-platform
peer-add-on
peer-exit
```

TowerBrook deals always display first. Within each lane, rank candidates using
TowerBrook or peer fit, theme relevance, platform and control significance,
recent activity, likely expert and advisor yield, and missing-information value.

Public-capital programs should create child research jobs for every material
recipient, project, procurement, consortium, and delivery partner. This is the
step that converts a headline government program into investable-company and
expert discovery.

### Loop 1: Deal-Centric Source-Lane Discovery

Run searches against defined source lanes for each priority investment, not just
general web results.

| Source lane | What it reveals | Why it finds non-obvious experts |
|---|---|---|
| Buyer, seller, investor, and target announcements | Parties, rationale, management, dealmakers | Establishes the investment and the principal actors |
| Bank, law-firm, lender, and advisor tombstones | Named transaction teams and exact roles | Reveals repeat advisors and lower-publicity experts |
| Regulatory filings and investor materials | Value, stake, financing, governance, timing | Fills material facts and identifies decision-makers |
| Company leadership and alumni pages | Founders, operators, board members | Captures people without broad press coverage |
| Regulatory filings, consultations, and submissions | Operators, advisors, technical specialists | Contributors are selected for substance, not publicity |
| Project and planning documents | Developers, consultants, engineers, counsel | Major projects list delivery teams and named authors |
| Procurement notices and contract awards | Buyers, vendors, implementation partners | Reveals who actually buys and delivers solutions |
| Innovation grants, pilots, and consortium lists | Emerging companies, utility sponsors, academics | Surfaces pre-scale and cross-sector participants |
| Conference programs, webinars, podcasts, and panels | Practitioners and category translators | Good source for specialists and former operators |
| Standards bodies, trade groups, and committees | Deep technical experts and network hubs | Often low publicity but high field credibility |
| Patents, papers, and technical reports | Inventors and domain experts | Finds technical originators |
| Corporate registers and director histories | Founders, directors, legal entities, alumni | Resolves company lineage and less-visible people |
| Portfolio, fund, and lender pages | Peer investors and dealmakers | Reveals repeated investment patterns |
| Internal emails, calendars, notes, and CRM | Reachable experts and warm paths | Converts TowerBrook's network into proprietary data |
| Expert-call referrals | Trusted, highly specific experts | Compounds the graph beyond public sources |

Search queries should be generated from structured templates:

```text
priority investment x missing material fact x source lane
major player x role x source lane x date
subtheme x archetype x source lane x geography x date
```

Examples:

```text
"Target Company" acquisition financial advisor
"Target Company" acquisition legal counsel
"Investor Name" "Target Company" partner
"Target Company" transaction value OR consideration
"active network management" "contract award" UK
"water leakage" innovation project partners
"solar development" planning application consultant
"grid connection" technical adviser transaction
site:law-firm-domain.example grid acquisition partner
site:company-domain.example leadership OR board OR team
```

The output of this stage is a ranked source queue, not final entities.

### Loop 2: Investment And Event-First Extraction

Extract investments and their participants before deciding who is an expert.

Important event types:

- investment announced, completed, refinanced, exited, or failed;
- advisor, counsel, lender, or diligence provider engaged;
- founded, joined, left, promoted, retired, or appointed;
- project awarded, delivered, delayed, approved, or connected;
- company acquired, financed, invested in, or sold;
- advisor/counsel/technical provider engaged;
- procurement issued or contract awarded;
- pilot launched or innovation funding awarded;
- spoke, authored, chaired, or served on a committee;
- regulator decision or consultation contribution;
- TowerBrook interaction, call, meeting, or introduction.

Why event-first works:

- expertise is demonstrated by participation in relevant work;
- the same event reveals people, companies, relationships, and dates;
- event evidence supports recency and role-at-the-time;
- events create follow-up search anchors.

The highest-priority extraction question is:

> Who played a material role in this investment, what exactly did they do, and
> where else have they done it?

### Loop 3: Graph Snowball Expansion

Every accepted node and event should create targeted follow-up jobs.

For a company:

- current and former leadership;
- founders and directors;
- board members and investors;
- named customers and delivery partners;
- acquisitions and exits;
- advisors on relevant transactions;
- conference appearances and technical authors;
- competitors and comparable companies.

For a person:

- employment history and aliases;
- prior companies and board seats;
- deals, projects, and committees;
- co-founders and repeated collaborators;
- people who cite, introduce, or appear with them;
- internal TowerBrook relationship paths.

For an investment or project:

- all parties;
- named individuals at each party;
- banker, lawyer, diligence, engineering, and other advisor teams;
- financing providers;
- management and board participants;
- comparable deals/projects.

Continue expansion while the marginal yield of high-quality new entities remains
above a threshold. Stop low-yield paths, not the entire theme.

Expansion priority should be proportional to the originating investment's
structural materiality and current activity. A Tier 1 investment should create
deeper and broader follow-up jobs than a Tier 3 investment.

### Loop 4: Relationship-Intelligence Overlay

With appropriate permissions and governance, ingest metadata from:

- TowerBrook email and calendar;
- existing CRM;
- portfolio-company and advisor interactions;
- call notes and transcripts;
- user-created shortlists and reports.

Create evidence-backed interaction edges:

```text
TowerBrook person -> emailed/met/introduced/worked-with -> external person
TowerBrook/portfolio company -> engaged/advised-by -> external person or firm
```

Relationship strength should consider:

- directness;
- interaction type;
- frequency;
- recency;
- duration;
- reciprocity;
- number and seniority of TowerBrook connections;
- whether the relationship produced a deal, introduction, or useful call;
- confidentiality and permission constraints.

Do not expose email content by default. Relationship metadata and access controls
should be designed with legal/compliance review.

### Loop 5: Active Recruiting And Call Compounding

When a high-value coverage cell is weak, create a recruiting task rather than
running endless generic searches.

Example:

```text
Need: UK water-utility procurement leaders who selected leakage analytics tools
Known anchors: three utility innovation projects and two awarded vendors
Action: identify project sponsors, former procurement leaders, and delivery
partners; request referrals from two already-vetted experts
```

After every expert call, capture:

- fit and quality rating;
- claims confirmed or rejected;
- companies mentioned;
- people recommended;
- people to avoid or conflicts;
- new vocabulary and subthemes;
- introduction willingness;
- follow-up actions;
- evidence status: call-derived, corroborated, or uncorroborated.

This creates a proprietary learning loop:

```text
expert -> call -> new people/companies/terms -> targeted discovery -> better call
```

### Loop 6: Monitoring And Refresh

Create watchlists for important people, companies, deals, projects, and search
specifications. Refresh on different cadences:

- daily: news, transactions, appointments, contract awards;
- weekly: saved searches and high-priority gaps;
- monthly: company leadership, ownership, and relationship momentum;
- quarterly: theme ontology and coverage review;
- event-driven: new call note, target added, deal launched, or user correction.

## Finding Important People With Little Publicity

Publicity should not be used as a proxy for importance.

Use a "demonstrated participation" model. A person can rank highly because they:

- repeatedly appear on relevant projects or deals;
- held a decision-making role at the time of an important event;
- is named by multiple independent practitioners;
- connects otherwise separate parts of the graph;
- was a buyer, implementer, or technical author;
- has a strong warm path from TowerBrook;
- is associated with companies that later became important;
- has rare experience in an under-covered part of the coverage cube.

Useful non-obviousness signals:

- high graph centrality but low press count;
- repeated appearance in technical/project documents;
- multiple independent expert referrals;
- former rather than current role, reducing conflict and increasing openness;
- strong TowerBrook relationship but low external visibility;
- high information gain for a weak coverage cell.

Do not reward obscurity by itself. A hard-to-find person with one weak mention
is not automatically valuable.

## Identity Resolution And Evidence Model

Entity resolution is foundational. A graph with duplicate or wrongly merged
people produces false confidence and bad relationship paths.

Replace name-slug identity with probabilistic entity resolution.

### Person match features

- normalized full name and aliases;
- LinkedIn or licensed-provider identifier;
- employer and employment dates;
- title/function;
- location;
- email domain or approved contact identifier;
- co-mentioned companies, projects, and people;
- source URLs;
- chronology consistency.

### Company match features

- legal name and trading names;
- Companies House/company registry number;
- website/domain;
- parent/subsidiary relationships;
- address/location;
- directors;
- ownership;
- product description and industry;
- source URLs.

### Match outcomes

```text
auto-match: high-confidence, no contradiction
suggested-merge: analyst review required
distinct: confirmed different entities
unresolved: insufficient evidence
```

Every fact and relationship should retain:

- source and evidence span;
- source-lane type;
- event date and role-at-the-time;
- extraction method;
- confidence;
- review status;
- freshness/staleness;
- independent corroboration count;
- contradiction state.

## Ranking Model

Do not collapse everything into one opaque "expert score." Store separate,
explainable dimensions and combine them for the current user objective.

### Investment dimensions

Maintain separate structural materiality and current activity scores.

Suggested structural materiality components:

```text
disclosed value or estimated value band
ownership/control significance
platform versus add-on status
theme relevance and purity
strategic/market-structure significance
quality and importance of participating actors
```

Suggested current activity components:

```text
announcement/completion recency
announced or pending status
follow-on acquisition/investment activity
recent appointments and financing
recent activity by the same investors or acquirers
```

Research priority should be a third score:

```text
research priority =
  structural materiality
  + current activity
  + missing-material-fact value
  + uncovered-important-person value
  + expected information gain
```

This ensures the next research action focuses on important investments with
valuable missing information, rather than repeatedly enriching already-complete
records.

For public-capital events, also maintain:

```text
delivery certainty
policy and market-shaping significance
public capital committed
private capital mobilized
recipient and delivery-partner visibility
procurement and follow-on investment potential
```

Never rank public-capital events against private transactions using headline
amount alone. Compare like-for-like capital mechanisms or use the explainable
dimensions above.

### Expert dimensions

```text
theme relevance
demonstrated expertise
role on major investments
role on recent investments
information value
access/reachability
relationship strength
recency/momentum
source confidence
independent corroboration
non-obviousness
conflict/compliance risk
```

One practical formulation:

```text
expert priority =
  objective fit
  x evidence confidence
  x availability/compliance eligibility
  + role-weighted structural investment materiality
  + role-weighted recent investment activity
  + information gain
  + warm-path value
  + relationship momentum
  + source-independent graph support
  - conflict/risk penalty
```

Information gain is critical. The next best call is not always the highest
profile expert; it is often the person most likely to reduce an important
uncertainty or fill a weak coverage cell.

### Company dimensions

```text
company interest =
  role-weighted participation in major investments
  + recent investment activity
  + weighted independent expert support
  + buyer/customer validation
  + founder/operator support
  + deal and ownership signals
  + market momentum
  + adjacency to TowerBrook thesis
  + reachability
  - evidence concentration penalty
  - already-taken/not-actionable penalty
```

Count independent evidence paths, not raw mentions. Five people from the same
law firm commenting on one transaction are not equivalent to a founder, a
customer, a technical implementer, and an investor independently surfacing the
same company.

Company rankings should expose why the company is important:

- major target or platform;
- active acquirer;
- repeat financial sponsor;
- emerging target with recent backing;
- recurrent advisor or service provider;
- comparable or adjacency surfaced from a priority investment.

## Measurable Completeness

"Complete" should mean auditable coverage and diminishing returns, not a
marketing claim.

### Coverage dashboard

For each cell in the coverage cube, show:

- Tier 1 and Tier 2 investment count;
- percentage of priority investments deeply researched;
- percentage with complete parties and organizational advisors;
- percentage with named people for each material role;
- largest investments with missing values, advisors, or experts;
- recent investments with unresolved people or companies;
- candidate count;
- reviewed and verified count;
- high-priority expert count;
- source-lane diversity;
- independent source count;
- warm-path count;
- average freshness;
- unresolved identities;
- contradictions;
- last refresh date.

### Saturation metrics

Track:

- percentage of the theme's top-value investments captured;
- percentage of all relevant last-24-month investments captured;
- priority-investment detail completeness;
- percentage of major players supported by multiple priority investments;
- number of named experts connected to Tier 1 and Tier 2 investments;
- percentage of priority investments with named bankers, lawyers, and other
  service providers where publicly disclosed;
- new verified experts per 100 sources reviewed;
- new verified companies per 100 sources reviewed;
- percentage of new entities found only by one source lane;
- overlap among independent source lanes;
- percentage of top-ranked entities with two or more independent sources;
- referral yield per expert call;
- number of weak or empty coverage cells;
- rank stability after each discovery batch.

Capture-recapture methods can estimate the likely unseen population from the
overlap among independent lists. They are imperfect because source lanes are
not truly independent, but they are useful as a warning signal:

- high overlap across independent lanes suggests increasing saturation;
- low overlap suggests a larger unseen population or biased discovery;
- high counts with low source diversity indicate false confidence.

### Suggested release gates

A theme is "decision ready" when:

- all Tier 1 investments are captured and deeply researched;
- all qualifying Tier 2 investments from the last 24 months are captured;
- all material parties are verified for Tier 1 and Tier 2 investments;
- every missing advisor, person, value, or financing fact is explicitly marked
  as not disclosed, unresolved, or queued for research;
- the major-player leaderboards are supported by verified investments;
- every required archetype/subtheme cell has minimum verified coverage or is
  explicitly marked as a gap;
- top experts have at least two independent evidence paths, unless clearly
  labeled single-source;
- top companies have multiple independent expert/support paths;
- identity conflicts and duplicate candidates are below an agreed threshold;
- discovery yield has declined across at least two successive batches;
- a human reviewer has signed off on the coverage report.

## Theme-Specific High-Value Sources

### Clean Energy Advisory & Development

- major developer/platform acquisitions, growth investments, and exits;
- large renewable project financings and portfolio transactions;
- acquisitions of PPA, power-market, development, and advisory platforms;
- UK Contracts for Difference allocation results;
- planning and development-consent applications;
- project finance, acquisition, and refinancing announcements;
- law-firm, bank, technical-advisor, and environmental-consultant tombstones;
- developer leadership/alumni and portfolio pages;
- power-market, PPA, and renewable-development conference programs;
- corporate registers and director histories.

### Grid Infrastructure & Connection

- acquisitions and investments in grid-services, engineering, software, and
  connection platforms;
- major transmission, distribution, flexibility, and interconnector
  investments;
- platform and add-on activity by infrastructure funds and strategic acquirers;
- NESO machine-readable connection registers and transmission works reports;
- DNO/utility procurement and contract-award notices;
- Ofgem consultations, decisions, and price-control submissions;
- major project and planning documents;
- engineering, grid-study, and owner-engineer case studies;
- flexibility/DERMS/ANM program participants;
- utility conference and standards-body contributors.

### Smart Water Infrastructure & Analytics

- acquisitions and investments in smart-metering, leakage, analytics,
  wastewater, and utility-software platforms;
- sponsor-backed water infrastructure service platforms and add-ons;
- utility technology investments, partnerships, and major contract awards;
- Ofwat Innovation Fund winners and consortium partners;
- AMP business plans, regulatory submissions, and innovation reports;
- water-utility procurement and award notices;
- utility pilot and vendor case studies;
- technical conferences, research foundations, and standards groups;
- water-company leadership, innovation, digital, and procurement teams;
- transaction and portfolio pages for water technology and service companies.

## User Experience

The output should be an action workspace, not a directory.

### Investment command center

This should be the primary entry point for each theme.

Show:

- largest investments, ranked by structural materiality;
- recent and announced investments, ranked by current activity;
- major investors, acquirers, targets, and advisors derived from those deals;
- named experts involved in each investment;
- repeat deal teams and recurring advisor relationships;
- missing material facts and unresolved people;
- comparable investments and emerging patterns;
- TowerBrook relationship paths to major players and experts.

The key actions should be:

- research missing participants;
- open investment relationship map;
- identify the best expert on this investment;
- compare with similar investments;
- build a recent-activity briefing;
- create a call plan around a major player.

### Theme coverage cockpit

Show:

- priority-investment coverage and research completeness;
- largest-investment and recent-investment coverage gaps;
- coverage cube and blank spaces;
- discovery saturation and source diversity;
- high-value new experts since last refresh;
- companies gaining independent support;
- recommended next discovery/recruiting actions;
- review queue and conflicts.

### Expert profile

Show:

- why this person matters for the current objective;
- major and recent investments they were involved in, with exact roles;
- cumulative investment materiality and recent activity;
- demonstrated experience timeline;
- evidence and independent corroboration;
- companies, projects, deals, committees, and people connected to them;
- TowerBrook's strongest introduction path;
- likely bias/conflicts and compliance status;
- best questions to ask;
- what uncertainty the call can reduce;
- referral questions and post-call capture.

### Company profile

Show:

- why it surfaced and from which independent paths;
- major and recent investments involving the company;
- whether it is a target, buyer, seller, investor, advisor, lender, or provider;
- supporting and disconfirming expert evidence;
- buyers/customers, founders, operators, deals, and projects;
- target/actionability status;
- best reachable experts;
- next diligence questions and research actions.

### Call-plan builder

Build a sequence designed to maximize information gain:

1. market mapper;
2. buyer/customer validator;
3. technical/implementation expert;
4. founder/operator;
5. dealmaker/advisor;
6. skeptic/red-team expert.

After each call, automatically re-rank the remaining plan based on what changed.

## Recommended Technical Architecture

```text
Private-investment census + public-capital census
  -> investment materiality/activity scoring
  -> public-capital delivery-certainty scoring
  -> Search specification registry
  -> source connectors and search provider
  -> source queue and deduplication
  -> fetch/parse/OCR
  -> investment/event/entity/relation extraction
  -> candidate store
  -> probabilistic entity resolution
  -> analyst review
  -> canonical graph
  -> expansion-job generator
  -> ranking, coverage, and monitoring
```

### Data-model additions

Add canonical records for:

- `investment_candidates`;
- `public_capital_event_candidates`;
- `public_capital_mechanisms`;
- `public_capital_delivery_status`;
- `program_project_children`;
- `investment_materiality_scores`;
- `investment_activity_scores`;
- `delivery_certainty_scores`;
- `investment_research_status`;
- `person_deal_roles`;
- `employment_roles`;
- `projects_assets`;
- `project_participants`;
- `procurements_contract_awards`;
- `committees_memberships`;
- `events`;
- `interaction_edges`;
- `referrals`;
- `search_specs`;
- `source_lanes`;
- `coverage_cells`;
- `discovery_runs`;
- `entity_match_candidates`;
- `review_decisions`;
- `watchlists`;
- `signals`.

Represent roles as time-bounded relationships rather than current text fields:

```text
person -> held_role -> organization
person -> invested_in/advised_on/led/counselled -> investment
organization -> buyer/seller/investor/advisor/lender -> investment
government/regulator -> authorized/awarded/financed -> program or project
program -> funded/selected -> project or recipient
organization -> awarded_contract_to -> company
person -> introduced -> person
```

### Agent/workflow boundaries

Use deterministic workflow orchestration for:

- private-investment and public-capital census collection and deduplication;
- capital-mechanism and delivery-status classification;
- materiality, activity, and research-priority scoring;
- query scheduling;
- connector execution;
- deduplication;
- review gates;
- graph writes;
- refresh policies;
- coverage metrics.

Use agents/LLMs for:

- ontology expansion suggestions;
- query generation within approved templates;
- structured event/entity/relation extraction;
- candidate merge explanations;
- missing-evidence and follow-up-search suggestions;
- grounded synthesis, call prep, and outreach.

The LLM should never decide by itself that a candidate is canonical truth.

## Implementation Roadmap

### Phase 0: Protect graph quality

- Define Supabase as the reviewed canonical graph and generate any static demo
  artifacts from approved graph snapshots.
- Make the investment/deal model the primary spine for people and company
  discovery.
- Change live discovery to write candidates, not canonical people/companies.
- Prevent relationships and facts with unresolved entity IDs from entering the
  canonical graph.
- Add extraction-run, source-lane, review, and evidence-span metadata.
- Add explicit source independence and corroboration counts.
- Recompute scores only after reviewed graph updates.

### Phase 1: Priority-investment census

- Build the major and recent investment universe for all three themes.
- Build a separate government and public-capital universe for all three themes.
- Preserve capital mechanism, amount basis, commitment status, and delivery
  certainty for every public-capital event.
- Expand material public programs into project, recipient, procurement, and
  delivery-partner child records.
- Add structural materiality, current activity, and research-priority scores.
- Add the Tier 1/Tier 2 investment research rubric and missing-fact workflows.
- Add person-level investment roles and named deal-team research.
- Build major-player leaderboards from verified investment participation.

### Phase 2: Search-specification engine

- Replace the fixed `THEME_QUERIES` dictionary with structured search specs.
- Add subtheme, archetype, geography, source lane, date range, priority, budget,
  and stop condition.
- Generate deal-centric searches from missing investment facts and participants.
- Generate jobs for empty/weak coverage cells.
- Store source yield and accepted-entity yield per query specification.

### Phase 3: Graph expansion and identity resolution

- Create expansion jobs from accepted investments, people, companies, and
  projects, weighted by investment priority.
- Add probabilistic person/company match candidates and analyst merge review.
- Add legal-entity identifiers and employment histories.
- Build source-lane overlap and saturation reporting.

### Phase 4: Relationship intelligence and call loop

- Integrate approved CRM/email/calendar metadata with privacy controls.
- Add warm-path and relationship-strength scoring.
- Add expert screening, conflict, availability, and call-quality fields.
- Convert call referrals and company mentions into reviewable candidates.

### Phase 5: Continuous monitoring and learning

- Add watchlists and refresh schedules.
- Monitor all major players and qualifying recent investments.
- Learn query/source-lane yield from analyst decisions.
- Learn ranking weights from shortlist, outreach, call, and diligence outcomes.
- Show coverage changes and newly actionable paths to users.

## Immediate Code Priorities

1. Build a TowerBrook Tier 0 census and complete the deal team, advisor,
   financing, management, board, and value-creation map for every relevant
   transaction.
2. Build a peer-fund census focused on PE platform deals, secondary buyouts,
   sponsor-backed add-ons, and sponsor exits.
3. Build a separate normalized public-capital census with delivery-status and
   capital-mechanism controls.
4. Add structural materiality, current activity, delivery certainty, and
   research-priority scores.
5. Expand major public programs into project, recipient, procurement, and
   delivery-partner research jobs.
6. Add person-level investment roles and a complete Tier 0/Tier 1/Tier 2 investment
   research rubric.
7. Make the review queue the only path from discovery to the canonical graph.
8. Introduce `SearchSpec`, `CoverageCell`, `CandidateEntity`,
   `CandidateRelationship`, and `EntityMatchCandidate` schemas.
9. Generate missing-fact and missing-participant searches for every priority
   investment.
10. Replace name-slug reconciliation with a probabilistic merge workflow.
11. Add event/project/procurement extraction so obscure experts can be found
   through demonstrated participation.
12. Add graph-driven follow-up job generation weighted by investment priority.
13. Separate expert relevance, investment importance, recent activity,
    information value, evidence quality, and reachability scores.
14. Rank companies by investment participation and weighted independent expert
    paths, not raw expert count.
15. Add a priority-investment coverage and saturation dashboard before
    increasing search volume.

## Reference Patterns

- Affinity automatic activity capture:
  https://www.affinity.co/product/activity-capture
- Affinity relationship intelligence:
  https://www.affinity.co/product/relationship-intelligence
- Intapp DealCloud relationship intelligence, zero-entry capture, data
  enrichment, and relational graph:
  https://www.intapp.com/dealcloud/
- LinkedIn Sales Navigator TeamLink warm-path model:
  https://www.linkedin.com/help/sales-navigator/answer/a101027/teamlink-overview
- Salesforce Data Cloud identity resolution and data harmonization:
  https://www.salesforce.com/products/data/
- Guidepoint custom recruiting, knowledge-graph matching, screening, and
  verification:
  https://www.guidepoint.com/services/1-to-1-calls/
- GLG expert-network compliance framework:
  https://glginsights.com/compliance/
- NESO connection registers:
  https://www.neso.energy/connections/registers-reports-and-guidance
- Ofwat Innovation Fund:
  https://www.ofwat.gov.uk/regulated-companies/innovation-in-the-water-sector/
- Companies House API:
  https://developer.company-information.service.gov.uk/get-started
- Capture-recapture population-size estimation:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9826711/
- Probabilistic record linkage:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10588881/

## Compliance Guardrails

- Use licensed APIs or permitted public sources; do not scrape authenticated
  LinkedIn pages. LinkedIn's user agreement explicitly prohibits scraping.
- Conduct legal review before ingesting email/calendar metadata or using
  personal data for outreach.
- Apply purpose limitation, data minimization, access controls, retention
  policies, correction workflows, and audit logs.
- Keep call-derived claims separate from corroborated public facts.
- Screen expert outreach and calls for conflicts, confidentiality obligations,
  and material non-public information risk.
- Make evidence, uncertainty, and review status visible to the investment team.
