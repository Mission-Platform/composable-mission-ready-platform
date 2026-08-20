import type { ForgeWebScriptDiagnostic } from '@mission-platform/forge-web-script';

/** Format a diagnostic without discarding its structured location metadata. */
export function formatForgeWebScriptDiagnostic(diagnostic: ForgeWebScriptDiagnostic): string {
  const location = `${diagnostic.fileName}:${diagnostic.span.line}:${diagnostic.span.column}`;
  const hint = diagnostic.hint === undefined ? '' : ` Hint: ${diagnostic.hint}`;
  return `${location} [${diagnostic.code}] ${diagnostic.severity} ${diagnostic.phase}: ${diagnostic.message}.${hint}`;
}

export function formatForgeWebScriptDiagnostics(diagnostics: readonly ForgeWebScriptDiagnostic[]): string {
  return diagnostics.map((diagnostic) => formatForgeWebScriptDiagnostic(diagnostic)).join('\n');
}

export function assertForgeWebScriptNoDiagnostics(diagnostics: readonly ForgeWebScriptDiagnostic[]): void {
  if (diagnostics.length === 0) return;
  throw new Error(`Expected no Forge Web Script diagnostics:\n${formatForgeWebScriptDiagnostics(diagnostics)}`);
}

export interface ForgeWebScriptDiagnosticExpectation {
  readonly code: string;
  readonly phase?: ForgeWebScriptDiagnostic['phase'];
  readonly fileName?: string;
  readonly line?: number;
  readonly column?: number;
}

export function findForgeWebScriptDiagnostic(
  diagnostics: readonly ForgeWebScriptDiagnostic[],
  expectation: ForgeWebScriptDiagnosticExpectation,
): ForgeWebScriptDiagnostic | undefined {
  return diagnostics.find(
    (diagnostic) =>
      diagnostic.code === expectation.code &&
      (expectation.phase === undefined || diagnostic.phase === expectation.phase) &&
      (expectation.fileName === undefined || diagnostic.fileName === expectation.fileName) &&
      (expectation.line === undefined || diagnostic.span.line === expectation.line) &&
      (expectation.column === undefined || diagnostic.span.column === expectation.column),
  );
}

export function assertForgeWebScriptDiagnostic(
  diagnostics: readonly ForgeWebScriptDiagnostic[],
  expectation: ForgeWebScriptDiagnosticExpectation,
): ForgeWebScriptDiagnostic {
  const diagnostic = findForgeWebScriptDiagnostic(diagnostics, expectation);
  if (diagnostic !== undefined) return diagnostic;
  throw new Error(
    `Expected Forge Web Script diagnostic ${JSON.stringify(expectation)}. Received:\n${formatForgeWebScriptDiagnostics(diagnostics) || '(none)'}`,
  );
}
