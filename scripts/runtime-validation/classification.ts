import type { RuntimeResult, RuntimeStatus } from './types.ts';

export type ValidationPhase = 'compile' | 'runtime' | 'interaction' | 'environment';

export interface FailureClassification {
  status: RuntimeStatus;
  category: string;
}

/**
 * Classifies an error into a standardized failure status and category based on the validation phase.
 *
 * @param phase - The validation phase during which the failure occurred.
 * @param error - The encountered error or rejection reason.
 * @returns Standardized failure classification containing status and category.
 */
export function classifyFailure(phase: ValidationPhase, error: unknown): FailureClassification {
  const message = error instanceof Error ? error.message : String(error);
  if (phase === 'compile') return { status: 'compile-failure', category: 'compile' };
  if (phase === 'interaction') return { status: 'interaction-failure', category: 'interaction' };
  if (phase === 'environment') return { status: 'blocked', category: 'environment' };
  if (/permission|browser executable|sandbox|not installed|missing dependency/i.test(message))
    return { status: 'blocked', category: 'environment' };
  return { status: 'runtime-failure', category: 'runtime' };
}

/**
 * Determines whether a runtime validation result represents a blocking failure.
 *
 * @param result - Validation result containing status and category.
 * @returns True if the status represents a build, runtime, interaction, or environment failure.
 */
export function isFailureResult(result: Pick<RuntimeResult, 'status' | 'category'>): boolean {
  return (
    ['compile-failure', 'runtime-failure', 'interaction-failure'].includes(result.status) ||
    (result.status === 'blocked' && result.category !== 'browser-not-requested')
  );
}
