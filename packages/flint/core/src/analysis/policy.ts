import type {
  FlintAnalysisFinding,
  FlintAnalysisLimits,
  FlintAnalysisPolicy,
  FlintAnalysisSeverity,
} from './contracts.js';

/**
 * Default resource and complexity limits enforced by static analysis.
 */
export const FLINT_DEFAULT_ANALYSIS_LIMITS: FlintAnalysisLimits = {
  maxFindings: 1000,
  maxCallDepth: 256,
  maxLoopIterations: 1_000_000,
  maxAllocationBytes: 64 * 1024 * 1024,
  maxAsyncTasks: 1024,
  maxRegexInputLength: 1_000_000,
};

/**
 * Strict analysis policy suitable for CI and production builds.
 * Disallows undeclared capabilities and treats errors as blocking.
 */
export const FLINT_STRICT_ANALYSIS_POLICY: FlintAnalysisPolicy = {
  profile: 'strict',
  allowedCapabilities: [],
  boundsChecks: 'runtime',
  limits: FLINT_DEFAULT_ANALYSIS_LIMITS,
  blockingSeverities: ['error'],
};

/**
 * Relaxed development analysis policy with permissive defaults.
 */
export const FLINT_DEVELOPMENT_ANALYSIS_POLICY: FlintAnalysisPolicy = {
  ...FLINT_STRICT_ANALYSIS_POLICY,
  profile: 'development',
};

/**
 * Creates a normalized analysis policy by merging user configuration with strict/development defaults.
 *
 * @param policy - Partial policy options or profile specifier.
 * @returns Fully populated FlintAnalysisPolicy instance.
 */
export function createFlintAnalysisPolicy(policy: FlintAnalysisOptionsLike = {}): FlintAnalysisPolicy {
  const base = policy.profile === 'development' ? FLINT_DEVELOPMENT_ANALYSIS_POLICY : FLINT_STRICT_ANALYSIS_POLICY;
  return {
    ...base,
    ...policy,
    allowedCapabilities: [...(policy.allowedCapabilities ?? base.allowedCapabilities)].toSorted(),
    boundsChecks: policy.boundsChecks ?? base.boundsChecks,
    blockingSeverities: [...(policy.blockingSeverities ?? base.blockingSeverities)],
    limits: { ...base.limits, ...policy.limits },
  };
}

/**
 * Loose input type for configuring analysis policy options.
 */
export type FlintAnalysisOptionsLike = Omit<Partial<FlintAnalysisPolicy>, 'limits'> & {
  readonly limits?: Partial<FlintAnalysisLimits>;
};

/**
 * Determines whether a static analysis finding should block compilation under the active policy.
 *
 * @param finding - Static analysis finding to evaluate.
 * @param policy - Active analysis policy governing the build.
 * @returns True if the finding is considered blocking in the current policy profile.
 */
export function isFlintAnalysisFindingBlocking(finding: FlintAnalysisFinding, policy: FlintAnalysisPolicy): boolean {
  if (policy.profile !== 'strict') return false;
  if (finding.blocking !== undefined) return finding.blocking;
  const severity: FlintAnalysisSeverity = finding.severity;
  return policy.blockingSeverities.includes(severity);
}
