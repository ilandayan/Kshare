import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load successfully", async ({ page }) => {
    await expect(page).toHaveTitle(/kshare/i);
  });

  test("should display the Kshare logo in the navbar", async ({ page }) => {
    const logo = page.locator("header a[aria-label='Kshare - Accueil']");
    await expect(logo).toBeVisible();
  });

  test("should display navbar navigation links", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Notre mission" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Contact" })).toBeVisible();
  });

  test("should display hero section with headline", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Kshare – La solution solidaire");
    await expect(h1).toContainText("pour sauver des paniers casher");
  });

  test("should display CTA buttons for registration", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Inscrire mon commerce" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Inscrire mon association" })
    ).toBeVisible();
  });

  test("should display basket type chips", async ({ page }) => {
    const basketTypes = ["Bassari", "Halavi", "Parvé", "Mix", "Shabbat"];
    for (const type of basketTypes) {
      await expect(page.getByText(type, { exact: true }).first()).toBeVisible();
    }
  });

  test("should display stats section", async ({ page }) => {
    await expect(page.getByText("Paniers sauvés")).toBeVisible();
    await expect(page.getByText("Commerçants", { exact: true })).toBeVisible();
    await expect(page.getByText("Associations", { exact: true })).toBeVisible();
  });

  test("should display 'Comment ça marche' section", async ({ page }) => {
    await expect(page.getByText("Comment ça marche ?")).toBeVisible();
  });

  test("should have footer visible", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });
});
