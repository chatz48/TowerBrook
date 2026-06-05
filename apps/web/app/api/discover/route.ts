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
    const keywordClause = theme
      ? theme.keywords.slice(0, 4).map((keyword) => `"${keyword}"`).join(" OR ")
      : '"clean energy advisory" OR "grid infrastructure" OR "smart water"';
    const defaultQueries: Record<string, string> = {
      founder_origination: `(${keywordClause}) (founder OR ex-founder OR CEO) ("private equity" OR acquisition OR investment) ("new company" OR portfolio OR board OR advisor)`,
      advisor_expert_gap: `(${keywordClause}) ("financial advisor" OR "legal counsel" OR lender OR diligence) (partner OR managing director OR deal team)`,
      identity_resolution: `(${keywordClause}) expert "current role" "public profile" deal team`,
      deep_discovery: `(${keywordClause}) ("private equity" OR "portfolio company" OR "secondary buyout" OR "majority investment") (advisor OR counsel OR lender OR founder OR CEO)`,
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
          error:
            "Live enrichment is not connected in this demo. You can still review the static coverage queue and use the suggested searches.",
          demoMode: true,
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
