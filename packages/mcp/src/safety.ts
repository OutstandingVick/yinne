import { createHash } from "node:crypto";
import type { AgentConfig } from "./config";

const HOUR_MS = 60 * 60 * 1000;

export class WriteGuard {
  private readonly calls: number[] = [];

  constructor(
    private readonly config: AgentConfig,
    private readonly now: () => number = Date.now,
  ) {}

  checkAmount(amount: string, label = "amount") {
    if (!/^\d+$/.test(amount) || BigInt(amount) > this.config.maxAmount) {
      throw new Error(
        `${label} exceeds YINNE_AGENT_MAX_AMOUNT (${this.config.maxAmount} minor units)`,
      );
    }
  }

  checkWrite() {
    const cutoff = this.now() - HOUR_MS;
    while (this.calls.length && this.calls[0]! <= cutoff) this.calls.shift();
    if (this.calls.length >= 20)
      throw new Error("Write limit reached: maximum 20 calls per process per hour");
    this.calls.push(this.now());
  }

  idempotencyKey(tool: string, args: unknown) {
    // Secret-derived namespace prevents identical arguments across merchants sharing a key.
    return createHash("sha256")
      .update(this.config.apiKey)
      .update("\0")
      .update(tool)
      .update("\0")
      .update(JSON.stringify(args))
      .digest("hex");
  }
}
