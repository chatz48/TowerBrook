import { callBackendApi } from "@/lib/backend-api";
import { runDealEnrichment } from "@/lib/deal-enrichment";
import {
  hasLocalDealDatabase,
  persistenceUnavailableMessage,
  shouldUseBackendPersistence,
} from "@/lib/persistence-backend";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (shouldUseBackendPersistence()) {
      const result = await callBackendApi<Record<string, unknown>>(`/deals/${id}/enrich`, {
        method: "POST",
      });
      if (!result) {
        return Response.json(
          { error: persistenceUnavailableMessage("Deal enrichment") },
          { status: 503 },
        );
      }
      return Response.json(result);
    }

    if (!hasLocalDealDatabase()) {
      return Response.json(
        { error: persistenceUnavailableMessage("Deal enrichment") },
        { status: 503 },
      );
    }

    const result = await runDealEnrichment(id);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Deal enrichment failed" },
      { status: 500 },
    );
  }
}
