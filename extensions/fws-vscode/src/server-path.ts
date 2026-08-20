import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

import type { ExtensionContext, WorkspaceFolder } from 'vscode';
import type { Executable, ServerOptions } from 'vscode-languageclient/node';

export const configurationSection = 'forgeWebScript';

export type ForgeWebScriptTrace = 'off' | 'messages' | 'verbose';

export interface ForgeWebScriptConfiguration {
  readonly nodePath: string;
  readonly serverPath: string;
  readonly serverArgs: readonly string[];
  readonly traceServer: ForgeWebScriptTrace;
}

export interface ConfigurationReader {
  get<T>(section: string, defaultValue: T): T;
}

export const defaultConfiguration: ForgeWebScriptConfiguration = {
  nodePath: 'node',
  serverPath: '',
  serverArgs: [],
  traceServer: 'off',
};

export function readConfiguration(configuration: ConfigurationReader): ForgeWebScriptConfiguration {
  const traceServer = configuration.get<string>('trace.server', defaultConfiguration.traceServer);
  return {
    nodePath: configuration.get('nodePath', defaultConfiguration.nodePath).trim() || defaultConfiguration.nodePath,
    serverPath: configuration.get('serverPath', defaultConfiguration.serverPath).trim(),
    serverArgs: configuration
      .get('serverArgs', defaultConfiguration.serverArgs)
      .filter((argument): argument is string => typeof argument === 'string'),
    traceServer: traceServer === 'messages' || traceServer === 'verbose' ? traceServer : 'off',
  };
}

export function resolveServerPath(
  context: Pick<ExtensionContext, 'extensionPath'>,
  configuration: Pick<ForgeWebScriptConfiguration, 'serverPath'>,
  workspaceFolder?: Pick<WorkspaceFolder, 'uri'>,
): string {
  if (configuration.serverPath.length === 0) return path.join(context.extensionPath, 'server', 'dist', 'main.js');
  if (path.isAbsolute(configuration.serverPath)) return configuration.serverPath;
  return path.resolve(workspaceFolder?.uri.fsPath ?? context.extensionPath, configuration.serverPath);
}

export function createServerOptions(
  context: Pick<ExtensionContext, 'extensionPath'>,
  configuration: ForgeWebScriptConfiguration,
  workspaceFolder?: Pick<WorkspaceFolder, 'uri'>,
): ServerOptions {
  const serverPath = resolveServerPath(context, configuration, workspaceFolder);
  const executable: Executable = {
    command: configuration.nodePath,
    args: [serverPath, ...configuration.serverArgs],
    options: {
      cwd: workspaceFolder?.uri.fsPath ?? context.extensionPath,
    },
  };
  return executable;
}

export async function assertServerAvailable(serverPath: string): Promise<void> {
  try {
    await access(serverPath);
  } catch {
    throw new Error(
      `Forge Web Script language server was not found at ${serverPath}. Build the extension with ` +
        '`pnpm run build` or set forgeWebScript.serverPath to a valid entrypoint.',
    );
  }
}

export async function assertNodeRuntime(nodePath: string): Promise<void> {
  const version = await readNodeVersion(nodePath);
  const match = /^v(\d+)(?:\.\d+){0,2}$/u.exec(version.trim());
  const major = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isInteger(major) || major < 24) {
    throw new Error(`Forge Web Script language server requires Node.js 24 or newer; ${nodePath} reported ${version}.`);
  }
}

function readNodeVersion(nodePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(nodePath, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', () => {
      reject(
        new Error(
          `Unable to execute Node.js at ${nodePath}. Configure forgeWebScript.nodePath to Node.js 24 or newer.`,
        ),
      );
    });
    child.once('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`Node.js at ${nodePath} could not be started: ${stderr.trim() || `exit code ${code}`}.`));
    });
  });
}
