import { callBackendApi } from "@/lib/backend-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const result = await callBackendApi(
      `/discovery/candidates/${encodeURIComponent(id)}/review`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    return Response.json(result ?? {});
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to review discovery candidate" },
      { status: 500 },
    );
  }
}
