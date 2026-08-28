import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["{packages,modules,apps}/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: { reporter: ["text", "json", "html"] },
  },
});
