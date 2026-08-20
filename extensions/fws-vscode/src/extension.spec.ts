import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { activate, deactivate } from './extension.js';

const mocks = vi.hoisted(() => {
  const outputChannel = {
    appendLine: vi.fn(),
    dispose: vi.fn(),
    show: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    replace: vi.fn(),
    hide: vi.fn(),
    name: 'Forge Web Script Language Server',
    logLevel: 0,
    onDidChangeLogLevel: vi.fn(),
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const watcher = { dispose: vi.fn() };
  const folders = [
    { name: 'workspace', uri: { fsPath: '/workspace', toString: () => 'file:///workspace' } },
    { name: 'packages', uri: { fsPath: '/workspace/packages', toString: () => 'file:///workspace/packages' } },
  ];
  const configurationValues: Record<string, unknown> = {
    nodePath: process.execPath,
    serverPath: 'package.json',
    serverArgs: ['--test'],
    'trace.server': 'messages',
  };
  const workspace = {
    workspaceFolders: folders,
    getConfiguration: vi.fn(() => ({
      get: vi.fn(<T>(section: string, defaultValue: T): T => (configurationValues[section] ?? defaultValue) as T),
    })),
    createFileSystemWatcher: vi.fn(() => watcher),
  };
  const window = {
    createOutputChannel: vi.fn(() => outputChannel),
    showErrorMessage: vi.fn(),
  };
  const debug = {
    registerDebugConfigurationProvider: vi.fn((_type: string, provider: unknown) => ({ dispose: vi.fn(), provider })),
    registerDebugAdapterDescriptorFactory: vi.fn((_type: string, factory: unknown) => ({ dispose: vi.fn(), factory })),
  };
  class MockLanguageClient {
    public static readonly instances: MockLanguageClient[] = [];
    public readonly start = vi.fn().mockResolvedValue(void 0);
    public readonly dispose = vi.fn().mockResolvedValue(void 0);
    public readonly setTrace = vi.fn().mockResolvedValue(void 0);
    public readonly constructorArguments: readonly unknown[];

    public constructor(...constructorArguments: unknown[]) {
      this.constructorArguments = constructorArguments;
      MockLanguageClient.instances.push(this);
    }

    protected fillInitializeParams(_parameters: unknown): void {
      // The real client supplies rootUri and protocol defaults before the extension adds workspace folders.
    }
  }
  return { configurationValues, folders, outputChannel, watcher, workspace, window, debug, MockLanguageClient };
});

vi.mock('vscode', () => ({ workspace: mocks.workspace, window: mocks.window, debug: mocks.debug }));
vi.mock('vscode-languageclient/node', () => ({
  LanguageClient: mocks.MockLanguageClient,
  RevealOutputChannelOn: { Error: 3 },
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
}));

describe('Forge Web Script VS Code client lifecycle', () => {
  beforeEach(() => {
    mocks.configurationValues.nodePath = process.execPath;
    mocks.configurationValues.serverPath = path.join(path.resolve(import.meta.dirname, '..'), 'package.json');
    mocks.configurationValues.serverArgs = ['--test'];
    mocks.configurationValues['trace.server'] = 'messages';
    mocks.MockLanguageClient.instances.length = 0;
    vi.clearAllMocks();
  });

  it('starts the fws client with stdio settings and disposes it on deactivation', async () => {
    const extensionPath = path.resolve(import.meta.dirname, '..');
    const context = { extensionPath, subscriptions: [] as unknown[] };

    await activate(context as never);

    const instance = mocks.MockLanguageClient.instances[0];
    expect(instance).toBeDefined();
    expect(instance.constructorArguments[0]).toBe('forge-web-script');
    expect(instance.constructorArguments[2]).toMatchObject({
      command: process.execPath,
      args: [path.join(extensionPath, 'package.json'), '--test'],
      options: { cwd: '/workspace' },
    });
    expect(instance.constructorArguments[3]).toMatchObject({
      documentSelector: [{ language: 'fws', scheme: 'file' }],
      synchronize: { fileEvents: mocks.watcher },
    });
    expect(instance.setTrace).toHaveBeenCalledWith(1);

    await deactivate();

    expect(instance.dispose).toHaveBeenCalledOnce();
  });

  it('reports an invalid configured Node executable without silently activating', async () => {
    mocks.configurationValues.nodePath = '/missing/node';
    const context = { extensionPath: path.resolve(import.meta.dirname, '..'), subscriptions: [] as unknown[] };

    await activate(context as never);

    expect(mocks.MockLanguageClient.instances).toHaveLength(0);
    expect(mocks.window.showErrorMessage).toHaveBeenCalledWith(expect.stringMatching(/node/u));
    expect(mocks.outputChannel.show).toHaveBeenCalledWith(true);
  });
});
