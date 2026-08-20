export type ForgeWebScriptWasmStandardLibraryOperation =
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
  | 'bytes-byte-at'
  | 'bytes-slice'
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
  | 'async-worker-receive';

export type ForgeWebScriptWasmAsyncCapability = 'scheduler.microtask' | 'scheduler.worker';

export interface ForgeWebScriptTargetFeatures {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
}

export interface ForgeWebScriptWasmCompilerHints {
  /** Functions proven to be in tail position and safe to lower with return_call. */
  readonly tailCallFunctions?: readonly string[];
  /** Bounded iterator state-machine steps retained by the frontend/optimizer. */
  readonly iteratorUnrollLimit?: number;
}

export interface ForgeWebScriptWasmLogger {
  readonly scope: string;
  readonly log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ) => void;
}

export interface ForgeWebScriptWasmFeatureRequirements {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
  /** Parallel lowering is only legal when the selected scheduler is declared. */
  readonly parallel?: 'serial' | 'host-workers' | 'wasm-threads';
}

export interface ForgeWebScriptWasmAsyncContract {
  readonly capabilities: readonly ForgeWebScriptWasmAsyncCapability[];
  readonly deterministic: true;
  readonly taskIdRepresentation: 'u32';
  readonly messageRepresentation: 'owned-bytes';
  readonly ordering: 'sequence';
}

export type ForgeWebScriptWasmPrimitiveType =
  'bool' | 'bytes' | 'f32' | 'f64' | 'i32' | 'i64' | 'string' | 'u32' | 'u64' | 'unit';

export interface ForgeWebScriptWasmSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface ForgeWebScriptWasmTypeName {
  readonly name: ForgeWebScriptWasmPrimitiveType;
  readonly reference?: 'Array' | 'Vector' | string;
  readonly arguments?: readonly ForgeWebScriptWasmTypeName[];
  readonly length?: number;
}

export interface ForgeWebScriptWasmEnumDeclaration {
  readonly name: string;
  readonly exported: boolean;
  readonly representation: 'i32';
  readonly variants: readonly { readonly name: string; readonly value: number }[];
}

export interface ForgeWebScriptWasmCollectionLayout {
  readonly type: string;
  readonly kind: 'array' | 'vector';
  readonly elementType: string;
  readonly length?: number;
  readonly representation: 'contiguous' | 'owned-handle';
  readonly ownership?: 'borrowed' | 'owned' | 'shared';
  readonly elementSize?: number;
}

export type ForgeWebScriptWasmIteratorCapability = 'linear' | 'random-access';

export interface ForgeWebScriptWasmIteratorCapabilityDescriptor {
  readonly capability: ForgeWebScriptWasmIteratorCapability;
  readonly preserves: readonly ForgeWebScriptWasmIteratorCapability[];
  readonly operation: 'source' | 'map' | 'filter' | 'flatten' | 'at';
}


export interface ForgeWebScriptWasmParameter {
  readonly name: string;
  readonly type: ForgeWebScriptWasmTypeName;
}

export interface ForgeWebScriptWasmCapabilityImport {
  readonly capability: string;
  readonly alias: string;
  readonly parameters: readonly ForgeWebScriptWasmParameter[];
  readonly result: ForgeWebScriptWasmTypeName;
}

export interface ForgeWebScriptWasmSourceImport {
  readonly source: string;
  readonly alias: string;
}

export type ForgeWebScriptWasmBinaryOperator =
  '!=' | '%' | '&&' | '*' | '+' | '-' | '/' | '<' | '<=' | '==' | '>' | '>=' | '||';

