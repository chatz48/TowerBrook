import { callBackendApi, isBackendUnreachableError } from "@/lib/backend-api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reviewStatus = url.searchParams.get("review_status") ?? "needs_review";
  const limit = url.searchParams.get("limit") ?? "25";
  try {
    const result = await callBackendApi(
      `/discovery/candidates?review_status=${encodeURIComponent(reviewStatus)}&limit=${encodeURIComponent(limit)}`,
    );
    return Response.json(result ?? { candidates: [] });
  } catch (error) {
    if (isBackendUnreachableError(error)) {
      return Response.json({
        candidates: [],
        backend_unavailable: true,
      });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load discovery candidates" },
      { status: 500 },
    );
  }
}
