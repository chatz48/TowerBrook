import { NextResponse } from "next/server";
import { globalSearch, type ThemeFocus } from "@/lib/investment-readiness";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const theme = (url.searchParams.get("theme") ?? "all") as ThemeFocus;
  const kind = (url.searchParams.get("kind") ?? "all") as "all" | "expert" | "company";
  const readiness = url.searchParams.get("readiness") ?? "all";
  const limit = Number(url.searchParams.get("limit") ?? 20);

  return NextResponse.json({
    query,
    theme,
    kind,
    readiness,
    results: globalSearch({ query, theme, kind, readiness, limit: Number.isFinite(limit) ? limit : 20 }),
    providers: {
      liveWebSearchConfigured: Boolean(process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY || process.env.BRAVE_SEARCH_API_KEY),
      liveLlmConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY),
    },
  });
}
