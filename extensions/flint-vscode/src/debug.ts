import { access } from 'node:fs/promises';
import path from 'node:path';

import * as vscode from 'vscode';

import {
  assertNodeRuntime,
  assertWorkingDirectoryAllowed,
  assertWorkspaceRelativeExecutableAllowed,
  assertWorkspaceRelativeOverrideAllowed,
  configurationSection,
  readConfiguration,
  type ConfigurationReader,
} from './server-path.js';

export interface FlintLaunchConfiguration extends vscode.DebugConfiguration {
  readonly type: 'flint';
  readonly request: 'launch';
  readonly name: string;
  readonly program?: string;
  readonly cwd?: string;
  readonly runtimePath?: string;
  readonly runtimeArgs?: readonly string[];
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stopOnEntry?: boolean;
}

export interface FlintDebugSettings {
  readonly nodePath: string;
  readonly dapPath: string;
  readonly runtimePath: string;
  readonly runtimeArgs: readonly string[];
}

const defaultDebugSettings: FlintDebugSettings = {
  nodePath: 'node',
  dapPath: '',
  runtimePath: '',
  runtimeArgs: [],
};

/**
 * Reads debugger settings from the given workspace configuration reader.
 *
 * @param configuration Configuration reader instance.
 * @returns Parsed Flint debug settings.
 */
export function readDebugSettings(configuration: ConfigurationReader): FlintDebugSettings {
  const languageSettings = readConfiguration(configuration);
  const dapPath = configuration.get('dapPath', defaultDebugSettings.dapPath);
  const runtimePath = configuration.get('runtimePath', defaultDebugSettings.runtimePath);
  return {
    nodePath: languageSettings.nodePath,
    dapPath: typeof dapPath === 'string' ? dapPath.trim() : defaultDebugSettings.dapPath,
    runtimePath: typeof runtimePath === 'string' ? runtimePath.trim() : defaultDebugSettings.runtimePath,
    runtimeArgs: readStringArray(configuration.get('runtimeArgs', defaultDebugSettings.runtimeArgs)),
  };
}

/**
 * Resolves the entrypoint path for the Flint debug adapter.
 *
 * @param context Extension context with base extensionPath.
 * @param settings Debug settings containing dapPath.
 * @param workspaceFolder Optional active workspace folder.
 * @returns Absolute path to the debug adapter entrypoint.
 */
export function resolveDebugAdapterPath(
  context: Pick<vscode.ExtensionContext, 'extensionPath'>,
  settings: Pick<FlintDebugSettings, 'dapPath'>,
  workspaceFolder?: Pick<vscode.WorkspaceFolder, 'uri'>,
): string {
  if (settings.dapPath.length === 0) return path.join(context.extensionPath, 'server', 'dap', 'dist', 'main.js');
  if (path.isAbsolute(settings.dapPath)) return settings.dapPath;
  return path.resolve(workspaceFolder?.uri.fsPath ?? context.extensionPath, settings.dapPath);
}

/**
 * Asserts that the debug adapter entrypoint exists and is accessible.
 *
 * @param adapterPath Path to debug adapter file.
 */
export async function assertDebugAdapterAvailable(adapterPath: string): Promise<void> {
  try {
    await access(adapterPath);
  } catch {
    throw new Error(
      `Flint debug adapter was not found at ${adapterPath}. Build the extension with ` +
        '`pnpm run build` or set flint.dapPath to a valid entrypoint.',
    );
  }
}

/**
 * Validates workspace trust security bounds on configured debug settings.
 *
 * @param settings Debug settings.
 * @param runtimePath Configured runtime path.
 * @param cwd Configured working directory.
 * @param isTrusted Whether the workspace is trusted.
 */
function validateDebugTrust(
  settings: FlintDebugSettings,
  runtimePath: unknown,
  cwd: unknown,
  isTrusted: boolean,
): void {
  assertWorkspaceRelativeOverrideAllowed(`${configurationSection}.dapPath`, settings.dapPath, isTrusted);
  assertWorkspaceRelativeExecutableAllowed(`${configurationSection}.nodePath`, settings.nodePath, isTrusted);
  assertWorkspaceRelativeExecutableAllowed(
    `${configurationSection}.runtimePath`,
    (typeof runtimePath === 'string' && runtimePath) || settings.runtimePath,
    isTrusted,
  );
  assertWorkingDirectoryAllowed(`${configurationSection}.cwd`, cwd, isTrusted);
}

