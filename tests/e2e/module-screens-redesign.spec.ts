import { expect, test } from "@playwright/test";
import { homeHeading } from "./support/dashboard";

test("commerce and payments modules retain their content and responsive containment", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: homeHeading })).toBeVisible();

  const screens = [
    ["/storefront", "Storefront"],
    ["/storefront/catalogue", "Store catalogue"],
    ["/storefront/settings", "Store settings"],
    ["/commerce/inventory", "Inventory"],
    ["/marketplace/manage", "Marketplace"],
    ["/payment-links", "Payment Links"],
    ["/payment-links/new", "Create Payment Link"],
    ["/checkout/sessions", "Checkout Sessions"],
    ["/refunds", "Refunds"],
    ["/invoices", "Invoices"],
    ["/invoices/new", "Create invoice"],
    ["/subscriptions", "Subscriptions"],
    ["/subscriptions/new", "Create subscription"],
    ["/subscription-plans", "Subscription Plans"],
    ["/subscription-plans/new", "Create subscription plan"],
  ] as const;
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [href, title] of screens) {
      await page.goto(href);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator(".module-screen")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${title} at ${width}px`,
      ).toBe(true);
    }
  }

  await page.goto("/commerce/inventory");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await page.goto("/payment-links");
  await page.getByRole("link", { name: "Create Payment Link" }).click();
  await expect(page.getByRole("heading", { name: "Create Payment Link" })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 900 });
  for (const [list, detail, table] of [
    ["/checkout/sessions", "Checkout Sessions", "Quote items"],
    ["/invoices", "Invoices", "Invoice items"],
    ["/subscription-plans", "Subscription Plans", "Recurring Prices"],
  ] as const) {
    await page.goto(list);
    await page
      .getByRole("table", { name: detail })
      .getByRole("row")
      .nth(1)
      .getByRole("link")
      .click();
    await expect(page.getByRole("table", { name: table })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.goto("/subscriptions");
  await page
    .getByRole("table", { name: "Subscriptions" })
    .getByRole("row")
    .nth(1)
    .getByRole("link")
    .click();
  await expect(page.locator(".module-summary")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
