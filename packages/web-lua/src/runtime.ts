import {
  WEB_LUA_CAPABILITIES,
  asWebLuaExports,
  assertMemoryRange,
  WEB_LUA_ABI_MANIFEST,
  WEB_LUA_CAPABILITY_POLICIES,
  WEB_LUA_IMPORT_POLICY,
  WEB_LUA_STATUS,
  type WebLuaExports,
  type WebLuaValueKind,
} from "./abi.js";
import { WEB_LUA_BUILD_ARTIFACT } from "./build-artifact.js";

import type { WebLuaArtifact } from "./compiler.js";

export { WEB_LUA_CAPABILITIES, WEB_LUA_BUILD_ARTIFACT };

export type WebLuaCapability = (typeof WEB_LUA_CAPABILITIES)[number];

export type WebLuaOperation = "load" | "call" | "resume";
export type WebLuaErrorPhase = "load" | "call" | "resume" | "capability";
export type WebLuaErrorCode =
  | "syntax-error"
  | "runtime-error"
  | "division-by-zero"
  | "malformed-chunk"
  | "yielded"
  | "closed"
  | "unknown";

export interface WebLuaResultFrame {
  readonly kind: "result";
  readonly operation: Exclude<WebLuaOperation, "load">;
  readonly ok: true;
  readonly state: number;
  readonly prototype: number;
  readonly status: number;
  readonly result: number;
  readonly values: readonly number[];
}

export interface WebLuaLoadedFrame {
  readonly kind: "loaded";
  readonly operation: "load";
  readonly ok: true;
  readonly state: number;
  readonly prototype: number;
  readonly status: number;
  readonly format: number;
  readonly sourceLength: number;
}

export interface WebLuaErrorFrame {
  readonly kind: "error";
  readonly operation: WebLuaOperation;
  readonly phase: WebLuaErrorPhase;
  readonly ok: false;
  readonly state: number;
  readonly prototype: number;
  readonly status: number;
  readonly code: WebLuaErrorCode;
  readonly message: string;
  readonly result: 0;
  readonly values: readonly [];
}

export type WebLuaLoadFrame = WebLuaLoadedFrame | WebLuaErrorFrame;
export type WebLuaExecutionFrame = WebLuaResultFrame | WebLuaErrorFrame;

export interface WebLuaOutputEvent {
  readonly kind: "output";
  readonly state: number;
  readonly message: string;
}

export interface WebLuaCapabilityRequest {
  readonly capability: WebLuaCapability;
  readonly operation: string;
  readonly input?: unknown;
}

export type WebLuaCapabilityResult<T = unknown> =
  | {
      readonly granted: true;
      readonly capability: WebLuaCapability;
      readonly value: T;
    }
  | {
      readonly granted: false;
      readonly capability: WebLuaCapability;
      readonly reason:
        "capability-denied" | "adapter-unavailable" | "adapter-error";
    };

export interface WebLuaHostAdapter {
  readonly invoke?: (request: WebLuaCapabilityRequest) => unknown;
  readonly output?: (event: WebLuaOutputEvent) => void;
  readonly error?: (frame: WebLuaErrorFrame) => void;
}

export interface WebLuaRuntimeOptions {
  readonly capabilities?: readonly WebLuaCapability[];
  readonly hostAdapter?: WebLuaHostAdapter;
  readonly onOutput?: (frame: WebLuaResultFrame) => void;
  readonly onError?: (frame: WebLuaErrorFrame) => void;
}

export class WebLuaCapabilityError extends Error {
  readonly capability: WebLuaCapability;

  constructor(capability: WebLuaCapability) {
    super(`WebLua capability '${capability}' is denied by the default policy.`);
    this.name = "WebLuaCapabilityError";
    this.capability = capability;
  }
}

export class WebLuaStateClosedError extends Error {
  readonly state: number;

  constructor(state: number) {
    super(`WebLua state ${state} is closed and cannot be reused.`);
    this.name = "WebLuaStateClosedError";
    this.state = state;
  }
}

