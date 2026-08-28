import { isForgeBridgeResponse, type ForgeBridgeResponse } from '@mission-platform/forge-figma-bridge/protocol';

import { isForgeBridgeConfig, type ForgeBridgeConfig } from './messages';

import type { ForgeExportBundle, ForgeExportFile, ForgeRepositoryExportRequest } from '@mission-platform/forge-figma';

export interface ForgeDownloadEnvironment {
  readonly document: Pick<Document, 'createElement'>;
  readonly url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
}

export interface ForgeClipboard {
  writeText(value: string): Promise<void>;
}

export function fileText(file: ForgeExportFile): string | undefined {
  return typeof file.content === 'string' ? file.content : undefined;
}

export function fileNameFromPath(path: string): string {
  const baseName = path.split('/').pop() ?? 'forge-artifact';
  const safeName = baseName.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  return safeName || 'forge-artifact';
}

export function fileForPath(bundle: ForgeExportBundle, path: string): ForgeExportFile | undefined {
  return bundle.files.find((file) => file.path === path);
}

export async function copyForgeFile(file: ForgeExportFile, clipboard: ForgeClipboard): Promise<void> {
  const content = fileText(file);
  if (content === undefined) throw new Error('Only text artifacts can be copied to the clipboard.');
  await clipboard.writeText(content);
}

export function downloadForgeFile(
  file: ForgeExportFile,
  environment: ForgeDownloadEnvironment = browserDownloadEnvironment,
): void {
  const content: BlobPart = typeof file.content === 'string' ? file.content : (file.content as unknown as BlobPart);
  const blob = new Blob([content], { type: mimeTypeForFile(file) });
  const href = environment.url.createObjectURL(blob);
  const anchor = environment.document.createElement('a');
  anchor.href = href;
  anchor.download = fileNameFromPath(file.path);
  anchor.click();
  environment.url.revokeObjectURL(href);
}

const browserDownloadEnvironment: ForgeDownloadEnvironment = {
  document: globalThis.document,
  url: globalThis.URL,
};

export function mimeTypeForFile(file: ForgeExportFile): string {
  if (file.kind === 'tsx') return 'text/tsx;charset=utf-8';
  if (file.kind === 'scss') return 'text/scss;charset=utf-8';
  const extension = file.path.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function sendBundleToBridge(
  config: ForgeBridgeConfig,
  bundle: ForgeExportBundle,
  overwrite: boolean,
  fetcher: typeof fetch = globalThis.fetch,
): Promise<ForgeBridgeResponse> {
  if (!isForgeBridgeConfig(config)) throw new Error('The repository bridge URL or destination is not allowed.');
  const request: ForgeRepositoryExportRequest = {
    protocolVersion: 1,
    repositoryRootId: config.repositoryRootId,
    targetDirectory: config.targetDirectory,
    overwrite,
    bundle,
  };
  const response = await fetcher(config.bridgeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request, (_key, value: unknown) => (value instanceof Uint8Array ? [...value] : value)),
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`The repository bridge returned HTTP ${response.status} without a valid response.`);
  }
  if (!isForgeBridgeResponse(body)) throw new Error('The repository bridge returned an invalid protocol response.');
  return body;
}
