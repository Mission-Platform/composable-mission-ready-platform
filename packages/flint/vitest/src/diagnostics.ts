import type { FlintDiagnostic } from '@mission-platform/flint';

/** Format a diagnostic without discarding its structured location metadata. */
export function formatFlintDiagnostic(diagnostic: FlintDiagnostic): string {
  const location = `${diagnostic.fileName}:${diagnostic.span.line}:${diagnostic.span.column}`;
  const hint = diagnostic.hint === undefined ? '' : ` Hint: ${diagnostic.hint}`;
  return `${location} [${diagnostic.code}] ${diagnostic.severity} ${diagnostic.phase}: ${diagnostic.message}.${hint}`;
}

/**
 * Formats a list of Flint diagnostics into a single human-readable string.
 *
 * @param diagnostics - Sequence of diagnostics to format.
 * @returns Formatted multiline diagnostic message.
 */
export function formatFlintDiagnostics(diagnostics: readonly FlintDiagnostic[]): string {
  return diagnostics.map((diagnostic) => formatFlintDiagnostic(diagnostic)).join('\n');
}

/**
 * Asserts that a list of diagnostics contains no entries.
 *
 * @param diagnostics - Diagnostics array to assert empty.
 * @throws {Error} If diagnostics are present.
 */
export function assertFlintNoDiagnostics(diagnostics: readonly FlintDiagnostic[]): void {
  if (diagnostics.length === 0) return;
  throw new Error(`Expected no Flint diagnostics:\n${formatFlintDiagnostics(diagnostics)}`);
}

/**
 * Expected properties when matching a diagnostic in assertions.
 */
export interface FlintDiagnosticExpectation {
  readonly code: string;
  readonly phase?: FlintDiagnostic['phase'];
  readonly fileName?: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * Finds the first diagnostic matching expectation criteria.
 *
 * @param diagnostics - Array of diagnostics to search.
 * @param expectation - Matching criteria.
 * @returns Matching diagnostic or undefined.
 */
export function findFlintDiagnostic(
  diagnostics: readonly FlintDiagnostic[],
  expectation: FlintDiagnosticExpectation,
): FlintDiagnostic | undefined {
  return diagnostics.find(
    (diagnostic) =>
      diagnostic.code === expectation.code &&
      (expectation.phase === undefined || diagnostic.phase === expectation.phase) &&
      (expectation.fileName === undefined || diagnostic.fileName === expectation.fileName) &&
      (expectation.line === undefined || diagnostic.span.line === expectation.line) &&
      (expectation.column === undefined || diagnostic.span.column === expectation.column),
  );
}

/**
 * Asserts that a diagnostic matching expectation criteria is present.
 *
 * @param diagnostics - Diagnostics array to inspect.
 * @param expectation - Expected diagnostic properties.
 * @returns The matched diagnostic instance.
 * @throws {Error} If no matching diagnostic is found.
 */
export function assertFlintDiagnostic(
  diagnostics: readonly FlintDiagnostic[],
  expectation: FlintDiagnosticExpectation,
): FlintDiagnostic {
  const diagnostic = findFlintDiagnostic(diagnostics, expectation);
  if (diagnostic !== undefined) return diagnostic;
  throw new Error(
    `Expected Flint diagnostic ${JSON.stringify(expectation)}. Received:\n${formatFlintDiagnostics(diagnostics) || '(none)'}`,
  );
}
