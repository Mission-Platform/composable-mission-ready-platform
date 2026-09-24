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
 * Constant-time string comparison to prevent timing side-channel attacks on security tokens and capability names.
 */
export function timingSafeEqualString(stringA: string, stringB: string): boolean {
  if (typeof stringA !== 'string' || typeof stringB !== 'string') return false;
  const lengthA = stringA.length;
  const lengthB = stringB.length;
  let mismatch = lengthA ^ lengthB;
  const maxLength = Math.max(lengthA, lengthB);
  for (let index = 0; index < maxLength; index += 1) {
    const codePointA = index < lengthA ? (stringA.codePointAt(index) ?? 0) : 0;
    const codePointB = index < lengthB ? (stringB.codePointAt(index) ?? 0) : 0;
    mismatch |= codePointA ^ codePointB;
  }
  return mismatch === 0;
}

/**
 * Checks whether a requested capability is authorized under the active policy using constant-time comparison.
 */
// skipcq: JS-R1005
export function isCapabilityAuthorized(capability: string, allowedCapabilities: readonly string[]): boolean {
  let authorized = false;
  for (const allowed of allowedCapabilities) {
    if (timingSafeEqualString(capability, allowed)) {
      authorized = true;
    }
  }
  return authorized;
}

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