export interface WebLuaCloseFrame {
  readonly kind: "closed";
  readonly operation: "close";
  readonly ok: true;
  readonly state: number;
  readonly status: typeof WEB_LUA_STATUS.ok;
}

export interface WebLuaState {
  readonly handle: number;
  readonly closed: boolean;
  readonly status: number;
  readonly load: (source: Uint8Array | string) => WebLuaLoadFrame;
  readonly call: (
    prototype: number | WebLuaLoadedFrame,
  ) => WebLuaExecutionFrame;
  readonly resume: (
    prototype: number | WebLuaLoadedFrame,
  ) => WebLuaExecutionFrame;
  readonly execute: (source: Uint8Array | string) => WebLuaExecutionFrame;
  readonly close: () => WebLuaCloseFrame;
}

export interface WebLuaRuntime {
  readonly artifact: WebLuaArtifact;
  readonly exports: WebLuaExports;
  readonly abi: typeof WEB_LUA_ABI_MANIFEST;
  readonly importPolicy: typeof WEB_LUA_IMPORT_POLICY;
  readonly capabilityPolicies: typeof WEB_LUA_CAPABILITY_POLICIES;
  readonly capabilities: readonly WebLuaCapability[];
  readonly hasCapability: (capability: WebLuaCapability) => boolean;
  readonly requireCapability: (capability: WebLuaCapability) => void;
  readonly invokeCapability: <T = unknown>(
    capability: WebLuaCapability,
    operation: string,
    input?: unknown,
  ) => WebLuaCapabilityResult<T>;
  readonly emitOutput: (
    message: string,
    state?: number,
  ) => WebLuaCapabilityResult<void>;
  readonly openState: () => WebLuaState;
  readonly dispose: () => void;
  readonly createState: () => number;
  readonly nilValue: () => number;
  readonly booleanValue: (value: boolean) => number;
  readonly integerValue: (value: number) => number;
  readonly floatValue: (state: number, value: number) => number;
  readonly floatNumber: (value: number) => number;
  readonly valueKind: (value: number) => WebLuaValueKind;
  readonly valuePayload: (value: number) => number;
  readonly valueIsValid: (value: number) => boolean;
  readonly libraryType: (state: number, value: number) => number;
  readonly libraryBaseTruthy: (value: number) => number;
  readonly libraryBaseToBoolean: (value: number) => number;
  readonly libraryBaseToInteger: (value: number) => number;
  readonly libraryBaseToFloat: (state: number, value: number) => number;
  readonly libraryBaseGetmetatable: (value: number) => number;
  readonly libraryBaseSetmetatable: (
    value: number,
    metatable: number,
  ) => number;
  readonly libraryBasePcallStatus: (state: number, prototype: number) => number;
  readonly libraryBasePcallResultCount: (prototype: number) => number;
  readonly libraryBasePcallResultValue: (
    prototype: number,
    index: number,
  ) => number;
  readonly libraryBaseNextKey: (value: number, cursor: number) => number;
  readonly libraryBaseNextValue: (value: number, cursor: number) => number;
  readonly libraryBaseIpairsNext: (value: number, index: number) => number;
  readonly libraryStringLength: (value: number) => number;
  readonly libraryTableLength: (value: number) => number;
  readonly libraryRawLength: (value: number) => number;
  readonly libraryStringByte: (value: number, index: number) => number;
  readonly libraryStringByteAt: (value: number, index: number) => number;
  readonly libraryStringEqual: (left: number, right: number) => boolean;
  readonly libraryStringConcat: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly libraryStringSub: (
    state: number,
    value: number,
    start: number,
    finish: number,
  ) => number;
  readonly libraryStringReverse: (state: number, value: number) => number;
  readonly libraryStringLower: (state: number, value: number) => number;
  readonly libraryStringUpper: (state: number, value: number) => number;
  readonly libraryRawGet: (value: number, key: number) => number;
  readonly libraryRawSet: (
    value: number,
    key: number,
    output: number,
  ) => number;
  readonly libraryTableInsert: (
    value: number,
    position: number,
    output: number,
  ) => number;
  readonly libraryTableRemove: (value: number, position: number) => number;
  readonly libraryTableConcat: (
    state: number,
    value: number,
    separator: number,
    start: number,
    finish: number,
  ) => number;
  readonly libraryMathAbs: (value: number) => number;
  readonly libraryMathMin: (left: number, right: number) => number;
  readonly libraryMathMax: (left: number, right: number) => number;
  readonly libraryMathAbsValue: (state: number, value: number) => number;
  readonly libraryMathMinValue: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly libraryMathMaxValue: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly libraryUtf8Length: (value: number) => number;
  readonly libraryUtf8Byte: (value: number, index: number) => number;
  readonly libraryUtf8IsValid: (value: number) => number;
  readonly libraryUtf8Codepoint: (value: number, index: number) => number;
  readonly libraryCoroutineStatus: (status: number) => number;
  readonly libraryCoroutineCanResume: (status: number) => number;
  readonly libraryCoroutineResumeStatus: (status: number) => number;
  readonly libraryCoroutineCloseStatus: (status: number) => number;
  readonly libraryCoroutineResumeResult: (
    state: number,
    prototype: number,
  ) => number;
  readonly libraryCoroutineCloseResult: (state: number) => number;
  readonly libraryPackageDefaultPath: () => number;
  readonly libraryPackageDefaultPathValue: () => number;
  readonly libraryPackageLoadStatus: (status: number) => number;
  readonly libraryPackageCanLoad: (status: number) => number;
  readonly libraryDebugTraceMask: (mask: number) => number;
  readonly libraryDebugTraceAllowed: (enabled: number) => number;
  readonly libraryDebugTraceEnabled: (mask: number, flag: number) => number;
  readonly internString: (
    state: number,
    hash: number,
    length: number,
  ) => number;
  readonly findString: (state: number, hash: number, length: number) => number;
  readonly internStringBytes: (
    state: number,
    source: Uint8Array | string,
  ) => number;
  readonly stringByte: (handle: number, index: number) => number;
  readonly stringSize: (handle: number) => number;
  readonly stringsEqual: (left: number, right: number) => boolean;
  readonly createTable: (state: number, key: number, value: number) => number;
  readonly createEmptyTable: (state: number) => number;
  readonly tableValue: (table: number, key: number) => number;
  readonly setTableValue: (table: number, key: number, value: number) => void;
  readonly tableSize: (table: number) => number;
  readonly tableNext: (table: number, cursor: number) => number;
  readonly tableNextKey: (table: number, cursor: number) => number;
  readonly tableNextValue: (table: number, cursor: number) => number;
  readonly setRoot: (state: number, index: number, value: number) => number;
  readonly rootValue: (state: number, index: number) => number;
  readonly ownsHandle: (state: number, handle: number) => boolean;
  readonly setAllocationLimit: (state: number, limit: number) => void;
  readonly allocationError: (state: number) => number;
  readonly stateIsValid: (state: number) => boolean;
  readonly collect: (state: number, root: number) => number;
  readonly objectCount: (state: number) => number;
  readonly lexTokenCount: (source: Uint8Array | string) => number;
  readonly load: (state: number, source: Uint8Array | string) => number;
  readonly call: (state: number, prototype: number) => number;
  readonly resume: (state: number, prototype: number) => number;
  readonly close: (state: number) => number;
  readonly status: (state: number) => number;
  readonly chunkFormat: (prototype: number) => number;
  readonly chunkSourceLength: (prototype: number) => number;
  readonly chunkError: (prototype: number) => number;
  readonly resultCount: (prototype: number) => number;
  readonly resultValue: (prototype: number, index: number) => number;
}

