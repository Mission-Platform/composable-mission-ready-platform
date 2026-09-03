#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createForgeWebScriptDapServer } from './server.js';

export function main(): void {
  const server = createForgeWebScriptDapServer({
    input: process.stdin,
    output: process.stdout,
  });

  const shutdown = (): void => {
    server.dispose();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('beforeExit', shutdown);
  process.once('exit', shutdown);

  server.start();
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isDirectExecution()) main();
