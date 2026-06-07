/**
 * Smoke tests — verify every primary page loads without error.
 * These catch deployment issues, broken builds, and 500s.
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/", label: "Command Centre" },
  { path: "/experts", label: "Expert Call List" },
  { path: "/companies", label: "Company Explorer" },
  { path: "/campaign", label: "Origination Desk" },
  { path: "/ask", label: "AI Copilot" },
  { path: "/graph", label: "Relationship Graph" },
  { path: "/discover", label: "Research Queue" },
  { path: "/reports", label: "Reports" },
  { path: "/deals", label: "Deal Intelligence" },
  { path: "/sources", label: "Source Register" },
];

for (const { path, label } of PAGES) {
  test(`${label} (${path}) loads and shows content`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    // Every page should have the header
    await expect(page.locator("header")).toBeVisible();

    // Every page should have the Expert Engine branding
    await expect(page.locator("text=EXPERT ENGINE")).toBeVisible();

    // Every page should have a main content area
    await expect(page.locator("main")).toBeVisible();

    // No raw error strings exposed to users
    const body = await page.textContent("body");
    expect(body).not.toContain("BACKEND_API_URL");
    expect(body).not.toContain("INTERNAL_SERVER_ERROR");
  });
}

test("Theme switcher changes scope", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Scope:")).toBeVisible();

  // Click a specific theme
  await page.click("button:has-text('Clean Energy Advisory')");
  await page.waitForTimeout(500);

  // Scope should reflect the selected theme
  const scopeText = await page.locator("text=Scope:").textContent();
  expect(scopeText).toContain("Clean Energy Advisory");
});

test("Expert profile loads with key sections", async ({ page }) => {
  await page.goto("/experts/james-knight");

  await expect(page.locator("h1")).toContainText("James Knight");
  await expect(page.locator("text=Why call")).toBeVisible();
  await expect(page.locator("text=Call-ready")).toBeVisible();

  // Should have action buttons
  await expect(page.locator("text=Prepare call")).toBeVisible();
  await expect(page.locator("text=View relationships")).toBeVisible();

  // Should show companies
  await expect(page.locator("text=Augusta")).toBeVisible();
});

test("Company profile loads with key sections", async ({ page }) => {
  await page.goto("/companies/zenobe");

  await expect(page.locator("h1")).toContainText("Zenob");
  await expect(page.locator("text=Investment")).toBeVisible();
});
