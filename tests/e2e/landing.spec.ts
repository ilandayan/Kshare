import { test, expect } from "@playwright/test";

test.describe("Pages publiques", () => {
  test("la landing affiche le titre et les sections clés", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Kshare/);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /notre mission/i })).toBeVisible();
  });

  test("la navbar contient les liens de navigation", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /notre mission/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /client/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /contact/i })).toBeVisible();
  });

  test("/notre-mission est accessible et a un titre", async ({ page }) => {
    await page.goto("/notre-mission");
    await expect(page).toHaveTitle(/Notre mission/i);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("/faq est accessible et affiche les questions", async ({ page }) => {
    await page.goto("/faq");
    await expect(page).toHaveTitle(/FAQ/i);
    await expect(page.locator("h1")).toBeVisible();
    // Au moins une question visible
    await expect(page.getByText("Qu'est-ce que Kshare")).toBeVisible();
  });

  test("/contact est accessible", async ({ page }) => {
    await page.goto("/contact");
    await expect(page).toHaveTitle(/Contact/i);
  });

  test("/cgu est accessible", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page).toHaveTitle(/Conditions/i);
  });

  test("/confidentialite est accessible", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page).toHaveTitle(/confidentialité/i);
  });

  test("les routes privées redirigent vers /connexion", async ({ page }) => {
    await page.goto("/shop/dashboard");
    await expect(page).toHaveURL(/connexion/);
  });

  test("robots.txt est servi correctement", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("Sitemap:");
    expect(text).toContain("Disallow: /shop/");
  });

  test("sitemap.xml est servi correctement", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("<loc>https://k-share.fr</loc>");
    expect(text).toContain("<loc>https://k-share.fr/faq</loc>");
  });
});
