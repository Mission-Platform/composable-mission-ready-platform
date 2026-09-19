import type { FlintWorkspaceOptions } from './types.js';

export function normalizeFlintWorkspaceOptions(value: FlintWorkspaceOptions = {}): FlintWorkspaceOptions {
  return value.requireExports === undefined ? { ...value, requireExports: false } : value;
}
