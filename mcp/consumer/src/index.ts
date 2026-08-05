#!/usr/bin/env node
/**
 * Entry point for the Mission Platform CONSUMER MCP server.
 *
 * Focuses on external consumability: package installation, framework selection,
 * and component usage.
 */
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { registerResources } from "@mission-platform/mcp-shared/resources/index";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerTools } from "./tools/index.ts";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mission-platform-mcp-consumer",
    version: "0.1.0",
  });
  registerTools(server);
  registerResources(server);
  // Consumer server might not need the same developer prompts, or we can add specific ones later.
  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  process.stderr.write(
    "[mission-mcp-consumer] Mission Platform CONSUMER MCP server ready (stdio).\n",
  );
  await server.connect(transport);
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const entryPath = realpathSync(resolve(process.argv[1]));
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    return entryPath === modulePath;
  } catch {
    const entryPath = resolve(process.argv[1]);
    const modulePath = fileURLToPath(import.meta.url);
    return (
      entryPath === modulePath ||
      entryPath + ".js" === modulePath ||
      entryPath + ".ts" === modulePath
    );
  }
}

if (isDirectExecution()) {
  await main();
}
