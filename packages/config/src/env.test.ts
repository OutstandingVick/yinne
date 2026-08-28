import { afterEach, describe, expect, it } from "vitest";
import { env, resetEnvironmentForTests } from "./index";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  resetEnvironmentForTests();
});

describe("environment validation", () => {
  it("rejects short secrets without exposing their values", () => {
    process.env.DATABASE_URL = "postgresql://localhost/yinne";
    process.env.AUTH_SECRET = "short";
    process.env.API_KEY_PEPPER = "also-short";
    expect(() => env()).toThrow("AUTH_SECRET");
  });
});
