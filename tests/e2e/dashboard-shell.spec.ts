import { expect, test } from "@playwright/test";

test("dashboard shell preserves navigation and reflows across viewports", async ({ page }) => {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole("heading", { name: "Commerce overview" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width < 1120) {
      const trigger = page.getByRole("button", { name: "Open navigation" });
      await trigger.click();
      const navigation = page.getByRole("dialog", { name: "Navigation" });
      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await page.keyboard.press("Escape");
      await expect(navigation).not.toBeVisible();
      await expect(trigger).toBeFocused();
    } else {
      await expect(
        page.locator(".desktop-sidebar").getByRole("link", { name: "Home", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
    await page.screenshot({ path: `test-results/dashboard-${width}.png`, fullPage: true });
  }

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog", { name: "Navigation" })
    .getByRole("link", { name: "Customers", exact: true })
    .click();
  await expect(page).toHaveURL(/\/commerce\/customers$/);
  await expect(page.getByRole("dialog", { name: "Navigation" })).not.toBeVisible();
  const table = page.getByRole("region", { name: "Customers" });
  await expect(table).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await table.focus();
  await expect(table).toBeFocused();
  await page.screenshot({ path: "test-results/customers-mobile.png", fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Switch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
