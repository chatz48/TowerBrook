"use client";

import { useState } from "react";
import Link from "next/link";
import type { TowerBrookLens } from "@/lib/towerbrook";
import { Badge, ConfidenceBars } from "./ui";

export default function TowerBrookFocus({
  lens,
  scopeLabel = "All themes",
}: {
  lens: TowerBrookLens;
  scopeLabel?: string;
}) {
  const [showWorkedWith, setShowWorkedWith] = useState(true);
  const companies = showWorkedWith
    ? lens.workedWithCompanies
    : lens.priorityCompanies;
  const experts = showWorkedWith ? lens.workedWithExperts : lens.priorityExperts;

  return (
    <section className="ee-panel overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="ee-label text-ink">TowerBrook lens</h2>
          <p className="mt-1 text-[12px] text-ink-faint">
            {scopeLabel} ranked for TowerBrook relationship strength and actionable fit.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-line-strong bg-white p-0.5">
          <button
            type="button"
            onClick={() => setShowWorkedWith(true)}
            className={`rounded px-3 py-1.5 text-[12px] font-semibold ${
              showWorkedWith
                ? "bg-[#edf5ff] text-accent"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Worked with
          </button>
          <button
            type="button"
            onClick={() => setShowWorkedWith(false)}
            className={`rounded px-3 py-1.5 text-[12px] font-semibold ${
              !showWorkedWith
                ? "bg-[#edf5ff] text-accent"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Priority fit
          </button>
        </div>
      </div>

      <div className="grid border-b border-line sm:grid-cols-4">
        <TowerBrookMetric
          label="TowerBrook score"
          value={lens.score}
          sub="Direct network + fit"
        />
        <TowerBrookMetric
          label="Worked-with companies"
          value={lens.metrics.directCompanies}
          sub="Portfolio / advisors"
        />
        <TowerBrookMetric
          label="Worked-with experts"
          value={lens.metrics.directExperts}
          sub="Team / portfolio links"
        />
        <TowerBrookMetric
          label="Priority matches"
          value={lens.metrics.priorityCompanies + lens.metrics.priorityExperts}
          sub="High-scoring rows"
        />
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="ee-label text-ink">Companies</div>
            <span className="text-[12px] text-ink-faint">{companies.length}</span>
          </div>
          <div className="max-h-[310px] overflow-auto">
            <table className="ee-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>TB score</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {companies.slice(0, 8).map((company) => (
                  <tr key={company.id}>
                    <td className="min-w-[180px]">
                      <Link href={company.href} className="ee-link">
                        {company.name}
                      </Link>
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft">
                        {company.description}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold tabular-nums text-ink">
                        {company.score}
                      </div>
                      <ConfidenceBars value={company.score / 100} />
                    </td>
                    <td>
                      <Badge
                        className={
                          company.isDirect
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-line bg-white text-ink-soft"
                        }
                      >
                        {company.label}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-ink-faint">
                      No TowerBrook relationships in this scope yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="ee-label text-ink">Experts</div>
            <span className="text-[12px] text-ink-faint">{experts.length}</span>
          </div>
          <div className="max-h-[310px] overflow-auto">
            <table className="ee-table">
              <thead>
                <tr>
                  <th>Expert</th>
                  <th>TB score</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {experts.slice(0, 8).map((expert) => (
                  <tr key={expert.id}>
                    <td className="min-w-[190px]">
                      <Link href={expert.href} className="ee-link">
                        {expert.name}
                      </Link>
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft">
                        {expert.headline}
                      </div>
                      {expert.companyNames.length ? (
                        <div className="mt-1 text-[11px] text-ink-faint">
                          {expert.companyNames.slice(0, 2).join(", ")}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="font-semibold tabular-nums text-ink">
                        {expert.score}
                      </div>
                      <ConfidenceBars value={expert.score / 100} />
                    </td>
                    <td>
                      <Badge
                        className={
                          expert.isDirect
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-line bg-white text-ink-soft"
                        }
                      >
                        {expert.label}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {experts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-ink-faint">
                      No TowerBrook expert links in this scope yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function TowerBrookMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="border-b border-r border-line px-4 py-3 last:border-r-0 sm:border-b-0">
      <div className="ee-label">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-soft">{sub}</div>
    </div>
  );
}
