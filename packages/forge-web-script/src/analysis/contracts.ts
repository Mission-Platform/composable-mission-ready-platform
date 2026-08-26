import type {
  ForgeWebScriptFrontendLinkMetadata,
  ForgeWebScriptFrontendResult,
  ForgeWebScriptTargetFeatures,
} from '../contracts.js';
import type {
  ForgeWebScriptDiagnostic,
  ForgeWebScriptDiagnosticSeverity,
  ForgeWebScriptSourceSpan,
} from '../diagnostics.js';
import type { ForgeWebScriptIrModule } from '../ir.js';
import type { ForgeWebScriptAbiManifest, ForgeWebScriptSourceImport } from '../manifest.js';
import type { ForgeWebScriptSoNBoundsChecks } from '../son-ir.js';

export type ForgeWebScriptAnalysisProfile = 'development' | 'strict';

export type ForgeWebScriptAnalysisCategory =
  'type' | 'control-flow' | 'memory' | 'ownership' | 'security' | 'resource' | 'optimization';

export type ForgeWebScriptAnalysisSeverity = ForgeWebScriptDiagnosticSeverity;

/** Stable prefixes reserved for source-analysis diagnostic families. */
export const FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES = {
  type: 'FWS-ANALYSIS-TYPE',
  controlFlow: 'FWS-ANALYSIS-CONTROL-FLOW',
  memory: 'FWS-ANALYSIS-MEMORY',
  ownership: 'FWS-ANALYSIS-OWNERSHIP',
  security: 'FWS-ANALYSIS-SECURITY',
  resource: 'FWS-ANALYSIS-RESOURCE',
  optimization: 'FWS-ANALYSIS-OPTIMIZATION',
} as const;

export interface ForgeWebScriptAnalysisLimits {
  readonly maxFindings: number;
  readonly maxCallDepth: number;
  readonly maxLoopIterations: number;
  readonly maxAllocationBytes: number;
  readonly maxAsyncTasks: number;
  readonly maxRegexInputLength: number;
}

export interface ForgeWebScriptAnalysisPolicy {
  readonly profile: ForgeWebScriptAnalysisProfile;
  readonly allowedCapabilities: readonly string[];
  /** Runtime checks are the default; exclusion is an explicit audited profile choice. */
  readonly boundsChecks: ForgeWebScriptSoNBoundsChecks;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly limits: ForgeWebScriptAnalysisLimits;
  /** Severities that block a strict compilation unless the finding opts out. */
  readonly blockingSeverities: readonly ForgeWebScriptAnalysisSeverity[];
}

export interface ForgeWebScriptAnalysisSourceMapEntry {
  readonly generated: ForgeWebScriptSourceSpan;
  readonly original: ForgeWebScriptSourceSpan;
  readonly sourceFile: string;
}

export type ForgeWebScriptAnalysisSourceMap = readonly ForgeWebScriptAnalysisSourceMapEntry[];

export interface ForgeWebScriptAnalysisSourceFile {
  readonly fileName: string;
  readonly source?: string;
}

