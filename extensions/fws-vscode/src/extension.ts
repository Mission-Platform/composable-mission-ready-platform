import * as vscode from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  RevealOutputChannelOn,
  Trace,
  type ServerOptions,
} from 'vscode-languageclient/node';

import { registerDebugSupport } from './debug.js';
import {
  assertNodeRuntime,
  assertServerAvailable,
  assertWorkspaceRelativeExecutableAllowed,
  assertWorkspaceRelativeOverrideAllowed,
  configurationSection,
  createServerOptions,
  readConfiguration,
  resolveServerPath,
  type ForgeWebScriptConfiguration,
} from './server-path.js';

let client: ForgeWebScriptLanguageClient | undefined;

class ForgeWebScriptLanguageClient extends LanguageClient {
  protected override fillInitializeParams(parameters: Parameters<LanguageClient['fillInitializeParams']>[0]): void {
    super.fillInitializeParams(parameters);
    parameters.workspaceFolders =
      vscode.workspace.workspaceFolders?.map((folder) => ({
        uri: folder.uri.toString(),
        name: folder.name,
      })) ?? undefined;
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  registerDebugSupport(context);
  const outputChannel = vscode.window.createOutputChannel('Forge Web Script Language Server', { log: true });
  context.subscriptions.push(outputChannel);

  try {
    const configuration = readConfiguration(vscode.workspace.getConfiguration(configurationSection));
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assertWorkspaceRelativeOverrideAllowed(
      `${configurationSection}.serverPath`,
      configuration.serverPath,
      vscode.workspace.isTrusted,
    );
    assertWorkspaceRelativeExecutableAllowed(
      `${configurationSection}.nodePath`,
      configuration.nodePath,
      vscode.workspace.isTrusted,
    );
    const serverPath = resolveServerPath(context, configuration, workspaceFolder);
    outputChannel.appendLine(`Starting Forge Web Script language server: ${serverPath}`);
    await assertNodeRuntime(configuration.nodePath);
    await assertServerAvailable(serverPath);

    const serverOptions = createServerOptions(context, configuration, workspaceFolder);
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    context.subscriptions.push(fileWatcher);
    client = createLanguageClient(serverOptions, configuration, outputChannel, fileWatcher);
    context.subscriptions.push(client);
    await client.start();
    await client.setTrace(toTrace(configuration.traceServer));
  } catch (error) {
    const message = formatError(error);
    outputChannel.appendLine(`[startup] ${message}`);
    outputChannel.show(true);
    if (client !== undefined) {
      await client.dispose();
      client = undefined;
    }
    void vscode.window.showErrorMessage(`Forge Web Script language server failed to start: ${message}`);
  }
}

export async function deactivate(): Promise<void> {
  const runningClient = client;
  client = undefined;
  if (runningClient !== undefined) await runningClient.dispose();
}

export function createLanguageClient(
  serverOptions: ServerOptions,
  configuration: Pick<ForgeWebScriptConfiguration, 'traceServer'>,
  outputChannel: vscode.LogOutputChannel,
  fileWatcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*'),
): ForgeWebScriptLanguageClient {
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'fws', scheme: 'file' }],
    outputChannel,
    traceOutputChannel: outputChannel,
    revealOutputChannelOn: RevealOutputChannelOn.Error,
    synchronize: {
      fileEvents: fileWatcher,
    },
    initializationOptions: {
      trace: configuration.traceServer,
    },
  };
  return new ForgeWebScriptLanguageClient('forge-web-script', 'Forge Web Script', serverOptions, clientOptions);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toTrace(trace: ForgeWebScriptConfiguration['traceServer']): Trace {
  if (trace === 'messages') return Trace.Messages;
  if (trace === 'verbose') return Trace.Verbose;
  return Trace.Off;
}
