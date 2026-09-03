import { expect, test } from "@playwright/test";

test("guest completes the Acme storefront golden path", async ({ page }) => {
  await page.goto("/store/acme-coffee");
  await expect(page.getByRole("heading", { name: "Acme Coffee", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "House Espresso" }).click();
  await expect(page.getByRole("heading", { name: "House Espresso" })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart.")).toBeVisible();
  await page.getByRole("link", { name: "Cart" }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await expect(page).toHaveURL(/\/checkout\/[A-Za-z0-9_-]{43}$/, { timeout: 15_000 });
  await page.getByLabel("Full name").fill("Storefront Guest");
  await page.getByLabel("Email").fill("storefront-guest@example.test");
  await page.getByRole("button", { name: "Pay securely" }).click();
  await expect(page).toHaveURL(/\/store\/acme-coffee\/confirmation$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Thank you for your order" })).toBeVisible();
});

test("public storefront hides unavailable resources", async ({ request }) => {
  const paused = await request.get("/v1/public/stores/not-a-store");
  expect(paused.status()).toBe(404);
  const unpublished = await request.get("/v1/public/stores/acme-coffee/products/seasonal-sample");
  expect(unpublished.status()).toBe(404);
});
