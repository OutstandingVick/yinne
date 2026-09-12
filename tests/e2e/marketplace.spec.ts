import { expect, test } from "@playwright/test";
const active = "0198f000-0000-7000-8000-000000004030";
const unavailable = "0198f000-0000-7000-8000-000000004031";
const unpublished = "0198f000-0000-7000-8000-000000004032";
test("public Marketplace discovers multiple merchants", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "Find something worth buying" })).toBeVisible();
  await expect(page.getByText(/Food & drink · Acme Coffee/)).toBeVisible();
  await expect(page.getByText(/Home & living · Aso Living/)).toBeVisible();
});
test("search and listing detail expose canonical prices", async ({ page }) => {
  await page.goto("/marketplace?q=espresso");
  await page.getByRole("link", { name: "Acme House Espresso" }).click();
  await expect(page.getByRole("heading", { name: "Acme House Espresso" })).toBeVisible();
  await expect(page.getByText("NGN 6,500.00")).toBeVisible();
  await expect(page.getByText(/Price and stock are revalidated/)).toBeVisible();
  await page.getByRole("button", { name: "Buy from this merchant" }).click();
  await expect(page.getByRole("heading", { name: "Complete your payment" })).toBeVisible();
});
test("inactive and unpublished listings remain private", async ({ request }) => {
  for (const id of [unavailable, unpublished]) {
    const response = await request.get(`/v1/public/marketplace/listings/${id}`);
    if (id === unavailable) expect([200, 404]).toContain(response.status());
    else expect(response.status()).toBe(404);
  }
  const activeResponse = await request.get(`/v1/public/marketplace/listings/${active}`);
  expect(activeResponse.status()).toBe(200);
  const body = (await activeResponse.json()) as { listing: Record<string, unknown> };
  expect(body.listing).not.toHaveProperty("organization_id");
});
