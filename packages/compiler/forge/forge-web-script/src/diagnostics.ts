export type ForgeWebScriptDiagnosticSeverity = 'error' | 'warning' | 'info';

export type ForgeWebScriptDiagnosticPhase =
  'lex' | 'parse' | 'type-check' | 'abi' | 'graph' | 'link' | 'analysis' | 'emit' | 'artifact';

export interface ForgeWebScriptSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface ForgeWebScriptDiagnostic {
  readonly code: string;
  readonly severity: ForgeWebScriptDiagnosticSeverity;
  readonly phase: ForgeWebScriptDiagnosticPhase;
  readonly message: string;
  readonly fileName: string;
  readonly span: ForgeWebScriptSourceSpan;
  readonly hint?: string;
  /** Additive metadata for analysis, editor, CI, and security tooling. */
  readonly ruleId?: string;
  readonly category?: string;
  readonly blocking?: boolean;
  readonly evidence?: readonly ForgeWebScriptDiagnosticEvidence[];
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
}

export interface ForgeWebScriptDiagnosticEvidence {
  readonly message: string;
  readonly span?: ForgeWebScriptSourceSpan;
  readonly value?: string | number | boolean;
}

export function createDiagnostic(
  fileName: string,
  phase: ForgeWebScriptDiagnosticPhase,
  code: string,
  message: string,
  span: ForgeWebScriptSourceSpan,
  severity: ForgeWebScriptDiagnosticSeverity = 'error',
  hint?: string,
  metadata?: Pick<ForgeWebScriptDiagnostic, 'ruleId' | 'category' | 'blocking' | 'evidence' | 'owasp' | 'cwe'>,
): ForgeWebScriptDiagnostic {
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

export function diagnosticKey(diagnostic: ForgeWebScriptDiagnostic): string {
  return JSON.stringify([
    diagnostic.fileName,
    diagnostic.phase,
    diagnostic.code,
    diagnostic.span.start,
    diagnostic.span.end,
    diagnostic.message,
  ]);
}
