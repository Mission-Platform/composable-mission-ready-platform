import type { FlintTraceOptions, FlintTraceReport } from './trace.js';
import type { FlintAggregateLayout, FlintOwnership, FlintSpecialization } from '@mission-platform/flint';

export type FlintVmExecutionMode = 'interpret' | 'jit' | 'aot';

export const FLINT_VM_DEFAULT_MAX_MEMORY_PAGES = 256;

export type FlintVmValue =
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
      readonly ownership: FlintOwnership;
    }
  | {
      readonly kind: 'aggregate';
      readonly layout: string;
      readonly bytes: Uint8Array;
      readonly ownership: FlintOwnership;
    }
  | { readonly kind: 'function'; readonly functionName: string };

export type FlintVmInstruction =
  | { readonly opcode: 'const'; readonly destination?: number; readonly constant: number }
  | { readonly opcode: 'move'; readonly destination: number; readonly source: number }
  | {
      readonly opcode: 'load';
      readonly destination: number;
      readonly address: number;
      readonly type: FlintVmValue['kind'];
      readonly numberType?: Extract<FlintVmValue, { readonly kind: 'number' }>['type'];
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
      readonly ownership?: FlintOwnership;
    }
  /** Copy a bounded linear-memory range into an aggregate value. */
  | {
      readonly opcode: 'aggregate-from-memory';
      readonly destination: number;
      readonly layout: string;
      readonly pointer: number;
      readonly length: number;
      readonly ownership?: FlintOwnership;
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

export interface FlintVmDebugSpan {
  readonly instruction: number;
  readonly fileName: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
}

export interface FlintVmFunction {
  readonly name: string;
  readonly parameters: readonly string[];
  readonly result: string;
  readonly registers: number;
  readonly code: readonly FlintVmInstruction[];
  readonly debugSpans: readonly FlintVmDebugSpan[];
}

export interface FlintVmCapabilityImport {
  readonly name: string;
  readonly capability: string;
  readonly parameters: readonly string[];
  readonly result: string;
}

export interface FlintVmModule {
  readonly format: 'forge-web-script-vm-module';
  readonly version: '1.0';
  readonly functions: readonly FlintVmFunction[];
  readonly constants: readonly FlintVmValue[];
  readonly aggregateLayouts: readonly FlintAggregateLayout[];
  readonly specializations: readonly FlintSpecialization[];
  readonly capabilityImports: readonly FlintVmCapabilityImport[];
  readonly memory: {
    readonly pageSize: 65_536;
    readonly addressType: 'u32';
    readonly allocatorExport: 'fws_alloc';
    readonly deallocatorExport: 'fws_dealloc';
    readonly reallocatorExport: 'fws_realloc';
  };
  readonly sourceHash: string;
}

export interface FlintVmExecutionOptions {
  readonly mode: FlintVmExecutionMode;
  readonly capabilities?: Readonly<Record<string, (...arguments_: readonly FlintVmValue[]) => FlintVmValue>>;
  readonly memory?: Uint8Array;
  readonly jitCache?: FlintVmJitCache;
  readonly maxSteps?: number;
  /** Maximum linear-memory pages available to this execution. */
  readonly maxMemoryPages?: number;
  readonly trace?: FlintTraceOptions;
}

export interface FlintVmExecutionResult {
  readonly value: FlintVmValue;
  readonly memory: Uint8Array;
  readonly steps: number;
  readonly mode: FlintVmExecutionMode;
  readonly trace?: FlintTraceReport;
}

export interface FlintVmExecutor {
  readonly execute: (
    module: FlintVmModule,
    functionName: string,
    arguments_: readonly FlintVmValue[],
    options: FlintVmExecutionOptions,
  ) => FlintVmExecutionResult;
  readonly prepare: (
    module: FlintVmModule,
    mode: Exclude<FlintVmExecutionMode, 'interpret'>,
    options?: Omit<FlintVmPreparedExecutorOptions, 'mode'>,
  ) => FlintVmPreparedExecutor;
  readonly getJitCache?: () => FlintVmJitCache;
}

export interface FlintVmJitCache {
  readonly compilerVersion: string;
  readonly entries: Readonly<Record<string, FlintVmJitEntry>>;
}

export interface FlintVmJitEntry {
  readonly functionName: string;
  readonly sourceHash: string;
  readonly codeHash: string;
  readonly mode: 'jit';
}

export interface FlintVmAotArtifact {
  readonly format: 'forge-web-script-vm-aot';
  readonly moduleVersion: '1.0';
  readonly sourceHash: string;
  readonly compilerVersion: string;
  readonly module: FlintVmModule;
  readonly functions: readonly FlintVmFunction[];
  readonly reproducibilityHash: string;
}

export const FLINT_VM_WASM_ABI_VERSION = '1.2' as const;
export const FLINT_VM_WASM_LOWERING_VERSION = '1.0' as const;

export interface FlintVmWasmArtifact {
  readonly format: 'forge-web-script-vm-wasm';
  readonly moduleVersion: '1.0';
  readonly sourceHash: string;
  readonly compilerVersion: string;
  readonly loweringVersion: typeof FLINT_VM_WASM_LOWERING_VERSION;
  readonly abiVersion: typeof FLINT_VM_WASM_ABI_VERSION;
  readonly loweringProfile: 'register-dispatch-v1';
  readonly module: FlintVmModule;
  readonly functions: readonly FlintVmFunction[];
  readonly wasm: Uint8Array;
  readonly reproducibilityHash: string;
}

export interface FlintVmPreparedExecutorOptions {
  readonly compilerVersion?: string;
  readonly mode?: Exclude<FlintVmExecutionMode, 'interpret'>;
  readonly aotArtifact?: FlintVmAotArtifact;
  readonly maxMemoryPages?: number;
  readonly capabilities?: Readonly<Record<string, (...arguments_: readonly FlintVmValue[]) => FlintVmValue>>;
}

export interface FlintVmPreparedExecutor {
  readonly artifact: FlintVmWasmArtifact;
  readonly mode: Exclude<FlintVmExecutionMode, 'interpret'>;
  readonly instance: WebAssembly.Instance;
  readonly memory: WebAssembly.Memory;
  /**
   * Execute one call at a time. Calls are reusable after reset, but nested or
   * concurrent calls on the same prepared executor are rejected.
   */
  readonly execute: (
    functionName: string,
    arguments_: readonly FlintVmValue[],
    options?: Omit<FlintVmExecutionOptions, 'mode' | 'capabilities'>,
  ) => FlintVmExecutionResult;
  readonly reset: () => void;
  readonly close: () => void;
  readonly metadata: Readonly<{
    readonly backend: 'wasm';
    readonly mode: Exclude<FlintVmExecutionMode, 'interpret'>;
    /** Reusable sequentially; invocation re-entry is rejected. */
    readonly instancePolicy: 'reusable-with-reset';
    readonly abiVersion: typeof FLINT_VM_WASM_ABI_VERSION;
    readonly loweringVersion: typeof FLINT_VM_WASM_LOWERING_VERSION;
    readonly compilerVersion: string;
    readonly sourceHash: string;
    readonly reproducibilityHash: string;
  }>;
}

export * from './vm-executor.js';
