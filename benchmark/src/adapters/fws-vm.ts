import {
  createForgeWebScriptVmAotArtifact,
  createForgeWebScriptVmExecutor,
} from "@mission-platform/forge-web-script-runtime";

import { decodeUtf8, encodeUtf8, normalizeBenchmarkOutput } from "../abi.ts";

import type {
  BuildArtifact,
  FwsMode,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";
import type {
  ForgeWebScriptVmExecutionResult,
  ForgeWebScriptVmInstruction,
  ForgeWebScriptVmModule,
  ForgeWebScriptVmPreparedExecutor,
  ForgeWebScriptVmValue,
} from "@mission-platform/forge-web-script-runtime";

const COMPILER_VERSION = "benchmark-fws-v1";
const SOURCE_HASH = "benchmark-fws-vm-wasm-v1";
const MAX_STEPS = 50_000_000;

const numberValue = (value: number): ForgeWebScriptVmValue => ({
  kind: "number",
  type: "i32",
  value,
});

const aggregateValue = (
  bytes: Uint8Array,
  layout: string,
): ForgeWebScriptVmValue => ({
  kind: "aggregate",
  layout,
  bytes,
  ownership: "borrowed",
});

/**
 * Minimal bytecode helpers for hand-lowered native FWS VM kernels.
 * Arithmetic and dataset run with pure VM ops; string uses a concat capability
 * only as the allocation primitive (control flow stays in the VM).
 */
function createNativeVmModule(): ForgeWebScriptVmModule {
  const constants: ForgeWebScriptVmValue[] = [
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

function buildModuleWithLabels(
  constants: ForgeWebScriptVmValue[],
): ForgeWebScriptVmModule {
  type Patch = {
    index: number;
    field: "ifTrue" | "ifFalse" | "target";
    label: string;
  };

  // We'll build each function separately with its own label space.
  function buildFunction(
    name: string,
    parameterCount: number,
    build: (b: {
      code: ForgeWebScriptVmInstruction[];
      alloc: () => number;
      label: (name: string) => void;
      num: (dest: number, constant: number) => void;
      move: (dest: number, source: number) => void;
      binary: (op: string, dest: number, left: number, right: number) => void;
      len: (dest: number, source: number) => void;
      byteAt: (dest: number, source: number, index: number) => void;
      call: (
        dest: number | undefined,
        fn: string,
        args: readonly number[],
      ) => void;
      capability: (
        dest: number | undefined,
        name: string,
        args: readonly number[],
      ) => void;
      branch: (cond: number, ifTrue: string, ifFalse: string) => void;
      jump: (label: string) => void;
      ret: (source?: number) => void;
      finish: () => ForgeWebScriptVmInstruction[];
      registers: () => number;
    }) => void,
  ): {
    name: string;
    parameters: string[];
    result: string;
    registers: number;
    code: ForgeWebScriptVmInstruction[];
    debugSpans: [];
  } {
    let next = parameterCount;
    const code: ForgeWebScriptVmInstruction[] = [];
    const localLabels = new Map<string, number>();
    const localPatches: Patch[] = [];
    const b = {
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
    build(b);
    const finished = b.finish();
    return {
      name,
      parameters: [],
      result: "i32",
      registers: b.registers(),
      code: finished,
      debugSpans: [],
    };
  }

  const rangeSum = buildFunction("range_sum", 4, (b) => {
    // args: lo=0, hi=1, mult=2, seed=3
    const condition = b.alloc(); // 4
    const sum = b.alloc(); // 5
    const idx = b.alloc(); // 6
    const raw = b.alloc(); // 7
    const left = b.alloc(); // 8
    const right = b.alloc(); // 9
    const half = b.alloc(); // 10
    const one = b.alloc();
    const two = b.alloc();
    const cMul = b.alloc();
    const cAdd = b.alloc();
    const cMod = b.alloc();
    const cSub = b.alloc();
    const zero = b.alloc();

    b.num(one, 1);
    b.num(two, 2);
    b.num(cMul, 3);
    b.num(cAdd, 4);
    b.num(cMod, 5);
    b.num(cSub, 6);
    b.num(zero, 0);

    b.binary(">=", condition, 0, 1);
    b.branch(condition, "empty", "check_leaf");
    b.label("empty");
    b.ret(zero);

    b.label("check_leaf");
    b.binary("+", idx, 0, one);
    b.binary("==", condition, idx, 1);
    b.branch(condition, "leaf", "branch");

    b.label("leaf");
    b.binary("*", raw, idx, cMul);
    b.binary("+", raw, raw, 3);
    b.binary("+", raw, raw, cAdd);
    b.binary("%", raw, raw, cMod);
    b.binary("-", raw, raw, cSub);
    b.binary("*", raw, raw, 2);
    b.ret(raw);

    b.label("branch");
    b.binary("+", half, 0, 1);
    b.binary("/", half, half, two);
    b.call(left, "range_sum", [0, half, 2, 3]);
    b.call(right, "range_sum", [half, 1, 2, 3]);
    b.binary("+", sum, left, right);
    b.ret(sum);
  });
  rangeSum.parameters = ["i32", "i32", "i32", "i32"];
  rangeSum.result = "i32";

  const arithmeticReduce = buildFunction("arithmetic_reduce", 4, (b) => {
    // n=0, mult=1, offset=2, seed=3
    const zero = b.alloc();
    const sum = b.alloc();
    b.num(zero, 0);
    b.call(sum, "range_sum", [zero, 0, 1, 3]);
    b.binary("+", sum, 2, sum);
    b.ret(sum);
  });
  arithmeticReduce.parameters = ["i32", "i32", "i32", "i32"];
  arithmeticReduce.result = "i32";

  const scanBytes = buildFunction("scan_bytes", 4, (b) => {
    // data=0, lo=1, hi=2, threshold=3
    const condition = b.alloc();
    const sum = b.alloc();
    const idx = b.alloc();
    const byte = b.alloc();
    const left = b.alloc();
    const right = b.alloc();
    const half = b.alloc();
    const one = b.alloc();
    const two = b.alloc();
    const zero = b.alloc();

    b.num(one, 1);
    b.num(two, 2);
    b.num(zero, 0);

    b.binary(">=", condition, 1, 2);
    b.branch(condition, "empty", "check_leaf");
    b.label("empty");
    b.ret(zero);

    b.label("check_leaf");
    b.binary("+", idx, 1, one);
    b.binary("==", condition, idx, 2);
    b.branch(condition, "leaf", "branch");

    b.label("leaf");
    b.byteAt(byte, 0, 1);
    b.binary(">=", condition, byte, 3);
    b.branch(condition, "hit", "miss");
    b.label("hit");
    b.binary("+", byte, byte, one);
    b.ret(byte);
    b.label("miss");
    b.ret(zero);

    b.label("branch");
    b.binary("+", half, 1, 2);
    b.binary("/", half, half, two);
    b.call(left, "scan_bytes", [0, 1, half, 3]);
    b.call(right, "scan_bytes", [0, half, 2, 3]);
    b.binary("+", sum, left, right);
    b.ret(sum);
  });
  scanBytes.parameters = ["BenchmarkBytes", "i32", "i32", "i32"];
  scanBytes.result = "i32";

  const datasetScan = buildFunction("dataset_scan", 2, (b) => {
    // data=0, threshold=1
    const zero = b.alloc();
    const length = b.alloc();
    const result = b.alloc();
    b.num(zero, 0);
    b.len(length, 0);
    b.call(result, "scan_bytes", [0, zero, length, 1]);
    b.ret(result);
  });
  datasetScan.parameters = ["BenchmarkBytes", "i32"];
  datasetScan.result = "i32";

  const startsWithAt = buildFunction("starts_with_at", 4, (b) => {
    // value=0, prefix=1, i=2, plen=3
    const tmp = b.alloc();
    const vb = b.alloc();
    const pb = b.alloc();
    const next = b.alloc();
    const one = b.alloc();
    const trueValue = b.alloc();
    const falseValue = b.alloc();
    b.num(one, 1);
    // true/false via comparisons
    b.num(trueValue, 1);
    b.num(falseValue, 0);
    b.binary(">=", tmp, 2, 3);
    b.branch(tmp, "done_true", "compare");
    b.label("done_true");
    b.binary("==", tmp, trueValue, trueValue);
    b.ret(tmp);
    b.label("compare");
    b.byteAt(vb, 0, 2);
    b.byteAt(pb, 1, 2);
    b.binary("==", tmp, vb, pb);
    b.branch(tmp, "advance", "done_false");
    b.label("done_false");
    b.binary("==", tmp, trueValue, falseValue);
    b.ret(tmp);
    b.label("advance");
    b.binary("+", next, 2, one);
    b.call(tmp, "starts_with_at", [0, 1, next, 3]);
    b.ret(tmp);
  });
  startsWithAt.parameters = ["BenchmarkBytes", "BenchmarkBytes", "i32", "i32"];
  startsWithAt.result = "bool";

  const startsWith = buildFunction("starts_with", 2, (b) => {
    // value=0, prefix=1
    const vlen = b.alloc();
    const plen = b.alloc();
    const tmp = b.alloc();
    const zero = b.alloc();
    const trueValue = b.alloc();
    const falseValue = b.alloc();
    b.num(zero, 0);
    b.num(trueValue, 1);
    b.num(falseValue, 0);
    b.len(vlen, 0);
    b.len(plen, 1);
    b.binary(">", tmp, plen, vlen);
    b.branch(tmp, "no", "yes");
    b.label("no");
    b.binary("==", tmp, trueValue, falseValue);
    b.ret(tmp);
    b.label("yes");
    b.call(tmp, "starts_with_at", [0, 1, zero, plen]);
    b.ret(tmp);
  });
  startsWith.parameters = ["BenchmarkBytes", "BenchmarkBytes"];
  startsWith.result = "bool";

  const repeatStr = buildFunction("repeat_str", 2, (b) => {
    // piece=0, n=1
    const condition = b.alloc();
    const remainder = b.alloc();
    const even = b.alloc();
    const odd = b.alloc();
    const halfn = b.alloc();
    const half = b.alloc();
    const doubled = b.alloc();
    const one = b.alloc();
    const two = b.alloc();
    const zero = b.alloc();
    const empty = b.alloc();
    b.num(one, 1);
    b.num(two, 2);
    b.num(zero, 0);
    // empty aggregate via capability empty_string
    b.capability(empty, "empty_string", []);

    b.binary("<=", condition, 1, zero);
    b.branch(condition, "ret_empty", "check_one");
    b.label("ret_empty");
    b.ret(empty);

    b.label("check_one");
    b.binary("==", condition, 1, one);
    b.branch(condition, "ret_piece", "split");
    b.label("ret_piece");
    b.ret(0);

    b.label("split");
    b.binary("/", halfn, 1, two);
    b.call(half, "repeat_str", [0, halfn]);
    b.capability(doubled, "concat", [half, half]);
    b.binary("%", remainder, 1, two);
    b.binary("==", even, remainder, zero);
    b.branch(even, "ret_doubled", "ret_odd");
    b.label("ret_doubled");
    b.ret(doubled);
    b.label("ret_odd");
    b.capability(odd, "concat", [doubled, 0]);
    b.ret(odd);
  });
  repeatStr.parameters = ["BenchmarkBytes", "i32"];
  repeatStr.result = "BenchmarkBytes";

  const stringTransform = buildFunction("string_transform", 4, (b) => {
    // value=0, prefix=1, suffix=2, repeat=3
    const starts = b.alloc();
    const repeated = b.alloc();
    const head = b.alloc();
    const result = b.alloc();
    b.call(starts, "starts_with", [0, 1]);
    b.call(repeated, "repeat_str", [2, 3]);
    b.branch(starts, "with_prefix", "without_prefix");
    b.label("with_prefix");
    b.capability(result, "concat", [0, repeated]);
    b.ret(result);
    b.label("without_prefix");
    b.capability(head, "concat", [0, 1]);
    b.capability(result, "concat", [head, repeated]);
    b.ret(result);
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

function stringCapabilities(): Readonly<
  Record<
    string,
    (...args: readonly ForgeWebScriptVmValue[]) => ForgeWebScriptVmValue
  >
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

function executeNative(
  mode: Exclude<FwsMode, "wasm" | "wasm-generated">,
  module: ForgeWebScriptVmModule,
  functionName: string,
  args: readonly ForgeWebScriptVmValue[],
  executor: ReturnType<typeof createForgeWebScriptVmExecutor>,
  prepared: ForgeWebScriptVmPreparedExecutor | undefined,
  capabilities: ReturnType<typeof stringCapabilities>,
): ForgeWebScriptVmExecutionResult {
  if (mode !== "interpret") {
    if (prepared === undefined)
      throw new Error("FWS prepared VM backend was not initialized.");
    return prepared.execute(functionName, args, { maxSteps: MAX_STEPS });
  }
  return executor.execute(module, functionName, args, {
    mode,
    maxSteps: MAX_STEPS,
    capabilities,
  });
}

export function createFwsVmAdapter(
  mode: Exclude<FwsMode, "wasm" | "wasm-generated">,
): RuntimeAdapter {
  const module = createNativeVmModule();
  const aot =
    mode === "aot"
      ? createForgeWebScriptVmAotArtifact(module, COMPILER_VERSION)
      : undefined;
  return {
    implementation: "fws",
    mode,
    adapterId: `fws-vm-${mode}`,
    async build(): Promise<BuildArtifact> {
      return {
        id: `fws-vm-${mode}`,
        implementation: "fws",
        fwsMode: mode,
        artifactKind: "fws-vm",
        hash: module.sourceHash,
        exports: ["arithmetic_reduce", "string_transform", "dataset_scan"],
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
      };
    },
    async initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (
        artifact.id !== `fws-vm-${mode}` ||
        artifact.fwsMode !== mode ||
        artifact.artifactKind !== "fws-vm"
      ) {
        throw new Error(
          `FWS ${mode} adapter received an incompatible build artifact.`,
        );
      }
      const executor = createForgeWebScriptVmExecutor({
        compilerVersion: COMPILER_VERSION,
        jitThreshold: 1,
      });
      const capabilities = stringCapabilities();
      const prepared =
        mode === "interpret"
          ? undefined
          : executor.prepare(module, mode, {
              capabilities,
              aotArtifact: mode === "aot" ? aot : undefined,
            });
      const jitEntries = Object.keys(executor.getJitCache?.().entries ?? {}).length;
      if (prepared !== undefined && prepared.mode !== mode)
        throw new Error(`FWS ${mode} preparation returned an unexpected mode.`);
      return {
        adapterId: `fws-vm-${mode}`,
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
        execute: (input) => {
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
              throw new Error("FWS VM arithmetic returned a non-number.");
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
              throw new Error(
                "FWS VM string transform returned a non-aggregate.",
              );
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
            throw new Error("FWS VM dataset scan returned a non-number.");
          return normalizeBenchmarkOutput(Number(result.value.value));
        },
      };
    },
  };
}
