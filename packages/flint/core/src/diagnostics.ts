export type FlintDiagnosticSeverity = 'error' | 'warning' | 'info';

export type FlintDiagnosticPhase =
  'lex' | 'parse' | 'type-check' | 'abi' | 'graph' | 'link' | 'analysis' | 'emit' | 'artifact';

export interface FlintSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

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

export interface FlintDiagnosticEvidence {
  readonly message: string;
  readonly span?: FlintSourceSpan;
  readonly value?: string | number | boolean;
}

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
