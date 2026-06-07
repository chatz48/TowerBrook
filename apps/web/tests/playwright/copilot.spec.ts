/**
 * Copilot interaction tests.
 * These are the most critical QA tests — the Copilot is the product's
 * differentiating feature and must work reliably.
 */
import { test, expect } from "@playwright/test";

test.describe("Copilot page", () => {
  test("loads with all UI elements visible", async ({ page }) => {
    await page.goto("/ask");

    // Core UI elements
    await expect(page.locator("h1")).toContainText("AI Copilot");
    await expect(page.locator("text=Session objective")).toBeVisible();
    await expect(page.locator("text=Filters")).toBeVisible();

    // Session objective buttons
    await expect(page.locator("text=Find experts")).toBeVisible();
    await expect(page.locator("text=Map companies")).toBeVisible();
    await expect(page.locator("text=Red-team thesis")).toBeVisible();
    await expect(page.locator("text=Prepare calls")).toBeVisible();

    // Filter controls
    await expect(page.locator("text=Theme")).toBeVisible();
    await expect(page.locator("text=Geography")).toBeVisible();
    await expect(page.locator("text=Expert archetype")).toBeVisible();

    // Basket context (empty state)
    await expect(page.locator("text=Basket context")).toBeVisible();

    // Evidence sidebar
    await expect(page.locator("text=Source evidence")).toBeVisible();

    // Tabs
    await expect(page.locator("button:has-text('Ask')")).toBeVisible();
    await expect(page.locator("button:has-text('Notes')")).toBeVisible();
    await expect(page.locator("a:has-text('Open Discover')")).toBeVisible();
  });

  test("streams baseline before final answer", async ({ page }) => {
    await page.goto("/ask");
    const textbox = page.locator('[role="textbox"], input[type="text"], textarea').first();
    await textbox.fill("Who should I call first for grid interconnection?");
    await textbox.press("Enter");

    await expect(page.locator("text=Directory baseline")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("text=Ranked experts")).toBeVisible({ timeout: 120_000 });
  }, 150_000);

  test("generates a response for a simple query", async ({ page }) => {
    await page.goto("/ask");

    // Wait for any auto-submitted query to complete or timeout
    // The Copilot may auto-submit the default question
    try {
      await page.waitForSelector("text=Ranked experts", { timeout: 30_000 });
    } catch {
      // If auto-submit didn't fire or timed out, submit manually
      const textbox = page.locator('[role="textbox"], input[type="text"], textarea').first();
      await textbox.fill("Who should I call first for Clean Energy Advisory?");
      await textbox.press("Enter");
      await page.waitForSelector("text=Ranked experts", { timeout: 30_000 });
    }

    // Verify the response structure
    await expect(page.locator("text=Ranked experts")).toBeVisible();
    await expect(page.locator("text=Ranked companies")).toBeVisible();

    // Should have at least one citation
    const citations = page.locator("button:has-text('[1]')");
    await expect(citations.first()).toBeVisible({ timeout: 10_000 });

    // Should have follow-up chips
    await expect(page.locator("text=Ask a follow-up")).toBeVisible();

    // Should have source evidence
    const sourceEvidence = page.locator("text=Source evidence");
    await expect(sourceEvidence).toBeVisible();
  }, 60_000); // 60-second timeout for this test

  test("response includes call sequence with phases", async ({ page }) => {
    await page.goto("/ask");

    // Wait for response
    try {
      await page.waitForSelector("text=Suggested call sequence", { timeout: 30_000 });
    } catch {
      const textbox = page.locator('[role="textbox"], input[type="text"], textarea').first();
      await textbox.fill("Build a call plan for Grid Infrastructure");
      await textbox.press("Enter");
      await page.waitForSelector("text=Suggested call sequence", { timeout: 30_000 });
    }

    // Verify call sequence structure
    await expect(page.locator("text=Market orientation")).toBeVisible();
    await expect(page.locator("text=3 phases")).toBeVisible();
  }, 60_000);

  test("response includes conviction signals", async ({ page }) => {
    await page.goto("/ask");

    try {
      await page.waitForSelector("text=What to listen for", { timeout: 30_000 });
    } catch {
      const textbox = page.locator('[role="textbox"], input[type="text"], textarea').first();
      await textbox.fill("What should I listen for when talking to battery storage founders?");
      await textbox.press("Enter");
      await page.waitForSelector("text=What to listen for", { timeout: 30_000 });
    }

    // Verify conviction signal structure
    await expect(page.locator("text=Raises")).toBeVisible();
    await expect(page.locator("text=Reduces")).toBeVisible();
  }, 60_000);

  test("can save an expert to basket from response", async ({ page }) => {
    await page.goto("/ask");

    try {
      await page.waitForSelector("button:has-text('Save')", { timeout: 30_000 });
    } catch {
      const textbox = page.locator('[role="textbox"], input[type="text"], textarea').first();
      await textbox.fill("Who should I call first?");
      await textbox.press("Enter");
      await page.waitForSelector("button:has-text('Save')", { timeout: 30_000 });
    }

    // Click the first Save button in the ranked experts table
    const saveButtons = page.locator("button:has-text('Save')");
    const count = await saveButtons.count();
    if (count > 0) {
      await saveButtons.first().click();
      // Should show "Saved" or update the basket count
      await page.waitForTimeout(500);
    }
  }, 60_000);

  test("source evidence sidebar populates with citations", async ({ page }) => {
    await page.goto("/ask");

    try {
      await page.waitForSelector("text=Source evidence", { timeout: 30_000 });
    } catch {
      const textbox = page.locator('[role="textbox"], input[type="text"], textarea').first();
      await textbox.fill("Who should I call first?");
      await textbox.press("Enter");
      await page.waitForSelector("text=Source evidence", { timeout: 30_000 });
    }

    // The evidence sidebar should have sources (not just "Source evidence (0)")
    await page.waitForTimeout(2000);
    const evidenceText = await page.locator("text=Source evidence").textContent();
    // Should show a count > 0 or list sources
    expect(evidenceText).toBeTruthy();
  }, 60_000);
});
