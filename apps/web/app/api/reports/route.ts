import { callIntelligenceApi } from "@/lib/intelligence-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callIntelligenceApi("/reports", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Set INTELLIGENCE_API_URL to enable source-backed report generation." },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 },
    );
  }
}
