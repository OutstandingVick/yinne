import { expect, test } from "@playwright/test";

test("Commerce Overview remains readable across viewports", async ({ page }) => {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".overview-primary")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Overview overflows at ${width}px`,
    ).toBe(true);
    if (process.env.YINNE_CAPTURE_OVERVIEW === "1") {
      await page.screenshot({ path: `/tmp/yinne-overview-${width}.png`, fullPage: true });
    }
  }
});
