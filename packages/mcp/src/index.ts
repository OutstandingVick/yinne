import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readConfig } from "./config";
import { createServer } from "./server";

async function main() {
  const config = readConfig();
  const server = createServer(config);
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  // stderr only: stdout is reserved for MCP protocol messages.
  console.error(error instanceof Error ? error.message : "Yinne MCP failed to start");
  process.exitCode = 1;
});
