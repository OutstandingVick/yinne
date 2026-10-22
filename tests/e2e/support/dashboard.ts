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
  const href = await group
    .locator(".rail-flyout")
    .getByRole("link", { name: pageName, exact: true, includeHidden: true })
    .getAttribute("href");
  // A click can be swallowed while Next.js is still refreshing after a server action, so
  // retry until the URL actually changes.
  await expect(async () => {
    await group.locator(".rail-button").hover();
    await group.locator(".rail-flyout").getByRole("link", { name: pageName, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  // Move the pointer off the rail so its hover flyout cannot cover the page under test.
  const viewport = page.viewportSize();
  if (viewport) await page.mouse.move(viewport.width - 1, viewport.height - 1);
}

/**
 * Calls the API from inside the signed-in page, like the dashboard does. Production builds mark
 * the session cookie Secure, and Playwright's standalone request context will not send Secure
 * cookies over plain http, so `page.request` would look signed out.
 */
export async function fetchFromPage(page: Page, path: string, init?: RequestInit) {
  const { status, body } = await page.evaluate(
    async ([url, options]) => {
      const response = await fetch(url, options);
      return { status: response.status, body: await response.text() };
    },
    [path, init ?? {}] as const,
  );
  return {
    status: () => status,
    ok: () => status >= 200 && status < 300,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body) as unknown),
  };
}
