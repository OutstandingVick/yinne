import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page) {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required for seeded E2E flows.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("owner views canonical analytics and domain reports", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(page.getByText("Net collected", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Payments" }).click();
  await expect(page.getByRole("heading", { name: "Payment analytics" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Payment analytics" })).toContainText(
    "success rate",
  );
});

test("analytics API partitions currencies and validates ranges", async ({ page }) => {
  await signIn(page);
  const valid = await page.request.get(
    "/v1/analytics/sales?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z&timezone=Africa%2FLagos",
  );
  expect(valid.status()).toBe(200);
  const body = (await valid.json()) as {
    gmv: Record<string, string>;
    meta: { formula_version: string };
  };
  expect(body.gmv.USD).toBe("2500");
  expect(body.gmv.NGN).toBeTruthy();
  expect(body.meta.formula_version).toBe("analytics.v1");
  const invalid = await page.request.get(
    "/v1/analytics/sales?from=2026-09-01T00%3A00%3A00.000Z&to=2026-08-01T00%3A00%3A00.000Z",
  );
  expect(invalid.status()).toBe(400);
});
