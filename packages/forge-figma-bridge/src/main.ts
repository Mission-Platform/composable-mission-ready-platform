#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { startForgeBridgeServer } from './bridge.js';

interface CliOptions {
  readonly roots: Readonly<Record<string, string>>;
  readonly host?: string;
  readonly port?: number;
}

function usage(): string {
  return 'Usage: forge-figma-bridge --root <id>=<absolute-path> [--host <host>] [--port <port>]';
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  const roots: Record<string, string> = {};
  let host: string | undefined;
  let port: number | undefined;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];
    if ((argument === '--root' || argument === '--host' || argument === '--port') && value === undefined)
      throw new Error(usage());
    switch (argument) {
      case '--root': {
        const separator = value.indexOf('=');
        if (separator <= 0) throw new Error(usage());
        const id = value.slice(0, separator).trim();
        const root = value.slice(separator + 1).trim();
        if (!id || !path.isAbsolute(root)) throw new Error('Each repository root must be an absolute path.');
        roots[id] = root;
        index += 1;

        break;
      }
      case '--host': {
        host = value;
        index += 1;

        break;
      }
      case '--port': {
        port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65_535)
          throw new Error('The port must be between 0 and 65535.');
        index += 1;

        break;
      }
      default: {
        throw new Error(usage());
      }
    }
  }
  if (Object.keys(roots).length === 0) throw new Error(usage());
  return { roots, ...(host === undefined ? {} : { host }), ...(port === undefined ? {} : { port }) };
}

export async function main(arguments_: readonly string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArguments(arguments_);
  const server = await startForgeBridgeServer({
    repositoryRoots: options.roots,
    host: options.host,
    port: options.port,
  });
  const address = server.address();
  process.stdout.write(
    `Forge Figma bridge listening on ${typeof address === 'object' && address ? address.port : address}\n` +
      `Forge Figma bridge authentication token: ${server.authToken}\n`,
  );
  const close = (): void => {
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await main();
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