export type ForgeWebScriptWasmExpression =
  | {
      readonly kind: 'literal';
      readonly value: boolean | number | string;
      readonly type: ForgeWebScriptWasmPrimitiveType;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | { readonly kind: 'identifier'; readonly name: string; readonly span: ForgeWebScriptWasmSourceSpan }
  | {
      readonly kind: 'call';
      readonly callee: string;
      readonly arguments: readonly ForgeWebScriptWasmExpression[];
      /** Compiler-owned operations are lowered to internal WASM functions. */
      readonly standardLibrary?: ForgeWebScriptWasmStandardLibraryOperation;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'binary';
      readonly operator: ForgeWebScriptWasmBinaryOperator;
      readonly left: ForgeWebScriptWasmExpression;
      readonly right: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'unary';
      readonly operator: '!' | '-';
      readonly operand: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'array-literal' | 'vector-literal';
      readonly elements: readonly ForgeWebScriptWasmExpression[];
      readonly type: ForgeWebScriptWasmTypeName;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'index';
      readonly receiver: ForgeWebScriptWasmExpression;
      readonly index: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'atomic';
      readonly operation: 'load' | 'store' | 'add' | 'compare-exchange';
      readonly address: ForgeWebScriptWasmExpression;
      readonly value?: ForgeWebScriptWasmExpression;
      readonly replacement?: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    };

export type ForgeWebScriptWasmStatement =
  | {
      readonly kind: 'assignment';
      readonly name: string;
      /** Present for collection[index] = value; omitted for local assignment. */
      readonly index?: ForgeWebScriptWasmExpression;
      readonly value: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'let';
      readonly name: string;
      readonly type: ForgeWebScriptWasmTypeName;
      readonly value: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'return';
      readonly value?: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'expression-statement';
      readonly expression: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'if';
      readonly condition: ForgeWebScriptWasmExpression;
      readonly consequent: readonly ForgeWebScriptWasmStatement[];
      readonly alternate?: readonly ForgeWebScriptWasmStatement[];
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'switch';
      readonly value: ForgeWebScriptWasmExpression;
      readonly cases: readonly {
        readonly value: number | string;
        readonly body: readonly ForgeWebScriptWasmStatement[];
      }[];
      readonly defaultCase?: readonly ForgeWebScriptWasmStatement[];
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'while';
      readonly condition: ForgeWebScriptWasmExpression;
      readonly body: readonly ForgeWebScriptWasmStatement[];
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'for';
      readonly initializer?: ForgeWebScriptWasmStatement;
      readonly condition: ForgeWebScriptWasmExpression;
      readonly update?: ForgeWebScriptWasmStatement;
      readonly body: readonly ForgeWebScriptWasmStatement[];
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'do-while';
      readonly body: readonly ForgeWebScriptWasmStatement[];
      readonly condition: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'yield';
      readonly value: ForgeWebScriptWasmExpression;
      readonly span: ForgeWebScriptWasmSourceSpan;
    }
  | {
      readonly kind: 'iterator-loop';
      readonly binding: string;
      readonly iterator: ForgeWebScriptWasmExpression;
      readonly body: readonly ForgeWebScriptWasmStatement[];
      readonly state?: number;
      readonly boundedLength?: number;
      readonly span: ForgeWebScriptWasmSourceSpan;
    };

export interface ForgeWebScriptWasmFunction {
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
  readonly parameters: readonly ForgeWebScriptWasmParameter[];
  readonly result: ForgeWebScriptWasmTypeName;
  readonly body: readonly ForgeWebScriptWasmStatement[];
  readonly span: ForgeWebScriptWasmSourceSpan;
}

export interface ForgeWebScriptWasmGenericSpecialization {
  readonly id: string;
  readonly generic: string;
  readonly arguments: readonly string[];
  readonly representation: 'monomorphized' | 'descriptor-boundary';
}

export interface ForgeWebScriptWasmIteratorBoundaryDescriptor {
  /** Factory export name used by JS iterator adapters. */
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: 'descriptor-boundary';
  readonly ownership: 'borrowed' | 'owned' | 'shared';
  readonly capability?: ForgeWebScriptWasmIteratorCapability;
}

export interface ForgeWebScriptWasmIteratorExport {
  readonly name: string;
  readonly nextFunction: string;
  readonly elementType: string;
  readonly resultRepresentation: 'value-done-pair';
  readonly ownership: 'borrowed' | 'owned' | 'shared';
}

export interface ForgeWebScriptWasmModule {
  readonly name: string;
  readonly imports: readonly ForgeWebScriptWasmCapabilityImport[];
  readonly sourceImports: readonly ForgeWebScriptWasmSourceImport[];
  readonly functions: readonly ForgeWebScriptWasmFunction[];
  readonly specializations?: readonly ForgeWebScriptWasmGenericSpecialization[];
  readonly iteratorDescriptors?: readonly ForgeWebScriptWasmIteratorBoundaryDescriptor[];
  readonly enumDeclarations?: readonly ForgeWebScriptWasmEnumDeclaration[];
  readonly collectionLayouts?: readonly ForgeWebScriptWasmCollectionLayout[];
  readonly iteratorCapabilities?: readonly ForgeWebScriptWasmIteratorCapabilityDescriptor[];
  readonly featureRequirements?: ForgeWebScriptWasmFeatureRequirements;
  readonly async?: ForgeWebScriptWasmAsyncContract;
  readonly span: ForgeWebScriptWasmSourceSpan;
}

export interface ForgeWebScriptWasmBackendInput {
  readonly ir: ForgeWebScriptWasmModule;
  readonly optimizedIr: ForgeWebScriptWasmModule;
  readonly abi: unknown;
  readonly links: unknown;
  readonly metadata: ForgeWebScriptWasmArtifactMetadata;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptWasmCompilerHints;
  readonly logger?: ForgeWebScriptWasmLogger;
}

export interface ForgeWebScriptWasmArtifactMetadata {
  readonly compilerVersion: string;
  readonly optimization: 'debug' | 'release';
  readonly sourceFiles: readonly string[];
  readonly graphHash?: string;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptWasmCompilerHints;
  readonly loggerScope?: string;
}

export interface ForgeWebScriptWasmDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly phase: 'emit';
  readonly message: string;
  readonly fileName: string;
  readonly span: ForgeWebScriptWasmSourceSpan;
  readonly hint?: string;
}

export interface ForgeWebScriptWasmBackendResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly iteratorExports?: readonly ForgeWebScriptWasmIteratorExport[];
  readonly featureRequirements?: ForgeWebScriptWasmFeatureRequirements;
  readonly sourceMap?: string;
  readonly contentHash: string;
  readonly metadata: ForgeWebScriptWasmArtifactMetadata;
  readonly diagnostics: readonly ForgeWebScriptWasmDiagnostic[];
}
