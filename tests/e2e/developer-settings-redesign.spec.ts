import { expect, test } from "@playwright/test";
import { homeHeading } from "./support/dashboard";

test("developer and settings screens retain content, controls, and narrow-width access", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: homeHeading })).toBeVisible();

  const screens = [
    ["/developer/api-keys", "API keys"],
    ["/developer/events", "Domain events"],
    ["/developer/audit", "Audit logs"],
    ["/developer/mock-provider", "Deterministic Mock Provider"],
    ["/settings/organization", "Organization"],
    ["/settings/team", "Team"],
    ["/settings/providers", "Providers"],
    ["/profile", "Profile"],
  ] as const;
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [href, title] of screens) {
      await page.goto(href);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator(".core-screen")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${title} at ${width}px`,
      ).toBe(true);
      if (width === 390) {
        await page.screenshot({
          path: `test-results/phase5-${title.toLowerCase().replaceAll(" ", "-")}-390.png`,
          fullPage: true,
        });
      }
      if (width === 1440 && (title === "API keys" || title === "Team")) {
        await page.screenshot({
          path: `test-results/phase5-${title.toLowerCase().replaceAll(" ", "-")}-1440.png`,
          fullPage: true,
        });
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/developer/api-keys");
  await expect(page.getByRole("textbox", { name: "Key name" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Scopes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create test key" })).toBeVisible();
  await page.goto("/settings/team");
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Role" })).toBeVisible();
  await page.goto("/settings/organization");
  await expect(page.getByRole("button", { name: "Save organization" })).toBeVisible();
});
