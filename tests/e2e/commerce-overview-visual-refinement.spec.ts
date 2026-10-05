import { expect, test } from "@playwright/test";
import { signInAsOwner } from "./support/dashboard";

const destinations = [
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
];

test("Home overview remains readable across viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAsOwner(page);

  // The rail reaches every destination through its icons and flyouts.
  const railHrefs = await page
    .locator(".desktop-sidebar nav a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(new Set(railHrefs)).toEqual(new Set(destinations));

  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".yh-row-top")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Home overflows at ${width}px`,
    ).toBe(true);
    if (width <= 900) {
      const wallet = await page.locator(".yh-wallet").boundingBox();
      const overview = await page.locator(".yh-overview").boundingBox();
      expect(wallet).not.toBeNull();
      expect(overview).not.toBeNull();
      expect(overview!.y).toBeGreaterThan(wallet!.y + wallet!.height);
    }
    if (process.env.YINNE_CAPTURE_OVERVIEW === "1") {
      await page.screenshot({ path: `/tmp/yinne-overview-${width}.png`, fullPage: true });
    }
  }
  await expect(page.getByRole("combobox", { name: "Organization" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Quick actions" })).toBeVisible();

  // The mobile drawer lists every destination in section order.
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await expect(drawer).toBeVisible();
  expect(
    await drawer
      .locator("nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(destinations);
  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(drawer).toBeHidden();
});
