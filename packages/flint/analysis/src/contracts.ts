import type {
  FlintCapabilityImport,
  FlintDiagnostic,
  FlintDiagnosticSeverity,
  FlintFunction,
  FlintModule,
  FlintSourceModuleImport,
  FlintSourceSpan,
} from "@mission-platform/flint-ast";

import type { FlintIrModule } from "./ir.js";

/** Named analysis strictness profile controlling default policy severity. */
export type FlintAnalysisProfile = "development" | "strict";

/** Classification category assigned to analysis findings and diagnostic families. */
export type FlintAnalysisCategory =
  | "type"
  | "control-flow"
  | "memory"
  | "ownership"
  | "security"
  | "resource"
  | "optimization";

/** Severity level shared with compiler diagnostics for analysis findings. */
export type FlintAnalysisSeverity = FlintDiagnosticSeverity;

/** Target feature flags for WebAssembly and machine backends. */
export interface FlintTargetFeatures {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
}

/** Bounds checking enforcement mode in static analysis. */
export type FlintAnalysisBoundsChecks =
  "runtime" | "proven-safe" | "excluded-by-profile";

/** Capability import summary. */
export interface FlintAnalysisCapabilityImport {
  readonly capability: string;
  readonly alias: string;
}

/** Link-time source import summary. */
export interface FlintAnalysisSourceImport {
  readonly source: string;
  readonly alias: string;
}

/** Minimal ABI manifest interface for static analysis and capability checks. */
export interface FlintAnalysisAbiManifest {
  readonly schemaVersion?: string;
  readonly format?: string;
  readonly module?: string;
  readonly moduleName?: string;
  readonly capabilities?: readonly { readonly name: string }[];
  readonly imports?: readonly { readonly capability: string }[];
}

/** Minimal link metadata interface for analysis. */
export interface FlintFrontendLinkMetadata {
  readonly imports?: readonly FlintAnalysisCapabilityImport[];
  readonly sourceImports?: readonly FlintAnalysisSourceImport[];
  readonly linkMode?: string;
  readonly linkProfile?: string;
}

/** Frontend compiler pass outcome container. */
export interface FlintFrontendResult {
  readonly fileName: string;
  readonly source: string;
  readonly sourceFiles: readonly string[];
  readonly module?: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly imports?: readonly FlintCapabilityImport[];
  readonly sourceImports?: readonly FlintSourceModuleImport[];
  readonly ir?: FlintIrModule;
  readonly optimizedIr?: FlintIrModule;
  readonly sonIr?: {
    readonly graphHash?: string;
    readonly nodes: readonly unknown[];
    readonly optimizationReport?: {
      readonly passes: readonly { readonly name: string }[];
    };
    readonly boundsChecks?: FlintAnalysisBoundsChecks;
  };
  readonly abi?: FlintAnalysisAbiManifest;
  readonly links: FlintFrontendLinkMetadata;
}

/** Compilation input descriptor for Salsa incremental query engine. */
export interface FlintCompileInput {
  readonly source: string;
  readonly fileName: string;
  readonly compilerVersion?: string;
  readonly requestedCapabilities?: readonly string[];
  readonly requireExports?: boolean;
  readonly linkProfile?: "static" | "dynamic";
  readonly boundsChecks?: FlintAnalysisBoundsChecks;
  readonly optimization?: "debug" | "release";
  readonly externalFunctions?: readonly FlintFunction[];
}

/** Stable prefixes reserved for source-analysis diagnostic families. */
export const FLINT_ANALYSIS_DIAGNOSTIC_CODES = {
  type: "FLINT-ANALYSIS-TYPE",
  controlFlow: "FLINT-ANALYSIS-CONTROL-FLOW",
  memory: "FLINT-ANALYSIS-MEMORY",
  ownership: "FLINT-ANALYSIS-OWNERSHIP",
  security: "FLINT-ANALYSIS-SECURITY",
  resource: "FLINT-ANALYSIS-RESOURCE",
  optimization: "FLINT-ANALYSIS-OPTIMIZATION",
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
  readonly boundsChecks: FlintAnalysisBoundsChecks;
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
  readonly source: "constant" | "literal-length" | "unknown";
}

/** Array/index bounds fact describing safety status for one access site. */
export interface FlintAnalysisArrayBoundsFact {
  readonly functionName: string;
  readonly receiver: string;
  readonly index: FlintAnalysisInterval;
  readonly length?: number;
  readonly status:
    "proven-safe" | "runtime-checked" | "unknown" | "out-of-range";
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
  readonly boundsChecks: FlintAnalysisBoundsChecks;
}

/** Capability import fact linking host capabilities to module imports. */
export interface FlintAnalysisCapabilityFact {
  readonly capability: string;
  readonly imports: readonly string[];
  readonly source: FlintAnalysisSourceImport | undefined;
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

/** Supporting evidence payload attached to an analysis finding. */
export interface FlintAnalysisEvidence {
  readonly message: string;
  readonly span?: FlintSourceSpan;
  readonly value?: string | number | boolean;
}

/** Concrete analysis finding with severity, span, and optional compliance tags. */
export interface FlintAnalysisFinding {
  readonly code: string;
  readonly ruleId: string;
  readonly category: FlintAnalysisCategory;
  readonly severity: FlintAnalysisSeverity;
  readonly blocking?: boolean;
  readonly message: string;
  readonly fileName: string;
  readonly span: FlintSourceSpan;
  readonly hint?: string;
  readonly evidence?: readonly FlintAnalysisEvidence[];
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
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
  readonly abi?: FlintAnalysisAbiManifest;
  readonly links: FlintFrontendLinkMetadata;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly policy: FlintAnalysisPolicy;
  readonly facts: FlintAnalysisFacts;
}

/** Static analysis rule interface capable of inspecting analysis contexts. */
export interface FlintAnalysisRule {
  readonly id: string;
  readonly name?: string;
  readonly category: FlintAnalysisCategory;
  readonly defaultSeverity?: FlintAnalysisSeverity;
  readonly description?: string;
  readonly analyze: (
    context: FlintAnalysisContext,
  ) => readonly FlintAnalysisFinding[];
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
}

/** Configuration options passed when requesting static analysis. */
export interface FlintAnalysisOptions {
  readonly policy?: Partial<FlintAnalysisPolicy>;
  readonly extraRules?: readonly FlintAnalysisRule[];
  readonly rules?: readonly FlintAnalysisRule[];
  readonly disabledRules?: readonly string[];
  readonly ruleSeverities?: Readonly<Record<string, FlintAnalysisSeverity>>;
  readonly source?: string;
  readonly sourceMap?: FlintAnalysisSourceMap;
  readonly sourceFiles?: readonly FlintAnalysisSourceFile[];
  readonly targetFeatures?: FlintTargetFeatures;
}

/** Aggregated report produced by running static analysis over a module. */
export interface FlintOptimizationReport {
  readonly mode?: "debug" | "release";
  readonly applied: number;
  readonly skipped: number;
  readonly passes: readonly string[];
}

export interface FlintAnalysisReport {
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly findings: readonly FlintAnalysisFinding[];
  readonly blockingFindings: readonly FlintAnalysisFinding[];
  readonly facts: FlintAnalysisFacts;
  readonly policy: FlintAnalysisPolicy;
}
