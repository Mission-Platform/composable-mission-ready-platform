import type { RuntimeStatus } from './types.ts';

export type ValidationPhase = 'compile' | 'runtime' | 'interaction' | 'environment';

export interface FailureClassification {
  status: RuntimeStatus;
  category: string;
}

export function classifyFailure(phase: ValidationPhase, error: unknown): FailureClassification {
  const message = error instanceof Error ? error.message : String(error);
  if (phase === 'compile') return { status: 'compile-failure', category: 'compile' };
  if (phase === 'interaction') return { status: 'interaction-failure', category: 'interaction' };
  if (phase === 'environment') return { status: 'blocked', category: 'environment' };
  if (/permission|browser executable|sandbox|not installed|missing dependency/i.test(message))
    return { status: 'blocked', category: 'environment' };
  return { status: 'runtime-failure', category: 'runtime' };
}
