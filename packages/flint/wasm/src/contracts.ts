export type FlintWasmStandardLibraryOperation =
  | 'full-match'
  | 'prefix-match'
  | 'search'
  | 'full-capture-start'
  | 'full-capture-end'
  | 'prefix-capture-start'
  | 'prefix-capture-end'
  | 'search-capture-start'
  | 'search-capture-end'
  | 'string-concat'
  | 'string-length'
  | 'string-byte-at'
  | 'string-starts-with'
  | 'string-slice'
  | 'string-to-i32'
  | 'bytes-length'
  | 'bytes-length-u32'
  | 'bytes-byte-at'
  | 'bytes-byte-at-u32'
  | 'bytes-slice'
  | 'memory-alloc'
  | 'memory-dealloc'
  | 'memory-realloc'
  | 'memory-load-u32'
  | 'memory-store-u32'
  | 'memory-load-f64'
  | 'memory-store-f64'
  | 'f64-from-u32'
  | 'vector-new'
  | 'vector-push'
  | 'vector-get'
  | 'vector-set'
  | 'vector-length'
  | 'vector-pop'
  | 'array-new'
  | 'array-get'
  | 'array-set'
  | 'array-length'
  | 'array-iter'
  | 'iterator-next'
  | 'set-has'
  | 'map-get'
  | 'ecs-query'
  | 'ecs-transition'
  | 'signal-schedule'
  | 'async-schedule-microtask'
  | 'async-worker-post'
  | 'async-worker-receive'
  | 'memory-copy'
  | 'memory-fill'
  | 'simd-binarize'
  | 'simd-i8x16-splat'
  | 'simd-i8x16-eq'
  | 'simd-i8x16-lt-u'
  | 'simd-i8x16-bitmask'
  | 'simd-i32x4-splat'
  | 'simd-i32x4-add'
  | 'simd-v128-load'
  | 'simd-v128-store';

export type FlintWasmAsyncCapability = 'scheduler.microtask' | 'scheduler.worker';

export interface FlintTargetFeatures {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
}

export interface FlintWasmCompilerHints {
  /** Functions proven to be in tail position and safe to lower with return_call. */
  readonly tailCallFunctions?: readonly string[];
  /** Bounded iterator state-machine steps retained by the frontend/optimizer. */
  readonly iteratorUnrollLimit?: number;
}

export interface FlintWasmLogger {
  readonly scope: string;
  readonly log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ) => void;
}

export interface FlintWasmFeatureRequirements {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
  /** Parallel lowering is only legal when the selected scheduler is declared. */
  readonly parallel?: 'serial' | 'host-workers' | 'wasm-threads';
}

export interface FlintWasmAsyncContract {
  readonly capabilities: readonly FlintWasmAsyncCapability[];
  readonly deterministic: true;
  readonly taskIdRepresentation: 'u32';
  readonly messageRepresentation: 'owned-bytes';
  readonly ordering: 'sequence';
}

export type FlintWasmPrimitiveType =
  'bool' | 'bytes' | 'f32' | 'f64' | 'i32' | 'i64' | 'string' | 'u32' | 'u64' | 'unit' | 'v128';

export interface FlintWasmSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface FlintWasmAggregateLayout {
  readonly name: string;
  readonly kind: 'struct' | 'enum';
  readonly record?: true;
  readonly size: number;
  readonly alignment: number;
  readonly fields: readonly {
    readonly name: string;
    readonly type: string;
    readonly offset: number;
    readonly size: number;
    readonly alignment: number;
  }[];
}

export interface FlintWasmTypeName {
  readonly name: FlintWasmPrimitiveType;
  readonly reference?: 'Array' | 'Vector' | string;
  readonly arguments?: readonly FlintWasmTypeName[];
  readonly length?: number;
  readonly referenceMode?: 'ref' | 'mut-ref';
}

export interface FlintWasmEnumDeclaration {
  readonly name: string;
  readonly exported: boolean;
  readonly representation: 'i32';
  readonly variants: readonly { readonly name: string; readonly value: number }[];
}

export interface FlintWasmCollectionLayout {
  readonly type: string;
  readonly kind: 'array' | 'vector';
  readonly elementType: string;
  readonly length?: number;
  readonly representation: 'contiguous' | 'owned-handle';
  readonly ownership?: 'borrowed' | 'owned' | 'shared';
  readonly elementSize?: number;
}

