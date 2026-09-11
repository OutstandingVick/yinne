import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "owner@acme.test") {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required for seeded E2E flows.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("merchant views an explainable Capital Profile", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Capital", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Capital" })).toBeVisible();
  await expect(page.getByText("Capital Score", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "72", exact: true })).toBeVisible();
  await expect(page.getByText(/Observed business stability—not a credit decision/i)).toBeVisible();
});

test("Capital shows deterministic score change and history", async ({ page }) => {
  await signIn(page);
  await page.goto("/capital");
  await expect(page.getByText("+1", { exact: true })).toBeVisible();
  const history = page.getByRole("table", { name: "Capital profile history" });
  await expect(history).toContainText("rules-1");
  await expect(history).toContainText("71");
});

test("Capital API exposes aggregate signals without customer PII", async ({ page }) => {
  await signIn(page);
  const response = await page.request.get("/v1/capital/signals");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("revenue_consistency");
  expect(body).not.toContain("customer_email");
});

test("location-only manager cannot read organization-wide Capital", async ({ page }) => {
  await signIn(page, "manager@acme.test");
  const response = await page.request.get("/v1/capital/profile");
  expect(response.status()).toBe(403);
});

test("insufficient data is represented without a poor-score fallback", async ({ page }) => {
  await signIn(page);
  const response = await page.request.get("/v1/capital/profile");
  const body = (await response.json()) as {
    profile: { status: string; missing_requirements: string[]; score: number | null };
  };
  expect(body.profile.status).toBe("scored");
  expect(body.profile.missing_requirements).toEqual([]);
  expect(body.profile.score).not.toBe(0);
});
