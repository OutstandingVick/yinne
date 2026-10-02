import { expect, test } from "@playwright/test";
import { homeHeading, navigateWithRail } from "./support/dashboard";

test("home overview composition keeps real data and existing navigation usable", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: homeHeading })).toBeVisible();

  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".yh-row-top")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Money movement" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent orders" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Home at ${width}px`,
    ).toBe(true);
    await page.screenshot({
      path: `test-results/commerce-overview-${width}.png`,
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await navigateWithRail(page, "Analytics");
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
  await page.goto("/");
  await page.locator(".yh-orders").getByRole("link", { name: "See all" }).click();
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
});
