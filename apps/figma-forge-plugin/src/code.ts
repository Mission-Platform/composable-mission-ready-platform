import {
  generateForgeExportBundle,
  type FigmaVariableBinding,
  type ForgeExportBundle,
} from '@mission-platform/forge-figma';

import {
  extractFigmaDocument,
  validateFigmaSelection,
  type FigmaExtractionOptions,
  type FigmaImageBytes,
  type FigmaNode,
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
  readonly requestId?: string;
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

export function createHostImageLoader(host: FigmaSelectionHost): FigmaExtractionOptions['loadImage'] {
  const getImage = host.getImageByHash?.bind(host);
  if (!getImage) return undefined;
  return async (imageReferenceOrHash: string, _node?: FigmaNode): Promise<FigmaImageBytes | undefined> => {
    try {
      const image = getImage(imageReferenceOrHash);
      if (!image) return undefined;
      const content = await image.getBytesAsync();
      return { content, mimeType: 'image/png' };
    } catch {
      return undefined;
    }
  };
}

export function createHostVariableResolver(host: FigmaSelectionHost): FigmaExtractionOptions['resolveVariable'] {
  const variables = host.variables;
  if (!variables?.getVariableById) return undefined;
  const getVariableById = variables.getVariableById.bind(variables);
  const getVariableCollectionById = variables.getVariableCollectionById?.bind(variables);
  return (id: string): FigmaVariableBinding | undefined => {
    try {
      const variable = getVariableById(id);
      if (!variable) return undefined;

      let collectionName: string | undefined =
        typeof (variable as { readonly collection?: unknown }).collection === 'string'
          ? (variable as { readonly collection: string }).collection
          : undefined;

      let mode: 'Light' | 'Dark' | undefined =
        (variable as { readonly mode?: unknown }).mode === 'Light' ||
        (variable as { readonly mode?: unknown }).mode === 'Dark'
          ? (variable as { readonly mode: 'Light' | 'Dark' }).mode
          : undefined;

      let defaultModeId: string | undefined;

      if (variable.variableCollectionId && getVariableCollectionById) {
        const collection = getVariableCollectionById(variable.variableCollectionId);
        if (collection) {
          if (!collectionName && collection.name) {
            collectionName = collection.name;
          }
          defaultModeId = collection.defaultModeId;
          if (!mode && collection.modes && collection.modes.length > 0) {
            const defaultMode = collection.modes.find((m) => m.modeId === defaultModeId) ?? collection.modes[0];
            if (defaultMode?.name?.toLowerCase() === 'dark') {
              mode = 'Dark';
            } else if (defaultMode?.name?.toLowerCase() === 'light') {
              mode = 'Light';
            }
          }
        }
      }

      let alias: string | undefined =
        typeof (variable as { readonly alias?: unknown }).alias === 'string'
          ? (variable as { readonly alias: string }).alias
          : undefined;

      let resolvedValue: string | number | undefined =
        typeof (variable as { readonly resolvedValue?: unknown }).resolvedValue === 'string' ||
        typeof (variable as { readonly resolvedValue?: unknown }).resolvedValue === 'number'
          ? (variable as { readonly resolvedValue: string | number }).resolvedValue
          : undefined;

      if (variable.valuesByMode) {
        const modeValue =
          (defaultModeId ? variable.valuesByMode[defaultModeId] : undefined) ?? Object.values(variable.valuesByMode)[0];

        if (modeValue !== undefined) {
          if (typeof modeValue === 'string' || typeof modeValue === 'number') {
            resolvedValue = resolvedValue ?? modeValue;
          } else if (typeof modeValue === 'object' && modeValue !== null) {
            const candidate = modeValue as Record<string, unknown>;
            if (candidate.type === 'VARIABLE_ALIAS' && typeof candidate.id === 'string') {
              const aliasVariable = getVariableById(candidate.id);
              if (aliasVariable?.name) {
                alias = alias ?? aliasVariable.name;
              }
            } else if (
              typeof candidate.r === 'number' &&
              typeof candidate.g === 'number' &&
              typeof candidate.b === 'number'
            ) {
              const r = Math.round(Math.max(0, Math.min(1, candidate.r)) * 255)
                .toString(16)
                .padStart(2, '0');
              const g = Math.round(Math.max(0, Math.min(1, candidate.g)) * 255)
                .toString(16)
                .padStart(2, '0');
              const b = Math.round(Math.max(0, Math.min(1, candidate.b)) * 255)
                .toString(16)
                .padStart(2, '0');
              resolvedValue = resolvedValue ?? `#${r}${g}${b}`;
            }
          }
        }
      }

      return {
        name: variable.name,
        alias,
        collection: collectionName,
        mode,
        resolvedValue,
      };
    } catch {
      return undefined;
    }
  };
}

export function bindHostExtractionOptions(
  host: FigmaSelectionHost,
  options: FigmaExtractionOptions = {},
): FigmaExtractionOptions {
  return {
    fileKey: options.fileKey ?? host.fileKey,
    resolveVariable: options.resolveVariable ?? host.resolveVariable ?? createHostVariableResolver(host),
    loadImage: options.loadImage ?? host.loadImage ?? createHostImageLoader(host),
  };
}

export async function convertCurrentSelection(
  host: FigmaSelectionHost,
  options: FigmaExtractionOptions = {},
): Promise<ForgePluginConversionResult> {
  const selection = validateFigmaSelection(host.currentPage.selection);
  if (!selection.root) return { error: selection.error };
  const effectiveOptions = bindHostExtractionOptions(host, options);
  const document = await extractFigmaDocument(selection.root, effectiveOptions);
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
      const requestId = pluginMessage.requestId;
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
      postMainMessage(host, {
        type: 'conversion-result',
        ...(requestId === undefined ? {} : { requestId }),
        ...result,
      });
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
