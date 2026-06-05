"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface SearchItem {
  id: string;
  name: string;
  sub: string;
  kind: "expert" | "company";
  href: string;
  keywords: string;
}

export default function SearchBox({
  index,
  scopeLabel = "All experts and companies",
}: {
  index: SearchItem[];
  scopeLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return index
      .filter((it) => it.keywords.includes(query))
      .slice(0, 8);
  }, [q, index]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-card px-4 py-3 shadow-sm focus-within:border-accent transition-colors">
        <span className="text-ink-faint">🔎</span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search any person or company - e.g. solar, leak detection, Piclo"
          className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-faint"
        />
        {q ? (
          <kbd className="text-[10px] text-ink-faint border border-line rounded px-1.5 py-0.5">
            {results.length} match{results.length === 1 ? "" : "es"}
          </kbd>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink-faint">
        <span>Search scope: {scopeLabel}</span>
        <span>{index.length} records</span>
      </div>

      {open && results.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-line bg-card shadow-lg overflow-hidden">
          {results.map((it) => (
            <button
              key={`${it.kind}-${it.id}`}
              onMouseDown={() => go(it.href)}
              className="w-full text-left px-4 py-2.5 hover:bg-paper flex items-center justify-between gap-3 border-b border-line last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-ink-faint truncate">{it.sub}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-ink-faint shrink-0">
                {it.kind}
              </span>
            </button>
          ))}
        </div>
      ) : open && q.trim() ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-line bg-card p-4 text-sm text-ink-soft shadow-lg">
          No matches in {scopeLabel}. Try a company, person, technology, advisor, or theme term.
        </div>
      ) : null}
    </div>
  );
}
