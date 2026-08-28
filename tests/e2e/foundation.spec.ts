import { expect, test } from "@playwright/test";

test("owner completes the Phase 1 dashboard lifecycle", async ({ page }) => {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required for the seeded E2E flow.");

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("TEST MODE", { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel("Organization")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Switch" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  await page.getByRole("link", { name: "Organization", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
  await page.getByRole("button", { name: "Save organization" }).click();

  await page.getByRole("link", { name: "API keys" }).click();
  const keyName = `E2E ${Date.now()}`;
  await page.getByLabel("Key name").fill(keyName);
  await page.getByRole("button", { name: "Create test key" }).click();
  await expect(page.getByText("Copy this secret now.", { exact: false })).toBeVisible();
  await expect(page.getByText("cannot be recovered", { exact: false })).toBeVisible();

  const keyRow = page.getByRole("row").filter({ hasText: keyName });
  await expect(keyRow).toContainText("active");
  await keyRow.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByRole("row").filter({ hasText: keyName })).toContainText("revoked");
});
