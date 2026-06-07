import type { Metadata } from "next";
import Link from "next/link";
import AppShellNav from "@/app/components/AppShellNav";
import InvestorWorkspaceTray from "@/app/components/InvestorWorkspaceTray";
import AppErrorBoundary from "@/app/components/AppErrorBoundary";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import { companiesWithLinks, getCompanies, getExperts } from "@/lib/data";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { coverageMatrix } from "@/lib/investment-readiness";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getThemeFocus } from "@/lib/theme-focus-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expert Engine — Investment Intelligence",
  description:
    "Expert and company intelligence by investment theme — call lists, targets, and IC memos.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
  const gapCount = coverageMatrix(themeFocus, includeTowerBrookEmployees).filter(
    (row) => row.gapSeverity !== "low",
  ).length;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-paper text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-white">
          <div className="flex h-12 items-center gap-4 px-4">
            <Link href="/" className="flex min-w-[200px] items-center gap-3 group">
              <span className="flex h-9 w-8 flex-col justify-center gap-1" aria-hidden="true">
                <span className="h-1 w-7 rounded-full bg-accent" />
                <span className="h-1 w-5 rounded-full bg-accent" />
                <span className="h-1 w-7 rounded-full bg-accent" />
              </span>
              <span className="leading-tight">
                <span className="block text-[16px] font-semibold tracking-[0.05em]">
                  EXPERT ENGINE
                </span>
                <span className="block text-[11px] text-ink-soft">
                  Investment intelligence
                </span>
              </span>
            </Link>
            <AppShellNav />
            <Link
              href="/ask"
              className="ml-auto hidden min-w-[240px] max-w-[400px] flex-1 items-center rounded-md border border-line-strong bg-white px-3 py-2 hover:border-line-dark hover:bg-[#fbfcff] xl:flex"
            >
              <span className="text-muted" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="m17 17-3.4-3.4m1.8-4.1a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="ml-2 flex-1 text-[13px] text-muted">Ask Copilot…</span>
            </Link>
          </div>
          <AppShellNav mobile />
          <ThemeSwitcher
            initialFocus={themeFocus}
            initialIncludeTowerBrookEmployees={includeTowerBrookEmployees}
            scopeStats={{
              experts: experts.length,
              companies: companies.length,
              targets,
              gaps: gapCount,
            }}
          />
        </header>
        <AppErrorBoundary>
          <main>{children}</main>
        </AppErrorBoundary>
        <InvestorWorkspaceTray />
      </body>
    </html>
  );
}
