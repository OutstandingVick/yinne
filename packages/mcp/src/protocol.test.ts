import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { YinneClient } from "@yinne/sdk";
import { describe, expect, it, vi } from "vitest";
import type { AgentConfig } from "./config";
import { createServer } from "./server";

const config: AgentConfig = {
  apiKey: "test-only-placeholder",
  baseUrl: "https://example.invalid",
  mode: "read",
  maxAmount: 5_000_000n,
};

describe("MCP protocol", () => {
  it("lists only read tools and returns structured JSON", async () => {
    const sdk = {
      analytics: {
        overview: vi.fn().mockResolvedValue({ metrics: { net_collected: { NGN: "1200" } } }),
        sales: vi.fn().mockResolvedValue({ refunds: { NGN: "100" } }),
      },
      orders: {
        list: vi
          .fn()
          .mockResolvedValue({
            data: [],
            has_more: false,
            next_cursor: null,
            request_id: "req_test",
          }),
      },
    } as unknown as YinneClient;
    const server = createServer(config, sdk);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("get_overview");
      expect(tools.tools.map((tool) => tool.name)).not.toContain("draft_invoice");
      const result = await client.callTool({
        name: "get_overview",
        arguments: { from: "2026-10-01T00:00:00.000Z", to: "2026-10-02T00:00:00.000Z" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        collected: [{ currency: "NGN", amount: "1200", formatted_amount: "NGN 12.00" }],
        refunded: [{ currency: "NGN", amount: "100", formatted_amount: "NGN 1.00" }],
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
