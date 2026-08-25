import type {
  ForgeWebScriptAnalysisFinding,
  ForgeWebScriptAnalysisLimits,
  ForgeWebScriptAnalysisPolicy,
  ForgeWebScriptAnalysisSeverity,
} from './contracts.js';
import type { ForgeWebScriptSoNBoundsChecks } from '../son-ir.js';

export const FORGE_WEB_SCRIPT_DEFAULT_ANALYSIS_LIMITS: ForgeWebScriptAnalysisLimits = {
  maxFindings: 1000,
  maxCallDepth: 256,
  maxLoopIterations: 1_000_000,
  maxAllocationBytes: 64 * 1024 * 1024,
  maxAsyncTasks: 1024,
  maxRegexInputLength: 1_000_000,
};

export const FORGE_WEB_SCRIPT_STRICT_ANALYSIS_POLICY: ForgeWebScriptAnalysisPolicy = {
  profile: 'strict',
  allowedCapabilities: [],
  boundsChecks: 'runtime',
  limits: FORGE_WEB_SCRIPT_DEFAULT_ANALYSIS_LIMITS,
  blockingSeverities: ['error'],
};

export const FORGE_WEB_SCRIPT_DEVELOPMENT_ANALYSIS_POLICY: ForgeWebScriptAnalysisPolicy = {
  ...FORGE_WEB_SCRIPT_STRICT_ANALYSIS_POLICY,
  profile: 'development',
};

export function createForgeWebScriptAnalysisPolicy(
  policy: ForgeWebScriptAnalysisOptionsLike = {},
): ForgeWebScriptAnalysisPolicy {
  const base =
    policy.profile === 'development'
      ? FORGE_WEB_SCRIPT_DEVELOPMENT_ANALYSIS_POLICY
      : FORGE_WEB_SCRIPT_STRICT_ANALYSIS_POLICY;
  return {
    ...base,
    ...policy,
    allowedCapabilities: [...(policy.allowedCapabilities ?? base.allowedCapabilities)].toSorted(),
    boundsChecks: (policy.boundsChecks ?? base.boundsChecks) as ForgeWebScriptSoNBoundsChecks,
    blockingSeverities: [...(policy.blockingSeverities ?? base.blockingSeverities)],
    limits: { ...base.limits, ...policy.limits },
  };
}

export type ForgeWebScriptAnalysisOptionsLike = Omit<Partial<ForgeWebScriptAnalysisPolicy>, 'limits'> & {
  readonly limits?: Partial<ForgeWebScriptAnalysisLimits>;
};

export function isForgeWebScriptAnalysisFindingBlocking(
  finding: ForgeWebScriptAnalysisFinding,
  policy: ForgeWebScriptAnalysisPolicy,
): boolean {
  if (policy.profile !== 'strict') return false;
  if (finding.blocking !== undefined) return finding.blocking;
  return policy.blockingSeverities.includes(finding.severity as ForgeWebScriptAnalysisSeverity);
}
