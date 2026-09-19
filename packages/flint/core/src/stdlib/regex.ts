import { FLINT_REGEX_BYTECODE_VERSION } from '@mission-platform/flint-regex';

import type { FlintPrimitiveType } from '../ast.js';

/** Stable identity inputs that affect regex compilation and generated artifacts. */
export interface FlintStandardLibraryIdentity {
  readonly regexBytecodeVersion: string;
  readonly regexCorpusHash?: string;
}

/** Supported regex bytecode format identifier for the standard library. */
export const FLINT_REGEX_VERSION = `bytecode-${FLINT_REGEX_BYTECODE_VERSION}` as const;

/** Default standard library regex identity configuration. */
export const DEFAULT_FLINT_STANDARD_LIBRARY_IDENTITY: FlintStandardLibraryIdentity = {
  regexBytecodeVersion: FLINT_REGEX_VERSION,
};

export const DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY = DEFAULT_FLINT_STANDARD_LIBRARY_IDENTITY;

/**
 * Standard library regex operations supported by compiler lowering.
 */
export type FlintRegexOperation =
  | 'full-match'
  | 'prefix-match'
  | 'search'
  | 'full-capture-start'
  | 'full-capture-end'
  | 'prefix-capture-start'
  | 'prefix-capture-end'
  | 'search-capture-start'
  | 'search-capture-end';

/**
 * Metadata descriptor for a standard library compiler intrinsic function.
 */
export interface FlintStandardLibraryFunction {
  readonly name: string;
  readonly parameters: readonly FlintPrimitiveType[];
  readonly result: FlintPrimitiveType;
  readonly operation: FlintRegexOperation;
}

/**
 * Compiler-owned calls. They are reserved source names, not host imports, and
 * are lowered to the Flint WASM runtime in the backend phase.
 * Capture operations return `-1` for an unset group or when no match exists.
 */
export const FLINT_REGEX_FUNCTIONS: readonly FlintStandardLibraryFunction[] = [
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

/**
 * Lookup map of regex standard library intrinsic function names to their definitions.
 */
export const FLINT_REGEX_FUNCTION_MAP = new Map(
  FLINT_REGEX_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);

/**
 * Standard diagnostic codes emitted during regex lowering and compilation.
 */
export const FLINT_REGEX_DIAGNOSTIC_CODES = {
  unsupportedSyntax: 'FLINT-REGEX-001',
  malformedPattern: 'FLINT-REGEX-002',
  internalCompilerError: 'FLINT-REGEX-003',
} as const;

/**
 * Creates a standard library identity descriptor with optional configuration overrides.
 *
 * @param overrides - Partial overrides for standard library identity properties.
 * @returns Complete FlintStandardLibraryIdentity instance.
 */
export function flintStandardLibraryIdentity(
  overrides: Partial<FlintStandardLibraryIdentity> = {},
): FlintStandardLibraryIdentity {
  return {
    ...DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY,
    ...overrides,
  };
}
