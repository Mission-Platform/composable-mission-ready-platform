#!/usr/bin/env node
/**
 * Entry point for the Mission Platform MCP server using `@modelcontextprotocol/sdk`.
 *
 * Assembles the server core with all tools, resources and prompts, then serves
 * the Model Context Protocol over stdio. Build with `pnpm build` (Turborepo
 * runs `tsdown`) and run the compiled output with `node dist/index.js`.
 */
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerResources } from '@mission-platform/mcp-shared/resources/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import packageJson from '../package.json' with { type: 'json' };

import { registerPrompts } from './prompts/index.ts';
import { registerTools, type McpProfileOptions } from './tools/index.ts';

export interface CreateServerOptions extends McpProfileOptions {}

function parseCliProfiles(): { profile?: string } {
  for (let index = 2; index < process.argv.length; index++) {
    const arg = process.argv[index];
    if (arg?.startsWith('--profile=')) {
      return { profile: arg.slice('--profile='.length) };
    }
    if (arg === '--profile' && index + 1 < process.argv.length) {
      return { profile: process.argv[index + 1] };
    }
  }
  return {};
}

export function createServer(options: CreateServerOptions = {}): McpServer {
  const cli = parseCliProfiles();
  const envProfile = process.env.MISSION_MCP_PROFILE;
  const effectiveProfile = options.profile ?? cli.profile ?? envProfile;

  const server = new McpServer({ name: 'mission-platform-mcp', version: packageJson.version });
  registerTools(server, {
    profile: effectiveProfile,
    profiles: options.profiles,
    tools: options.tools,
  });
  registerResources(server);
  registerPrompts(server);
  return server;
}

export async function main(): Promise<void> {
  const cli = parseCliProfiles();
  const envProfile = process.env.MISSION_MCP_PROFILE;
  const effectiveProfile = cli.profile ?? envProfile ?? 'full';

  const server = createServer({ profile: effectiveProfile });
  const transport = new StdioServerTransport();
  process.stderr.write(`[mission-mcp] Mission Platform MCP server ready (stdio) [profile: ${effectiveProfile}].\n`);
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
    return entryPath === modulePath || entryPath + '.js' === modulePath || entryPath + '.ts' === modulePath;
  }
}

// Only start the stdio transport when executed as a program, not when imported
// by tests.
if (isDirectExecution()) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void main();
}
