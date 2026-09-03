import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  createDebugAdapterDescriptorFactory,
  createDebugConfigurationProvider,
  readDebugSettings,
  resolveDebugAdapterPath,
} from './debug.js';

const mocks = vi.hoisted(() => {
  class DebugAdapterExecutable {
    public readonly command: string;
    public readonly arguments_: readonly string[];
    public readonly options: { readonly cwd: string };

    public constructor(command: string, arguments_: readonly string[], options: { readonly cwd: string }) {
      this.command = command;
      this.arguments_ = arguments_;
      this.options = options;
    }
  }

  const configurationValues: Record<string, unknown> = {
    nodePath: 'node',
    dapPath: '',
    runtimePath: '/opt/forge-runtime',
    runtimeArgs: ['--debug'],
  };
  const workspace = {
    isTrusted: true,
    getConfiguration: vi.fn(() => ({
      get: vi.fn(<T>(section: string, defaultValue: T): T => (configurationValues[section] ?? defaultValue) as T),
    })),
  };
  const debug = {
    registerDebugConfigurationProvider: vi.fn((_type: string, provider: unknown) => provider),
    registerDebugAdapterDescriptorFactory: vi.fn((_type: string, factory: unknown) => factory),
  };
  return { configurationValues, workspace, debug, DebugAdapterExecutable };
});

vi.mock('vscode', () => ({
  workspace: mocks.workspace,
  debug: mocks.debug,
  DebugAdapterExecutable: mocks.DebugAdapterExecutable,
}));

describe('Forge Web Script VS Code debugger', () => {
  it('reads shared Node, adapter, and Forge runtime settings', () => {
    const values: Record<string, unknown> = {
      nodePath: ' /opt/node24 ',
      dapPath: ' tools/dap.mjs ',
      runtimePath: ' /opt/forge ',
      runtimeArgs: ['--trace', 42],
    };

    expect(
      readDebugSettings({
        get<T>(section: string, defaultValue: T): T {
          return (values[section] ?? defaultValue) as T;
        },
      }),
    ).toEqual({
      nodePath: '/opt/node24',
      dapPath: 'tools/dap.mjs',
      runtimePath: '/opt/forge',
      runtimeArgs: ['--trace'],
    });
  });

  it('resolves the packaged adapter and workspace-relative override', () => {
    expect(resolveDebugAdapterPath({ extensionPath: '/extension' }, { dapPath: '' })).toBe(
      '/extension/server/dap/dist/main.js',
    );
    expect(
      resolveDebugAdapterPath(
        { extensionPath: '/extension' },
        { dapPath: 'tools/dap.mjs' },
        { uri: { fsPath: '/workspace' } as never },
      ),
    ).toBe('/workspace/tools/dap.mjs');
  });

  it('fills a launch configuration from workspace defaults', async () => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.dapPath = path.join(path.resolve(import.meta.dirname, '..'), 'package.json');
    const provider = createDebugConfigurationProvider({ extensionPath: path.resolve(import.meta.dirname, '..') });
    const resolved = await provider.resolveDebugConfiguration?.(
      { uri: { fsPath: '/workspace' } } as never,
      { type: 'fws', request: 'launch' } as never,
    );

    expect(resolved).toMatchObject({
      type: 'fws',
      request: 'launch',
      name: 'Launch Forge Web Script',
      program: '${file}',
      cwd: '${workspaceFolder}',
      runtimePath: '/opt/forge-runtime',
      runtimeArgs: ['--debug'],
      args: [],
    });
  });

  it('rejects a workspace-relative adapter override in an untrusted workspace', async () => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.dapPath = 'tools/dap.mjs';
    mocks.workspace.isTrusted = false;
    try {
      const provider = createDebugConfigurationProvider({ extensionPath: path.resolve(import.meta.dirname, '..') });

      await expect(
        provider.resolveDebugConfiguration?.(
          { uri: { fsPath: '/workspace' } } as never,
          { type: 'fws', request: 'launch' } as never,
        ),
      ).rejects.toThrow(/untrusted workspace/u);
    } finally {
      mocks.workspace.isTrusted = true;
    }
  });

  it('rejects an absolute adapter override in an untrusted workspace', async () => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.dapPath = path.join(path.resolve(import.meta.dirname, '..'), 'package.json');
    mocks.workspace.isTrusted = false;
    try {
      const provider = createDebugConfigurationProvider({ extensionPath: path.resolve(import.meta.dirname, '..') });

      await expect(
        provider.resolveDebugConfiguration?.(
          { uri: { fsPath: '/workspace' } } as never,
          { type: 'fws', request: 'launch' } as never,
        ),
      ).rejects.toThrow(/untrusted workspace/u);
    } finally {
      mocks.workspace.isTrusted = true;
    }
  });

  it('rejects a configured runtime path in an untrusted workspace', async () => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.dapPath = path.join(path.resolve(import.meta.dirname, '..'), 'package.json');
    mocks.configurationValues.runtimePath = '/opt/forge-runtime';
    mocks.workspace.isTrusted = false;
    try {
      const provider = createDebugConfigurationProvider({ extensionPath: path.resolve(import.meta.dirname, '..') });

      await expect(
        provider.resolveDebugConfiguration?.(
          { uri: { fsPath: '/workspace' } } as never,
          { type: 'fws', request: 'launch' } as never,
        ),
      ).rejects.toThrow(/untrusted workspace/u);
    } finally {
      mocks.workspace.isTrusted = true;
    }
  });

  it('rejects a configured working directory in an untrusted workspace', async () => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.dapPath = path.join(path.resolve(import.meta.dirname, '..'), 'package.json');
    mocks.configurationValues.runtimePath = '';
    mocks.workspace.isTrusted = false;
    try {
      const provider = createDebugConfigurationProvider({ extensionPath: path.resolve(import.meta.dirname, '..') });

      await expect(
        provider.resolveDebugConfiguration?.(
          { uri: { fsPath: '/workspace' } } as never,
          { type: 'fws', request: 'launch', cwd: '/tmp' } as never,
        ),
      ).rejects.toThrow(/untrusted workspace/u);
    } finally {
      mocks.workspace.isTrusted = true;
    }
  });

  it('launches the staged adapter with configured Node and workspace cwd', () => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.dapPath = path.join(path.resolve(import.meta.dirname, '..'), 'package.json');
    const factory = createDebugAdapterDescriptorFactory({ extensionPath: '/extension' });
    const descriptor = factory.createDebugAdapterDescriptor(
      {
        configuration: { cwd: 'packages' },
        workspaceFolder: { uri: { fsPath: '/workspace' } },
      } as never,
      {} as never,
    ) as unknown as InstanceType<typeof mocks.DebugAdapterExecutable>;

    expect(descriptor.command).toBe(process.execPath);
    expect(descriptor.arguments_).toEqual([path.join(path.resolve(import.meta.dirname, '..'), 'package.json')]);
    expect(descriptor.options).toEqual({ cwd: '/workspace/packages' });
  });
});
