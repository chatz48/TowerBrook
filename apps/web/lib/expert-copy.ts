import type { Expert } from "./types";

const CURATED_CALL_ANGLE: Record<string, string> = {
  "jerome-guillet":
    "Offshore-wind project finance operator with EUR30bn+ transaction visibility. Use him to test financing constraints, bidder behavior, and advisory routes.",
  "greg-jackson":
    "Octopus founder with buyer, software-platform, and renewables-generation context. Use him to separate real customer demand from market narrative.",
  "piers-clark":
    "Water technology connector with utility, founder, and water-PE visibility. Use him for market mapping and high-signal founder referrals.",
  "tom-ferguson":
    "Water-focused investor with a broad early-stage pipeline view. Use him to identify which smart-water segments are investable now.",
  "jeff-mcdermott":
    "Energy-transition banker with two decades of decarbonisation M&A. Use him to test which assets are live, bankable, and reachable.",
  "reese-tisdale":
    "Independent water-market intelligence lead. Use him to map buyers, technologies, and investors across smart-water infrastructure.",
};

export function expertCallAngle(expert: Expert): string {
  const curated = CURATED_CALL_ANGLE[expert.id];
  if (curated) return curated;

  const companyCount = new Set(expert.companies.map((link) => link.companyId)).size;
  const specialty = expert.specialties?.[0]?.toLowerCase();
  const org = expert.org ? ` at ${expert.org}` : "";

  if (expert.type === "ex-founder") {
    return `${expert.headline}${org}. Use the call to test founder economics, buyer urgency, and referral paths${specialty ? ` in ${specialty}` : ""}.`;
  }
  if (expert.type === "operator") {
    return `${expert.headline}${org}. Focus on implementation bottlenecks, customer adoption, and which company claims are diligence-ready.`;
  }
  if (expert.type === "banker") {
    return `${expert.headline}${org}. Ask which assets are actionable, who controls the process, and where TowerBrook can get warm access.`;
  }
  if (expert.type === "lawyer") {
    return `${expert.headline}${org}. Use the call to verify deal parties, diligence issues, and counsel-level transaction evidence.`;
  }
  if (expert.type === "investor" || expert.type === "lender-credit") {
    return `${expert.headline}${org}. Test sponsor appetite, valuation pressure, and financing constraints across the current theme.`;
  }
  if (companyCount > 0) {
    return `${expert.headline}${org}. Use ${companyCount} mapped company edge${companyCount === 1 ? "" : "s"} to identify named decision-makers and live diligence gaps.`;
  }
  return expert.whyRelevant;
}
