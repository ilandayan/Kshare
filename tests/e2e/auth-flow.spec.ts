import { test, expect } from "@playwright/test";

test.describe("Parcours authentification", () => {
  test("la page /connexion est accessible", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page).toHaveTitle(/Kshare/);
  });

  test("/shop/dashboard redirige vers /connexion sans auth", async ({ page }) => {
    await page.goto("/shop/dashboard");
    await expect(page).toHaveURL(/connexion/);
  });

  test("/asso/dashboard redirige vers /connexion sans auth", async ({ page }) => {
    await page.goto("/asso/dashboard");
    await expect(page).toHaveURL(/connexion/);
  });

  test("/client/paniers redirige vers /connexion sans auth", async ({ page }) => {
    await page.goto("/client/paniers");
    await expect(page).toHaveURL(/connexion/);
  });

  test("/kshare-admin redirige sans auth", async ({ page }) => {
    await page.goto("/kshare-admin");
    // Admin redirige vers / ou /connexion selon le middleware
    const url = page.url();
    expect(url).toMatch(/\/(connexion)?$/);
  });

  test("la page /inscription-commercant est accessible", async ({ page }) => {
    await page.goto("/inscription-commercant");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("la page /inscription-association est accessible", async ({ page }) => {
    await page.goto("/inscription-association");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("la page /mot-de-passe-oublie est accessible", async ({ page }) => {
    await page.goto("/mot-de-passe-oublie");
    await expect(page).toHaveTitle(/Kshare/);
  });
});
