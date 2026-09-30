import { expect, test } from "@playwright/test";

test("core dashboard screens preserve navigation, content, and responsive containment", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  const screens = [
    ["/", "Commerce overview"],
    ["/commerce/orders", "Orders"],
    ["/commerce/products", "Products"],
    ["/commerce/customers", "Customers"],
    ["/payments", "Payments"],
    ["/transactions", "Transactions"],
    ["/analytics", "Analytics"],
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
      if (width === 390)
        await page.screenshot({
          path: `test-results/core-${title.toLowerCase().replaceAll(" ", "-")}-390.png`,
          fullPage: true,
        });
    }
  }

  await page.goto("/commerce/orders");
  await page.getByRole("searchbox", { name: "Search" }).fill("Acme");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page).toHaveURL(/search=Acme/);
  await page.goto("/commerce/products");
  const product = page
    .getByRole("table", { name: "Products" })
    .getByRole("row")
    .nth(1)
    .getByRole("link");
  await product.click();
  await expect(page.getByRole("table", { name: "Product variants" })).toBeVisible();
  await page.goto("/commerce/customers");
  await page
    .getByRole("table", { name: "Customers" })
    .getByRole("row")
    .nth(1)
    .getByRole("link")
    .click();
  await expect(page.locator(".core-detail-grid")).toBeVisible();
  await page.goto("/commerce/orders");
  await page
    .getByRole("table", { name: "Orders" })
    .getByRole("row")
    .nth(1)
    .getByRole("link")
    .click();
  await expect(page.getByRole("table", { name: "Order items" })).toBeVisible();
  await page.goto("/payments");
  await page
    .getByRole("table", { name: "Payments" })
    .getByRole("row")
    .nth(1)
    .getByRole("link")
    .click();
  await expect(page.getByRole("table", { name: "Payment attempts" })).toBeVisible();
});
