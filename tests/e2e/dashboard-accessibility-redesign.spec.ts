import { expect, test } from "@playwright/test";

test("dashboard navigation and forms remain keyboard-accessible", async ({ page }) => {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.focus();
  await expect(menu).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Navigation" })).not.toBeVisible();

  await page.goto("/developer/api-keys");
  const keyName = page.getByRole("textbox", { name: "Key name" });
  await keyName.focus();
  await expect(keyName).toBeFocused();
  await expect(page.getByRole("group", { name: "Scopes" })).toBeVisible();
  await page.goto("/settings/organization");
  await expect(page.getByRole("textbox", { name: "Organization name" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Default currency" })).toBeVisible();
});
