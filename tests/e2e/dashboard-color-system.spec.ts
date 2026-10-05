import { expect, test, type Locator } from "@playwright/test";
import { signInAsOwner } from "./support/dashboard";

const canvas = "rgb(238, 240, 244)";
const white = "rgb(255, 255, 255)";
const nearBlack = "rgb(23, 23, 23)";
const cobalt = "rgb(36, 87, 255)";
const canary = "rgb(245, 247, 73)";

async function backgroundImage(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).backgroundImage);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAsOwner(page);
});

test("brand palette tokens stay mapped to the approved colors", async ({ page }) => {
  const palette = await page.locator(".dashboard-theme").evaluate((element) => {
    const styles = getComputedStyle(element);
    return Object.fromEntries(
      ["--brand-blue", "--brand-yellow", "--brand-vanilla", "--brand-black"].map((token) => [
        token,
        styles.getPropertyValue(token).trim().toLowerCase(),
      ]),
    );
  });
  expect(palette).toEqual({
    "--brand-blue": "#2457ff",
    "--brand-yellow": "#f5f749",
    "--brand-vanilla": "#f6f5ae",
    "--brand-black": "#171717",
  });
});

test("collected balance card is the cobalt hero with white text", async ({ page }) => {
  const collected = page.locator(".yh-currency-blue");
  expect(await backgroundImage(collected)).toContain(cobalt);
  await expect(collected).toHaveCSS("color", white);
});

test("canary marks the unpaid balance card", async ({ page }) => {
  const unpaid = page.locator(".yh-currency-yellow");
  expect(await backgroundImage(unpaid)).toContain(canary);
  await expect(unpaid).toHaveCSS("color", nearBlack);
});

test("icon rail sits on the soft canvas with white inactive icons", async ({ page }) => {
  await expect(page.locator(".rail")).toHaveCSS("background-color", canvas);
  const inactive = page.locator(".rail-button:not([data-active])").first();
  await expect(inactive).toHaveCSS("background-color", white);
  await expect(inactive).toHaveCSS("color", nearBlack);
});

test("cobalt marks the active section and the primary action", async ({ page }) => {
  const active = page.locator(".rail-button[data-active]");
  await expect(active).toHaveCount(1);
  expect(await backgroundImage(active)).toContain(cobalt);
  await expect(active).toHaveCSS("color", white);
  expect(await backgroundImage(page.locator(".yh-actions .yh-pill-primary"))).toContain(cobalt);
});

test("content cards stay white on the canvas", async ({ page }) => {
  await expect(page.locator(".content")).toHaveCSS("background-color", canvas);
  await expect(page.locator(".yh-overview")).toHaveCSS("background-color", white);
  await expect(page.locator(".yh-orders")).toHaveCSS("background-color", white);
});

test("rail flyouts are near-black with a cobalt current page", async ({ page }) => {
  await page.goto("/payments");
  const group = page.locator(".rail-group", {
    has: page.getByRole("link", { name: "Payment Links", includeHidden: true }),
  });
  await group.locator(".rail-button").hover();
  const flyout = group.locator(".rail-flyout");
  await expect(flyout).toBeVisible();
  await expect(flyout).toHaveCSS("background-color", nearBlack);
  await expect(flyout.locator('[aria-current="page"]')).toHaveCSS("background-color", cobalt);
});

test("mobile navigation keeps the dark drawer with a cobalt marker", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS("background-color", nearBlack);
  const active = drawer.locator('.nav-link[aria-current="page"]');
  expect(
    await active.evaluate((element) => getComputedStyle(element, "::before").backgroundColor),
  ).toBe(cobalt);
});

test("rail brand mark shows the Yinne icon and links home", async ({ page }) => {
  const brand = page.getByRole("link", { name: "Yinne home" });
  await expect(brand).toHaveAttribute("href", "/");
  await expect(brand.locator("img")).toHaveAttribute("src", /yinne-icon\.svg/);
});

test("test-mode marker uses a compact canary badge", async ({ page }) => {
  const badge = page.locator(".topbar > .badge");
  await expect(badge).toHaveCSS("background-color", canary);
  await expect(badge).toHaveCSS("color", nearBlack);
});

test("overview notice is white with a canary accent bar", async ({ page }) => {
  const notice = page.locator(".yh > .notice");
  await expect(notice).toHaveCSS("background-color", white);
  expect(
    await notice.evaluate((element) => getComputedStyle(element, "::before").backgroundColor),
  ).toBe(canary);
});

test("chart roles keep cobalt primary and canary comparison", async ({ page }) => {
  const chart = await page.locator(".dashboard-theme").evaluate((element) => {
    const styles = getComputedStyle(element);
    return ["--chart-primary", "--chart-comparison", "--chart-range", "--chart-reference"].map(
      (token) => styles.getPropertyValue(token).trim().toLowerCase(),
    );
  });
  expect(chart).toEqual(["#2457ff", "#f5f749", "#f6f5ae", "#171717"]);
});

test("shared shell palette carries through to Payments", async ({ page }) => {
  await page.goto("/payments");
  await expect(page.locator(".rail")).toHaveCSS("background-color", canvas);
  await expect(page.locator(".content")).toHaveCSS("background-color", canvas);
  await expect(page.locator(".topbar > .badge")).toHaveCSS("background-color", canary);
  await expect(page.locator(".table-wrap")).toHaveCSS("background-color", white);
});

test("secondary actions stay white with near-black text", async ({ page }) => {
  const action = page.locator(".yh-pill:not(.yh-pill-primary)").first();
  await expect(action).toHaveCSS("background-color", white);
  await expect(action).toHaveCSS("color", nearBlack);
});

test("semantic status badges retain their meaning outside brand accents", async ({ page }) => {
  await page.goto("/payments");
  const status = page.locator(".table-wrap .badge-success").first();
  await expect(status).toHaveCSS("background-color", "rgb(234, 246, 239)");
  await expect(status).toHaveCSS("color", "rgb(23, 96, 58)");
});