export interface ForgeWebScriptAnalysisCallGraphNode {
  readonly functionName: string;
  readonly calls: readonly string[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptAnalysisControlFlowFact {
  readonly functionName: string;
  readonly statementCount: number;
  readonly expressionCount: number;
  readonly hasLoop: boolean;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptAnalysisTypeFact {
  readonly functionName: string;
  readonly parameters: readonly string[];
  readonly result: string;
}

export interface ForgeWebScriptAnalysisOwnershipFact {
  readonly functionName: string;
  readonly ownedParameters: readonly string[];
  readonly borrowedParameters: readonly string[];
  readonly sharedParameters: readonly string[];
}

export interface ForgeWebScriptAnalysisRangeFact {
  readonly functionName: string;
  readonly knownConstants: Readonly<Record<string, number>>;
}

export interface ForgeWebScriptAnalysisInterval {
  readonly min?: number;
  readonly max?: number;
  readonly source: 'constant' | 'literal-length' | 'unknown';
}

export interface ForgeWebScriptAnalysisArrayBoundsFact {
  readonly functionName: string;
  readonly receiver: string;
  readonly index: ForgeWebScriptAnalysisInterval;
  readonly length?: number;
  readonly status: 'proven-safe' | 'runtime-checked' | 'unknown' | 'out-of-range';
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptAnalysisPointerRangeFact {
  readonly functionName: string;
  readonly pointer: string;
  readonly range: ForgeWebScriptAnalysisInterval;
  readonly checked: boolean;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptAnalysisAliasLifetimeFact {
  readonly functionName: string;
  readonly borrowed: readonly string[];
  readonly mutable: readonly string[];
  readonly shared: readonly string[];
  readonly regionEscapes: readonly string[];
  readonly releaseCount: number;
}

export interface ForgeWebScriptAnalysisSwitchCoverageFact {
  readonly functionName: string;
  readonly caseCount: number;
  readonly hasDefault: boolean;
  readonly values: readonly (number | string)[];
  readonly duplicateValues: readonly (number | string)[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptAnalysisOptimizationFact {
  readonly graphHash?: string;
  readonly nodesBefore?: number;
  readonly nodesAfter?: number;
  readonly passes: readonly string[];
  readonly boundsChecks: ForgeWebScriptSoNBoundsChecks;
}

export interface ForgeWebScriptAnalysisCapabilityFact {
  readonly capability: string;
  readonly imports: readonly string[];
  readonly source: ForgeWebScriptSourceImport | undefined;
}

export interface ForgeWebScriptAnalysisResourceFact {
  readonly functionName: string;
  readonly estimatedStatements: number;
  readonly estimatedExpressions: number;
  readonly loopCount: number;
}

export interface ForgeWebScriptAnalysisFacts {
  readonly callGraph: readonly ForgeWebScriptAnalysisCallGraphNode[];
  readonly controlFlow: readonly ForgeWebScriptAnalysisControlFlowFact[];
  readonly types: readonly ForgeWebScriptAnalysisTypeFact[];
  readonly ownership: readonly ForgeWebScriptAnalysisOwnershipFact[];
  readonly ranges: readonly ForgeWebScriptAnalysisRangeFact[];
  readonly arrayBounds: readonly ForgeWebScriptAnalysisArrayBoundsFact[];
  readonly pointerRanges: readonly ForgeWebScriptAnalysisPointerRangeFact[];
  readonly aliasLifetimes: readonly ForgeWebScriptAnalysisAliasLifetimeFact[];
  readonly switchCoverage: readonly ForgeWebScriptAnalysisSwitchCoverageFact[];
  readonly optimization: ForgeWebScriptAnalysisOptimizationFact;
  readonly capabilities: readonly ForgeWebScriptAnalysisCapabilityFact[];
  readonly resources: readonly ForgeWebScriptAnalysisResourceFact[];
}

export interface ForgeWebScriptAnalysisContext {
  readonly frontend: ForgeWebScriptFrontendResult;
  readonly source: string;
  readonly fileName: string;
  readonly sourceFiles: readonly ForgeWebScriptAnalysisSourceFile[];
  readonly sourceMap?: ForgeWebScriptAnalysisSourceMap;
  readonly ir?: ForgeWebScriptIrModule;
  readonly optimizedIr?: ForgeWebScriptIrModule;
  readonly abi?: ForgeWebScriptAbiManifest;
  readonly links: ForgeWebScriptFrontendLinkMetadata;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly policy: ForgeWebScriptAnalysisPolicy;
  readonly facts: ForgeWebScriptAnalysisFacts;
}

export interface ForgeWebScriptAnalysisEvidence {
  readonly message: string;
  readonly span?: ForgeWebScriptSourceSpan;
  readonly value?: string | number | boolean;
}

export interface ForgeWebScriptAnalysisFinding {
  /** Stable FWS analysis code, for example `FWS-ANALYSIS-MEMORY-001`. */
  readonly code: string;
  readonly ruleId: string;
  readonly category: ForgeWebScriptAnalysisCategory;
  readonly severity: ForgeWebScriptAnalysisSeverity;
  readonly blocking?: boolean;
  readonly message: string;
  readonly fileName: string;
  readonly span: ForgeWebScriptSourceSpan;
  readonly evidence?: readonly ForgeWebScriptAnalysisEvidence[];
  readonly hint?: string;
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
}

export interface ForgeWebScriptAnalysisRule {
  readonly id: string;
  readonly category: ForgeWebScriptAnalysisCategory;
  readonly analyze: (context: ForgeWebScriptAnalysisContext) => readonly ForgeWebScriptAnalysisFinding[];
}

export interface ForgeWebScriptAnalysisReport {
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly findings: readonly ForgeWebScriptAnalysisFinding[];
  readonly blockingFindings: readonly ForgeWebScriptAnalysisFinding[];
  readonly facts: ForgeWebScriptAnalysisFacts;
  readonly policy: ForgeWebScriptAnalysisPolicy;
}

export interface ForgeWebScriptAnalysisOptions {
  readonly policy?: Omit<Partial<ForgeWebScriptAnalysisPolicy>, 'limits'> & {
    readonly limits?: Partial<ForgeWebScriptAnalysisLimits>;
  };
  readonly rules?: readonly ForgeWebScriptAnalysisRule[];
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly sourceMap?: ForgeWebScriptAnalysisSourceMap;
  readonly sourceFiles?: readonly ForgeWebScriptAnalysisSourceFile[];
}