export async function createWebLuaRuntime(
  artifact?: WebLuaArtifact,
  options: WebLuaRuntimeOptions = {},
): Promise<WebLuaRuntime> {
  const resolvedArtifact = artifact ?? WEB_LUA_BUILD_ARTIFACT;
  const capabilities = [...new Set(options.capabilities)];
  const hasCapability = (capability: WebLuaCapability): boolean =>
    capabilities.includes(capability);
  const requireCapability = (capability: WebLuaCapability): void => {
    if (!hasCapability(capability)) throw new WebLuaCapabilityError(capability);
  };
  let exports: WebLuaExports;
  const decodeGuestString = (handle: number): string | undefined => {
    if (!Number.isSafeInteger(handle) || handle < 0) return undefined;
    assertMemoryRange(exports.memory, handle, 20);
    const view = new DataView(exports.memory.buffer);
    if (view.getUint32(handle, true) !== 2) return undefined;
    const length = view.getUint32(handle + 16, true);
    const byteLength = length * 4;
    assertMemoryRange(exports.memory, handle + 24, byteLength);
    const bytes = new Uint8Array(byteLength);
    for (let index = 0; index < length; index += 1) {
      const codePoint = view.getUint32(handle + 24 + index * 4, true);
      if (codePoint > 0xff) return undefined;
      bytes[index] = codePoint;
    }
    const terminator = bytes.indexOf(0);
    return new TextDecoder().decode(
      terminator === -1 ? bytes : bytes.subarray(0, terminator),
    );
  };
  const decodeGuestBytes = (
    pointer: number,
    length: number,
  ): string | undefined => {
    if (!Number.isSafeInteger(pointer) || !Number.isSafeInteger(length))
      return undefined;
    if (pointer < 0 || length < 0) return undefined;
    const cellByteLength = length * 4;
    if (!Number.isSafeInteger(cellByteLength)) return undefined;
    assertMemoryRange(exports.memory, pointer, cellByteLength);
    const view = new DataView(exports.memory.buffer);
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      const codePoint = view.getUint32(pointer + index * 4, true);
      if (codePoint > 0xff) return undefined;
      bytes[index] = codePoint;
    }
    return new TextDecoder().decode(bytes);
  };
  const emptyBytes = (): readonly [number, number] => [1024, 0];
  const capabilityMarker = new Map<
    string,
    {
      readonly capability: WebLuaCapability;
      readonly operation: string;
    }
  >([
    ["__wl_os_exec", { capability: "lua.os.command", operation: "execute" }],
    ["__wl_os_tmp", { capability: "lua.os.command", operation: "tmpname" }],
    ["__wl_os_rm", { capability: "lua.os.command", operation: "remove" }],
    ["__wl_io_read", { capability: "lua.io.read", operation: "open-read" }],
    ["__wl_io_write", { capability: "lua.io.write", operation: "open-write" }],
  ]);
  const packageLoad = (pathHandle: number): readonly [number, number] => {
    const input = decodeGuestString(pathHandle);
    if (input === undefined) return emptyBytes();
    const marker = capabilityMarker.get(input);
    if (marker !== undefined) {
      if (!hasCapability(marker.capability)) return emptyBytes();
      const invoke = options.hostAdapter?.invoke;
      if (invoke === undefined) return emptyBytes();
      try {
        if (
          invoke({
            capability: marker.capability,
            operation: marker.operation,
          }) === false
        )
          return emptyBytes();
      } catch {
        return emptyBytes();
      }
      const pointer = exports.fws_alloc(1);
      assertMemoryRange(exports.memory, pointer, 1);
      new Uint8Array(exports.memory.buffer, pointer, 1)[0] = 1;
      return [pointer, 1];
    }
    if (!hasCapability("lua.package.load")) return emptyBytes();
    const invoke = options.hostAdapter?.invoke;
    if (invoke === undefined) return emptyBytes();
    let result: unknown;
    try {
      result = invoke({
        capability: "lua.package.load",
        operation: "load",
        input,
      });
    } catch {
      return emptyBytes();
    }
    const bytes =
      typeof result === "string"
        ? new TextEncoder().encode(result)
        : ArrayBuffer.isView(result)
          ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
          : undefined;
    if (bytes === undefined) return emptyBytes();
    const pointer = exports.fws_alloc(bytes.byteLength);
    assertMemoryRange(exports.memory, pointer, bytes.byteLength);
    new Uint8Array(exports.memory.buffer, pointer, bytes.byteLength).set(bytes);
    return [pointer, bytes.byteLength];
  };
  const sourceToBytes = (sourceHandle: number): readonly [number, number] => {
    const source = decodeGuestString(sourceHandle);
    if (source === undefined || source.length === 0) return emptyBytes();
    const bytes = new TextEncoder().encode(source);
    const pointer = exports.fws_alloc(bytes.byteLength);
    assertMemoryRange(exports.memory, pointer, bytes.byteLength);
    new Uint8Array(exports.memory.buffer, pointer, bytes.byteLength).set(bytes);
    return [pointer, bytes.byteLength];
  };
  const ioWrite = (handle: number): void => {
    if (!hasCapability("lua.io.write")) return;
    try {
      if (!Number.isSafeInteger(handle) || handle < 0) return;
      assertMemoryRange(exports.memory, handle, 20);
      const view = new DataView(exports.memory.buffer);
      if (view.getUint32(handle, true) !== 2) return;
      const length = view.getUint32(handle + 16, true);
      const pointer = handle + 24;
      const message = decodeGuestBytes(pointer, length);
      if (message !== undefined) emitOutput(message);
    } catch {
      return;
    }
  };
  const instance = new WebAssembly.Instance(
    new WebAssembly.Module(
      resolvedArtifact.artifact.wasm! as unknown as ArrayBuffer,
    ),
    {
      "lua.io.write": {
        io_write: ioWrite,
      },
      "lua.package.load": {
        package_load: packageLoad,
      },
      "lua.core.source": {
        string_to_bytes: sourceToBytes,
      },
    },
  );
  exports = asWebLuaExports(instance.exports);
  const errorCode = (status: number): WebLuaErrorCode => {
    if (status === WEB_LUA_STATUS.syntaxError) return "syntax-error";
    if (status === WEB_LUA_STATUS.runtimeError) return "runtime-error";
    if (status === WEB_LUA_STATUS.divisionByZero) return "division-by-zero";
    if (status === WEB_LUA_STATUS.malformedChunk) return "malformed-chunk";
    if (status === WEB_LUA_STATUS.yielded) return "yielded";
    return "unknown";
  };
  const errorMessage = (phase: WebLuaErrorPhase, status: number): string =>
    `WebLua ${phase} failed with ${errorCode(status)} (status ${status}).`;
  const notifyError = (frame: WebLuaErrorFrame): void => {
    options.onError?.(frame);
    options.hostAdapter?.error?.(frame);
  };
  const makeError = (
    operation: WebLuaOperation,
    phase: WebLuaErrorPhase,
    state: number,
    prototype: number,
    status: number,
  ): WebLuaErrorFrame => {
    const frame: WebLuaErrorFrame = {
      kind: "error",
      operation,
      phase,
      ok: false,
      state,
      prototype,
      status,
      code: errorCode(status),
      message: errorMessage(phase, status),
      result: 0,
      values: [],
    };
    notifyError(frame);
    return frame;
  };
  const bootstrapObjectCounts = new Map<number, number>();
  const createState = (): number => {
    const state = exports.create_state();
    if (state !== 0)
      bootstrapObjectCounts.set(state, exports.object_count(state));
    return state;
  };
  const objectCount = (state: number): number => {
    const count = exports.object_count(state);
    const bootstrapCount = bootstrapObjectCounts.get(state) ?? 0;
    return Math.max(0, count - bootstrapCount);
  };
  const activeStates = new Set<WebLuaState>();
  const openState = (): WebLuaState => {
    const handle = createState();
    if (handle === 0) throw new Error("WebLua could not create a guest state.");
    let closed = false;
    const assertOpen = (): void => {
      if (closed) throw new WebLuaStateClosedError(handle);
    };
    const load = (source: Uint8Array | string): WebLuaLoadFrame => {
      assertOpen();
      const prototype = withSource(source, (pointer, length) =>
        exports.load(handle, pointer, length),
      );
      const status = exports.state_status(handle);
      if (prototype === 0 || status !== WEB_LUA_STATUS.ok)
        return makeError("load", "load", handle, prototype, status);
      return {
        kind: "loaded",
        operation: "load",
        ok: true,
        state: handle,
        prototype,
        status,
        format: exports.loaded_chunk_format(prototype),
        sourceLength: exports.loaded_chunk_source_length(prototype),
      };
    };
    const prototypeOf = (value: number | WebLuaLoadedFrame): number =>
      typeof value === "number" ? value : value.prototype;
    const call = (loaded: number | WebLuaLoadedFrame): WebLuaExecutionFrame => {
      assertOpen();
      const prototype = prototypeOf(loaded);
      const result = exports.call(handle, prototype);
      const status = exports.state_status(handle);
      if (status !== WEB_LUA_STATUS.ok)
        return makeError("call", "call", handle, prototype, status);
      const values = Array.from(
        { length: exports.result_count(prototype) },
        (_, index) => exports.result_value(prototype, index),
      );
      const frame: WebLuaResultFrame = {
        kind: "result",
        operation: "call",
        ok: true,
        state: handle,
        prototype,
        status,
        result,
        values,
      };
      options.onOutput?.(frame);
      return frame;
    };
    const resume = (
      loaded: number | WebLuaLoadedFrame,
    ): WebLuaExecutionFrame => {
      assertOpen();
      const prototype = prototypeOf(loaded);
      const result = exports.resume(handle, prototype);
      const status = exports.state_status(handle);
      if (status !== WEB_LUA_STATUS.ok)
        return makeError("resume", "resume", handle, prototype, status);
      const values = Array.from(
        { length: exports.result_count(prototype) },
        (_, index) => exports.result_value(prototype, index),
      );
      const frame: WebLuaResultFrame = {
        kind: "result",
        operation: "resume",
        ok: true,
        state: handle,
        prototype,
        status,
        result,
        values,
      };
      options.onOutput?.(frame);
      return frame;
    };
    const execute = (source: Uint8Array | string): WebLuaExecutionFrame => {
      const loaded = load(source);
      return loaded.kind === "loaded" ? call(loaded) : loaded;
    };
    const state: WebLuaState = {
      handle,
      get closed() {
        return closed;
      },
      get status() {
        return exports.state_status(handle);
      },
      load,
      call,
      resume,
      execute,
      close: () => {
        if (!closed) {
          exports.close_state(handle);
          closed = true;
          activeStates.delete(state);
        }
        return {
          kind: "closed",
          operation: "close",
          ok: true,
          state: handle,
          status: WEB_LUA_STATUS.ok,
        };
      },
    };
    activeStates.add(state);
    return state;
  };
  const invokeCapability = <T = unknown>(
    capability: WebLuaCapability,
    operation: string,
    input?: unknown,
  ): WebLuaCapabilityResult<T> => {
    if (!hasCapability(capability))
      return { granted: false, capability, reason: "capability-denied" };
    const invoke = options.hostAdapter?.invoke;
    if (invoke === undefined)
      return { granted: false, capability, reason: "adapter-unavailable" };
    try {
      return {
        granted: true,
        capability,
        value: invoke({ capability, operation, input }),
      } as WebLuaCapabilityResult<T>;
    } catch {
      return { granted: false, capability, reason: "adapter-error" };
    }
  };
  const emitOutput = (
    message: string,
    state = 0,
  ): WebLuaCapabilityResult<void> => {
    if (!hasCapability("lua.io.write"))
      return {
        granted: false,
        capability: "lua.io.write",
        reason: "capability-denied",
      };
    const output = options.hostAdapter?.output;
    if (output === undefined)
      return {
        granted: false,
        capability: "lua.io.write",
        reason: "adapter-unavailable",
      };
    try {
      output({ kind: "output", state, message });
      return { granted: true, capability: "lua.io.write", value: undefined };
    } catch {
      return {
        granted: false,
        capability: "lua.io.write",
        reason: "adapter-error",
      };
    }
  };
  const dispose = (): void => {
    for (const state of activeStates) state.close();
    bootstrapObjectCounts.clear();
    exports.fws_reset();
  };
  assertMemoryRange(exports.memory, 0, 0);
  const encodeSource = (source: Uint8Array | string): Uint8Array =>
    typeof source === "string" ? new TextEncoder().encode(source) : source;
  const withSource = <T>(
    source: Uint8Array | string,
    operation: (pointer: number, length: number) => T,
  ): T => {
    const encoded = encodeSource(source);
    const pointer = exports.fws_alloc(encoded.byteLength);
    assertMemoryRange(exports.memory, pointer, encoded.byteLength);
    new Uint8Array(exports.memory.buffer, pointer, encoded.byteLength).set(
      encoded,
    );
    try {
      return operation(pointer, encoded.byteLength);
    } finally {
      exports.fws_dealloc(pointer, encoded.byteLength);
    }
  };
  const valueKind = (value: number): WebLuaValueKind => {
    switch (exports.value_kind_of(value)) {
      case 0: {
        return "nil";
      }
      case 1: {
        return "boolean";
      }
      case 2: {
        return "integer";
      }
      case 3: {
        return "float";
      }
      case 4: {
        return "string";
      }
      case 5: {
        return "table";
      }
      case 6: {
        return "function";
      }
      case 7: {
        return "thread";
      }
      case 8: {
        return "userdata";
      }
      default: {
        return "unknown";
      }
    }
  };
  return {
    artifact: resolvedArtifact,
    exports,
    abi: WEB_LUA_ABI_MANIFEST,
    importPolicy: WEB_LUA_IMPORT_POLICY,
    capabilityPolicies: WEB_LUA_CAPABILITY_POLICIES,
    capabilities,
    hasCapability,
    requireCapability,
    invokeCapability,
    emitOutput,
    openState,
    dispose,
    createState,
    nilValue: exports.nil_value,
    booleanValue: (value) => exports.boolean_value(value ? 1 : 0),
    integerValue: (value) => {
      if (!Number.isSafeInteger(value) || value < 0 || value > 0xf_ff_ff_ff)
        throw new RangeError(
          "WebLua integer values must fit the guest unsigned payload range.",
        );
      return exports.integer_value(value);
    },
    floatValue: (state, value) => {
      if (!Number.isFinite(value))
        throw new RangeError("WebLua float values must be finite numbers.");
      return exports.float_value(state, value);
    },
    floatNumber: exports.float_number_of,
    valueKind,
    valuePayload: exports.value_payload_of,
    valueIsValid: (value) => exports.value_is_valid_of(value) === 1,
    libraryType: exports.library_type,
    libraryBaseTruthy: exports.library_base_truthy,
    libraryBaseToBoolean: exports.library_base_to_boolean,
    libraryBaseToInteger: exports.library_base_to_integer,
    libraryBaseToFloat: exports.library_base_to_float,
    libraryBaseGetmetatable: exports.library_base_getmetatable,
    libraryBaseSetmetatable: exports.library_base_setmetatable,
    libraryBasePcallStatus: exports.library_base_pcall_status,
    libraryBasePcallResultCount: exports.library_base_pcall_result_count,
    libraryBasePcallResultValue: exports.library_base_pcall_result_value,
    libraryBaseNextKey: exports.library_base_next_key,
    libraryBaseNextValue: exports.library_base_next_value,
    libraryBaseIpairsNext: exports.library_base_ipairs_next,
    libraryStringLength: exports.library_string_length,
    libraryTableLength: exports.library_table_length,
    libraryRawLength: exports.library_raw_length,
    libraryStringByte: exports.library_string_byte,
    libraryStringByteAt: exports.library_string_byte_at,
    libraryStringEqual: (left, right) =>
      exports.library_string_equal(left, right) === 1,
    libraryStringConcat: exports.library_string_concat,
    libraryStringSub: exports.library_string_sub,
    libraryStringReverse: exports.library_string_reverse,
    libraryStringLower: exports.library_string_lower,
    libraryStringUpper: exports.library_string_upper,
    libraryRawGet: exports.library_raw_get,
    libraryRawSet: exports.library_raw_set,
    libraryTableInsert: exports.library_table_insert,
    libraryTableRemove: exports.library_table_remove,
    libraryTableConcat: exports.library_table_concat,
    libraryMathAbs: exports.library_math_abs,
    libraryMathMin: exports.library_math_min,
    libraryMathMax: exports.library_math_max,
    libraryMathAbsValue: exports.library_math_abs_value,
    libraryMathMinValue: exports.library_math_min_value,
    libraryMathMaxValue: exports.library_math_max_value,
    libraryUtf8Length: exports.library_utf8_length,
    libraryUtf8Byte: exports.library_utf8_byte,
    libraryUtf8IsValid: exports.library_utf8_is_valid,
    libraryUtf8Codepoint: exports.library_utf8_codepoint,
    libraryCoroutineStatus: exports.library_coroutine_status,
    libraryCoroutineCanResume: exports.library_coroutine_can_resume,
    libraryCoroutineResumeStatus: exports.library_coroutine_resume_status,
    libraryCoroutineCloseStatus: exports.library_coroutine_close_status,
    libraryCoroutineResumeResult: exports.library_coroutine_resume_result,
    libraryCoroutineCloseResult: exports.library_coroutine_close_result,
    libraryPackageDefaultPath: exports.library_package_default_path,
    libraryPackageDefaultPathValue: exports.library_package_default_path_value,
    libraryPackageLoadStatus: exports.library_package_load_status,
    libraryPackageCanLoad: exports.library_package_can_load,
    libraryDebugTraceMask: exports.library_debug_trace_mask,
    libraryDebugTraceAllowed: exports.library_debug_trace_allowed,
    libraryDebugTraceEnabled: exports.library_debug_trace_enabled,
    internString: exports.intern_string,
    findString: exports.find_string,
    internStringBytes: (state, source) =>
      withSource(source, (pointer, length) =>
        exports.intern_string_bytes(state, pointer, length),
      ),
    stringByte: exports.string_byte_value,
    stringSize: exports.string_size,
    stringsEqual: (left, right) => exports.strings_equal(left, right) === 1,
    createTable: exports.new_table,
    createEmptyTable: exports.new_empty_table,
    tableValue: exports.table_value,
    setTableValue: exports.set_table_value,
    tableSize: exports.table_size,
    tableNext: exports.table_next_entry,
    tableNextKey: exports.table_next_key_value,
    tableNextValue: exports.table_next_value_value,
    setRoot: exports.set_root,
    rootValue: exports.root_value,
    ownsHandle: (state, handle) => exports.owns_handle(state, handle) === 1,
    setAllocationLimit: exports.set_allocation_limit,
    allocationError: exports.allocation_error,
    stateIsValid: (state) => exports.state_is_valid(state) === 1,
    collect: exports.collect_state,
    objectCount,
    lexTokenCount: (source) =>
      withSource(source, (pointer, length) =>
        exports.lex_token_count(pointer, length),
      ),
    load: (state, source) =>
      withSource(source, (pointer, length) =>
        exports.load(state, pointer, length),
      ),
    call: exports.call,
    resume: exports.resume,
    close: exports.close_state,
    status: exports.state_status,
    chunkFormat: exports.loaded_chunk_format,
    chunkSourceLength: exports.loaded_chunk_source_length,
    chunkError: exports.loaded_chunk_error,
    resultCount: exports.result_count,
    resultValue: exports.result_value,
  };
}
