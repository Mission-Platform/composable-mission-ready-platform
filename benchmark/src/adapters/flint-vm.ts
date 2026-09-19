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

/**
 * Wraps a number into a 32-bit integer Flint VM value.
 *
 * @param value Number value to box.
 * @returns 32-bit integer Flint VM value.
 */
const numberValue = (value: number): FlintVmValue => ({
  kind: "number",
  type: "i32",
  value,
});

/**
 * Wraps a byte buffer into an aggregate Flint VM value.
 *
 * @param bytes Byte payload.
 * @param layout Aggregate layout identifier.
 * @returns Borrowed aggregate Flint VM value.
 */
const aggregateValue = (bytes: Uint8Array, layout: string): FlintVmValue => ({
  kind: "aggregate",
  layout,
  bytes,
  ownership: "borrowed",
});

/**
 * Minimal bytecode helpers for hand-lowered native Flint VM kernels.
 * Arithmetic and dataset run with pure VM ops; string uses a concat capability
 * only as the allocation primitive (control flow stays in the VM).
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

interface FunctionBuilder {
  code: FlintVmInstruction[];
  alloc: () => number;
  label: (name: string) => void;
  num: (dest: number, constant: number) => void;
  move: (dest: number, source: number) => void;
  binary: (op: string, dest: number, left: number, right: number) => void;
  len: (dest: number, source: number) => void;
  byteAt: (dest: number, source: number, index: number) => void;
  call: (dest: number | undefined, fn: string, args: readonly number[]) => void;
  capability: (
    dest: number | undefined,
    name: string,
    args: readonly number[],
  ) => void;
  branch: (cond: number, ifTrue: string, ifFalse: string) => void;
  jump: (label: string) => void;
  ret: (source?: number) => void;
  finish: () => FlintVmInstruction[];
  registers: () => number;
}

/**
 * Builds the hand-lowered benchmark module with local labels and patches.
 *
 * @param constants Array of constant values embedded into the module.
 * @returns Fully assembled Flint VM module.
 */
