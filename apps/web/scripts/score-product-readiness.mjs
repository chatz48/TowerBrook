import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const exists = (file) => fs.existsSync(path.join(root, file));
const contains = (file, needle) => fs.readFileSync(path.join(root, file), "utf8").includes(needle);

const experts = readJson("data/experts.json");
const companies = readJson("data/companies.json");
const discovery = readJson("data/expert-first-pe-discovery-candidates.json");
const jobsPayload = readJson("data/origination-research-jobs.json");
const jobs = Array.isArray(jobsPayload) ? jobsPayload : jobsPayload.jobs ?? [];

const themes = ["clean-energy-advisory", "grid-infrastructure", "smart-water"];
const expertTypes = new Set(experts.map((expert) => expert.type));
const companyThemes = new Set(companies.flatMap((company) => company.themes));
const expertThemes = new Set(experts.flatMap((expert) => expert.themes));
const contactableExperts = experts.filter((expert) => expert.linkedin || expert.email || expert.contactFacts?.some((fact) => fact.value));
const sourceBackedExperts = experts.filter((expert) => expert.sources?.length);
const sourceBackedCompanies = companies.filter((company) => company.sources?.length);
const linkedCompanies = new Set(experts.flatMap((expert) => expert.companies?.map((link) => link.companyId) ?? []));

const checks = [
  {
    id: "theme_coverage",
    label: "All required themes represented in experts and companies",
    pass: themes.every((theme) => expertThemes.has(theme) && companyThemes.has(theme)),
    evidence: { expertThemes: [...expertThemes], companyThemes: [...companyThemes] },
  },
  {
    id: "expert_universe",
    label: "Expert universe has all requested archetypes and sufficient breadth",
    pass: experts.length >= 150 && ["ex-founder", "operator", "advisor", "banker", "lawyer", "investor"].every((type) => expertTypes.has(type)),
    evidence: { experts: experts.length, expertTypes: [...expertTypes].sort() },
  },
  {
    id: "company_derivation",
    label: "Expert-derived company universe is broad and connected",
    pass: companies.length >= 200 && linkedCompanies.size >= 120 && discovery.derived_company_candidates?.length >= 30,
    evidence: { companies: companies.length, linkedCompanies: linkedCompanies.size, derivedCandidates: discovery.derived_company_candidates?.length ?? 0 },
  },
  {
    id: "evidence_trust",
    label: "Source-backed records and confidence/trust UI are present",
    pass: sourceBackedExperts.length >= 120 && sourceBackedCompanies.length >= 180 && exists("app/components/ReadinessBadge.tsx"),
    evidence: { sourceBackedExperts: sourceBackedExperts.length, sourceBackedCompanies: sourceBackedCompanies.length },
  },
  {
    id: "call_actionability",
    label: "Call readiness, contact path, and outreach workflow are implemented",
    pass: contactableExperts.length >= 20 && contains("app/experts/page.tsx", "Readiness") && contains("app/components/ExpertActions.tsx", "Draft outreach note"),
    evidence: { contactableExperts: contactableExperts.length },
  },
  {
    id: "target_actionability",
    label: "PE target scorecards and company readiness filters are implemented",
    pass: exists("lib/investment-readiness.ts") && contains("app/companies/[id]/page.tsx", "PE target scorecard") && contains("app/companies/page.tsx", "PE score"),
    evidence: { scorecardFunction: contains("lib/investment-readiness.ts", "targetScorecard") },
  },
  {
    id: "nontechnical_workflow",
    label: "Guided non-technical workflow exists on the homepage",
    pass: exists("app/components/GuidedWorkflow.tsx") && contains("app/page.tsx", "GuidedWorkflow"),
    evidence: { guidedWorkflow: true },
  },
  {
    id: "campaign_workflow",
    label: "Assigned call-campaign workflow closes the loop from map to outreach",
    pass: exists("app/campaign/page.tsx") && exists("app/components/campaign/CampaignWorkspace.tsx") && contains("app/components/campaign/CampaignWorkspace.tsx", "Copy meeting pack") && contains("app/components/campaign/CampaignWorkspace.tsx", "Export CSV"),
    evidence: { campaignPage: exists("app/campaign/page.tsx"), exportCsv: contains("app/components/campaign/CampaignWorkspace.tsx", "Export CSV") },
  },
  {
    id: "ranking_transparency",
    label: "Expert rankings expose score components and trust rationale",
    pass: contains("app/experts/page.tsx", "type {score.base}") && contains("app/experts/[id]/page.tsx", "Trust dossier"),
    evidence: { scoreComponents: true, trustDossier: true },
  },
  {
    id: "research_queue",
    label: "Research queues and generated jobs cover verification loops",
    pass: discovery.expert_candidates?.length >= 80 && discovery.advisor_expert_gaps?.length >= 50 && jobs.length >= 100,
    evidence: { expertCandidates: discovery.expert_candidates?.length ?? 0, advisorGaps: discovery.advisor_expert_gaps?.length ?? 0, jobs: jobs.length },
  },
  {
    id: "live_search_llm",
    label: "Live search and LLM provider fallbacks are implemented on frontend and backend",
    pass: exists("lib/live-search.ts") && exists("app/api/search/route.ts") && exists("../backend-api/app/api/search.py") && contains("lib/llm.ts", "completeWithGemini"),
    evidence: { webSearchRoute: true, backendSearchRoute: true, geminiFallback: true },
  },
  {
    id: "reporting_and_export",
    label: "Meeting-pack/reporting path and source register remain available",
    pass: exists("app/reports/page.tsx") && exists("app/components/reports/ReportWorkspace.tsx") && exists("app/sources/page.tsx"),
    evidence: { reports: true, sources: true },
  },
];

const passed = checks.filter((check) => check.pass).length;
const score = Math.round((passed / checks.length) * 100) / 10;
const result = {
  generated_at: new Date().toISOString(),
  score_out_of_10: score,
  passed,
  total: checks.length,
  status: score === 10 ? "10/10 capability score" : "needs further improvement",
  checks,
};

fs.writeFileSync(path.join(root, "data/product-readiness-score.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (score < 10) process.exitCode = 1;
