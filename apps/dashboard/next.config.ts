import type { NextConfig } from "next";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(process.cwd(), "../.."));

const config: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // CI runs the repository-wide ESLint command before build; avoid Next.js invoking a second,
  // framework-specific lint pass with a different configuration.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: [
    "@node-rs/argon2",
    "@node-rs/argon2-darwin-arm64",
    "@node-rs/argon2-linux-x64-gnu",
    "@node-rs/argon2-linux-x64-musl",
    "postgres",
    "pino",
  ],
  transpilePackages: [
    "@yinne/auth",
    "@yinne/application",
    "@yinne/commerce",
    "@yinne/config",
    "@yinne/contracts",
    "@yinne/core",
    "@yinne/database",
    "@yinne/organizations",
    "@yinne/sdk",
    "@yinne/ui",
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals.push({
        "@node-rs/argon2": "commonjs @node-rs/argon2",
        "@node-rs/argon2-darwin-arm64": "commonjs @node-rs/argon2-darwin-arm64",
        "@node-rs/argon2-linux-x64-gnu": "commonjs @node-rs/argon2-linux-x64-gnu",
        "@node-rs/argon2-linux-x64-musl": "commonjs @node-rs/argon2-linux-x64-musl",
      });
    }
    return config;
  },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ]);
  },
};

export default config;
