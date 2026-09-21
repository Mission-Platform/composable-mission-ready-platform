import type { FlintWorkspaceOptions } from './types.js';

/** Normalizes partial workspace options into a complete options structure with defaults. */
export function normalizeFlintWorkspaceOptions(value: FlintWorkspaceOptions = {}): FlintWorkspaceOptions {
  return value.requireExports === undefined ? { ...value, requireExports: false } : value;
}
