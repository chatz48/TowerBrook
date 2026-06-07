import { EXPERT_TYPE_LABEL } from "./labels";
import type { Expert } from "./types";

export interface ExpertRoleDisplay {
  company: string;
  role: string;
}

/** Split headline into company-first display parts for dense tables. */
export function expertRoleDisplay(
  expert: Pick<Expert, "headline" | "org" | "type">,
  companyName?: string,
): ExpertRoleDisplay {
  const headline = expert.headline?.trim() ?? "";
  const commaIdx = headline.indexOf(", ");

  if (commaIdx > 0) {
    const role = headline.slice(0, commaIdx).trim();
    let company = headline.slice(commaIdx + 2).trim();
    const semiIdx = company.indexOf(";");
    if (semiIdx > 0) company = company.slice(0, semiIdx).trim();
    if (company) return { company, role };
  }

  const orgCompany = expert.org?.replace(/\s*\([^)]*\)\s*$/, "").trim() ?? "";
  const company = companyName || orgCompany;
  const role =
    commaIdx > 0 ? headline.slice(0, commaIdx).trim() : headline || EXPERT_TYPE_LABEL[expert.type];

  if (company) return { company, role };
  return { company: "", role: headline || EXPERT_TYPE_LABEL[expert.type] };
}

export function formatExpertRoleLine(display: ExpertRoleDisplay): string {
  if (display.company && display.role) return `${display.company} — ${display.role}`;
  return display.company || display.role;
}

export type CallPhase = "Market orientation" | "Buyer validation" | "Deal intelligence";

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

interface ArchetypeProfile {
  callAngle: string;
  callObjective: string;
  callPhase: CallPhase;
}

function archetypeProfile(expert: Expert): ArchetypeProfile {
  const curated = CURATED_CALL_ANGLE[expert.id];
  const companyCount = new Set(expert.companies.map((link) => link.companyId)).size;
  const specialty = expert.specialties?.[0]?.toLowerCase();
  const org = expert.org ? ` at ${expert.org}` : "";
  const primaryCompany = expert.companies[0]?.companyId.replaceAll("-", " ");
  const edges = companyCount;

  let callPhase: CallPhase = "Deal intelligence";
  if (expert.type === "ex-founder" || expert.type === "operator") {
    callPhase = "Market orientation";
  } else if (expert.type === "banker" || expert.type === "investor") {
    callPhase = "Buyer validation";
  }

  let callAngle = curated ?? expert.whyRelevant;
  if (!curated) {
    if (expert.type === "ex-founder") {
      callAngle = `${expert.headline}${org}. Use the call to test founder economics, buyer urgency, and referral paths${specialty ? ` in ${specialty}` : ""}.`;
    } else if (expert.type === "operator") {
      callAngle = `${expert.headline}${org}. Focus on implementation bottlenecks, customer adoption, and which company claims are diligence-ready.`;
    } else if (expert.type === "banker") {
      callAngle = `${expert.headline}${org}. Ask which assets are actionable, who controls the process, and where TowerBrook can get warm access.`;
    } else if (expert.type === "lawyer") {
      callAngle = `${expert.headline}${org}. Use the call to verify deal parties, diligence issues, and counsel-level transaction evidence.`;
    } else if (expert.type === "investor") {
      callAngle = `${expert.headline}${org}. Test sponsor appetite, valuation pressure, and financing constraints across the current theme.`;
    } else if (companyCount > 0) {
      callAngle = `${expert.headline}${org}. Use ${companyCount} mapped company edge${companyCount === 1 ? "" : "s"} to identify named decision-makers and live diligence gaps.`;
    }
  }

  let callObjective: string;
  if (!edges) {
    callObjective =
      "Map their strongest companies, buyer pain and founder/operator referral paths.";
  } else if (expert.type === "ex-founder") {
    callObjective = `Pressure-test founder economics, buyer urgency and two operator referrals around ${primaryCompany ?? "their strongest company edge"}.`;
  } else if (expert.type === "operator") {
    callObjective = `Validate implementation bottlenecks, procurement timing and customer references across ${edges} mapped company edge${edges === 1 ? "" : "s"}.`;
  } else if (expert.type === "banker") {
    callObjective =
      "Ask which assets are actionable now, who owns the buyer dialogue and which advisers control warm introductions.";
  } else if (expert.type === "investor") {
    callObjective = `Test sponsor appetite, leverage constraints and valuation signals for ${specialty ?? "the theme"} targets.`;
  } else if (expert.type === "lawyer") {
    callObjective =
      "Verify deal parties, counsel history, completion risk and diligence issues behind the mapped transaction edges.";
  } else {
    callObjective = `Use their ${edges} mapped edge${edges === 1 ? "" : "s"} to identify named decision-makers, live diligence gaps and referral paths.`;
  }

  return { callAngle, callObjective, callPhase };
}

export function expertCallAngle(expert: Expert): string {
  return archetypeProfile(expert).callAngle;
}

export function callObjective(expert: Expert): string {
  return archetypeProfile(expert).callObjective;
}

export function callPhase(expert: Expert): CallPhase {
  return archetypeProfile(expert).callPhase;
}
