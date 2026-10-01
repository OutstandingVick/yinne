import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();
});

test("brand palette tokens stay mapped to the approved colors", async ({ page }) => {
  const palette = await page.locator(".dashboard-theme").evaluate((element) => {
    const styles = getComputedStyle(element);
    return Object.fromEntries(
      ["--brand-blue", "--brand-yellow", "--brand-vanilla", "--brand-black"].map((token) => [
        token,
        styles.getPropertyValue(token).trim().toLowerCase(),
      ]),
    );
  });
  expect(palette).toEqual({
    "--brand-blue": "#2457ff",
    "--brand-yellow": "#f5f749",
    "--brand-vanilla": "#f6f5ae",
    "--brand-black": "#171717",
  });
});

test("featured commerce summary is vanilla with near-black values", async ({ page }) => {
  const hero = page.locator(".overview-featured-metric .metric-card");
  await expect(hero).toHaveCSS("background-color", "rgb(246, 245, 174)");
  await expect(hero.locator(".metric-value")).toHaveCSS("color", "rgb(23, 23, 23)");
});

test("canary stays a small accent on the featured summary", async ({ page }) => {
  await expect(page.locator(".overview-featured-metric .badge")).toHaveCSS(
    "background-color",
    "rgb(245, 247, 73)",
  );
  await expect(page.locator(".overview-featured-metric .badge")).toHaveCSS(
    "color",
    "rgb(23, 23, 23)",
  );
});

test("sidebar is near-black with neutral inactive navigation", async ({ page }) => {
  const sidebar = page.locator(".home-shell .desktop-sidebar");
  await expect(sidebar).toHaveCSS("background-color", "rgb(23, 23, 23)");
  const inactiveIcon = sidebar.locator('.nav-link:not([aria-current="page"]) svg').first();
  await expect(inactiveIcon).toHaveCSS("color", "rgb(235, 235, 235)");
});
