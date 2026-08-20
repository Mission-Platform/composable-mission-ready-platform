import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertNodeRuntime,
  assertServerAvailable,
  createServerOptions,
  defaultConfiguration,
  readConfiguration,
  resolveServerPath,
} from './server-path.js';

import type { Uri } from 'vscode';

describe('Forge Web Script server launcher', () => {
  it('reads configured executable, override, arguments, and trace settings', () => {
    const values: Record<string, unknown> = {
      nodePath: ' /opt/node24 ',
      serverPath: 'tools/server.mjs',
      serverArgs: ['--trace-startup', 42],
      'trace.server': 'verbose',
    };
    const configuration = readConfiguration({
      get<T>(section: string, defaultValue: T): T {
        return (values[section] ?? defaultValue) as T;
      },
    });

    expect(configuration).toEqual({
      nodePath: '/opt/node24',
      serverPath: 'tools/server.mjs',
      serverArgs: ['--trace-startup'],
      traceServer: 'verbose',
    });
  });

  it('resolves the packaged server by default and relative overrides from the workspace', () => {
    const context = { extensionPath: '/extension' };
    const workspaceFolder = { uri: { fsPath: '/workspace' } as Uri };
    expect(resolveServerPath(context, defaultConfiguration)).toBe('/extension/server/dist/main.js');
    expect(resolveServerPath(context, { serverPath: 'tools/server.mjs' }, workspaceFolder)).toBe(
      '/workspace/tools/server.mjs',
    );
  });

  it('constructs a Node stdio executable with the workspace as its cwd', () => {
    const options = createServerOptions(
      { extensionPath: '/extension' },
      { ...defaultConfiguration, nodePath: '/opt/node24', serverPath: '/server/main.mjs', serverArgs: ['--trace'] },
      { uri: { fsPath: '/workspace' } as Uri },
    );

    expect(options).toEqual({
      command: '/opt/node24',
      args: ['/server/main.mjs', '--trace'],
      options: { cwd: '/workspace' },
    });
  });

  it('reports missing server paths with a build/configuration remedy', async () => {
    await expect(assertServerAvailable(path.join(import.meta.dirname, 'missing-server.mjs'))).rejects.toThrow(
      /pnpm run build.*serverPath/u,
    );
  });

  it('accepts the current Node runtime for the shared server', async () => {
    await expect(assertNodeRuntime(process.execPath)).resolves.toBeUndefined();
  });

  it('rejects an unavailable Node executable with an actionable setting name', async () => {
    await expect(assertNodeRuntime(path.join(import.meta.dirname, 'missing-node'))).rejects.toThrow(/nodePath/u);
  });
});
