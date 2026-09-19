import type { FlintFrontendLinkMetadata, FlintFrontendResult, FlintTargetFeatures } from '../contracts.js';
import type { FlintDiagnostic, FlintDiagnosticSeverity, FlintSourceSpan } from '../diagnostics.js';
import type { FlintIrModule } from '../ir.js';
import type { FlintAbiManifest, FlintSourceImport } from '../manifest.js';
import type { FlintSoNBoundsChecks } from '../son-ir.js';

export type FlintAnalysisProfile = 'development' | 'strict';

export type FlintAnalysisCategory =
  'type' | 'control-flow' | 'memory' | 'ownership' | 'security' | 'resource' | 'optimization';

export type FlintAnalysisSeverity = FlintDiagnosticSeverity;

/** Stable prefixes reserved for source-analysis diagnostic families. */
export const FLINT_ANALYSIS_DIAGNOSTIC_CODES = {
  type: 'FLINT-ANALYSIS-TYPE',
  controlFlow: 'FLINT-ANALYSIS-CONTROL-FLOW',
  memory: 'FLINT-ANALYSIS-MEMORY',
  ownership: 'FLINT-ANALYSIS-OWNERSHIP',
  security: 'FLINT-ANALYSIS-SECURITY',
  resource: 'FLINT-ANALYSIS-RESOURCE',
  optimization: 'FLINT-ANALYSIS-OPTIMIZATION',
} as const;

export interface FlintAnalysisLimits {
  readonly maxFindings: number;
  readonly maxCallDepth: number;
  readonly maxLoopIterations: number;
  readonly maxAllocationBytes: number;
  readonly maxAsyncTasks: number;
  readonly maxRegexInputLength: number;
}

export interface FlintAnalysisPolicy {
  readonly profile: FlintAnalysisProfile;
  readonly allowedCapabilities: readonly string[];
  /** Runtime checks are the default; exclusion is an explicit audited profile choice. */
  readonly boundsChecks: FlintSoNBoundsChecks;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly limits: FlintAnalysisLimits;
  /** Severities that block a strict compilation unless the finding opts out. */
  readonly blockingSeverities: readonly FlintAnalysisSeverity[];
}

export interface FlintAnalysisSourceMapEntry {
  readonly generated: FlintSourceSpan;
  readonly original: FlintSourceSpan;
  readonly sourceFile: string;
}

export type FlintAnalysisSourceMap = readonly FlintAnalysisSourceMapEntry[];

export interface FlintAnalysisSourceFile {
  readonly fileName: string;
  readonly source?: string;
}

export interface FlintAnalysisCallGraphNode {
  readonly functionName: string;
  readonly calls: readonly string[];
  readonly span: FlintSourceSpan;
}

export interface FlintAnalysisControlFlowFact {
  readonly functionName: string;
  readonly statementCount: number;
  readonly expressionCount: number;
  readonly hasLoop: boolean;
  readonly span: FlintSourceSpan;
}

export interface FlintAnalysisTypeFact {
  readonly functionName: string;
  readonly parameters: readonly string[];
  readonly result: string;
}

export interface FlintAnalysisOwnershipFact {
  readonly functionName: string;
  readonly ownedParameters: readonly string[];
  readonly borrowedParameters: readonly string[];
  readonly sharedParameters: readonly string[];
}

export interface FlintAnalysisRangeFact {
  readonly functionName: string;
  readonly knownConstants: Readonly<Record<string, number>>;
}

export interface FlintAnalysisInterval {
  readonly min?: number;
  readonly max?: number;
  readonly source: 'constant' | 'literal-length' | 'unknown';
}

export interface FlintAnalysisArrayBoundsFact {
  readonly functionName: string;
  readonly receiver: string;
  readonly index: FlintAnalysisInterval;
  readonly length?: number;
  readonly status: 'proven-safe' | 'runtime-checked' | 'unknown' | 'out-of-range';
  readonly span: FlintSourceSpan;
}

export interface FlintAnalysisPointerRangeFact {
  readonly functionName: string;
  readonly pointer: string;
  readonly range: FlintAnalysisInterval;
  readonly checked: boolean;
  readonly span: FlintSourceSpan;
}

