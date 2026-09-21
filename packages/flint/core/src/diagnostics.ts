/**
 * Severity level for compiler diagnostics.
 */
export type FlintDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * Compilation phase in which a diagnostic was emitted.
 */
export type FlintDiagnosticPhase =
  'lex' | 'parse' | 'type-check' | 'abi' | 'graph' | 'link' | 'analysis' | 'emit' | 'artifact';

/**
 * Source coordinate span defining the precise location of a token, AST node, or diagnostic in a file.
 */
export interface FlintSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/**
 * Structured diagnostic record produced across compiler phases or static analysis passes.
 */
export interface FlintDiagnostic {
  readonly code: string;
  readonly severity: FlintDiagnosticSeverity;
  readonly phase: FlintDiagnosticPhase;
  readonly message: string;
  readonly fileName: string;
  readonly span: FlintSourceSpan;
  readonly hint?: string;
  /** Additive metadata for analysis, editor, CI, and security tooling. */
  readonly ruleId?: string;
  readonly category?: string;
  readonly blocking?: boolean;
  readonly evidence?: readonly FlintDiagnosticEvidence[];
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
}

/**
 * Secondary evidence or related location attached to a diagnostic finding.
 */
export interface FlintDiagnosticEvidence {
  readonly message: string;
  readonly span?: FlintSourceSpan;
  readonly value?: string | number | boolean;
}

/**
 * Constructs a structured compiler diagnostic with optional hint and security metadata.
 *
 * @param fileName - Path or identifier of the source file.
 * @param phase - Compiler phase emitting the diagnostic.
 * @param code - Diagnostic error or warning code.
 * @param message - Descriptive human-readable diagnostic message.
 * @param span - Source span coordinates for the diagnostic location.
 * @param severity - Severity level, defaulting to 'error'.
 * @param hint - Optional remediation hint or actionable advice.
 * @param metadata - Optional rule ID, category, evidence, or security taxonomy identifiers.
 * @returns A structured FlintDiagnostic instance.
 */
export function createDiagnostic(
  fileName: string,
  phase: FlintDiagnosticPhase,
  code: string,
  message: string,
  span: FlintSourceSpan,
  severity: FlintDiagnosticSeverity = 'error',
  hint?: string,
  metadata?: Pick<FlintDiagnostic, 'ruleId' | 'category' | 'blocking' | 'evidence' | 'owasp' | 'cwe'>,
): FlintDiagnostic {
  return {
    code,
    severity,
    phase,
    message,
    fileName,
    span,
    ...(hint === undefined ? {} : { hint }),
    ...(metadata === undefined ? {} : metadata),
  };
}

/**
 * Computes a deterministic identity string key for deduplicating diagnostics.
 *
 * @param diagnostic - Diagnostic to compute a key for.
 * @returns Deterministic JSON string encoding file name, phase, code, span, and message.
 */
export function diagnosticKey(diagnostic: FlintDiagnostic): string {
  return JSON.stringify([
    diagnostic.fileName,
    diagnostic.phase,
    diagnostic.code,
    diagnostic.span.start,
    diagnostic.span.end,
    diagnostic.message,
  ]);
}