function buildModuleWithLabels(constants: FlintVmValue[]): FlintVmModule {
  type Patch = {
    index: number;
    field: "ifTrue" | "ifFalse" | "target";
    label: string;
  };

  /**
   * Helper constructing an individual function with a dedicated local label space.
   */
  function buildFunction(
    name: string,
    parameterCount: number,
    build: (builder: FunctionBuilder) => void,
  ): {
    name: string;
    parameters: string[];
    result: string;
    registers: number;
    code: FlintVmInstruction[];
    debugSpans: [];
  } {
    let next = parameterCount;
    const code: FlintVmInstruction[] = [];
    const localLabels = new Map<string, number>();
    const localPatches: Patch[] = [];
    const builder: FunctionBuilder = {
      code,
      alloc: () => {
        const register = next;
        next += 1;
        return register;
      },
      label: (labelName: string) => {
        localLabels.set(labelName, code.length);
      },
      num: (dest: number, constant: number) => {
        code.push({ opcode: "const", destination: dest, constant });
      },
      move: (dest: number, source: number) => {
        code.push({ opcode: "move", destination: dest, source });
      },
      binary: (op: string, dest: number, left: number, right: number) => {
        code.push({
          opcode: "binary",
          operation: op,
          destination: dest,
          left,
          right,
        });
      },
      len: (dest: number, source: number) => {
        code.push({ opcode: "len", destination: dest, source });
      },
      byteAt: (dest: number, source: number, index: number) => {
        code.push({
          opcode: "byte-at",
          destination: dest,
          source,
          index,
        });
      },
      call: (dest: number | undefined, fn: string, args: readonly number[]) => {
        code.push({
          opcode: "call",
          ...(dest === undefined ? {} : { destination: dest }),
          functionName: fn,
          arguments: args,
        });
      },
      capability: (
        dest: number | undefined,
        importName: string,
        args: readonly number[],
      ) => {
        code.push({
          opcode: "call-capability",
          ...(dest === undefined ? {} : { destination: dest }),
          importName,
          arguments: args,
        });
      },
      branch: (cond: number, ifTrue: string, ifFalse: string) => {
        localPatches.push(
          { index: code.length, field: "ifTrue", label: ifTrue },
          { index: code.length, field: "ifFalse", label: ifFalse },
        );
        code.push({
          opcode: "branch",
          condition: cond,
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
      finish: () => {
        for (const patch of localPatches) {
          const target = localLabels.get(patch.label);
          if (target === undefined)
            throw new Error(`Missing label ${patch.label} in ${name}`);
          const instruction = code[patch.index] as {
            ifTrue?: number;
            ifFalse?: number;
            target?: number;
          };
          instruction[patch.field] = target;
        }
        return code;
      },
      registers: () => next,
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

  const rangeSum = buildFunction("range_sum", 4, (builder) => {
    // args: lo=0, hi=1, mult=2, seed=3
    const condition = builder.alloc(); // 4
    const sum = builder.alloc(); // 5
    const idx = builder.alloc(); // 6
    const raw = builder.alloc(); // 7
    const left = builder.alloc(); // 8
    const right = builder.alloc(); // 9
    const half = builder.alloc(); // 10
    const one = builder.alloc();
    const two = builder.alloc();
    const cMul = builder.alloc();
    const cAdd = builder.alloc();
    const cMod = builder.alloc();
    const cSub = builder.alloc();
    const zero = builder.alloc();

    builder.num(one, 1);
    builder.num(two, 2);
    builder.num(cMul, 3);
    builder.num(cAdd, 4);
    builder.num(cMod, 5);
    builder.num(cSub, 6);
    builder.num(zero, 0);

    builder.binary(">=", condition, 0, 1);
    builder.branch(condition, "empty", "check_leaf");
    builder.label("empty");
    builder.ret(zero);

    builder.label("check_leaf");
    builder.binary("+", idx, 0, one);
    builder.binary("==", condition, idx, 1);
    builder.branch(condition, "leaf", "branch");

    builder.label("leaf");
    builder.binary("*", raw, idx, cMul);
    builder.binary("+", raw, raw, 3);
    builder.binary("+", raw, raw, cAdd);
    builder.binary("%", raw, raw, cMod);
    builder.binary("-", raw, raw, cSub);
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

  const scanBytes = buildFunction("scan_bytes", 4, (builder) => {
    // data=0, lo=1, hi=2, threshold=3
    const condition = builder.alloc();
    const sum = builder.alloc();
    const idx = builder.alloc();
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
    builder.binary("+", idx, 1, one);
    builder.binary("==", condition, idx, 2);
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

  const startsWithAt = buildFunction("starts_with_at", 4, (builder) => {
    // value=0, prefix=1, i=2, plen=3
    const tmp = builder.alloc();
    const vb = builder.alloc();
    const pb = builder.alloc();
    const next = builder.alloc();
    const one = builder.alloc();
    const trueValue = builder.alloc();
    const falseValue = builder.alloc();
    builder.num(one, 1);
    // true/false via comparisons
    builder.num(trueValue, 1);
    builder.num(falseValue, 0);
    builder.binary(">=", tmp, 2, 3);
    builder.branch(tmp, "done_true", "compare");
    builder.label("done_true");
    builder.binary("==", tmp, trueValue, trueValue);
    builder.ret(tmp);
    builder.label("compare");
    builder.byteAt(vb, 0, 2);
    builder.byteAt(pb, 1, 2);
    builder.binary("==", tmp, vb, pb);
    builder.branch(tmp, "advance", "done_false");
    builder.label("done_false");
    builder.binary("==", tmp, trueValue, falseValue);
    builder.ret(tmp);
    builder.label("advance");
    builder.binary("+", next, 2, one);
    builder.call(tmp, "starts_with_at", [0, 1, next, 3]);
    builder.ret(tmp);
  });
  startsWithAt.parameters = ["BenchmarkBytes", "BenchmarkBytes", "i32", "i32"];
  startsWithAt.result = "bool";

  const startsWith = buildFunction("starts_with", 2, (builder) => {
    // value=0, prefix=1
    const vlen = builder.alloc();
    const plen = builder.alloc();
    const tmp = builder.alloc();
    const zero = builder.alloc();
    const trueValue = builder.alloc();
    const falseValue = builder.alloc();
    builder.num(zero, 0);
    builder.num(trueValue, 1);
    builder.num(falseValue, 0);
    builder.len(vlen, 0);
    builder.len(plen, 1);
    builder.binary(">", tmp, plen, vlen);
    builder.branch(tmp, "no", "yes");
    builder.label("no");
    builder.binary("==", tmp, trueValue, falseValue);
    builder.ret(tmp);
    builder.label("yes");
    builder.call(tmp, "starts_with_at", [0, 1, zero, plen]);
    builder.ret(tmp);
  });
  startsWith.parameters = ["BenchmarkBytes", "BenchmarkBytes"];
  startsWith.result = "bool";

  const repeatStr = buildFunction("repeat_str", 2, (builder) => {
    // piece=0, n=1
    const condition = builder.alloc();
    const remainder = builder.alloc();
    const even = builder.alloc();
    const odd = builder.alloc();
    const halfn = builder.alloc();
    const half = builder.alloc();
    const doubled = builder.alloc();
    const one = builder.alloc();
    const two = builder.alloc();
    const zero = builder.alloc();
    const empty = builder.alloc();
    builder.num(one, 1);
    builder.num(two, 2);
    builder.num(zero, 0);
    // empty aggregate via capability empty_string
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
    builder.binary("/", halfn, 1, two);
    builder.call(half, "repeat_str", [0, halfn]);
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

  return {
    format: "forge-web-script-vm-module",
    version: "1.0",
    sourceHash: SOURCE_HASH,
    functions: [
      rangeSum,
      arithmeticReduce,
      scanBytes,
      datasetScan,
      startsWithAt,
      startsWith,
      repeatStr,
      stringTransform,
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
 * Creates built-in string capability handlers for the Flint VM benchmark harness.
 *
 * @returns Map of capability names to implementation functions.
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
 * Executes a native Flint VM function via interpreted, JIT, or AOT execution mode.
 *
 * @param mode Execution mode variant.
 * @param module Flint VM bytecode module.
 * @param functionName Name of the function to execute.
 * @param args Arguments to pass to the function.
 * @param executor Root VM executor instance.
 * @param prepared Prepared executor for JIT/AOT modes, if initialized.
 * @param capabilities Capability handlers map.
 * @returns VM execution result containing the return value and step counter.
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
    if (prepared === undefined)
      throw new Error("Flint prepared VM backend was not initialized.");
    return prepared.execute(functionName, args, { maxSteps: MAX_STEPS });
  }
  return executor.execute(module, functionName, args, {
    mode,
    maxSteps: MAX_STEPS,
    capabilities,
  });
}

/**
 * Validates that an artifact is compatible with the requested Flint VM mode.
 *
 * @param artifact Build artifact to check.
 * @param mode Expected execution mode.
 */
function validateVmArtifact(artifact: BuildArtifact, mode: FlintMode): void {
  if (
    artifact.id !== `flint-vm-${mode}` ||
    artifact.flintMode !== mode ||
    artifact.artifactKind !== "flint-vm"
  ) {
    throw new Error(
      `Flint ${mode} adapter received an incompatible build artifact.`,
    );
  }
}

/**
 * Dispatches an input workload to the corresponding native Flint VM kernel function.
 *
 * @param mode VM execution mode.
 * @param module Flint VM bytecode module.
 * @param input Benchmark input workload.
 * @param executor Root VM executor instance.
 * @param prepared Prepared executor for JIT/AOT modes, if initialized.
 * @param capabilities Capability handlers map.
 * @returns Normalized benchmark output value.
 */
function dispatchVmExecution(
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
    if (result.value.kind !== "number")
      throw new Error("Flint VM arithmetic returned a non-number.");
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
    if (result.value.kind !== "aggregate")
      throw new Error("Flint VM string transform returned a non-aggregate.");
    return normalizeBenchmarkOutput(decodeUtf8(result.value.bytes));
  }
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
  if (result.value.kind !== "number")
    throw new Error("Flint VM dataset scan returned a non-number.");
  return normalizeBenchmarkOutput(Number(result.value.value));
}

/**
 * Prepares the VM executor and builds preparation metadata for the initialized adapter.
 *
 * @param mode VM execution mode.
 * @param module VM module.
 * @param executor VM executor.
 * @param aot Optional AOT artifact.
 * @param capabilities Capability handlers.
 * @returns Prepared executor instance and metadata.
 */
function prepareVmBackend(
  mode: Exclude<FlintMode, "wasm" | "wasm-generated" | "wasm-excluded-bounds">,
  module: FlintVmModule,
  executor: ReturnType<typeof createFlintVmExecutor>,
  aot: ReturnType<typeof createFlintVmAotArtifact> | undefined,
  capabilities: ReturnType<typeof stringCapabilities>,
) {
  const prepared =
    mode === "interpret"
      ? undefined
      : executor.prepare(module, mode, {
          capabilities,
          aotArtifact: mode === "aot" ? aot : undefined,
        });
  const jitEntries = Object.keys(executor.getJitCache?.().entries ?? {}).length;
  if (prepared !== undefined && prepared.mode !== mode)
    throw new Error(`Flint ${mode} preparation returned an unexpected mode.`);
  return {
    prepared,
    preparation: {
      compilerVersion: COMPILER_VERSION,
      jitCacheEntries: jitEntries,
      backend: prepared?.metadata.backend ?? "interpreter",
      instancePolicy: prepared?.metadata.instancePolicy ?? "fresh-per-execute",
      loweringVersion: prepared?.metadata.loweringVersion ?? "none",
      preparedArtifactHash: prepared?.artifact.reproducibilityHash ?? "",
      preparedArtifactSize: prepared?.artifact.wasm.byteLength ?? 0,
      aotArtifactCreated: aot !== undefined,
      nativeKernels: true,
    },
  };
}

/**
 * Creates a runtime adapter for executing hand-lowered Flint VM bytecode kernels.
 *
 * @param mode Execution mode variant (interpret, jit, or aot).
 * @returns Configured runtime adapter instance.
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
      return Promise.resolve({
        id: `flint-vm-${mode}`,
        implementation: "flint",
        flintMode: mode,
        artifactKind: "flint-vm",
        hash: module.sourceHash,
        exports: ["arithmetic_reduce", "string_transform", "dataset_scan"],
        flintPipeline: {
          pipeline: "flint-vm-reference",
          frontend: "vm-ir",
          optimization: mode === "aot" ? "release" : "debug",
        },
        metadata: {
          abi: "vm-wasm-v1",
          compilerVersion: COMPILER_VERSION,
          nativeKernels: true,
          preparation:
            mode === "aot"
              ? "prepared-wasm-aot"
              : mode === "jit"
                ? "prepared-wasm-jit"
                : "none",
          aotReproducibilityHash: aot?.reproducibilityHash ?? "",
        },
      });
    },
    initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      validateVmArtifact(artifact, mode);
      const executor = createFlintVmExecutor({
        compilerVersion: COMPILER_VERSION,
        jitThreshold: 1,
      });
      const capabilities = stringCapabilities();
      const { prepared, preparation } = prepareVmBackend(
        mode,
        module,
        executor,
        aot,
        capabilities,
      );
      return Promise.resolve({
        adapterId: `flint-vm-${mode}`,
        preparation,
        execute: (input) =>
          dispatchVmExecution(
            mode,
            module,
            input,
            executor,
            prepared,
            capabilities,
          ),
      });
    },
  };
}
