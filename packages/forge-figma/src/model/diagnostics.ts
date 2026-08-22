export type ForgeDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ForgeDiagnostic {
  readonly code: string;
  readonly severity: ForgeDiagnosticSeverity;
  readonly message: string;
  readonly feature: string;
  readonly nodeId?: string;
  readonly nodeName?: string;
  readonly suggestion?: string;
}

export function createForgeDiagnostic(
  diagnostic: Omit<ForgeDiagnostic, 'code'> & Pick<ForgeDiagnostic, 'code'>,
): ForgeDiagnostic {
  return Object.freeze({ ...diagnostic });
}
