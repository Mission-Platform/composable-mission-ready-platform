#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';

import { registerFlintLsp } from './server.js';

export async function main(): Promise<void> {
  const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
  registerFlintLsp(connection);
  process.stderr.write('[flint-lsp] Flint language server ready (stdio).\n');
  await connection.listen();
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const entryPath = realpathSync(path.resolve(process.argv[1]));
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    return entryPath === modulePath;
  } catch {
    const entryPath = path.resolve(process.argv[1]);
    const modulePath = fileURLToPath(import.meta.url);
    return entryPath === modulePath || entryPath + '.js' === modulePath || entryPath + '.ts' === modulePath;
  }
}

if (isDirectExecution()) {
  try {
    await main();
  } catch (error: unknown) {
    process.stderr.write(`[flint-lsp] ${String(error)}\n`);
    process.exitCode = 1;
  }
}