/**
 * Creates the Flint launch configuration provider.
 *
 * @param context Extension context.
 * @returns DebugConfigurationProvider implementation.
 */
export function createDebugConfigurationProvider(
  context: Pick<vscode.ExtensionContext, 'extensionPath'>,
): vscode.DebugConfigurationProvider {
  return {
    resolveDebugConfiguration: async (
      folder: vscode.WorkspaceFolder | undefined,
      configuration: vscode.DebugConfiguration,
    ): Promise<vscode.DebugConfiguration> => {
      const settings = readDebugSettings(vscode.workspace.getConfiguration(configurationSection, folder?.uri));
      validateDebugTrust(settings, configuration.runtimePath, configuration.cwd, vscode.workspace.isTrusted);
      const adapterPath = resolveDebugAdapterPath(context, settings, folder);
      await assertNodeRuntime(settings.nodePath);
      await assertDebugAdapterAvailable(adapterPath);

      const resolved: FlintLaunchConfiguration = {
        ...configuration,
        type: 'flint',
        request: 'launch',
        name: configuration.name ?? 'Launch Flint',
        program: configuration.program ?? '${file}', // skipcq: JS-0038
        cwd: configuration.cwd ?? '${workspaceFolder}', // skipcq: JS-0038
        runtimePath: configuration.runtimePath || settings.runtimePath || undefined,
        runtimeArgs: configuration.runtimeArgs ?? settings.runtimeArgs,
        args: configuration.args ?? [],
      };
      return resolved;
    },
  };
}

/**
 * Creates the Flint debug adapter descriptor factory.
 *
 * @param context Extension context.
 * @returns DebugAdapterDescriptorFactory implementation.
 */
export function createDebugAdapterDescriptorFactory(
  context: Pick<vscode.ExtensionContext, 'extensionPath'>,
): vscode.DebugAdapterDescriptorFactory {
  return {
    createDebugAdapterDescriptor(
      session: vscode.DebugSession,
      _executable: vscode.DebugAdapterExecutable | undefined,
    ): vscode.DebugAdapterDescriptor {
      const folder = session.workspaceFolder;
      const settings = readDebugSettings(vscode.workspace.getConfiguration(configurationSection, folder?.uri));
      validateDebugTrust(
        settings,
        session.configuration.runtimePath,
        session.configuration.cwd,
        vscode.workspace.isTrusted,
      );
      const adapterPath = resolveDebugAdapterPath(context, settings, folder);
      const cwd = resolveWorkingDirectory(session.configuration.cwd, folder, context.extensionPath);
      return new vscode.DebugAdapterExecutable(settings.nodePath, [adapterPath], { cwd });
    },
  };
}

/**
 * Registers debug configuration and adapter providers with VS Code.
 *
 * @param context Extension context containing extensionPath and subscriptions.
 */
export function registerDebugSupport(context: Pick<vscode.ExtensionContext, 'extensionPath' | 'subscriptions'>): void {
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider('flint', createDebugConfigurationProvider(context)),
    vscode.debug.registerDebugAdapterDescriptorFactory('flint', createDebugAdapterDescriptorFactory(context)),
  );
}

/**
 * Coerces an unknown configuration value to a string array.
 *
 * @param value Raw configuration value.
 * @returns Readonly string array.
 */
function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Checks if a path value is empty or the workspaceFolder substitution variable.
 *
 * @param configuredPath Configured path string or unknown value.
 * @returns True if path is a workspace root placeholder.
 */
function isWorkspacePlaceholder(configuredPath: unknown): boolean {
  return (
    typeof configuredPath !== 'string' || configuredPath.length === 0 || configuredPath === '${workspaceFolder}' // skipcq: JS-0038
  );
}

/**
 * Resolves working directory path against workspace folder or extension directory.
 *
 * @param configuredPath User-configured working directory.
 * @param workspaceFolder Active workspace folder.
 * @param extensionPath Extension installation root directory.
 * @returns Resolved absolute working directory path.
 */
function resolveWorkingDirectory(
  configuredPath: unknown,
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  extensionPath: string,
): string {
  const workspacePath = workspaceFolder?.uri.fsPath ?? extensionPath;
  if (isWorkspacePlaceholder(configuredPath)) return workspacePath;
  if (path.isAbsolute(configuredPath as string)) return configuredPath as string;
  return path.resolve(workspacePath, configuredPath as string);
}
