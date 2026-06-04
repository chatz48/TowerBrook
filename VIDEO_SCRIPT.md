# 2-Minute Demo Script

## Opening

TowerBrook asked for a people expert engine across three themes: Clean Energy
Advisory & Development, Grid Infrastructure & Connection, and Smart Water
Infrastructure & Analytics.

The product is built around one origination question: who should TowerBrook call
this week, and what investable companies or referrals could those calls reveal?

## Product Walkthrough

Start on the home page. The workflow is people-led deal origination: pick a
theme, use PE transactions as the discovery spine, rank credible experts, and
reverse-derive companies from those experts.

Open `/experts`. This is the main origination workspace. It shows founder-led
opportunity jobs, PE-derived expert candidates, named advisor-person gaps, and
the canonical expert graph. The point is not just to list famous people. The
engine looks for ex-founders, operators, bankers, lawyers, lenders, diligence
providers, peer-fund dealmakers and service providers tied to real transactions.

Open an expert profile. The user can see why this person matters, which
companies and deals they connect to, what evidence supports the connection, and
how strong the TowerBrook path is. From there, the user can generate sourcing
call prep or draft outreach.

Open `/companies`. Companies are not just searched directly; they are
reverse-derived from named expert evidence: current companies, former companies,
board seats, advisory clients, investments and referrals. That makes the target
list actionable because every company has a person-led route into diligence.

Open `/discover`. This is the live discovery pipeline. Keiro searches and
fetches sources, DeepSeek extracts named experts and opportunity signals, and
Supabase stores review-gated candidates. The canonical graph only changes after
human approval, so AI helps with coverage and speed without pretending extracted
data is final truth.

## Close

The benefit to TowerBrook is speed and repeatability. An investment professional
can move from a broad theme to a ranked call list, evidence-backed prep, likely
target companies, and a review queue for new experts. With more time, the next
step would be CRM and email integration so every internal relationship and every
expert call compounds the graph.
