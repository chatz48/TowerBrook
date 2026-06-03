import { callIntelligenceApi } from "@/lib/intelligence-api";
import { getTheme } from "@/lib/themes";

export async function POST(request: Request) {
  try {
    const { themeId, query } = (await request.json()) as { themeId: string; query?: string };
    const theme = getTheme(themeId);
    if (!theme) return Response.json({ error: "Unknown theme" }, { status: 400 });

    const job = await callIntelligenceApi("/discovery/jobs", {
      method: "POST",
      body: JSON.stringify({
        job_type: "deep_discovery",
        theme_id: theme.id,
        query,
        metadata: { source: "web-discover" },
      }),
    });

    if (!job) {
      return Response.json(
        {
          error: "Set INTELLIGENCE_API_URL to create live discovery jobs.",
          candidates: [],
        },
        { status: 503 },
      );
    }

    return Response.json({ job, candidates: [] });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 },
    );
  }
}
