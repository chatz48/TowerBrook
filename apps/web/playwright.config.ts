import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for TowerBrook Expert Engine QA.
 *
 * Run with:
 *   npx playwright test                    # all tests, headless
 *   npx playwright test --ui               # interactive UI mode
 *   npx playwright test --headed           # see the browser
 *   npx playwright test --debug            # step through
 *
 * Targets the deployed app by default. Override with:
 *   BASE_URL=http://localhost:3000 npx playwright test
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false, // avoid rate-limiting the deployed API
  retries: 1,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  timeout: 45_000, // generous: Copilot queries can take 20s+
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
