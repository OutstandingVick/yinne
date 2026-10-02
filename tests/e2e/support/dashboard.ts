import { expect, type Page } from "@playwright/test";

export const homeHeading = /^Welcome back, .+!$/;

/** Signs in as the seeded owner and waits for the Home overview. */
export async function signInAsOwner(page: Page) {
  const password = process.env.YINNE_SEED_PASSWORD;
  if (!password) throw new Error("YINNE_SEED_PASSWORD is required for seeded E2E flows.");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("owner@acme.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: homeHeading })).toBeVisible();
}

/**
 * Opens a dashboard page through the desktop icon rail: hovers the section icon to reveal its
 * flyout, then clicks the page link inside it, the way a pointer user would.
 */
export async function navigateWithRail(page: Page, pageName: string) {
  // Flyout links are hidden until their icon is hovered, so locate the group with includeHidden.
  const hiddenLink = page.getByRole("link", { name: pageName, exact: true, includeHidden: true });
  const group = page.locator(".rail-group").filter({ has: hiddenLink });
  await group.locator(".rail-button").hover();
  await group.locator(".rail-flyout").getByRole("link", { name: pageName, exact: true }).click();
}
