export function hasBackendApi() {
  return Boolean(process.env.BACKEND_API_URL);
}

export async function callBackendApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const baseUrl = process.env.BACKEND_API_URL;
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(process.env.BACKEND_API_TOKEN
        ? { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? `Backend API failed: ${response.status}`);
  }
  return data as T;
}
