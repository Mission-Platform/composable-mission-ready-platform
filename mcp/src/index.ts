#!/usr/bin/env node
/**
 * Entry point for the Mission Platform MCP server.
 *
 * Assembles the server core with all tools, resources and prompts, then serves
 * the Model Context Protocol over stdio. Build with `pnpm build` (Turborepo
 * runs `tsc`) and run the compiled output with `node dist/index.js`.
 */
import { registerPrompts } from './prompts/index.ts';
import { registerResources } from './resources/index.ts';
import { registerTools } from './tools/index.ts';
import { McpServer } from './protocol/server.ts';
import { serveStdio } from './protocol/stdio.ts';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'mission-platform-mcp', version: '0.1.0' });
  registerTools(server);
  registerResources(server);
  registerPrompts(server);
  return server;
}

function main(): void {
  const server = createServer();
  process.stderr.write('[mission-mcp] Mission Platform MCP server ready (stdio).\n');
  serveStdio(server);
}

// Only start the stdio transport when executed as a program, not when imported
// by tests.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
