import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { navigateWithRail } from "./support/dashboard";

async function signIn(page: Page) {
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
  await navigateWithRail(page, "Locations");
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Locations" })).toContainText("Ikeja Flagship");

  await navigateWithRail(page, "Employees");
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Employees" })).toContainText("owner@acme.test");
});

test("owner sees draft, open, overdue, void, and paid invoice fixtures", async ({ page }) => {
  await signIn(page);
  await navigateWithRail(page, "Invoices");
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

/**
 * Creates a draft through the dashboard form and issues it through the API, because the
 * one-time public invoice URL is only returned in the issue response.
 */
async function issueFreshInvoice(page: Page) {
  await signIn(page);
  await page.goto("/invoices/new");
  await page.getByLabel("Description").fill(`E2E invoice ${Date.now()}`);
  await page.getByLabel("Unit amount (minor units)").fill("250000");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);
  const invoiceId = new URL(page.url()).pathname.split("/").at(-1)!;
  const response = await page.request.post(`/v1/invoices/${invoiceId}/issue`, {
    headers: {
      origin: new URL(page.url()).origin,
      "idempotency-key": crypto.randomUUID() + crypto.randomUUID(),
    },
  });
  expect(response.ok()).toBe(true);
  const { invoice } = (await response.json()) as {
    invoice: { invoice_number: string; invoice_url: string };
  };
  return invoice;
}

test("customer can pay an issued invoice through hosted checkout", async ({ page }) => {
  const invoice = await issueFreshInvoice(page);
  await page.goto(invoice.invoice_url);
  await expect(page.getByText(invoice.invoice_number)).toBeVisible();
  await page.getByRole("button", { name: "Pay invoice" }).click();
  await expect(page).toHaveURL(/\/checkout\/[A-Za-z0-9_-]{43}$/);
  await page.getByRole("button", { name: "Pay securely" }).click();
  await expect(page).toHaveURL(new RegExp(`${invoice.invoice_url}$`));
  await expect(page.getByText("Invoice paid")).toBeVisible();
});

test("paid invoice cannot start another checkout", async ({ page }) => {
  const paidToken = Buffer.alloc(32, 34).toString("base64url");
  await page.goto(`/invoice/${paidToken}`);
  await expect(page.getByText("paid", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay invoice" })).toHaveCount(0);
});
