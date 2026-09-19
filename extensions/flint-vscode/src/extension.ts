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
  type FlintConfiguration,
} from './server-path.js';

let client: FlintLanguageClient | undefined;

/**
 * Custom LanguageClient implementation providing workspace folder parameter initialization.
 */
class FlintLanguageClient extends LanguageClient {
  /**
   * Enriches initialization parameters with active VS Code workspace folders.
   *
   * @param parameters LSP initialize parameters.
   */
  protected override fillInitializeParams(parameters: Parameters<LanguageClient['fillInitializeParams']>[0]): void {
    super.fillInitializeParams(parameters);
    parameters.workspaceFolders =
      vscode.workspace.workspaceFolders?.map((folder) => ({
        uri: folder.uri.toString(),
        name: folder.name,
      })) ?? undefined;
  }
}

/**
 * Activates the Flint VS Code extension and starts the language server and debug support.
 *
 * @param context VS Code ExtensionContext.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  registerDebugSupport(context);
  const outputChannel = vscode.window.createOutputChannel('Flint Language Server', { log: true });
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
    outputChannel.appendLine(`Starting Flint language server: ${serverPath}`);
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
    vscode.window.showErrorMessage(`Flint language server failed to start: ${message}`);
  }
}

/**
 * Deactivates the extension and disposes running language client instances.
 */
export async function deactivate(): Promise<void> {
  const runningClient = client;
  client = undefined;
  if (runningClient !== undefined) await runningClient.dispose();
}

/**
 * Creates and configures the Flint language server client.
 *
 * @param serverOptions Language server process configuration.
 * @param configuration User configuration options.
 * @param outputChannel Log output channel for LSP communications.
 * @param fileWatcher File system watcher for workspace sync.
 * @returns Configured FlintLanguageClient.
 */
export function createLanguageClient(
  serverOptions: ServerOptions,
  configuration: Pick<FlintConfiguration, 'traceServer'>,
  outputChannel: vscode.LogOutputChannel,
  fileWatcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*'),
): FlintLanguageClient {
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'flint', scheme: 'file' }],
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
  return new FlintLanguageClient('flint', 'Flint', serverOptions, clientOptions);
}

/**
 * Extracts error message from an unknown error value.
 *
 * @param error Caught error object.
 * @returns Formatted error string.
 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Maps configuration trace string to LSP Trace enum value.
 *
 * @param trace Configured trace mode.
 * @returns Trace enum value.
 */
function toTrace(trace: FlintConfiguration['traceServer']): Trace {
  if (trace === 'messages') return Trace.Messages;
  if (trace === 'verbose') return Trace.Verbose;
  return Trace.Off;
}
