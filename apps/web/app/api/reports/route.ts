import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callBackendApi("/reports", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Set BACKEND_API_URL to enable source-backed report generation." },
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
