import { companiesWithLinks, getCompanies, getExperts } from "@/lib/data";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { THEMES } from "@/lib/themes";

export default async function ScopeIndicator() {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  const experts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
    includeTowerBrookEmployees,
  );
  const companies = getCompanies().filter((company) =>
    matchesThemeFocus(company.themes, themeFocus),
  );
  const targets = companiesWithLinks(
    themeFocus === "all" ? undefined : themeFocus,
    includeTowerBrookEmployees,
  ).filter(
    (company) => company.category === "target" && company.ownershipStatus !== "acquired",
  ).length;

  const label =
    themeFocus === "all"
      ? "All three themes"
      : THEMES.find((theme) => theme.id === themeFocus)?.name ?? "Selected theme";

  return (
    <div
      className="border-b border-line bg-[#f7fbff] px-4 py-2 text-[12px] text-ink-soft"
      role="status"
      aria-live="polite"
    >
      <span className="font-semibold text-ink">Scope:</span> {label}
      <span className="mx-2 text-ink-faint">·</span>
      <span>
        <strong className="font-semibold tabular-nums text-ink">{experts.length}</strong> experts
      </span>
      <span className="mx-2 text-ink-faint">·</span>
      <span>
        <strong className="font-semibold tabular-nums text-ink">{companies.length}</strong> companies
      </span>
      <span className="mx-2 text-ink-faint">·</span>
      <span>
        <strong className="font-semibold tabular-nums text-ink">{targets}</strong> targets
      </span>
    </div>
  );
}
