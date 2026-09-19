import type { FlintFrontendLinkMetadata, FlintFrontendResult, FlintTargetFeatures } from '../contracts.js';
import type { FlintDiagnostic, FlintDiagnosticSeverity, FlintSourceSpan } from '../diagnostics.js';
import type { FlintIrModule } from '../ir.js';
import type { FlintAbiManifest, FlintSourceImport } from '../manifest.js';
import type { FlintSoNBoundsChecks } from '../son-ir.js';

/** Named analysis strictness profile controlling default policy severity. */
export type FlintAnalysisProfile = 'development' | 'strict';

/** Classification category assigned to analysis findings and diagnostic families. */
export type FlintAnalysisCategory =
  'type' | 'control-flow' | 'memory' | 'ownership' | 'security' | 'resource' | 'optimization';

/** Severity level shared with compiler diagnostics for analysis findings. */
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

/** Numeric resource ceilings enforced by analysis policy profiles. */
export interface FlintAnalysisLimits {
  readonly maxFindings: number;
  readonly maxCallDepth: number;
  readonly maxLoopIterations: number;
  readonly maxAllocationBytes: number;
  readonly maxAsyncTasks: number;
  readonly maxRegexInputLength: number;
}

/** Complete analysis policy describing capabilities, bounds checks, and limits. */
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

/** Mapping from a generated span back to an original source location. */
export interface FlintAnalysisSourceMapEntry {
  readonly generated: FlintSourceSpan;
  readonly original: FlintSourceSpan;
  readonly sourceFile: string;
}

/** Ordered collection of generated-to-original source map entries. */
export type FlintAnalysisSourceMap = readonly FlintAnalysisSourceMapEntry[];

/** Source file identity optionally carrying raw source text for analysis. */
export interface FlintAnalysisSourceFile {
  readonly fileName: string;
  readonly source?: string;
}

/** Call-graph fact recording the direct callees of one function. */
export interface FlintAnalysisCallGraphNode {
  readonly functionName: string;
  readonly calls: readonly string[];
  readonly span: FlintSourceSpan;
}

/** Control-flow summary for a function including statement and loop presence. */
export interface FlintAnalysisControlFlowFact {
  readonly functionName: string;
  readonly statementCount: number;
  readonly expressionCount: number;
  readonly hasLoop: boolean;
  readonly span: FlintSourceSpan;
}

/** Type signature fact capturing parameter and result type names. */
export interface FlintAnalysisTypeFact {
  readonly functionName: string;
  readonly parameters: readonly string[];
  readonly result: string;
}

/** Ownership classification of a function's parameters by mode. */
export interface FlintAnalysisOwnershipFact {
  readonly functionName: string;
  readonly ownedParameters: readonly string[];
  readonly borrowedParameters: readonly string[];
  readonly sharedParameters: readonly string[];
}

/** Known constant ranges discovered for locals within a function. */
export interface FlintAnalysisRangeFact {
  readonly functionName: string;
  readonly knownConstants: Readonly<Record<string, number>>;
}

/** Inclusive numeric interval with provenance used by bounds analysis. */
export interface FlintAnalysisInterval {
  readonly min?: number;
  readonly max?: number;
  readonly source: 'constant' | 'literal-length' | 'unknown';
}

/** Array/index bounds fact describing safety status for one access site. */
export interface FlintAnalysisArrayBoundsFact {
  readonly functionName: string;
  readonly receiver: string;
  readonly index: FlintAnalysisInterval;
  readonly length?: number;
  readonly status: 'proven-safe' | 'runtime-checked' | 'unknown' | 'out-of-range';
  readonly span: FlintSourceSpan;
}

/** Pointer-range fact derived from memory standard-library call sites. */
export interface FlintAnalysisPointerRangeFact {
  readonly functionName: string;
  readonly pointer: string;
  readonly range: FlintAnalysisInterval;
  readonly checked: boolean;
  readonly span: FlintSourceSpan;
}

/** Alias and lifetime summary for borrowed, mutable, and shared bindings. */
export interface FlintAnalysisAliasLifetimeFact {
  readonly functionName: string;
  readonly borrowed: readonly string[];
  readonly mutable: readonly string[];
  readonly shared: readonly string[];
  readonly regionEscapes: readonly string[];
  readonly releaseCount: number;
}

/** Switch coverage fact including case values, duplicates, and default presence. */
export interface FlintAnalysisSwitchCoverageFact {
  readonly functionName: string;
  readonly caseCount: number;
  readonly hasDefault: boolean;
  readonly values: readonly (number | string)[];
  readonly duplicateValues: readonly (number | string)[];
  readonly span: FlintSourceSpan;
}

/** Optimization pipeline summary including graph size and applied passes. */
export interface FlintAnalysisOptimizationFact {
  readonly graphHash?: string;
  readonly nodesBefore?: number;
  readonly nodesAfter?: number;
  readonly passes: readonly string[];
  readonly boundsChecks: FlintSoNBoundsChecks;
}

/** Capability import fact linking host capabilities to module imports. */
export interface FlintAnalysisCapabilityFact {
  readonly capability: string;
  readonly imports: readonly string[];
  readonly source: FlintSourceImport | undefined;
}

/** Resource-usage estimate for a function based on IR size and loops. */
export interface FlintAnalysisResourceFact {
  readonly functionName: string;
  readonly estimatedStatements: number;
  readonly estimatedExpressions: number;
  readonly loopCount: number;
}

/** Aggregated semantic facts consumed by analysis rules and reports. */
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

/** Rule evaluation context bundling frontend artifacts, policy, and facts. */
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

/** Supporting evidence payload attached to an analysis finding. */
export interface FlintAnalysisEvidence {
  readonly message: string;
  readonly span?: FlintSourceSpan;
  readonly value?: string | number | boolean;
}

/** Concrete analysis finding with severity, span, and optional compliance tags. */
export interface FlintAnalysisFinding {
  /** Stable FLINT analysis code, for example `FLINT-ANALYSIS-MEMORY-001`. */
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

/** Pluggable analysis rule that emits findings from an analysis context. */
export interface FlintAnalysisRule {
  readonly id: string;
  readonly category: FlintAnalysisCategory;
  readonly analyze: (context: FlintAnalysisContext) => readonly FlintAnalysisFinding[];
}

/** Final analysis report containing findings, diagnostics, facts, and policy. */
export interface FlintAnalysisReport {
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly findings: readonly FlintAnalysisFinding[];
  readonly blockingFindings: readonly FlintAnalysisFinding[];
  readonly facts: FlintAnalysisFacts;
  readonly policy: FlintAnalysisPolicy;
}

/** Optional analysis configuration accepted by compile and service entry points. */
export interface FlintAnalysisOptions {
  readonly policy?: Omit<Partial<FlintAnalysisPolicy>, 'limits'> & {
    readonly limits?: Partial<FlintAnalysisLimits>;
  };
  readonly rules?: readonly FlintAnalysisRule[];
  readonly targetFeatures?: FlintTargetFeatures;
  readonly sourceMap?: FlintAnalysisSourceMap;
  readonly sourceFiles?: readonly FlintAnalysisSourceFile[];
}
