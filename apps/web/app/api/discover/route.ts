import { callBackendApi } from "@/lib/backend-api";
import { getTheme } from "@/lib/themes";

export async function POST(request: Request) {
  try {
    const { themeId, query, jobType } = (await request.json()) as {
      themeId: string;
      query?: string;
      jobType?: string;
    };
    const theme = themeId === "all" ? undefined : getTheme(themeId);
    if (themeId !== "all" && !theme) {
      return Response.json({ error: "Unknown theme" }, { status: 400 });
    }
    const themeName = theme?.name ?? "all three investment themes";
    const objectives: Record<string, string> = {
      deep_discovery:
        "Find named experts and company opportunities from relevant private-equity activity.",
      founder_origination:
        "Use a previously funded founder or ex-founder to uncover new companies, investments, boards and referrals.",
      advisor_expert_gap:
        "Identify named professionals who performed the evidenced transaction role and map their relevant deal activity.",
      identity_resolution:
        "Verify a candidate expert's identity, current role, employment history, LinkedIn profile and canonical match.",
    };
    const selectedJobType = jobType && objectives[jobType] ? jobType : "deep_discovery";
    const defaultQueries: Record<string, string> = {
      founder_origination: `"${themeName}" (founder OR ex-founder) (investment OR acquisition) ("new company" OR portfolio OR board)`,
      advisor_expert_gap: `"${themeName}" ("financial advisor" OR "legal counsel" OR diligence) (partner OR managing director)`,
      identity_resolution: `"${themeName}" expert current role LinkedIn`,
      deep_discovery: `"${themeName}" ("private equity" OR "portfolio company") experts`,
    };

    const job = await callBackendApi("/discovery/jobs", {
      method: "POST",
      body: JSON.stringify({
        job_type: selectedJobType,
        theme_id: theme?.id,
        query: query || defaultQueries[selectedJobType],
        metadata: {
          source: "web-discover",
          objective: objectives[selectedJobType],
          review_gated: true,
        },
      }),
    });

    if (!job) {
      return Response.json(
        {
          error: "Set BACKEND_API_URL to create live discovery jobs.",
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
