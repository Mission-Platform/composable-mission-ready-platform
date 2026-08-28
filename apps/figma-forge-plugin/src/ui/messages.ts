import type { ForgeExportBundle } from '@mission-platform/forge-figma';

export const FORGE_FIGMA_UI_ORIGIN = 'https://www.figma.com';

export interface ForgeBridgeConfig {
  readonly bridgeUrl: string;
  readonly repositoryRootId: string;
  readonly targetDirectory: string;
}

export interface ForgePluginUiBridgeConfigMessage {
  readonly type: 'set-bridge-config';
  readonly config: ForgeBridgeConfig;
}

export type ForgePluginUiMessage =
  | { readonly type: 'convert' }
  | { readonly type: 'get-bridge-config' }
  | { readonly type: 'request-selection-status' }
  | ForgePluginUiBridgeConfigMessage;

export type ForgePluginMainMessage =
  | { readonly type: 'selection-status'; readonly selectionCount: number }
  | { readonly type: 'conversion-result'; readonly bundle?: ForgeExportBundle; readonly error?: string }
  | { readonly type: 'bridge-config'; readonly config: ForgeBridgeConfig }
  | { readonly type: 'bridge-config-saved'; readonly config: ForgeBridgeConfig };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isForgeExportFile(value: unknown): boolean {
  if (!isRecord(value) || typeof value.path !== 'string' || value.path.length === 0 || value.path.length > 1024)
    return false;
  if (
    value.path.startsWith('/') ||
    value.path.includes('\\') ||
    value.path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  )
    return false;
  if (value.kind !== 'tsx' && value.kind !== 'scss' && value.kind !== 'asset') return false;
  return (
    (typeof value.content === 'string' && value.content.length <= 10 * 1024 * 1024) ||
    (value.content instanceof Uint8Array && value.content.byteLength <= 10 * 1024 * 1024)
  );
}

function isForgeDiagnostic(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.severity === 'string' &&
    (value.severity === 'error' || value.severity === 'warning' || value.severity === 'info') &&
    typeof value.message === 'string' &&
    typeof value.feature === 'string'
  );
}

export function isAllowedForgeBridgeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '::1' ||
        url.hostname === '[::1]') &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/export' &&
      url.search === '' &&
      url.hash === ''
    );
  } catch {
    return false;
  }
}

export function isForgeBridgeConfig(value: unknown): value is ForgeBridgeConfig {
  if (!isRecord(value)) return false;
  return (
    typeof value.bridgeUrl === 'string' &&
    isAllowedForgeBridgeUrl(value.bridgeUrl) &&
    typeof value.repositoryRootId === 'string' &&
    value.repositoryRootId.length > 0 &&
    value.repositoryRootId.length <= 256 &&
    typeof value.targetDirectory === 'string' &&
    value.targetDirectory.length > 0 &&
    value.targetDirectory.length <= 1024 &&
    !value.targetDirectory.startsWith('/') &&
    !value.targetDirectory.includes('\\') &&
    !value.targetDirectory.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  );
}

export function isTrustedForgePluginMessageEvent(
  event: MessageEvent<unknown>,
  parent: WindowProxy,
  expectedOrigin = FORGE_FIGMA_UI_ORIGIN,
): boolean {
  return event.source === parent && event.origin === expectedOrigin;
}

export function isForgePluginUiMessage(message: unknown): message is ForgePluginUiMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) return false;
  const type = message.type;
  return (
    type === 'convert' ||
    type === 'get-bridge-config' ||
    type === 'request-selection-status' ||
    type === 'set-bridge-config'
  );
}

export function isForgePluginMainMessage(message: unknown): message is ForgePluginMainMessage {
  if (!isRecord(message) || typeof message.type !== 'string') return false;
  if (message.type === 'selection-status')
    return Number.isSafeInteger(message.selectionCount) && (message.selectionCount as number) >= 0;
  if (message.type === 'conversion-result') {
    if (message.error !== undefined && typeof message.error !== 'string') return false;
    if (message.bundle === undefined) return true;
    if (
      !isRecord(message.bundle) ||
      typeof message.bundle.componentName !== 'string' ||
      message.bundle.componentName.length === 0 ||
      message.bundle.componentName.length > 256 ||
      !Array.isArray(message.bundle.files) ||
      message.bundle.files.length > 1000 ||
      !message.bundle.files.every((file) => isForgeExportFile(file)) ||
      !Array.isArray(message.bundle.diagnostics) ||
      message.bundle.diagnostics.length > 1000
    )
      return false;
    return message.bundle.diagnostics.every((diagnostic) => isForgeDiagnostic(diagnostic));
  }
  if (message.type === 'bridge-config' || message.type === 'bridge-config-saved')
    return isForgeBridgeConfig(message.config);
  return false;
}

export function unwrapForgePluginMessage(message: unknown): unknown {
  if (typeof message !== 'object' || message === null || !('pluginMessage' in message)) return message;
  return message.pluginMessage;
}