export type FlintWasmIteratorCapability = 'linear' | 'random-access';

export interface FlintWasmIteratorCapabilityDescriptor {
  readonly capability: FlintWasmIteratorCapability;
  readonly preserves: readonly FlintWasmIteratorCapability[];
  readonly operation: 'source' | 'map' | 'filter' | 'flatten' | 'at';
}

export interface FlintWasmParameter {
  readonly name: string;
  readonly type: FlintWasmTypeName;
  readonly passing?: 'value' | 'immutable-reference' | 'mutable-reference';
  readonly mutable?: true;
}

export interface FlintWasmCapabilityImport {
  readonly capability: string;
  readonly alias: string;
  readonly parameters: readonly FlintWasmParameter[];
  readonly result: FlintWasmTypeName;
}

export interface FlintWasmSourceImport {
  readonly source: string;
  readonly alias: string;
}

export type FlintWasmBinaryOperator = '!=' | '%' | '&&' | '*' | '+' | '-' | '/' | '<' | '<=' | '==' | '>' | '>=' | '||';

export type FlintWasmExpression =
  | {
      readonly kind: 'literal';
      readonly value: boolean | number | string;
      readonly type: FlintWasmPrimitiveType;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'struct-value';
      readonly type: string;
      readonly fields: Readonly<Record<string, FlintWasmExpression>>;
      readonly span: FlintWasmSourceSpan;
    }
  | { readonly kind: 'identifier'; readonly name: string; readonly span: FlintWasmSourceSpan }
  | {
      readonly kind: 'call';
      readonly callee: string;
      readonly arguments: readonly FlintWasmExpression[];
      /** Compiler-owned operations are lowered to internal WASM functions. */
      readonly standardLibrary?: FlintWasmStandardLibraryOperation;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'binary';
      readonly operator: FlintWasmBinaryOperator;
      readonly left: FlintWasmExpression;
      readonly right: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'unary';
      readonly operator: '!' | '-';
      readonly operand: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'array-literal' | 'vector-literal';
      readonly elements: readonly FlintWasmExpression[];
      readonly type: FlintWasmTypeName;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'index';
      readonly receiver: FlintWasmExpression;
      readonly index: FlintWasmExpression;
      /** Present only when a prior proof establishes that the access is in range. */
      readonly boundsCheck?: 'required' | 'proven-safe';
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'atomic';
      readonly operation: 'load' | 'store' | 'add' | 'compare-exchange';
      readonly address: FlintWasmExpression;
      readonly value?: FlintWasmExpression;
      readonly replacement?: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    };

export type FlintWasmStatement =
  | {
      readonly kind: 'assignment';
      readonly name: string;
      /** Present for collection[index] = value; omitted for local assignment. */
      readonly index?: FlintWasmExpression;
      readonly value: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'let';
      readonly name: string;
      readonly type: FlintWasmTypeName;
      readonly value: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'return';
      readonly value?: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'expression-statement';
      readonly expression: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'if';
      readonly condition: FlintWasmExpression;
      readonly consequent: readonly FlintWasmStatement[];
      readonly alternate?: readonly FlintWasmStatement[];
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'switch';
      readonly value: FlintWasmExpression;
      readonly cases: readonly {
        readonly value: number | string;
        readonly body: readonly FlintWasmStatement[];
      }[];
      readonly defaultCase?: readonly FlintWasmStatement[];
      readonly strategy?: 'br-table' | 'sparse' | 'constant';
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'while';
      readonly condition: FlintWasmExpression;
      readonly body: readonly FlintWasmStatement[];
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'for';
      readonly initializer?: FlintWasmStatement;
      readonly condition: FlintWasmExpression;
      readonly update?: FlintWasmStatement;
      readonly body: readonly FlintWasmStatement[];
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'do-while';
      readonly body: readonly FlintWasmStatement[];
      readonly condition: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'yield';
      readonly value: FlintWasmExpression;
      readonly span: FlintWasmSourceSpan;
    }
  | {
      readonly kind: 'iterator-loop';
      readonly binding: string;
      readonly iterator: FlintWasmExpression;
      readonly body: readonly FlintWasmStatement[];
      readonly state?: number;
      readonly boundedLength?: number;
      readonly span: FlintWasmSourceSpan;
    };

