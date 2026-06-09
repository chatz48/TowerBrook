function resolveBackendApiUrl(): string | null {
  if (process.env.BACKEND_API_URL) {
    return process.env.BACKEND_API_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8001";
  }
  return null;
}

export function hasBackendApi() {
  return Boolean(resolveBackendApiUrl());
}

export function isBackendUnreachableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /not reachable|fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND/i.test(message);
}

function formatBackendApiError(data: Record<string, unknown>, status: number): string {
  const detail = data.error ?? data.detail;
  if (typeof detail === "string" && detail.trim()) {
    if (/^internal server error$/i.test(detail.trim())) {
      return "Backend request failed. Check backend API logs for missing DeepSeek, Supabase, or embedding configuration.";
    }
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg?: unknown }).msg ?? "")
          : "",
      )
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  if (typeof detail === "object" && detail !== null && "message" in detail) {
    const message = String((detail as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  if (status === 401) {
    return "Backend API rejected the request. Check BACKEND_API_TOKEN matches the backend deployment.";
  }
  if (status === 503) {
    return "Backend persistence is not configured. Check Supabase and model secrets on the backend API deployment.";
  }
  return `Backend API failed: ${status}`;
}

export async function callBackendApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const baseUrl = resolveBackendApiUrl();
  if (!baseUrl) return null;

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(process.env.BACKEND_API_TOKEN
          ? { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` }
          : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    if (/fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND/i.test(message)) {
      throw new Error(
        process.env.NODE_ENV === "development"
          ? "Backend API is not reachable. Run `pnpm api:dev` in another terminal, or remove BACKEND_API_URL to use local fallbacks."
          : "Backend API is not reachable. Check BACKEND_API_URL on the web deployment.",
      );
    }
    throw error;
  }
  const raw = await response.text();
  let data: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      data = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      if (!response.ok) {
        throw new Error(raw.slice(0, 160) || `Backend API failed: ${response.status}`);
      }
      throw new Error("Backend returned a non-JSON response.");
    }
  }
  if (!response.ok) {
    const message = formatBackendApiError(data, response.status);
    throw new Error(message);
  }
  return data as T;
}
