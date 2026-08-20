import { diagnosticKey, type ForgeWebScriptDiagnostic } from './diagnostics.js';
import { parseForgeWebScript } from './parser.js';
import { checkForgeWebScript, type ForgeWebScriptTypeCheckOptions } from './type-checker.js';

import type { ForgeWebScriptModule } from './ast.js';

export interface ForgeWebScriptValidationResult {
  readonly module?: ForgeWebScriptModule;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly valid: boolean;
}

export function validateForgeWebScript(
  source: string,
  fileName = '<input>',
  options: ForgeWebScriptTypeCheckOptions = {},
): ForgeWebScriptValidationResult {
  const parsed = parseForgeWebScript(source, fileName);
  const checked =
    parsed.module === undefined
      ? { diagnostics: [], valid: false }
      : checkForgeWebScript(parsed.module, fileName, options);
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
