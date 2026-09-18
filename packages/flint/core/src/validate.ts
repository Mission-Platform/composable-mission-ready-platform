import { diagnosticKey, type FlintDiagnostic } from './diagnostics.js';
import { parseFlint } from './parser.js';
import { checkFlint, type FlintTypeCheckOptions } from './type-checker.js';

import type { FlintModule } from './ast.js';

export interface FlintValidationResult {
  readonly module?: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly valid: boolean;
}

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