export interface FlintAnalysisAliasLifetimeFact {
  readonly functionName: string;
  readonly borrowed: readonly string[];
  readonly mutable: readonly string[];
  readonly shared: readonly string[];
  readonly regionEscapes: readonly string[];
  readonly releaseCount: number;
}

export interface FlintAnalysisSwitchCoverageFact {
  readonly functionName: string;
  readonly caseCount: number;
  readonly hasDefault: boolean;
  readonly values: readonly (number | string)[];
  readonly duplicateValues: readonly (number | string)[];
  readonly span: FlintSourceSpan;
}

export interface FlintAnalysisOptimizationFact {
  readonly graphHash?: string;
  readonly nodesBefore?: number;
  readonly nodesAfter?: number;
  readonly passes: readonly string[];
  readonly boundsChecks: FlintSoNBoundsChecks;
}

export interface FlintAnalysisCapabilityFact {
  readonly capability: string;
  readonly imports: readonly string[];
  readonly source: FlintSourceImport | undefined;
}

export interface FlintAnalysisResourceFact {
  readonly functionName: string;
  readonly estimatedStatements: number;
  readonly estimatedExpressions: number;
  readonly loopCount: number;
}

export interface FlintAnalysisFacts {
  readonly callGraph: readonly FlintAnalysisCallGraphNode[];
  readonly controlFlow: readonly FlintAnalysisControlFlowFact[];
  readonly types: readonly FlintAnalysisTypeFact[];
  readonly ownership: readonly FlintAnalysisOwnershipFact[];
  readonly ranges: readonly FlintAnalysisRangeFact[];
  readonly arrayBounds: readonly FlintAnalysisArrayBoundsFact[];
  readonly pointerRanges: readonly FlintAnalysisPointerRangeFact[];
  readonly aliasLifetimes: readonly FlintAnalysisAliasLifetimeFact[];
  readonly switchCoverage: readonly FlintAnalysisSwitchCoverageFact[];
  readonly optimization: FlintAnalysisOptimizationFact;
  readonly capabilities: readonly FlintAnalysisCapabilityFact[];
  readonly resources: readonly FlintAnalysisResourceFact[];
}

export interface FlintAnalysisContext {
  readonly frontend: FlintFrontendResult;
  readonly source: string;
  readonly fileName: string;
  readonly sourceFiles: readonly FlintAnalysisSourceFile[];
  readonly sourceMap?: FlintAnalysisSourceMap;
  readonly ir?: FlintIrModule;
  readonly optimizedIr?: FlintIrModule;
  readonly abi?: FlintAbiManifest;
  readonly links: FlintFrontendLinkMetadata;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly policy: FlintAnalysisPolicy;
  readonly facts: FlintAnalysisFacts;
}

export interface FlintAnalysisEvidence {
  readonly message: string;
  readonly span?: FlintSourceSpan;
  readonly value?: string | number | boolean;
}

export interface FlintAnalysisFinding {
  /** Stable FWS analysis code, for example `FLINT-ANALYSIS-MEMORY-001`. */
  readonly code: string;
  readonly ruleId: string;
  readonly category: FlintAnalysisCategory;
  readonly severity: FlintAnalysisSeverity;
  readonly blocking?: boolean;
  readonly message: string;
  readonly fileName: string;
  readonly span: FlintSourceSpan;
  readonly evidence?: readonly FlintAnalysisEvidence[];
  readonly hint?: string;
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
}

export interface FlintAnalysisRule {
  readonly id: string;
  readonly category: FlintAnalysisCategory;
  readonly analyze: (context: FlintAnalysisContext) => readonly FlintAnalysisFinding[];
}

export interface FlintAnalysisReport {
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly findings: readonly FlintAnalysisFinding[];
  readonly blockingFindings: readonly FlintAnalysisFinding[];
  readonly facts: FlintAnalysisFacts;
  readonly policy: FlintAnalysisPolicy;
}

export interface FlintAnalysisOptions {
  readonly policy?: Omit<Partial<FlintAnalysisPolicy>, 'limits'> & {
    readonly limits?: Partial<FlintAnalysisLimits>;
  };
  readonly rules?: readonly FlintAnalysisRule[];
  readonly targetFeatures?: FlintTargetFeatures;
  readonly sourceMap?: FlintAnalysisSourceMap;
  readonly sourceFiles?: readonly FlintAnalysisSourceFile[];
}
