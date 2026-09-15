import type { RuntimeResult, RuntimeStatus } from './types.ts';

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

export function isFailureResult(result: Pick<RuntimeResult, 'status' | 'category'>): boolean {
  if (['compile-failure', 'runtime-failure', 'interaction-failure'].includes(result.status)) return true;
  if (result.status === 'blocked' && result.category !== 'browser-not-requested') return true;
  return false;
}
