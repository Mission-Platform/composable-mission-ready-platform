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

export interface ForgeWebScriptLaunchConfiguration extends vscode.DebugConfiguration {
  readonly type: 'fws';
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

export interface ForgeWebScriptDebugSettings {
  readonly nodePath: string;
  readonly dapPath: string;
  readonly runtimePath: string;
  readonly runtimeArgs: readonly string[];
}

const defaultDebugSettings: ForgeWebScriptDebugSettings = {
  nodePath: 'node',
  dapPath: '',
  runtimePath: '',
  runtimeArgs: [],
};

export function readDebugSettings(configuration: ConfigurationReader): ForgeWebScriptDebugSettings {
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

export function resolveDebugAdapterPath(
  context: Pick<vscode.ExtensionContext, 'extensionPath'>,
  settings: Pick<ForgeWebScriptDebugSettings, 'dapPath'>,
  workspaceFolder?: Pick<vscode.WorkspaceFolder, 'uri'>,
): string {
  if (settings.dapPath.length === 0) return path.join(context.extensionPath, 'server', 'dap', 'dist', 'main.js');
  if (path.isAbsolute(settings.dapPath)) return settings.dapPath;
  return path.resolve(workspaceFolder?.uri.fsPath ?? context.extensionPath, settings.dapPath);
}

export async function assertDebugAdapterAvailable(adapterPath: string): Promise<void> {
  try {
    await access(adapterPath);
  } catch {
    throw new Error(
      `Forge Web Script debug adapter was not found at ${adapterPath}. Build the extension with ` +
        '`pnpm run build` or set forgeWebScript.dapPath to a valid entrypoint.',
    );
  }
}

export function createDebugConfigurationProvider(
  context: Pick<vscode.ExtensionContext, 'extensionPath'>,
): vscode.DebugConfigurationProvider {
  return {
    resolveDebugConfiguration: async (
      folder: vscode.WorkspaceFolder | undefined,
      configuration: vscode.DebugConfiguration,
    ): Promise<vscode.DebugConfiguration> => {
      const settings = readDebugSettings(vscode.workspace.getConfiguration(configurationSection, folder?.uri));
      assertWorkspaceRelativeOverrideAllowed(
        `${configurationSection}.dapPath`,
        settings.dapPath,
        vscode.workspace.isTrusted,
      );
      assertWorkspaceRelativeExecutableAllowed(
        `${configurationSection}.nodePath`,
        settings.nodePath,
        vscode.workspace.isTrusted,
      );
      assertWorkspaceRelativeExecutableAllowed(
        `${configurationSection}.runtimePath`,
        configuration.runtimePath || settings.runtimePath,
        vscode.workspace.isTrusted,
      );
      assertWorkingDirectoryAllowed(`${configurationSection}.cwd`, configuration.cwd, vscode.workspace.isTrusted);
      const adapterPath = resolveDebugAdapterPath(context, settings, folder);
      await assertNodeRuntime(settings.nodePath);
      await assertDebugAdapterAvailable(adapterPath);

      const resolved: ForgeWebScriptLaunchConfiguration = {
        ...configuration,
        type: 'fws',
        request: 'launch',
        name: configuration.name ?? 'Launch Forge Web Script',
        program: configuration.program ?? '${file}',
        cwd: configuration.cwd ?? '${workspaceFolder}',
        runtimePath: configuration.runtimePath || settings.runtimePath || undefined,
        runtimeArgs: configuration.runtimeArgs ?? settings.runtimeArgs,
        args: configuration.args ?? [],
      };
      return resolved;
    },
  };
}

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
      assertWorkspaceRelativeOverrideAllowed(
        `${configurationSection}.dapPath`,
        settings.dapPath,
        vscode.workspace.isTrusted,
      );
      assertWorkspaceRelativeExecutableAllowed(
        `${configurationSection}.nodePath`,
        settings.nodePath,
        vscode.workspace.isTrusted,
      );
      assertWorkspaceRelativeExecutableAllowed(
        `${configurationSection}.runtimePath`,
        session.configuration.runtimePath || settings.runtimePath,
        vscode.workspace.isTrusted,
      );
      assertWorkingDirectoryAllowed(
        `${configurationSection}.cwd`,
        session.configuration.cwd,
        vscode.workspace.isTrusted,
      );
      const adapterPath = resolveDebugAdapterPath(context, settings, folder);
      const cwd = resolveWorkingDirectory(session.configuration.cwd, folder, context.extensionPath);
      return new vscode.DebugAdapterExecutable(settings.nodePath, [adapterPath], { cwd });
    },
  };
}

export function registerDebugSupport(context: Pick<vscode.ExtensionContext, 'extensionPath' | 'subscriptions'>): void {
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider('fws', createDebugConfigurationProvider(context)),
    vscode.debug.registerDebugAdapterDescriptorFactory('fws', createDebugAdapterDescriptorFactory(context)),
  );
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function resolveWorkingDirectory(
  configuredPath: unknown,
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  extensionPath: string,
): string {
  const workspacePath = workspaceFolder?.uri.fsPath;
  if (typeof configuredPath !== 'string' || configuredPath.length === 0 || configuredPath === '${workspaceFolder}') {
    return workspacePath ?? extensionPath;
  }
  if (path.isAbsolute(configuredPath)) return configuredPath;
  return path.resolve(workspacePath ?? extensionPath, configuredPath);
}
