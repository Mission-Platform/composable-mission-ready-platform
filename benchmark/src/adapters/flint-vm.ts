import {
  createFlintVmAotArtifact,
  createFlintVmExecutor,
} from "@mission-platform/flint-runtime";

import { decodeUtf8, encodeUtf8, normalizeBenchmarkOutput } from "../abi.ts";

import type {
  BenchmarkInput,
  BenchmarkOutput,
  BuildArtifact,
  FlintMode,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";
import type {
  FlintVmExecutionResult,
  FlintVmInstruction,
  FlintVmModule,
  FlintVmPreparedExecutor,
  FlintVmValue,
} from "@mission-platform/flint-runtime";

const COMPILER_VERSION = "benchmark-flint-v1";
const SOURCE_HASH = "benchmark-flint-vm-wasm-v1";
const MAX_STEPS = 50_000_000;

const VM_PREPARATION_LABELS: Readonly<Record<string, string>> = {
  aot: "prepared-wasm-aot",
  jit: "prepared-wasm-jit",
  interpret: "none",
};

const VM_OPTIMIZATION_LEVELS: Readonly<Record<string, "release" | "debug">> = {
  aot: "release",
  jit: "debug",
  interpret: "debug",
};

/**
 * Creates an i32 numeric value representation for the Forge Web Script VM.
 *
 * @param value - 32-bit integer literal value.
 * @returns A structured FlintVmValue representing the integer.
 */
const numberValue = (value: number): FlintVmValue => ({
  kind: "number",
  type: "i32",
  value,
});

/**
 * Creates an aggregate byte slice value representation for the Forge Web Script VM.
 *
 * @param bytes - Contiguous byte payload.
 * @param layout - Identifier of the aggregate layout contract.
 * @returns A structured FlintVmValue representing the aggregate payload.
 */
const aggregateValue = (bytes: Uint8Array, layout: string): FlintVmValue => ({
  kind: "aggregate",
  layout,
  bytes,
  ownership: "borrowed",
});

/**
 * Label patch record used during bytecode emission to resolve forward and backward jumps.
 */
interface LabelPatch {
  readonly index: number;
  readonly field: "ifTrue" | "ifFalse" | "target";
  readonly label: string;
}

/**
 * Fluent builder interface for emitting Forge Web Script VM bytecode instructions.
 */
interface FunctionBuilder {
  readonly code: FlintVmInstruction[];
  readonly alloc: () => number;
  readonly label: (labelName: string) => void;
  readonly num: (destination: number, constant: number) => void;
  readonly move: (destination: number, source: number) => void;
  readonly binary: (
    operation: string,
    destination: number,
    left: number,
    right: number,
  ) => void;
  readonly len: (destination: number, source: number) => void;
  readonly byteAt: (destination: number, source: number, index: number) => void;
  readonly call: (
    destination: number | undefined,
    functionName: string,
    argumentsList: readonly number[],
  ) => void;
  readonly capability: (
    destination: number | undefined,
    importName: string,
    argumentsList: readonly number[],
  ) => void;
  readonly branch: (condition: number, ifTrue: string, ifFalse: string) => void;
  readonly jump: (labelName: string) => void;
  readonly ret: (source?: number) => void;
  readonly finish: () => FlintVmInstruction[];
  readonly registers: () => number;
}

/**
 * Function definition structure emitted for module linkage.
 */
interface BuiltFunction {
  name: string;
  parameters: string[];
  result: string;
  registers: number;
  code: FlintVmInstruction[];
  debugSpans: [];
}

/**
 * Resolves label references across bytecode instructions to concrete instruction offsets.
 *
 * @param code - Emitted bytecode instructions.
 * @param patches - Pending label fixups recorded during emission.
 * @param labels - Map of label identifiers to instruction indices.
 * @param functionName - Name of the function being linked, used for error diagnostics.
 * @returns The patched instructions array.
 * @throws {Error} If a target label is missing in the label index.
 */
// skipcq: JS-R1005
function resolvePatches(
  code: FlintVmInstruction[],
  patches: readonly LabelPatch[],
  labels: ReadonlyMap<string, number>,
  functionName: string,
): FlintVmInstruction[] {
  for (const patch of patches) {
    const target = labels.get(patch.label);
    if (target === undefined) {
      throw new Error(`Missing label ${patch.label} in ${functionName}`);
    }
    const instruction = code[patch.index];
    if (instruction.opcode === "branch") {
      code[patch.index] = {
        ...instruction,
        ifTrue: patch.field === "ifTrue" ? target : instruction.ifTrue,
        ifFalse: patch.field === "ifFalse" ? target : instruction.ifFalse,
      };
    } else if (instruction.opcode === "jump") {
      code[patch.index] = {
        ...instruction,
        target,
      };
    }
  }
  return code;
}

/**
 * Assembles a single bytecode function with an isolated local label namespace and register allocator.
 *
 * @param name - Semantic identifier of the function within the module.
 * @param parameterCount - Number of initial registers reserved for function parameters.
 * @param build - Callback receiving the fluent instruction builder.
 * @returns The structured VM function definition ready for module linkage.
 */
function buildFunction(
  name: string,
  parameterCount: number,
  build: (builder: FunctionBuilder) => void,
): BuiltFunction {
  let nextRegister = parameterCount;
  const code: FlintVmInstruction[] = [];
  const localLabels = new Map<string, number>();
  const localPatches: LabelPatch[] = [];

  const builder: FunctionBuilder = {
    code,
    alloc: () => {
      const register = nextRegister;
      nextRegister += 1;
      return register;
    },
    label: (labelName: string) => {
      localLabels.set(labelName, code.length);
    },
    num: (destination: number, constant: number) => {
      code.push({ opcode: "const", destination, constant });
    },
    move: (destination: number, source: number) => {
      code.push({ opcode: "move", destination, source });
    },
    binary: (
      operation: string,
      destination: number,
      left: number,
      right: number,
    ) => {
      code.push({
        opcode: "binary",
        operation,
        destination,
        left,
        right,
      });
    },
    len: (destination: number, source: number) => {
      code.push({ opcode: "len", destination, source });
    },
    byteAt: (destination: number, source: number, index: number) => {
      code.push({
        opcode: "byte-at",
        destination,
        source,
        index,
      });
    },
    call: (
      destination: number | undefined,
      functionName: string,
      argumentsList: readonly number[],
    ) => {
      code.push({
        opcode: "call",
        ...(destination === undefined ? {} : { destination }),
        functionName,
        arguments: argumentsList,
      });
    },
    capability: (
      destination: number | undefined,
      importName: string,
      argumentsList: readonly number[],
    ) => {
      code.push({
        opcode: "call-capability",
        ...(destination === undefined ? {} : { destination }),
        importName,
        arguments: argumentsList,
      });
    },
    branch: (condition: number, ifTrue: string, ifFalse: string) => {
      localPatches.push(
        { index: code.length, field: "ifTrue", label: ifTrue },
        { index: code.length, field: "ifFalse", label: ifFalse },
      );
      code.push({
        opcode: "branch",
        condition,
        ifTrue: -1,
        ifFalse: -1,
      });
    },
    jump: (labelName: string) => {
      localPatches.push({
        index: code.length,
        field: "target",
        label: labelName,
      });
      code.push({ opcode: "jump", target: -1 });
    },
    ret: (source?: number) => {
      code.push(
        source === undefined
          ? { opcode: "return" }
          : { opcode: "return", source },
      );
    },
    finish: () => resolvePatches(code, localPatches, localLabels, name),
    registers: () => nextRegister,
  };

  build(builder);
  const finished = builder.finish();
  return {
    name,
    parameters: [],
    result: "i32",
    registers: builder.registers(),
    code: finished,
    debugSpans: [],
  };
}

/**
 * Builds the recursive range sum kernel function.
 *
 * @returns Built range sum function.
 */
function buildRangeSumFunction(): BuiltFunction {
  const rangeSum = buildFunction("range_sum", 4, (builder) => {
    // args: lo=0, hi=1, mult=2, seed=3
    const condition = builder.alloc();
    const sum = builder.alloc();
    const index = builder.alloc();
    const raw = builder.alloc();
    const left = builder.alloc();
    const right = builder.alloc();
    const half = builder.alloc();
    const one = builder.alloc();
    const two = builder.alloc();
    const multiplierConstant = builder.alloc();
    const offsetConstant = builder.alloc();
    const moduloConstant = builder.alloc();
    const decrementConstant = builder.alloc();
    const zero = builder.alloc();

    builder.num(one, 1);
    builder.num(two, 2);
    builder.num(multiplierConstant, 3);
    builder.num(offsetConstant, 4);
    builder.num(moduloConstant, 5);
    builder.num(decrementConstant, 6);
    builder.num(zero, 0);

    builder.binary(">=", condition, 0, 1);
    builder.branch(condition, "empty", "check_leaf");
    builder.label("empty");
    builder.ret(zero);

    builder.label("check_leaf");
    builder.binary("+", index, 0, one);
    builder.binary("==", condition, index, 1);
    builder.branch(condition, "leaf", "branch");

    builder.label("leaf");
    builder.binary("*", raw, index, multiplierConstant);
    builder.binary("+", raw, raw, 3);
    builder.binary("+", raw, raw, offsetConstant);
    builder.binary("%", raw, raw, moduloConstant);
    builder.binary("-", raw, raw, decrementConstant);
    builder.binary("*", raw, raw, 2);
    builder.ret(raw);

    builder.label("branch");
    builder.binary("+", half, 0, 1);
    builder.binary("/", half, half, two);
    builder.call(left, "range_sum", [0, half, 2, 3]);
    builder.call(right, "range_sum", [half, 1, 2, 3]);
    builder.binary("+", sum, left, right);
    builder.ret(sum);
  });
  rangeSum.parameters = ["i32", "i32", "i32", "i32"];
  rangeSum.result = "i32";
  return rangeSum;
}

/**
 * Builds the top-level arithmetic reduction kernel function.
 *
 * @returns Built arithmetic reduction function.
 */
function buildArithmeticReduceFunction(): BuiltFunction {
  const arithmeticReduce = buildFunction("arithmetic_reduce", 4, (builder) => {
    // n=0, mult=1, offset=2, seed=3
    const zero = builder.alloc();
    const sum = builder.alloc();
    builder.num(zero, 0);
    builder.call(sum, "range_sum", [zero, 0, 1, 3]);
    builder.binary("+", sum, 2, sum);
    builder.ret(sum);
  });
  arithmeticReduce.parameters = ["i32", "i32", "i32", "i32"];
  arithmeticReduce.result = "i32";
  return arithmeticReduce;
}

/**
 * Builds the divide-and-conquer byte scanning kernel function.
 *
 * @returns Built byte scan function.
 */
function buildScanBytesFunction(): BuiltFunction {
  const scanBytes = buildFunction("scan_bytes", 4, (builder) => {
    // data=0, lo=1, hi=2, threshold=3
    const condition = builder.alloc();
    const sum = builder.alloc();
    const index = builder.alloc();
    const byte = builder.alloc();
    const left = builder.alloc();
    const right = builder.alloc();
    const half = builder.alloc();
    const one = builder.alloc();
    const two = builder.alloc();
    const zero = builder.alloc();

    builder.num(one, 1);
    builder.num(two, 2);
    builder.num(zero, 0);

    builder.binary(">=", condition, 1, 2);
    builder.branch(condition, "empty", "check_leaf");
    builder.label("empty");
    builder.ret(zero);

    builder.label("check_leaf");
    builder.binary("+", index, 1, one);
    builder.binary("==", condition, index, 2);
    builder.branch(condition, "leaf", "branch");

    builder.label("leaf");
    builder.byteAt(byte, 0, 1);
    builder.binary(">=", condition, byte, 3);
    builder.branch(condition, "hit", "miss");
    builder.label("hit");
    builder.binary("+", byte, byte, one);
    builder.ret(byte);
    builder.label("miss");
    builder.ret(zero);

    builder.label("branch");
    builder.binary("+", half, 1, 2);
    builder.binary("/", half, half, two);
    builder.call(left, "scan_bytes", [0, 1, half, 3]);
    builder.call(right, "scan_bytes", [0, half, 2, 3]);
    builder.binary("+", sum, left, right);
    builder.ret(sum);
  });
  scanBytes.parameters = ["BenchmarkBytes", "i32", "i32", "i32"];
  scanBytes.result = "i32";
  return scanBytes;
}

/**
 * Builds the top-level dataset scan kernel function.
 *
 * @returns Built dataset scan function.
 */
function buildDatasetScanFunction(): BuiltFunction {
  const datasetScan = buildFunction("dataset_scan", 2, (builder) => {
    // data=0, threshold=1
    const zero = builder.alloc();
    const length = builder.alloc();
    const result = builder.alloc();
    builder.num(zero, 0);
    builder.len(length, 0);
    builder.call(result, "scan_bytes", [0, zero, length, 1]);
    builder.ret(result);
  });
  datasetScan.parameters = ["BenchmarkBytes", "i32"];
  datasetScan.result = "i32";
  return datasetScan;
}

/**
 * Builds the recursive string prefix check helper function.
 *
 * @returns Built starts_with_at function.
 */
function buildStartsWithAtFunction(): BuiltFunction {
  const startsWithAt = buildFunction("starts_with_at", 4, (builder) => {
    // value=0, prefix=1, index=2, prefixLength=3
    const temporary = builder.alloc();
    const valueByte = builder.alloc();
    const prefixByte = builder.alloc();
    const nextIndex = builder.alloc();
    const one = builder.alloc();
    const trueValue = builder.alloc();
    const falseValue = builder.alloc();
    builder.num(one, 1);
    builder.num(trueValue, 1);
    builder.num(falseValue, 0);
    builder.binary(">=", temporary, 2, 3);
    builder.branch(temporary, "done_true", "compare");
    builder.label("done_true");
    builder.binary("==", temporary, trueValue, trueValue);
    builder.ret(temporary);
    builder.label("compare");
    builder.byteAt(valueByte, 0, 2);
    builder.byteAt(prefixByte, 1, 2);
    builder.binary("==", temporary, valueByte, prefixByte);
    builder.branch(temporary, "advance", "done_false");
    builder.label("done_false");
    builder.binary("==", temporary, trueValue, falseValue);
    builder.ret(temporary);
    builder.label("advance");
    builder.binary("+", nextIndex, 2, one);
    builder.call(temporary, "starts_with_at", [0, 1, nextIndex, 3]);
    builder.ret(temporary);
  });
  startsWithAt.parameters = ["BenchmarkBytes", "BenchmarkBytes", "i32", "i32"];
  startsWithAt.result = "bool";
  return startsWithAt;
}

/**
 * Builds the string prefix comparison function.
 *
 * @returns Built starts_with function.
 */
function buildStartsWithFunction(): BuiltFunction {
  const startsWith = buildFunction("starts_with", 2, (builder) => {
    // value=0, prefix=1
    const valueLength = builder.alloc();
    const prefixLength = builder.alloc();
    const temporary = builder.alloc();
    const zero = builder.alloc();
    const trueValue = builder.alloc();
    const falseValue = builder.alloc();
    builder.num(zero, 0);
    builder.num(trueValue, 1);
    builder.num(falseValue, 0);
    builder.len(valueLength, 0);
    builder.len(prefixLength, 1);
    builder.binary(">", temporary, prefixLength, valueLength);
    builder.branch(temporary, "no", "yes");
    builder.label("no");
    builder.binary("==", temporary, trueValue, falseValue);
    builder.ret(temporary);
    builder.label("yes");
    builder.call(temporary, "starts_with_at", [0, 1, zero, prefixLength]);
    builder.ret(temporary);
  });
  startsWith.parameters = ["BenchmarkBytes", "BenchmarkBytes"];
  startsWith.result = "bool";
  return startsWith;
}

/**
 * Builds the string repetition kernel function.
 *
 * @returns Built repeat_str function.
 */
function buildRepeatStrFunction(): BuiltFunction {
  const repeatStr = buildFunction("repeat_str", 2, (builder) => {
    // piece=0, count=1
    const condition = builder.alloc();
    const remainder = builder.alloc();
    const even = builder.alloc();
    const odd = builder.alloc();
    const halfCount = builder.alloc();
    const half = builder.alloc();
    const doubled = builder.alloc();
    const one = builder.alloc();
    const two = builder.alloc();
    const zero = builder.alloc();
    const empty = builder.alloc();
    builder.num(one, 1);
    builder.num(two, 2);
    builder.num(zero, 0);
    builder.capability(empty, "empty_string", []);

    builder.binary("<=", condition, 1, zero);
    builder.branch(condition, "ret_empty", "check_one");
    builder.label("ret_empty");
    builder.ret(empty);

    builder.label("check_one");
    builder.binary("==", condition, 1, one);
    builder.branch(condition, "ret_piece", "split");
    builder.label("ret_piece");
    builder.ret(0);

    builder.label("split");
    builder.binary("/", halfCount, 1, two);
    builder.call(half, "repeat_str", [0, halfCount]);
    builder.capability(doubled, "concat", [half, half]);
    builder.binary("%", remainder, 1, two);
    builder.binary("==", even, remainder, zero);
    builder.branch(even, "ret_doubled", "ret_odd");
    builder.label("ret_doubled");
    builder.ret(doubled);
    builder.label("ret_odd");
    builder.capability(odd, "concat", [doubled, 0]);
    builder.ret(odd);
  });
  repeatStr.parameters = ["BenchmarkBytes", "i32"];
  repeatStr.result = "BenchmarkBytes";
  return repeatStr;
}

/**
 * Builds the string transformation pipeline function.
 *
 * @returns Built string_transform function.
 */
function buildStringTransformFunction(): BuiltFunction {
  const stringTransform = buildFunction("string_transform", 4, (builder) => {
    // value=0, prefix=1, suffix=2, repeat=3
    const starts = builder.alloc();
    const repeated = builder.alloc();
    const head = builder.alloc();
    const result = builder.alloc();
    builder.call(starts, "starts_with", [0, 1]);
    builder.call(repeated, "repeat_str", [2, 3]);
    builder.branch(starts, "with_prefix", "without_prefix");
    builder.label("with_prefix");
    builder.capability(result, "concat", [0, repeated]);
    builder.ret(result);
    builder.label("without_prefix");
    builder.capability(head, "concat", [0, 1]);
    builder.capability(result, "concat", [head, repeated]);
    builder.ret(result);
  });
  stringTransform.parameters = [
    "BenchmarkBytes",
    "BenchmarkBytes",
    "BenchmarkBytes",
    "i32",
  ];
  stringTransform.result = "BenchmarkBytes";
  return stringTransform;
}

/**
 * Minimal bytecode helpers for hand-lowered native Flint VM kernels.
 * Arithmetic and dataset run with pure VM ops; string uses a concat capability
 * only as the allocation primitive (control flow stays in the VM).
 *
 * @returns Fully assembled FlintVmModule containing all native benchmark kernels.
 */
function createNativeVmModule(): FlintVmModule {
  const constants: FlintVmValue[] = [
    numberValue(0), // 0
    numberValue(1), // 1
    numberValue(2), // 2
    numberValue(1_103_515_245), // 3
    numberValue(12_345), // 4
    numberValue(2001), // 5
    numberValue(1000), // 6
    numberValue(131), // 7 unused
  ];

  return buildModuleWithLabels(constants);
}

/**
 * Assembles the complete VM module with hand-lowered kernels and aggregate layouts.
 *
 * @param constants - Constant pool entries for the module.
 * @returns Constructed FlintVmModule definition.
 */
function buildModuleWithLabels(constants: FlintVmValue[]): FlintVmModule {
  return {
    format: "forge-web-script-vm-module",
    version: "1.0",
    sourceHash: SOURCE_HASH,
    functions: [
      buildRangeSumFunction(),
      buildArithmeticReduceFunction(),
      buildScanBytesFunction(),
      buildDatasetScanFunction(),
      buildStartsWithAtFunction(),
      buildStartsWithFunction(),
      buildRepeatStrFunction(),
      buildStringTransformFunction(),
    ],
    constants,
    aggregateLayouts: [
      {
        name: "BenchmarkBytes",
        kind: "struct",
        size: 4,
        alignment: 4,
        fields: [
          {
            name: "bytes",
            type: "bytes",
            offset: 0,
            size: 4,
            alignment: 4,
            ownership: "borrowed",
          },
        ],
        immutable: true,
      },
    ],
    specializations: [],
    capabilityImports: [
      {
        name: "concat",
        capability: "benchmark.string_concat",
        parameters: ["BenchmarkBytes", "BenchmarkBytes"],
        result: "BenchmarkBytes",
      },
      {
        name: "empty_string",
        capability: "benchmark.empty_string",
        parameters: [],
        result: "BenchmarkBytes",
      },
    ],
    memory: {
      pageSize: 65_536,
      addressType: "u32",
      allocatorExport: "fws_alloc",
      deallocatorExport: "fws_dealloc",
      reallocatorExport: "fws_realloc",
    },
  };
}

/**
 * Instantiates the host capability handlers required for string operations in the VM.
 *
 * @returns Map of capability names to execution closures.
 */
function stringCapabilities(): Readonly<
  Record<string, (...args: readonly FlintVmValue[]) => FlintVmValue>
> {
  return {
    concat: (left, right) => {
      if (left.kind !== "aggregate" || right.kind !== "aggregate") {
        throw new Error("concat capability expects aggregate byte payloads.");
      }
      const bytes = new Uint8Array(left.bytes.length + right.bytes.length);
      bytes.set(left.bytes, 0);
      bytes.set(right.bytes, left.bytes.length);
      return aggregateValue(bytes, "BenchmarkBytes");
    },
    empty_string: () => aggregateValue(new Uint8Array(), "BenchmarkBytes"),
  };
}

/**
 * Dispatches a native kernel invocation to either the prepared executor or the general interpreter.
 *
 * @param mode - Execution mode (interpret, jit, or aot).
 * @param module - Compiled VM module.
 * @param functionName - Target kernel function name.
 * @param args - Positional VM arguments.
 * @param executor - VM execution engine.
 * @param prepared - Optional prepared VM executor.
 * @param capabilities - Host string capabilities.
 * @returns VM execution outcome containing the returned value and execution step count.
 * @throws {Error} If prepared backend is uninitialized in JIT/AOT modes.
 */
function executeNative(
  mode: Exclude<FlintMode, "wasm" | "wasm-generated" | "wasm-excluded-bounds">,
  module: FlintVmModule,
  functionName: string,
  args: readonly FlintVmValue[],
  executor: ReturnType<typeof createFlintVmExecutor>,
  prepared: FlintVmPreparedExecutor | undefined,
  capabilities: ReturnType<typeof stringCapabilities>,
): FlintVmExecutionResult {
  if (mode !== "interpret") {
    if (prepared === undefined) {
      throw new Error("Flint prepared VM backend was not initialized.");
    }
    return prepared.execute(functionName, args, { maxSteps: MAX_STEPS });
  }
  return executor.execute(module, functionName, args, {
    mode,
    maxSteps: MAX_STEPS,
    capabilities,
  });
}

/**
 * Prepares the VM backend for execution, returning an initialized prepared executor for JIT/AOT modes.
 *
 * @param mode - Execution mode (interpret, jit, or aot).
 * @param module - Compiled VM module.
 * @param aot - AOT artifact when mode is "aot", otherwise undefined.
 * @param executor - VM executor engine.
 * @param capabilities - Imported host capabilities.
 * @returns Initialized prepared executor, or undefined when interpreting.
 * @throws {Error} When preparation returns an unexpected mode.
 */
function prepareVmBackend(
  mode: Exclude<FlintMode, "wasm" | "wasm-generated" | "wasm-excluded-bounds">,
  module: FlintVmModule,
  aot: ReturnType<typeof createFlintVmAotArtifact> | undefined,
  executor: ReturnType<typeof createFlintVmExecutor>,
  capabilities: ReturnType<typeof stringCapabilities>,
): FlintVmPreparedExecutor | undefined {
  if (mode === "interpret") {
    return undefined;
  }
  const prepared = executor.prepare(module, mode, {
    capabilities,
    aotArtifact: mode === "aot" ? aot : undefined,
  });
  if (prepared.mode !== mode) {
    throw new Error(`Flint ${mode} preparation returned an unexpected mode.`);
  }
  return prepared;
}

/**
 * Extracts normalized preparation metadata from the VM prepared state.
 *
 * @param prepared - The prepared VM executor, or undefined if in interpreted mode.
 * @param jitCacheEntries - Number of cached JIT entries.
 * @param aotArtifactCreated - Whether an AOT artifact was created.
 * @returns Dictionary of benchmark preparation metadata.
 */
// skipcq: JS-R1005
function extractPreparationMetadata(
  prepared: FlintVmPreparedExecutor | undefined,
  jitCacheEntries: number,
  aotArtifactCreated: boolean,
): Record<string, string | number | boolean> {
  return {
    compilerVersion: COMPILER_VERSION,
    jitCacheEntries,
    backend: prepared?.metadata.backend ?? "interpreter",
    instancePolicy: prepared?.metadata.instancePolicy ?? "fresh-per-execute",
    loweringVersion: prepared?.metadata.loweringVersion ?? "none",
    preparedArtifactHash: prepared?.artifact.reproducibilityHash ?? "",
    preparedArtifactSize: prepared?.artifact.wasm.byteLength ?? 0,
    aotArtifactCreated,
    nativeKernels: true,
  };
}

/**
 * Constructs the benchmark build artifact descriptor for a VM execution mode.
 *
 * @param mode - Target execution mode.
 * @param module - Compiled native VM module.
 * @param aot - Optional AOT artifact.
 * @returns Benchmark build artifact metadata.
 */
function buildVmArtifact(
  mode: Exclude<FlintMode, "wasm" | "wasm-generated" | "wasm-excluded-bounds">,
  module: FlintVmModule,
  aot: ReturnType<typeof createFlintVmAotArtifact> | undefined,
): BuildArtifact {
  return {
    id: `flint-vm-${mode}`,
    implementation: "flint",
    flintMode: mode,
    artifactKind: "flint-vm",
    hash: module.sourceHash,
    exports: ["arithmetic_reduce", "string_transform", "dataset_scan"],
    flintPipeline: {
      pipeline: "flint-vm-reference",
      frontend: "vm-ir",
      optimization: VM_OPTIMIZATION_LEVELS[mode] ?? "debug",
    },
    metadata: {
      abi: "vm-wasm-v1",
      compilerVersion: COMPILER_VERSION,
      nativeKernels: true,
      preparation: VM_PREPARATION_LABELS[mode] ?? "none",
      aotReproducibilityHash: aot?.reproducibilityHash ?? "",
    },
  };
}

/**
 * Dispatches a benchmark input workload to the appropriate native VM function.
 *
 * @param mode - Target execution mode.
 * @param module - Native VM module.
 * @param input - Benchmark input payload.
 * @param executor - VM executor.
 * @param prepared - Optional prepared VM executor.
 * @param capabilities - Host string capabilities.
 * @returns Normalized benchmark output.
 * @throws {Error} If execution produces unexpected output types or unrecognized inputs.
 */
// skipcq: JS-R1005
function executeVmInput(
  mode: Exclude<FlintMode, "wasm" | "wasm-generated" | "wasm-excluded-bounds">,
  module: FlintVmModule,
  input: BenchmarkInput,
  executor: ReturnType<typeof createFlintVmExecutor>,
  prepared: FlintVmPreparedExecutor | undefined,
  capabilities: ReturnType<typeof stringCapabilities>,
): BenchmarkOutput {
  if ("multiplier" in input) {
    const result = executeNative(
      mode,
      module,
      "arithmetic_reduce",
      [
        numberValue(input.n),
        numberValue(input.multiplier),
        numberValue(input.offset),
        numberValue(input.seed),
      ],
      executor,
      prepared,
      capabilities,
    );
    if (result.value.kind !== "number") {
      throw new Error("Flint VM arithmetic returned a non-number.");
    }
    return normalizeBenchmarkOutput(Number(result.value.value));
  }
  if ("suffix" in input) {
    const result = executeNative(
      mode,
      module,
      "string_transform",
      [
        aggregateValue(encodeUtf8(input.value), "BenchmarkBytes"),
        aggregateValue(encodeUtf8(input.prefix), "BenchmarkBytes"),
        aggregateValue(encodeUtf8(input.suffix), "BenchmarkBytes"),
        numberValue(input.repeat),
      ],
      executor,
      prepared,
      capabilities,
    );
    if (result.value.kind !== "aggregate") {
      throw new Error("Flint VM string transform returned a non-aggregate.");
    }
    return normalizeBenchmarkOutput(decodeUtf8(result.value.bytes));
  }
  if ("bytes" in input) {
    const result = executeNative(
      mode,
      module,
      "dataset_scan",
      [
        aggregateValue(Uint8Array.from(input.bytes), "BenchmarkBytes"),
        numberValue(input.threshold),
      ],
      executor,
      prepared,
      capabilities,
    );
    if (result.value.kind !== "number") {
      throw new Error("Flint VM dataset scan returned a non-number.");
    }
    return normalizeBenchmarkOutput(Number(result.value.value));
  }
  throw new Error("Unrecognized benchmark input shape for Flint VM adapter.");
}

/**
 * Creates a benchmark adapter for Forge Web Script VM execution.
 *
 * @param mode - Target execution mode (interpret, jit, or aot).
 * @returns Runtime adapter adhering to the benchmark contract.
 */
export function createFlintVmAdapter(
  mode: Exclude<FlintMode, "wasm" | "wasm-generated" | "wasm-excluded-bounds">,
): RuntimeAdapter {
  const module = createNativeVmModule();
  const aot =
    mode === "aot"
      ? createFlintVmAotArtifact(module, COMPILER_VERSION)
      : undefined;
  return {
    implementation: "flint",
    mode,
    adapterId: `flint-vm-${mode}`,
    build(): Promise<BuildArtifact> {
      return Promise.resolve(buildVmArtifact(mode, module, aot));
    },
    initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (
        artifact.id !== `flint-vm-${mode}` ||
        artifact.flintMode !== mode ||
        artifact.artifactKind !== "flint-vm"
      ) {
        throw new Error(
          `Flint ${mode} adapter received an incompatible build artifact.`,
        );
      }
      const executor = createFlintVmExecutor({
        compilerVersion: COMPILER_VERSION,
        jitThreshold: 1,
      });
      const capabilities = stringCapabilities();
      const prepared = prepareVmBackend(
        mode,
        module,
        aot,
        executor,
        capabilities,
      );
      const jitCacheEntries = Object.keys(
        executor.getJitCache?.().entries ?? {},
      ).length;
      return Promise.resolve({
        adapterId: `flint-vm-${mode}`,
        preparation: extractPreparationMetadata(
          prepared,
          jitCacheEntries,
          aot !== undefined,
        ),
        execute: (input) =>
          executeVmInput(mode, module, input, executor, prepared, capabilities),
      });
    },
  };
}
