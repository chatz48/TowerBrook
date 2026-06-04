import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AppShellNav from "@/app/components/AppShellNav";
import PageAwareChat from "@/app/components/PageAwareChat";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expert Engine — People & Companies by Theme",
  description:
    "Discover the experts and companies behind an investment theme — and act on them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-white">
          <div className="flex h-14 items-center gap-5 px-4">
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
            <div className="ml-auto hidden min-w-[280px] max-w-[460px] flex-1 items-center rounded-md border border-line-strong bg-white px-3 py-2 xl:flex">
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
            </div>
            <div className="hidden items-center gap-3 text-ink-soft sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full hover:bg-paper" aria-label="Notifications">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M14.5 7.6a4.5 4.5 0 0 0-9 0c0 5-2 5.3-2 6.4h13c0-1.1-2-.4-2-6.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M8.4 16a1.8 1.8 0 0 0 3.2 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-[12px] font-semibold text-ink">
                AB
              </span>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <PageAwareChat />
      </body>
    </html>
  );
}
