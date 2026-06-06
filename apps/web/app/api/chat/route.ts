import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callBackendApi("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Live Copilot is not connected in this demo. You can still browse experts, companies, and the research queue." },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
