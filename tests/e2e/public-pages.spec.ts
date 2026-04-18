import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("FAQ page should load", async ({ page }) => {
    const response = await page.goto("/faq");
    expect(response?.status()).toBeLessThan(500);
    // Page should have some content (heading or body text)
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("CGU page should load", async ({ page }) => {
    const response = await page.goto("/cgu");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Privacy policy page should load", async ({ page }) => {
    const response = await page.goto("/confidentialite");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Notre mission page should load", async ({ page }) => {
    const response = await page.goto("/notre-mission");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Contact page should load", async ({ page }) => {
    const response = await page.goto("/contact");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Notre mission page should have meaningful content", async ({ page }) => {
    await page.goto("/notre-mission");
    // The page should contain text related to the mission
    await expect(page.locator("body")).toContainText(/mission|kshare|gaspillage|casher/i);
  });

  test("Contact page should have a form or contact info", async ({ page }) => {
    await page.goto("/contact");
    // Contact page should have either a form or contact information
    const hasForm = await page.locator("form").count();
    const hasContactText = await page.getByText(/contact|email|message/i).count();
    expect(hasForm + hasContactText).toBeGreaterThan(0);
  });

  test("CGU page should have legal content", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.locator("body")).toContainText(/condition|utilisation|kshare/i);
  });

  test("Privacy page should have privacy content", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page.locator("body")).toContainText(
      /confidentialit|donn|personnel|privacy/i
    );
  });
});
