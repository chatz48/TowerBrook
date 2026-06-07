import type { Metadata } from "next";
import Link from "next/link";
import AppShellNav from "@/app/components/AppShellNav";
import InvestorWorkspaceTray from "@/app/components/InvestorWorkspaceTray";
import PageAwareChat from "@/app/components/PageAwareChat";
import AppErrorBoundary from "@/app/components/AppErrorBoundary";
import ScopeIndicator from "@/app/components/ScopeIndicator";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import { getThemeFocus } from "@/lib/theme-focus-server";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expert Engine — People & Companies by Theme",
  description:
    "Discover the experts and companies behind an investment theme — and act on them.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-paper text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-white">
          <div className="flex h-12 items-center gap-4 px-4">
            <Link href="/" className="flex min-w-[220px] items-center gap-3 group">
              <span className="flex h-9 w-8 flex-col justify-center gap-1" aria-hidden="true">
                <span className="h-1 w-7 rounded-full bg-accent" />
                <span className="h-1 w-5 rounded-full bg-accent" />
                <span className="h-1 w-7 rounded-full bg-accent" />
              </span>
              <span className="leading-tight">
                <span className="block text-[17px] font-semibold tracking-[0.06em]">
                  EXPERT ENGINE
                </span>
                <span className="block text-[11px] text-ink-soft">
                  Expert Intelligence
                </span>
              </span>
            </Link>
            <AppShellNav />
            <Link
              href="/ask"
              className="ml-auto hidden min-w-[280px] max-w-[460px] flex-1 items-center rounded-md border border-line-strong bg-white px-3 py-2 hover:border-line-dark hover:bg-[#fbfcff] 2xl:flex"
            >
              <span className="text-muted" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="m17 17-3.4-3.4m1.8-4.1a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="ml-2 flex-1 text-[13px] text-muted">
                Search or ask anything...
              </span>
              <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-[11px] text-ink-faint">
                ⌘ K
              </span>
            </Link>
            <span
              className="hidden h-8 w-8 place-items-center rounded-full border border-line bg-paper text-[12px] font-semibold text-ink sm:grid"
              title="TowerBrook workspace"
            >
              TB
            </span>
          </div>
          <AppShellNav mobile />
          <div className="border-t border-line bg-[#fbfcff]">
            <ThemeSwitcher
              initialFocus={themeFocus}
              initialIncludeTowerBrookEmployees={includeTowerBrookEmployees}
            />
          </div>
        </header>
        <ScopeIndicator />
        <AppErrorBoundary>
          <main>{children}</main>
        </AppErrorBoundary>
        <InvestorWorkspaceTray />
        <PageAwareChat />
      </body>
    </html>
  );
}
