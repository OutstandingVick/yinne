import { expect, test } from "@playwright/test";

test("all dashboard sections remain reachable without document overflow", async ({ page }) => {
  test.setTimeout(300_000);
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  const paths = [
    "/",
    "/commerce/orders",
    "/commerce/products",
    "/commerce/customers",
    "/commerce/inventory",
    "/payments",
    "/transactions",
    "/analytics",
    "/storefront",
    "/storefront/catalogue",
    "/storefront/settings",
    "/marketplace/manage",
    "/payment-links",
    "/checkout/sessions",
    "/refunds",
    "/invoices",
    "/subscriptions",
    "/subscription-plans",
    "/operations/locations",
    "/operations/employees",
    "/capital",
    "/developer/api-keys",
    "/developer/events",
    "/developer/audit",
    "/developer/mock-provider",
    "/settings/organization",
    "/settings/team",
    "/settings/providers",
    "/profile",
  ];
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator(".page-header h1")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  }
});
