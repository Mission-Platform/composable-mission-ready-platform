import type {
  FlintAnalysisFinding,
  FlintAnalysisLimits,
  FlintAnalysisPolicy,
  FlintAnalysisSeverity,
} from './contracts.js';
import type { FlintSoNBoundsChecks } from '../son-ir.js';

export const FLINT_DEFAULT_ANALYSIS_LIMITS: FlintAnalysisLimits = {
  maxFindings: 1000,
  maxCallDepth: 256,
  maxLoopIterations: 1_000_000,
  maxAllocationBytes: 64 * 1024 * 1024,
  maxAsyncTasks: 1024,
  maxRegexInputLength: 1_000_000,
};

export const FLINT_STRICT_ANALYSIS_POLICY: FlintAnalysisPolicy = {
  profile: 'strict',
  allowedCapabilities: [],
  boundsChecks: 'runtime',
  limits: FLINT_DEFAULT_ANALYSIS_LIMITS,
  blockingSeverities: ['error'],
};

export const FLINT_DEVELOPMENT_ANALYSIS_POLICY: FlintAnalysisPolicy = {
  ...FLINT_STRICT_ANALYSIS_POLICY,
  profile: 'development',
};

/**
 * Creates an effective analysis policy by merging user configuration with profile defaults.
 *
 * @param policy Partial policy options.
 * @returns Fully populated FlintAnalysisPolicy.
 */
export function createFlintAnalysisPolicy(policy: FlintAnalysisOptionsLike = {}): FlintAnalysisPolicy {
  const base = policy.profile === 'development' ? FLINT_DEVELOPMENT_ANALYSIS_POLICY : FLINT_STRICT_ANALYSIS_POLICY;
  return {
    ...base,
    ...policy,
    allowedCapabilities: [...(policy.allowedCapabilities ?? base.allowedCapabilities)].toSorted(),
    boundsChecks: (policy.boundsChecks ?? base.boundsChecks) as FlintSoNBoundsChecks,
    blockingSeverities: [...(policy.blockingSeverities ?? base.blockingSeverities)],
    limits: { ...base.limits, ...policy.limits },
  };
}

export type FlintAnalysisOptionsLike = Omit<Partial<FlintAnalysisPolicy>, 'limits'> & {
  readonly limits?: Partial<FlintAnalysisLimits>;
};

/**
 * Determines whether an analysis finding should block compilation under the given policy.
 *
 * @param finding Finding under evaluation.
 * @param policy Active analysis policy.
 * @returns True if the finding is considered blocking.
 */
export function isFlintAnalysisFindingBlocking(finding: FlintAnalysisFinding, policy: FlintAnalysisPolicy): boolean {
  if (policy.profile !== 'strict') return false;
  if (finding.blocking !== undefined) return finding.blocking;
  return policy.blockingSeverities.includes(finding.severity as FlintAnalysisSeverity);
}