export interface FlintWasmFunction {
  readonly name: string;
  readonly exported: boolean;
  /** Marks source-level iter fn factories before backend state-machine lowering. */
  readonly iterable?: boolean;
  /**
   * Backend-only roles after iterator lowering.
   * - factory: returns an i32 iterator handle
   * - next: (handle) -> (value, done) multi-value result
   */
  readonly iteratorRole?: 'factory' | 'next';
  readonly parameters: readonly FlintWasmParameter[];
  readonly result: FlintWasmTypeName;
  readonly results?: readonly FlintWasmTypeName[];
  readonly body: readonly FlintWasmStatement[];
  readonly span: FlintWasmSourceSpan;
}

export interface FlintWasmGenericSpecialization {
  readonly id: string;
  readonly generic: string;
  readonly arguments: readonly string[];
  readonly representation: 'monomorphized' | 'descriptor-boundary';
}

export interface FlintWasmIteratorBoundaryDescriptor {
  /** Factory export name used by JS iterator adapters. */
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: 'descriptor-boundary';
  readonly ownership: 'borrowed' | 'owned' | 'shared';
  readonly capability?: FlintWasmIteratorCapability;
}

export interface FlintWasmIteratorExport {
  readonly name: string;
  readonly nextFunction: string;
  readonly elementType: string;
  readonly resultRepresentation: 'value-done-pair';
  readonly ownership: 'borrowed' | 'owned' | 'shared';
}

export interface FlintWasmModule {
  readonly name: string;
  readonly imports: readonly FlintWasmCapabilityImport[];
  readonly sourceImports: readonly FlintWasmSourceImport[];
  readonly functions: readonly FlintWasmFunction[];
  readonly specializations?: readonly FlintWasmGenericSpecialization[];
  readonly iteratorDescriptors?: readonly FlintWasmIteratorBoundaryDescriptor[];
  readonly enumDeclarations?: readonly FlintWasmEnumDeclaration[];
  readonly aggregateLayouts?: readonly FlintWasmAggregateLayout[];
  readonly collectionLayouts?: readonly FlintWasmCollectionLayout[];
  readonly iteratorCapabilities?: readonly FlintWasmIteratorCapabilityDescriptor[];
  readonly featureRequirements?: FlintWasmFeatureRequirements;
  readonly async?: FlintWasmAsyncContract;
  readonly memoryModel?: 'region-arc-checked-linear';
  readonly span: FlintWasmSourceSpan;
}

export interface FlintWasmBackendInput {
  readonly ir: FlintWasmModule;
  readonly optimizedIr: FlintWasmModule;
  readonly abi: unknown;
  readonly links: unknown;
  readonly metadata: FlintWasmArtifactMetadata;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintWasmCompilerHints;
  readonly logger?: FlintWasmLogger;
}

export interface FlintWasmArtifactMetadata {
  readonly compilerVersion: string;
  readonly optimization: 'debug' | 'release';
  readonly sourceFiles: readonly string[];
  readonly sourceHash?: string;
  readonly graphHash?: string;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintWasmCompilerHints;
  readonly loggerScope?: string;
  readonly memoryModel?: 'region-arc-checked-linear';
  readonly sonSchemaVersion?: string;
  readonly sonGraphHash?: string;
  readonly boundsChecks?: 'runtime' | 'proven-safe' | 'excluded-by-profile';
  readonly sonOptimizationPasses?: readonly string[];
  readonly wasmOptimizationPasses?: readonly string[];
}

export interface FlintWasmDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly phase: 'emit';
  readonly message: string;
  readonly fileName: string;
  readonly span: FlintWasmSourceSpan;
  readonly hint?: string;
}

export interface FlintWasmBackendResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly iteratorExports?: readonly FlintWasmIteratorExport[];
  readonly featureRequirements?: FlintWasmFeatureRequirements;
  readonly sourceMap?: string;
  /** Versioned SHA-256 digest in the `sha256-v1:<hex>` format. */
  readonly contentHash: string;
  readonly metadata: FlintWasmArtifactMetadata;
  readonly diagnostics: readonly FlintWasmDiagnostic[];
}
