import type { ForgeWebScriptTraceOptions, ForgeWebScriptTraceReport } from './trace.js';
import type {
  ForgeWebScriptAggregateLayout,
  ForgeWebScriptOwnership,
  ForgeWebScriptSpecialization,
} from '@mission-platform/forge-web-script';

export type ForgeWebScriptVmExecutionMode = 'interpret' | 'jit' | 'aot';

export const FORGE_WEB_SCRIPT_VM_DEFAULT_MAX_MEMORY_PAGES = 256;

export type ForgeWebScriptVmValue =
  | { readonly kind: 'unit' }
  | { readonly kind: 'bool'; readonly value: boolean }
  | {
      readonly kind: 'number';
      readonly type: 'f32' | 'f64' | 'i32' | 'i64' | 'u32' | 'u64';
      readonly value: number | bigint;
    }
  | {
      readonly kind: 'bytes';
      readonly pointer: number;
      readonly length: number;
      readonly ownership: ForgeWebScriptOwnership;
    }
  | {
      readonly kind: 'aggregate';
      readonly layout: string;
      readonly bytes: Uint8Array;
      readonly ownership: ForgeWebScriptOwnership;
    }
  | { readonly kind: 'function'; readonly functionName: string };

export type ForgeWebScriptVmInstruction =
  | { readonly opcode: 'const'; readonly destination?: number; readonly constant: number }
  | { readonly opcode: 'move'; readonly destination: number; readonly source: number }
  | {
      readonly opcode: 'load';
      readonly destination: number;
      readonly address: number;
      readonly type: ForgeWebScriptVmValue['kind'];
      readonly numberType?: Extract<ForgeWebScriptVmValue, { readonly kind: 'number' }>['type'];
    }
  | { readonly opcode: 'store'; readonly address: number; readonly source: number }
  /** Allocate the number of bytes in `register[size]` and return its pointer. */
  | { readonly opcode: 'alloc'; readonly destination: number; readonly size: number }
  /** Expose a bounded linear-memory range as a pointer-length bytes value. */
  | {
      readonly opcode: 'bytes-from-memory';
      readonly destination: number;
      readonly pointer: number;
      readonly length: number;
      readonly ownership?: ForgeWebScriptOwnership;
    }
  /** Copy a bounded linear-memory range into an aggregate value. */
  | {
      readonly opcode: 'aggregate-from-memory';
      readonly destination: number;
      readonly layout: string;
      readonly pointer: number;
      readonly length: number;
      readonly ownership?: ForgeWebScriptOwnership;
    }
  /** Write an aggregate or pointer-length bytes value to linear memory. */
  | { readonly opcode: 'write-bytes'; readonly pointer: number; readonly source: number }
  /** Length in bytes of an aggregate or bytes value held in `source`. */
  | { readonly opcode: 'len'; readonly destination: number; readonly source: number }
  /** Zero-extended byte at `index` from an aggregate or bytes value held in `source`. */
  | {
      readonly opcode: 'byte-at';
      readonly destination: number;
      readonly source: number;
      readonly index: number;
    }
  | {
      readonly opcode: 'unary';
      readonly operation: 'not' | 'neg';
      readonly destination: number;
      readonly operand: number;
    }
  | {
      readonly opcode: 'binary';
      readonly operation: string;
      readonly destination: number;
      readonly left: number;
      readonly right: number;
    }
  | {
      readonly opcode: 'call';
      readonly destination?: number;
      readonly functionName: string;
      readonly arguments: readonly number[];
    }
  | {
      readonly opcode: 'call-capability';
      readonly destination?: number;
      readonly importName: string;
      readonly arguments: readonly number[];
    }
  | { readonly opcode: 'branch'; readonly condition: number; readonly ifTrue: number; readonly ifFalse: number }
  | { readonly opcode: 'jump'; readonly target: number }
  | { readonly opcode: 'return'; readonly source?: number }
  | { readonly opcode: 'trap'; readonly code: string; readonly message: string };

export interface ForgeWebScriptVmDebugSpan {
  readonly instruction: number;
  readonly fileName: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
}

export interface ForgeWebScriptVmFunction {
  readonly name: string;
  readonly parameters: readonly string[];
  readonly result: string;
  readonly registers: number;
  readonly code: readonly ForgeWebScriptVmInstruction[];
  readonly debugSpans: readonly ForgeWebScriptVmDebugSpan[];
}

export interface ForgeWebScriptVmCapabilityImport {
  readonly name: string;
  readonly capability: string;
  readonly parameters: readonly string[];
  readonly result: string;
}

export interface ForgeWebScriptVmModule {
  readonly format: 'forge-web-script-vm-module';
  readonly version: '1.0';
  readonly functions: readonly ForgeWebScriptVmFunction[];
  readonly constants: readonly ForgeWebScriptVmValue[];
  readonly aggregateLayouts: readonly ForgeWebScriptAggregateLayout[];
  readonly specializations: readonly ForgeWebScriptSpecialization[];
  readonly capabilityImports: readonly ForgeWebScriptVmCapabilityImport[];
  readonly memory: {
    readonly pageSize: 65_536;
    readonly addressType: 'u32';
    readonly allocatorExport: 'fws_alloc';
    readonly deallocatorExport: 'fws_dealloc';
    readonly reallocatorExport: 'fws_realloc';
  };
  readonly sourceHash: string;
}

