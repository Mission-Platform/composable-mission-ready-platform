import { generateForgeExportBundle, type ForgeExportBundle } from '@mission-platform/forge-figma';

import {
  extractFigmaDocument,
  validateFigmaSelection,
  type FigmaExtractionOptions,
  type FigmaSelectionHost,
} from './extractor';
import {
  isForgePluginUiMessage,
  isForgeBridgeConfig,
  unwrapForgePluginMessage,
  type ForgeBridgeConfig,
  type ForgePluginMainMessage,
} from './ui/messages';

const BRIDGE_CONFIG_STORAGE_KEY = 'forge-figma.bridge-config';

const DEFAULT_BRIDGE_CONFIG: ForgeBridgeConfig = {
  bridgeUrl: 'http://127.0.0.1:8787/export',
  authToken: '',
  repositoryRootId: '',
  targetDirectory: '',
};

export interface ForgePluginConversionResult {
  readonly bundle?: ForgeExportBundle;
  readonly error?: string;
}

function postMainMessage(host: FigmaSelectionHost, message: ForgePluginMainMessage): void {
  host.ui.postMessage(message);
}

async function readBridgeConfig(host: FigmaSelectionHost): Promise<ForgeBridgeConfig> {
  const stored = await host.clientStorage?.getAsync(BRIDGE_CONFIG_STORAGE_KEY);
  if (!isForgeBridgeConfig(stored)) return DEFAULT_BRIDGE_CONFIG;
  return stored;
}

export async function convertCurrentSelection(
  host: FigmaSelectionHost,
  options: FigmaExtractionOptions = {},
): Promise<ForgePluginConversionResult> {
  const selection = validateFigmaSelection(host.currentPage.selection);
  if (!selection.root) return { error: selection.error };
  const document = await extractFigmaDocument(selection.root, options);
  return { bundle: generateForgeExportBundle(document) };
}

export function startForgePlugin(host: FigmaSelectionHost, uiHtml: string): void {
  host.showUI(uiHtml, { width: 420, height: 680 });
  const postSelectionStatus = (): void => {
    postMainMessage(host, { type: 'selection-status', selectionCount: host.currentPage.selection.length });
  };
  postSelectionStatus();
  host.on?.('selectionchange', postSelectionStatus);
  host.onSelectionChange?.(postSelectionStatus);
  // Figma's plugin UI API exposes `onmessage`; it is not a DOM EventTarget.
  // eslint-disable-next-line unicorn/prefer-add-event-listener
  host.ui.onmessage = async (message: unknown): Promise<void> => {
    const pluginMessage = unwrapForgePluginMessage(message);
    if (!isForgePluginUiMessage(pluginMessage)) return;
    if (pluginMessage.type === 'convert') {
      let result: ForgePluginConversionResult;
      try {
        result = await convertCurrentSelection(host, {
          fileKey: host.fileKey,
          resolveVariable: host.resolveVariable,
          loadImage: host.loadImage,
        });
      } catch (error) {
        result = { error: error instanceof Error ? error.message : 'Conversion failed unexpectedly.' };
      }
      postMainMessage(host, { type: 'conversion-result', ...result });
      return;
    }
    if (pluginMessage.type === 'get-bridge-config') {
      postMainMessage(host, { type: 'bridge-config', config: await readBridgeConfig(host) });
      return;
    }
    if (pluginMessage.type === 'request-selection-status') {
      postSelectionStatus();
      return;
    }
    if (!isForgeBridgeConfig(pluginMessage.config)) return;
    await host.clientStorage?.setAsync(BRIDGE_CONFIG_STORAGE_KEY, pluginMessage.config);
    postMainMessage(host, { type: 'bridge-config-saved', config: pluginMessage.config });
  };
}

const pluginGlobal = globalThis as typeof globalThis & {
  readonly figma?: FigmaSelectionHost;
};

if (pluginGlobal.figma) {
  const pluginUiHtml = (globalThis as typeof globalThis & { readonly __html__?: string }).__html__ ?? '';
  startForgePlugin(pluginGlobal.figma, pluginUiHtml);
}
