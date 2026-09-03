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

test("owner views active and archived recurring plans", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Subscription Plans", exact: true }).click();
  const table = page.getByRole("table", { name: "Subscription Plans" });
  await expect(table).toContainText("Coffee Club");
  await expect(table).toContainText("Legacy Tasting Club");
  await expect(table).toContainText("archived");
});

test("owner sees active trialing past due paused and cancelled subscriptions", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Subscriptions", exact: true }).click();
  const table = page.getByRole("table", { name: "Subscriptions" });
  for (const status of ["active", "trialing", "past_due", "paused", "cancelled"])
    await expect(table).toContainText(status);
});

test("subscription detail exposes price snapshot and renewal state", async ({ page }) => {
  await signIn(page);
  await page.goto("/subscriptions/0198f000-0000-7000-8000-000000002622");
  await expect(page.getByText("past_due", { exact: true })).toBeVisible();
  await expect(page.getByText("Price snapshot")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry payment" })).toBeVisible();
});