export interface ForgeWebScriptVmExecutionOptions {
  readonly mode: ForgeWebScriptVmExecutionMode;
  readonly capabilities?: Readonly<
    Record<string, (...arguments_: readonly ForgeWebScriptVmValue[]) => ForgeWebScriptVmValue>
  >;
  readonly memory?: Uint8Array;
  readonly jitCache?: ForgeWebScriptVmJitCache;
  readonly maxSteps?: number;
  /** Maximum linear-memory pages available to this execution. */
  readonly maxMemoryPages?: number;
  readonly trace?: ForgeWebScriptTraceOptions;
}

export interface ForgeWebScriptVmExecutionResult {
  readonly value: ForgeWebScriptVmValue;
  readonly memory: Uint8Array;
  readonly steps: number;
  readonly mode: ForgeWebScriptVmExecutionMode;
  readonly trace?: ForgeWebScriptTraceReport;
}

export interface ForgeWebScriptVmExecutor {
  readonly execute: (
    module: ForgeWebScriptVmModule,
    functionName: string,
    arguments_: readonly ForgeWebScriptVmValue[],
    options: ForgeWebScriptVmExecutionOptions,
  ) => ForgeWebScriptVmExecutionResult;
  readonly prepare: (
    module: ForgeWebScriptVmModule,
    mode: Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>,
    options?: Omit<ForgeWebScriptVmPreparedExecutorOptions, 'mode'>,
  ) => ForgeWebScriptVmPreparedExecutor;
  readonly getJitCache?: () => ForgeWebScriptVmJitCache;
}

export interface ForgeWebScriptVmJitCache {
  readonly compilerVersion: string;
  readonly entries: Readonly<Record<string, ForgeWebScriptVmJitEntry>>;
}

export interface ForgeWebScriptVmJitEntry {
  readonly functionName: string;
  readonly sourceHash: string;
  readonly codeHash: string;
  readonly mode: 'jit';
}

export interface ForgeWebScriptVmAotArtifact {
  readonly format: 'forge-web-script-vm-aot';
  readonly moduleVersion: '1.0';
  readonly sourceHash: string;
  readonly compilerVersion: string;
  readonly module: ForgeWebScriptVmModule;
  readonly functions: readonly ForgeWebScriptVmFunction[];
  readonly reproducibilityHash: string;
}

export const FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION = '1.2' as const;
export const FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION = '1.0' as const;

export interface ForgeWebScriptVmWasmArtifact {
  readonly format: 'forge-web-script-vm-wasm';
  readonly moduleVersion: '1.0';
  readonly sourceHash: string;
  readonly compilerVersion: string;
  readonly loweringVersion: typeof FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION;
  readonly abiVersion: typeof FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION;
  readonly loweringProfile: 'register-dispatch-v1';
  readonly module: ForgeWebScriptVmModule;
  readonly functions: readonly ForgeWebScriptVmFunction[];
  readonly wasm: Uint8Array;
  readonly reproducibilityHash: string;
}

export interface ForgeWebScriptVmPreparedExecutorOptions {
  readonly compilerVersion?: string;
  readonly mode?: Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>;
  readonly aotArtifact?: ForgeWebScriptVmAotArtifact;
  readonly maxMemoryPages?: number;
  readonly capabilities?: Readonly<
    Record<string, (...arguments_: readonly ForgeWebScriptVmValue[]) => ForgeWebScriptVmValue>
  >;
}

export interface ForgeWebScriptVmPreparedExecutor {
  readonly artifact: ForgeWebScriptVmWasmArtifact;
  readonly mode: Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>;
  readonly instance: WebAssembly.Instance;
  readonly memory: WebAssembly.Memory;
  /**
   * Execute one call at a time. Calls are reusable after reset, but nested or
   * concurrent calls on the same prepared executor are rejected.
   */
  readonly execute: (
    functionName: string,
    arguments_: readonly ForgeWebScriptVmValue[],
    options?: Omit<ForgeWebScriptVmExecutionOptions, 'mode' | 'capabilities'>,
  ) => ForgeWebScriptVmExecutionResult;
  readonly reset: () => void;
  readonly close: () => void;
  readonly metadata: Readonly<{
    readonly backend: 'wasm';
    readonly mode: Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>;
    /** Reusable sequentially; invocation re-entry is rejected. */
    readonly instancePolicy: 'reusable-with-reset';
    readonly abiVersion: typeof FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION;
    readonly loweringVersion: typeof FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION;
    readonly compilerVersion: string;
    readonly sourceHash: string;
    readonly reproducibilityHash: string;
  }>;
}

export * from './vm-executor.js';
