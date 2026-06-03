import { callIntelligenceApi } from "@/lib/intelligence-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callIntelligenceApi("/linkedin/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Set INTELLIGENCE_API_URL to enable LinkedIn link search." },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "LinkedIn search failed" },
      { status: 500 },
    );
  }
}
