import { FORGE_REGEX_BYTECODE_VERSION } from '@mission-platform/forge-web-script-regex';

import type { ForgeWebScriptPrimitiveType } from '../ast.js';

/** Stable identity inputs that affect regex compilation and generated artifacts. */
export interface ForgeWebScriptStandardLibraryIdentity {
  readonly regexBytecodeVersion: string;
  readonly regexCorpusHash?: string;
}

export const FORGE_WEB_SCRIPT_REGEX_VERSION = `bytecode-${FORGE_REGEX_BYTECODE_VERSION}` as const;

export const DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY: ForgeWebScriptStandardLibraryIdentity = {
  regexBytecodeVersion: FORGE_WEB_SCRIPT_REGEX_VERSION,
};

export type ForgeWebScriptRegexOperation =
  | 'full-match'
  | 'prefix-match'
  | 'search'
  | 'full-capture-start'
  | 'full-capture-end'
  | 'prefix-capture-start'
  | 'prefix-capture-end'
  | 'search-capture-start'
  | 'search-capture-end';

export interface ForgeWebScriptStandardLibraryFunction {
  readonly name: string;
  readonly parameters: readonly ForgeWebScriptPrimitiveType[];
  readonly result: ForgeWebScriptPrimitiveType;
  readonly operation: ForgeWebScriptRegexOperation;
}

/**
 * Compiler-owned calls. They are reserved source names, not host imports, and
 * are lowered to the Forge Web Script WASM runtime in the backend phase.
 * Capture operations return `-1` for an unset group or when no match exists.
 */
export const FORGE_WEB_SCRIPT_REGEX_FUNCTIONS: readonly ForgeWebScriptStandardLibraryFunction[] = [
  { name: 'regex_full_match', parameters: ['string', 'string'], result: 'bool', operation: 'full-match' },
  { name: 'regex_prefix_match', parameters: ['string', 'string'], result: 'bool', operation: 'prefix-match' },
  { name: 'regex_search', parameters: ['string', 'string', 'i32'], result: 'bool', operation: 'search' },
  {
    name: 'regex_full_capture_start',
    parameters: ['string', 'string', 'i32'],
    result: 'i32',
    operation: 'full-capture-start',
  },
  {
    name: 'regex_full_capture_end',
    parameters: ['string', 'string', 'i32'],
    result: 'i32',
    operation: 'full-capture-end',
  },
  {
    name: 'regex_prefix_capture_start',
    parameters: ['string', 'string', 'i32'],
    result: 'i32',
    operation: 'prefix-capture-start',
  },
  {
    name: 'regex_prefix_capture_end',
    parameters: ['string', 'string', 'i32'],
    result: 'i32',
    operation: 'prefix-capture-end',
  },
  {
    name: 'regex_search_capture_start',
    parameters: ['string', 'string', 'i32', 'i32'],
    result: 'i32',
    operation: 'search-capture-start',
  },
  {
    name: 'regex_search_capture_end',
    parameters: ['string', 'string', 'i32', 'i32'],
    result: 'i32',
    operation: 'search-capture-end',
  },
];

export const FORGE_WEB_SCRIPT_REGEX_FUNCTION_MAP = new Map(
  FORGE_WEB_SCRIPT_REGEX_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);

export const FORGE_WEB_SCRIPT_REGEX_DIAGNOSTIC_CODES = {
  unsupportedSyntax: 'FWS-REGEX-001',
  malformedPattern: 'FWS-REGEX-002',
  internalCompilerError: 'FWS-REGEX-003',
} as const;

export function forgeWebScriptStandardLibraryIdentity(
  overrides: Partial<ForgeWebScriptStandardLibraryIdentity> = {},
): ForgeWebScriptStandardLibraryIdentity {
  return {
    ...DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY,
    ...overrides,
  };
}
