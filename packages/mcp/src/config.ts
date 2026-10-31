import { z } from "zod";

const configSchema = z.object({
  YINNE_API_KEY: z.string().min(1, "YINNE_API_KEY is required"),
  YINNE_BASE_URL: z.url().default("https://app.yinne.store"),
  YINNE_AGENT_MODE: z.enum(["read", "draft", "act"]).default("read"),
  YINNE_AGENT_MAX_AMOUNT: z
    .string()
    .regex(/^[1-9]\d*$/, "YINNE_AGENT_MAX_AMOUNT must be positive minor units")
    .default("5000000"),
});

export type AgentMode = "read" | "draft" | "act";

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    // Do not include raw environment values or the API key in diagnostics.
    throw new Error(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return {
    apiKey: result.data.YINNE_API_KEY,
    baseUrl: result.data.YINNE_BASE_URL,
    mode: result.data.YINNE_AGENT_MODE,
    maxAmount: BigInt(result.data.YINNE_AGENT_MAX_AMOUNT),
  };
}

export type AgentConfig = ReturnType<typeof readConfig>;
