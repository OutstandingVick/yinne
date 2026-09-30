import { expect, test } from "@playwright/test";

test("operations and intelligence views preserve content and narrow-width access", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  const screens = [
    ["/operations/locations", "Locations"],
    ["/operations/employees", "Employees"],
    ["/settings/providers", "Providers"],
    ["/settings/organization", "Organization"],
    ["/settings/team", "Team"],
    ["/analytics/sales", "Sales analytics"],
    ["/analytics/payments", "Payment analytics"],
    ["/analytics/customers", "Customer analytics"],
    ["/analytics/subscriptions", "Subscription analytics"],
    ["/analytics/invoices", "Invoice analytics"],
    ["/analytics/locations", "Location analytics"],
    ["/analytics/products", "Product analytics"],
    ["/capital", "Capital"],
  ] as const;
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [href, title] of screens) {
      await page.goto(href);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator(".core-screen")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${title} at ${width}px`,
      ).toBe(true);
    }
  }

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/operations/locations");
  await page
    .getByRole("table", { name: "Locations" })
    .getByRole("row")
    .nth(1)
    .getByRole("link")
    .click();
  await expect(page.locator(".core-detail-grid")).toBeVisible();
  await page.goto("/operations/employees");
  await page
    .getByRole("table", { name: "Employees" })
    .getByRole("row")
    .nth(1)
    .getByRole("link")
    .click();
  await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
