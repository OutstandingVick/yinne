import pino from "pino";
import { env } from "@yinne/config";

export const logger = pino({
  level: env().LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "headers.authorization",
      "password",
      "*.password",
      "secret",
      "*.secret",
      "secretDigest",
      "*.secretDigest",
      "passwordHash",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
});
