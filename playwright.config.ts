import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env", quiet: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // CI tests a production build: `next dev` compiles each route on first visit, which on
    // 2-core runners outlasts navigation and action timeouts. Locally the dev server is kept.
    command: process.env.CI
      ? "YINNE_ALLOWED_ORIGINS=http://127.0.0.1:3010 pnpm --filter @yinne/dashboard build && YINNE_ALLOWED_ORIGINS=http://127.0.0.1:3010 pnpm --filter @yinne/dashboard start --port 3010"
      : "YINNE_ALLOWED_ORIGINS=http://127.0.0.1:3010 pnpm --filter @yinne/dashboard dev:e2e",
    url: "http://127.0.0.1:3010/v1/health",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 420_000 : 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
