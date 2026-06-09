import { hasBackendApi } from "./backend-api";
import { hasDealDatabase } from "./deal-db";

/** True when the web app should proxy persistence to the Python API (Vercel backend secrets). */
export function shouldUseBackendPersistence(): boolean {
  return hasBackendApi();
}

/** True when this Next.js runtime can write to Supabase directly. */
export function hasLocalDealDatabase(): boolean {
  return hasDealDatabase();
}

export function persistenceUnavailableMessage(feature: string): string {
  if (!hasBackendApi() && !hasDealDatabase()) {
    return `${feature} requires BACKEND_API_URL on the web app so database secrets stay on the backend API.`;
  }
  return `${feature} is temporarily unavailable. Try again in a moment.`;
}
