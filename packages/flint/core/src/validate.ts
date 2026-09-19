import { diagnosticKey, type FlintDiagnostic } from './diagnostics.js';
import { parseFlint } from './parser.js';
import { checkFlint, type FlintTypeCheckOptions } from './type-checker.js';

import type { FlintModule } from './ast.js';

/**
 * Result of validating a Flint source file through parsing and type-checking.
 */
export interface FlintValidationResult {
  /** Parsed module AST, if parsing produced a module structure. */
  readonly module?: FlintModule;
  /** Deduplicated diagnostics emitted during parsing and semantic type checking. */
  readonly diagnostics: readonly FlintDiagnostic[];
  /** True if no error-severity diagnostics were emitted. */
  readonly valid: boolean;
}

/**
 * Validates Flint source text by running the parser and type-checker.
 * Collects and deduplicates syntactic and semantic diagnostics.
 *
 * @param source - Flint source code text.
 * @param fileName - Optional file path or name used in diagnostic spans (defaults to `'<input>'`).
 * @param options - Optional type-checker configuration flags and external symbol tables.
 * @returns Combined validation result with parsed module (if available), diagnostics, and valid flag.
 */
export function validateFlint(
  source: string,
  fileName = '<input>',
  options: FlintTypeCheckOptions = {},
): FlintValidationResult {
  const parsed = parseFlint(source, fileName);
  const checked =
    parsed.module === undefined ? { diagnostics: [], valid: false } : checkFlint(parsed.module, fileName, options);
  const diagnostics = [
    ...new Map(
      [...parsed.diagnostics, ...checked.diagnostics].map((diagnostic) => [diagnosticKey(diagnostic), diagnostic]),
    ).values(),
  ];
  return {
    ...(parsed.module === undefined ? {} : { module: parsed.module }),
    diagnostics,
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
  };
}
