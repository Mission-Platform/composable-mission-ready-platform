import type { ForgeWebScriptWorkspaceOptions } from './types.js';

export function normalizeForgeWebScriptWorkspaceOptions(
  value: ForgeWebScriptWorkspaceOptions = {},
): ForgeWebScriptWorkspaceOptions {
  return value.requireExports === undefined ? { ...value, requireExports: false } : value;
}
