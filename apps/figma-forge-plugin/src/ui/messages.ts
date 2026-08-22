import type { ForgeExportBundle } from '@mission-platform/forge-figma';

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

export function unwrapForgePluginMessage(message: unknown): unknown {
  if (typeof message !== 'object' || message === null || !('pluginMessage' in message)) return message;
  return message.pluginMessage;
}
