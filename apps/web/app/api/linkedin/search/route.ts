import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callBackendApi("/linkedin/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Set BACKEND_API_URL to enable LinkedIn link search." },
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
