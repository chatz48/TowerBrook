export function hasIntelligenceApi() {
  return Boolean(process.env.INTELLIGENCE_API_URL);
}

export async function callIntelligenceApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const baseUrl = process.env.INTELLIGENCE_API_URL;
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? `Intelligence API failed: ${response.status}`);
  }
  return data as T;
}
