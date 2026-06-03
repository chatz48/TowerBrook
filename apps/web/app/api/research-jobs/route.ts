import { callIntelligenceApi } from "@/lib/intelligence-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callIntelligenceApi("/discovery/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Set INTELLIGENCE_API_URL to create research jobs." },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create research job" },
      { status: 500 },
    );
  }
}
