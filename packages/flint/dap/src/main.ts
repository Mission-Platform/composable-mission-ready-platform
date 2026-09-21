import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFlintDapServer } from './server.js';

/**
 * Entry point for starting the standalone Flint DAP server process on stdio.
 */
export function main(): void {
  const server = createFlintDapServer({
    input: process.stdin,
    output: process.stdout,
  });

  // skipcq: JS-D1001
  const shutdown = (): void => {
    server.dispose();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('beforeExit', shutdown);
  process.once('exit', shutdown);

  server.start();
}

/**
 * Detects whether this file was executed directly from the command line.
 *
 * @returns True if executed directly as main script.
 */
function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isDirectExecution()) main();
