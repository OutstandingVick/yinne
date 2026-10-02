import { expect, test } from "@playwright/test";

test("Commerce Overview remains readable across viewports", async ({ page }) => {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();
  expect(
    await page
      .locator(".desktop-sidebar nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    "/",
    "/commerce/customers",
    "/commerce/products",
    "/commerce/inventory",
    "/commerce/orders",
    "/payments",
    "/checkout/sessions",
    "/payment-links",
    "/storefront",
    "/marketplace/manage",
    "/transactions",
    "/refunds",
    "/invoices",
    "/operations/locations",
    "/operations/employees",
    "/subscription-plans",
    "/subscriptions",
    "/analytics",
    "/capital",
    "/settings/team",
    "/settings/organization",
    "/settings/providers",
    "/developer/mock-provider",
    "/developer/api-keys",
    "/developer/events",
    "/developer/audit",
  ]);

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
