import { hasDealDatabase } from "./deal-db";

/** True when BACKEND_API_URL is explicitly configured (production / intentional local proxy). */
export function hasConfiguredBackendApi(): boolean {
  return Boolean(process.env.BACKEND_API_URL?.trim());
}

/** True when the web app should proxy persistence to the Python API (Vercel backend secrets). */
export function shouldUseBackendPersistence(): boolean {
  return hasConfiguredBackendApi();
}

/** True when this Next.js runtime can write to Supabase directly. */
export function hasLocalDealDatabase(): boolean {
  return hasDealDatabase();
}

export function persistenceUnavailableMessage(feature: string): string {
  if (!hasConfiguredBackendApi() && !hasDealDatabase()) {
    if (process.env.NODE_ENV === "development") {
      return `${feature} needs Supabase credentials in the repo-root .env, or BACKEND_API_URL with the Python API running (pnpm api:dev). Restart pnpm dev after editing .env.`;
    }
    return `${feature} requires BACKEND_API_URL on the web app so database secrets stay on the backend API.`;
  }
  return `${feature} is temporarily unavailable. Try again in a moment.`;
}
