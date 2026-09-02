import { expect, test } from "@playwright/test";

const openInvoiceToken = Buffer.alloc(32, 31).toString("base64url");

async function signIn(page: import("@playwright/test").Page) {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required for seeded E2E flows.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("owner can inspect canonical locations and employee scopes", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Locations" }).click();
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Locations" })).toContainText("HQ");

  await page.getByRole("link", { name: "Employees" }).click();
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Employees" })).toContainText("owner@acme.test");
});

test("owner sees draft, open, overdue, void, and paid invoice fixtures", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Invoices" }).click();
  const table = page.getByRole("table", { name: "Invoices" });
  await expect(table).toContainText("Draft");
  await expect(table).toContainText("INV-2026-000001");
  await expect(table).toContainText("overdue");
  await expect(table).toContainText("void");
  await expect(table).toContainText("paid");
});

test("public capability rejects unknown invoice tokens", async ({ request }) => {
  const response = await request.get(`/v1/public/invoices/${"x".repeat(43)}`);
  expect(response.status()).toBe(404);
});

test("customer can pay an issued invoice through hosted checkout", async ({ page }) => {
  await page.goto(`/invoice/${openInvoiceToken}`);
  await expect(page.getByText("INV-2026-000001")).toBeVisible();
  await page.getByRole("button", { name: "Pay invoice" }).click();
  await expect(page).toHaveURL(/\/checkout\/[A-Za-z0-9_-]{43}$/);
  await page.getByRole("button", { name: "Pay securely" }).click();
  await expect(page).toHaveURL(new RegExp(`/invoice/${openInvoiceToken}$`));
  await expect(page.getByText("Invoice paid")).toBeVisible();
});

test("paid invoice cannot start another checkout", async ({ page }) => {
  const paidToken = Buffer.alloc(32, 34).toString("base64url");
  await page.goto(`/invoice/${paidToken}`);
  await expect(page.getByText("paid", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay invoice" })).toHaveCount(0);
});
