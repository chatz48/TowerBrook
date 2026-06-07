import Link from "next/link";
import { companiesPageHref } from "@/lib/companies-url";

export default function CompaniesFilterForm({
  query,
  selectedCategory,
  selectedReadiness,
  companiesCount,
}: {
  query: string;
  selectedCategory: string;
  selectedReadiness: string;
  companiesCount: number;
}) {
  return (
    <form className="ee-panel mb-5 rounded-lg p-4" action={companiesPageHref({})}>
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto] lg:items-end">
        <label className="block">
          <span className="ee-label text-ink-faint">Search companies, experts or angles</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="e.g. independent, leak detection, JSM, grid"
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="ee-label text-ink-faint">Company type</span>
          <select
            name="category"
            defaultValue={selectedCategory}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All company types</option>
            <option value="target">Targets</option>
            <option value="advisory">Advisory firms</option>
            <option value="service-provider">Service providers</option>
            <option value="investor">Investors</option>
            <option value="incumbent">Incumbents</option>
          </select>
        </label>
        <label className="block">
          <span className="ee-label text-ink-faint">Readiness</span>
          <select
            name="readiness"
            defaultValue={selectedReadiness}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All readiness states</option>
            <option value="actionable">Actionable diligence</option>
            <option value="target-ready">Target-ready</option>
            <option value="verify-ownership">Verify ownership</option>
            <option value="verify-scale">Verify scale</option>
            <option value="monitor">Monitor / comp</option>
            <option value="research-needed">Research needed</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className="ee-button ee-button-primary h-10 px-4" type="submit">
            Search
          </button>
          <Link href={companiesPageHref({})} className="ee-button ee-button-secondary h-10 px-4">
            Reset
          </Link>
        </div>
      </div>
      <div className="mt-3 border-t border-line pt-3 text-[11px] text-ink-faint">
        <strong className="text-ink">{companiesCount}</strong> mapped companies visible in the current scope.
      </div>
    </form>
  );
}
