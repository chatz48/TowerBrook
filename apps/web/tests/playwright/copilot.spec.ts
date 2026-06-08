/**
 * Copilot interaction tests.
 */
import { test, expect } from "@playwright/test";
import { clearBasketState, expectBasketCount, makeBasketItem, seedBasketOnPage } from "./helpers/basket";
import { requireLiveBackend } from "./helpers/backend-guard";
import {
  ensureCopilotResponse,
  rankedCompaniesHeading,
  rankedExpertsHeading,
  submitCopilotQuestion,
  waitForCopilotBaseline,
  waitForCopilotEnrichment,
  waitForRankedExperts,
} from "./helpers/copilot";

test.describe("Copilot page @copilot", () => {
  test.beforeEach(async ({ page }) => {
    await clearBasketState(page);
  });

  test("@copilot loads with all UI elements visible", async ({ page }) => {
    await page.goto("/ask");

    const filters = page.getByRole("complementary");
    await expect(page.locator("h1")).toContainText("AI Copilot");
    await expect(page.locator("text=Session objective")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
    await expect(page.locator("text=Find experts")).toBeVisible();
    await expect(page.locator("text=Map companies")).toBeVisible();
    await expect(page.locator("text=Red-team thesis")).toBeVisible();
    await expect(page.locator("text=Prepare calls")).toBeVisible();
    await expect(filters.getByText("Theme", { exact: true })).toBeVisible();
    await expect(filters.getByText("Geography", { exact: true })).toBeVisible();
    await expect(filters.getByText("Expert archetype", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notes" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Discover/ })).toBeVisible();
  });

  test("@copilot streams baseline before final answer", { timeout: 150_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await submitCopilotQuestion(page, "Who should I call first for grid interconnection?");
    await waitForCopilotBaseline(page);
    await waitForRankedExperts(page);
  });

  test("@copilot live backend enrichment surfaces trust badge", { timeout: 150_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await submitCopilotQuestion(page, "Who should I call first for Clean Energy Advisory?");
    await waitForCopilotEnrichment(page);
    await expect(page.getByTestId("copilot-trust-badge").first()).toBeVisible();
  });

  test("@copilot new chat clears the active conversation", { timeout: 120_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await ensureCopilotResponse(page, "Who should I call first for Clean Energy Advisory?");
    await expect(rankedExpertsHeading(page)).toBeVisible();
    await page.getByTestId("copilot-new-chat").click();
    await expect(rankedExpertsHeading(page)).not.toBeVisible();
    await expect(page.getByTestId("copilot-new-chat")).not.toBeVisible();
  });

  test("@copilot generates a response for a simple query", { timeout: 120_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await ensureCopilotResponse(page, "Who should I call first for Clean Energy Advisory?");

    await expect(rankedExpertsHeading(page)).toBeVisible();
    await expect(rankedCompaniesHeading(page)).toBeVisible();
    await expect(page.locator("button:has-text('[1]')").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Ask a follow-up")).toBeVisible();
    await expect(page.getByText("Source evidence")).toBeVisible();
  });

  test("@copilot response includes call sequence with phases", { timeout: 120_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await ensureCopilotResponse(page, "Build a call plan for Grid Infrastructure");
    await expect(page.getByText("Suggested call sequence")).toBeVisible();
    await expect(page.getByText("Market orientation")).toBeVisible();
    await expect(page.getByText("3 phases")).toBeVisible();
  });

  test("@copilot response includes conviction signals", { timeout: 120_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await ensureCopilotResponse(page, "What should I listen for when talking to battery storage founders?");
    await expect(page.getByText("What to listen for")).toBeVisible();
    await expect(page.getByText("Raises")).toBeVisible();
    await expect(page.getByText("Reduces")).toBeVisible();
  });

  test("@copilot can save an expert to basket from response", { timeout: 120_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await ensureCopilotResponse(page, "Who should I call first?");
    const saveButton = page.getByRole("button", { name: "Save" }).first();
    await saveButton.click();
    await expect(saveButton).toHaveText(/Saved/);
    await expectBasketCount(page, "1");
  });

  test("@copilot source evidence sidebar populates with citations", { timeout: 120_000 }, async ({ page }) => {
    requireLiveBackend();
    await page.goto("/ask");
    await ensureCopilotResponse(page, "Who should I call first?");
    const evidenceText = await page.locator("text=Source evidence").textContent();
    expect(evidenceText).toBeTruthy();
  });

  test("@copilot basket context panel shows quick actions", async ({ page }) => {
    await seedBasketOnPage(
      page,
      [
        makeBasketItem({
          id: "james-knight",
          kind: "call",
          name: "James Knight",
          href: "/experts/james-knight",
          status: "shortlisted",
        }),
      ],
      { skipAutoRun: true },
    );
    await page.goto("/ask");
    const basketPanel = page.getByTestId("basket-context-panel");
    await expect(basketPanel).toBeVisible();
    await expect(basketPanel.getByRole("button", { name: "Gather research" })).toBeVisible();
    await expect(basketPanel.getByRole("button", { name: "Draft outreach" })).toBeVisible();
    await expect(basketPanel.getByRole("button", { name: "Prepare calls" })).toBeVisible();
    await expect(basketPanel.getByRole("button", { name: "Draft memo section" })).toBeVisible();
  });

  test("@copilot basket auto-run submits review prompt", { timeout: 150_000 }, async ({ page }) => {
    requireLiveBackend();
    await seedBasketOnPage(page, [
      makeBasketItem({
        id: "james-knight",
        kind: "call",
        name: "James Knight",
        href: "/experts/james-knight",
        status: "shortlisted",
      }),
    ]);
    await page.goto("/ask");
    await waitForRankedExperts(page);
  });

  test("@copilot deep link with prompt auto-runs", { timeout: 150_000 }, async ({ page }) => {
    requireLiveBackend();
    const prompt = encodeURIComponent("Who should I call first for grid infrastructure?");
    await page.goto(`/ask?prompt=${prompt}`);
    await waitForRankedExperts(page);
  });
});
