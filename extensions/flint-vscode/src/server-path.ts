import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

import type { ExtensionContext, WorkspaceFolder } from 'vscode';
import type { Executable, ServerOptions } from 'vscode-languageclient/node';

export const configurationSection = 'flint';

/**
 * Trace verbosity level for Flint language server communication.
 */
export type FlintTrace = 'off' | 'messages' | 'verbose';

/**
 * VS Code workspace configuration schema for the Flint extension.
 */
export interface FlintConfiguration {
  readonly nodePath: string;
  readonly serverPath: string;
  readonly serverArgs: readonly string[];
  readonly traceServer: FlintTrace;
}

/**
 * Helper reader providing type-safe access to extension workspace configuration.
 */
export interface ConfigurationReader {
  get<T>(section: string, defaultValue: T): T;
}

export const defaultConfiguration: FlintConfiguration = {
  nodePath: 'node',
  serverPath: '',
  serverArgs: [],
  traceServer: 'off',
};

/**
 * Reads Flint language server configuration from the provided workspace reader.
 *
 * @param configuration Configuration reader handle.
 * @returns Parsed FlintConfiguration object.
 */
export function readConfiguration(configuration: ConfigurationReader): FlintConfiguration {
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

/**
 * Resolves the absolute path to the Flint language server entrypoint.
 *
 * @param context Extension context providing extensionPath.
 * @param configuration Configuration providing serverPath.
 * @param workspaceFolder Active workspace folder, if present.
 * @returns Absolute path to the server main.js file.
 */
export function resolveServerPath(
  context: Pick<ExtensionContext, 'extensionPath'>,
  configuration: Pick<FlintConfiguration, 'serverPath'>,
  workspaceFolder?: Pick<WorkspaceFolder, 'uri'>,
): string {
  if (configuration.serverPath.length === 0) return path.join(context.extensionPath, 'server', 'dist', 'main.js');
  if (path.isAbsolute(configuration.serverPath)) return configuration.serverPath;
  return path.resolve(workspaceFolder?.uri.fsPath ?? context.extensionPath, configuration.serverPath);
}

/**
 * Asserts that a configured relative path is only allowed in trusted workspaces.
 *
 * @param settingName Name of the configuration setting.
 * @param configuredPath Configured path string.
 * @param workspaceTrusted Whether workspace is trusted.
 */
export function assertWorkspaceRelativeOverrideAllowed(
  settingName: string,
  configuredPath: string,
  workspaceTrusted: boolean,
): void {
  if (workspaceTrusted || configuredPath.length === 0) {
    return;
  }
  throw new Error(`${settingName} cannot use a configured path in an untrusted workspace.`);
}

/**
 * Asserts that a configured working directory is allowed by workspace trust settings.
 *
 * @param settingName Name of the configuration setting.
 * @param configuredPath Configured working directory path.
 * @param workspaceTrusted Whether workspace is trusted.
 */
export function assertWorkingDirectoryAllowed(
  settingName: string,
  configuredPath: unknown,
  workspaceTrusted: boolean,
): void {
  if (
    workspaceTrusted ||
    configuredPath === undefined ||
    configuredPath === '' ||
    configuredPath === '${workspaceFolder}' // skipcq: JS-0038
  ) {
    return;
  }
  throw new Error(`${settingName} cannot use a configured path in an untrusted workspace.`);
}

/**
 * Asserts that an executable path with relative directories is only allowed in trusted workspaces.
 *
 * @param settingName Name of the configuration setting.
 * @param configuredPath Configured executable path.
 * @param workspaceTrusted Whether workspace is trusted.
 */
export function assertWorkspaceRelativeExecutableAllowed(
  settingName: string,
  configuredPath: string,
  workspaceTrusted: boolean,
): void {
  if (!configuredPath.startsWith('.') && !configuredPath.includes('/') && !configuredPath.includes('\\')) return;
  assertWorkspaceRelativeOverrideAllowed(settingName, configuredPath, workspaceTrusted);
}

/**
 * Creates ServerOptions for launching the Flint LSP process.
 *
 * @param context Extension context.
 * @param configuration Flint configuration.
 * @param workspaceFolder Active workspace folder.
 * @returns Executable server options.
 */
export function createServerOptions(
  context: Pick<ExtensionContext, 'extensionPath'>,
  configuration: FlintConfiguration,
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

/**
 * Asserts that the language server entrypoint file exists and is accessible.
 *
 * @param serverPath Path to server main file.
 */
export async function assertServerAvailable(serverPath: string): Promise<void> {
  try {
    await access(serverPath);
  } catch {
    throw new Error(
      `Flint language server was not found at ${serverPath}. Build the extension with ` +
        '`pnpm run build` or set flint.serverPath to a valid entrypoint.',
    );
  }
}

/**
 * Validates that the configured Node.js runtime meets the minimum version requirement (v24+).
 *
 * @param nodePath Executable path to Node.js.
 */
export async function assertNodeRuntime(nodePath: string): Promise<void> {
  const version = await readNodeVersion(nodePath);
  const match = /^v(\d+)(?:\.\d+){0,2}$/u.exec(version.trim());
  const major = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isInteger(major) || major < 24) {
    throw new Error(`Flint language server requires Node.js 24 or newer; ${nodePath} reported ${version}.`);
  }
}

/**
 * Probes the Node.js executable to obtain its version string.
 *
 * @param nodePath Path to Node.js binary.
 * @returns Promise resolving to the reported version string.
 */
function readNodeVersion(nodePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    /**
     * Executes the settlement callback exactly once and clears probe timeouts.
     *
     * @param callback Finalization callback to execute.
     */
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      if (timeout !== undefined) clearTimeout(timeout);
      callback();
    };

    try {
      child = spawn(nodePath, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      if (child.stdout === null || child.stderr === null) {
        child.kill('SIGTERM');
        throw new Error('Node.js version probe streams unavailable.');
      }
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });
      child.once('error', () => {
        finish(() =>
          reject(
            new Error(`Unable to execute Node.js at ${nodePath}. Configure flint.nodePath to Node.js 24 or newer.`),
          ),
        );
      });
      child.once('close', (code) => {
        finish(() => {
          if (code === 0) resolve(stdout.trim());
          else
            reject(new Error(`Node.js at ${nodePath} could not be started: ${stderr.trim() || `exit code ${code}`}.`));
        });
      });
      timeout = setTimeout(() => {
        finish(() => {
          try {
            child.kill('SIGTERM');
          } finally {
            reject(new Error(`Node.js version probe timed out at ${nodePath}.`));
          }
        });
      }, 1000);
    } catch {
      finish(() =>
        reject(new Error(`Unable to execute Node.js at ${nodePath}. Configure flint.nodePath to Node.js 24 or newer.`)),
      );
    }
  });
}
