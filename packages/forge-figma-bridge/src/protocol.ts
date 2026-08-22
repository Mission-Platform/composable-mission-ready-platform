import type { ForgeRepositoryExportRequest } from '@mission-platform/forge-figma';

export const FORGE_BRIDGE_PROTOCOL_VERSION = 1 as const;

export type ForgeBridgeFileStatus = 'written' | 'rejected';

export interface ForgeBridgeFileResult {
  readonly path: string;
  readonly status: ForgeBridgeFileStatus;
  readonly bytesWritten?: number;
  readonly error?: string;
}

export interface ForgeBridgeResponse {
  readonly protocolVersion: typeof FORGE_BRIDGE_PROTOCOL_VERSION;
  readonly ok: boolean;
  readonly results: readonly ForgeBridgeFileResult[];
  readonly error?: string;
}

export type ForgeBridgeRequest = ForgeRepositoryExportRequest;

export function isForgeBridgeResponse(value: unknown): value is ForgeBridgeResponse {
  if (typeof value !== 'object' || value === null) return false;
  if (!('protocolVersion' in value) || value.protocolVersion !== FORGE_BRIDGE_PROTOCOL_VERSION) return false;
  if (!('ok' in value) || typeof value.ok !== 'boolean' || !('results' in value) || !Array.isArray(value.results))
    return false;
  return value.results.every((result) => {
    if (typeof result !== 'object' || result === null || !('path' in result) || typeof result.path !== 'string')
      return false;
    return 'status' in result && (result.status === 'written' || result.status === 'rejected');
  });
}
