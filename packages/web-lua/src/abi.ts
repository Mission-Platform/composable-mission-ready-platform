export const WEB_LUA_ABI_VERSION = "0.1.0";

export const WEB_LUA_REQUIRED_EXPORTS = [
  "create_state",
  "load",
  "call",
  "resume",
  "close_state",
  "state_status",
] as const;

export const WEB_LUA_RUNTIME_EXPORTS = [
  "memory",
  "fws_alloc",
  "fws_dealloc",
  "fws_realloc",
  "fws_reset",
  "create_state",
  "nil_value",
  "boolean_value",
  "integer_value",
  "float_value",
  "float_number_of",
  "value_kind_of",
  "value_payload_of",
  "value_float_of",
  "value_string_of",
  "value_table_of",
  "value_function_of",
  "value_thread_of",
  "value_is_valid_of",
  "library_type",
  "library_base_truthy",
  "library_base_to_boolean",
  "library_base_to_integer",
  "library_base_to_float",
  "library_base_getmetatable",
  "library_base_setmetatable",
  "library_base_pcall_status",
  "library_base_pcall_result_count",
  "library_base_pcall_result_value",
  "library_base_next_key",
  "library_base_next_value",
  "library_base_ipairs_next",
  "library_string_length",
  "library_table_length",
  "library_raw_length",
  "library_string_byte",
  "library_string_byte_at",
  "library_string_equal",
  "library_string_concat",
  "library_string_sub",
  "library_string_reverse",
  "library_string_lower",
  "library_string_upper",
  "library_raw_get",
  "library_raw_set",
  "library_table_insert",
  "library_table_remove",
  "library_table_concat",
  "library_math_abs",
  "library_math_min",
  "library_math_max",
  "library_math_abs_value",
  "library_math_min_value",
  "library_math_max_value",
  "library_utf8_length",
  "library_utf8_byte",
  "library_utf8_is_valid",
  "library_utf8_codepoint",
  "library_coroutine_status",
  "library_coroutine_can_resume",
  "library_coroutine_resume_status",
  "library_coroutine_close_status",
  "library_coroutine_resume_result",
  "library_coroutine_close_result",
  "library_package_default_path",
  "library_package_default_path_value",
  "library_package_load_status",
  "library_package_can_load",
  "library_debug_trace_mask",
  "library_debug_trace_allowed",
  "library_debug_trace_enabled",
  "intern_string",
  "find_string",
  "next_string",
  "intern_string_bytes",
  "string_byte_value",
  "string_size",
  "strings_equal",
  "new_table",
  "new_empty_table",
  "table_value",
  "set_table_value",
  "table_size",
  "table_next_entry",
  "table_next_key_value",
  "table_next_value_value",
  "new_closure",
  "closure_value",
  "new_upvalue",
  "upvalue_value",
  "set_upvalue",
  "new_thread",
  "thread_value",
  "new_frame",
  "push_frame",
  "current_frame",
  "set_thread_yield",
  "thread_yield_result",
  "collect_state",
  "object_count",
  "set_root",
  "root_value",
  "owns_handle",
  "set_allocation_limit",
  "allocation_error",
  "state_is_valid",
  "lex_token_count",
  "load",
  "call",
  "resume",
  "close_state",
  "state_status",
  "loaded_chunk_format",
  "loaded_chunk_source_length",
  "loaded_chunk_error",
  "result_count",
  "result_value",
] as const;

export const WEB_LUA_GUEST_EXPORTS = WEB_LUA_RUNTIME_EXPORTS.slice(5);

export const WEB_LUA_STATUS = {
  ok: 0,
  syntaxError: 1,
  runtimeError: 2,
  divisionByZero: 3,
  malformedChunk: 4,
  yielded: 5,
} as const;

export const WEB_LUA_CAPABILITIES = [
  "lua.io.read",
  "lua.io.write",
  "lua.clock.now",
  "lua.random.bytes",
  "lua.os.command",
  "lua.package.load",
  "lua.debug.trace",
] as const;

export const WEB_LUA_IMPORT_POLICY_VERSION = WEB_LUA_ABI_VERSION;
export const WEB_LUA_CAPABILITY_POLICY_VERSION = WEB_LUA_ABI_VERSION;

export interface WebLuaImportPolicy {
  readonly format: "web-lua-import-policy";
  readonly version: typeof WEB_LUA_IMPORT_POLICY_VERSION;
  readonly imports: readonly string[];
}

export interface WebLuaCapabilityPolicy {
  readonly version: typeof WEB_LUA_CAPABILITY_POLICY_VERSION;
  readonly capability: (typeof WEB_LUA_CAPABILITIES)[number];
  readonly status: "adapter-only";
  readonly importName: string | null;
  readonly denial: "capability-denied";
}

export const WEB_LUA_IMPORT_POLICY: WebLuaImportPolicy = {
  format: "web-lua-import-policy",
  version: WEB_LUA_IMPORT_POLICY_VERSION,
  imports: ["lua.io.write", "lua.package.load", "lua.core.source"],
};

export const WEB_LUA_CAPABILITY_POLICIES: readonly WebLuaCapabilityPolicy[] =
  WEB_LUA_CAPABILITIES.map((capability) => ({
    version: WEB_LUA_CAPABILITY_POLICY_VERSION,
    capability,
    status: "adapter-only",
    importName:
      capability === "lua.package.load" || capability === "lua.io.write"
        ? capability
        : null,
    denial: "capability-denied",
  }));

export type WebLuaValueKind =
  | "nil"
  | "boolean"
  | "integer"
  | "float"
  | "string"
  | "table"
  | "function"
  | "thread"
  | "userdata"
  | "unknown";

export interface WebLuaAbiManifest {
  readonly format: "web-lua-abi";
  readonly version: typeof WEB_LUA_ABI_VERSION;
  readonly requiredExports: readonly string[];
  readonly runtimeExports: readonly string[];
  readonly capabilities: readonly string[];
  readonly importPolicy: WebLuaImportPolicy;
  readonly capabilityPolicyVersion: typeof WEB_LUA_CAPABILITY_POLICY_VERSION;
  readonly capabilityPolicies: readonly WebLuaCapabilityPolicy[];
}

export const WEB_LUA_ABI_MANIFEST: WebLuaAbiManifest = {
  format: "web-lua-abi",
  version: WEB_LUA_ABI_VERSION,
  requiredExports: WEB_LUA_REQUIRED_EXPORTS,
  runtimeExports: WEB_LUA_RUNTIME_EXPORTS,
  capabilities: WEB_LUA_CAPABILITIES,
  importPolicy: WEB_LUA_IMPORT_POLICY,
  capabilityPolicyVersion: WEB_LUA_CAPABILITY_POLICY_VERSION,
  capabilityPolicies: WEB_LUA_CAPABILITY_POLICIES,
};

export interface WebLuaExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
  readonly create_state: () => number;
  readonly nil_value: () => number;
  readonly boolean_value: (value: number) => number;
  readonly integer_value: (value: number) => number;
  readonly float_value: (state: number, value: number) => number;
  readonly float_number_of: (value: number) => number;
  readonly value_kind_of: (value: number) => number;
  readonly value_payload_of: (value: number) => number;
  readonly value_float_of: (handle: number) => number;
  readonly value_string_of: (handle: number) => number;
  readonly value_table_of: (handle: number) => number;
  readonly value_function_of: (handle: number) => number;
  readonly value_thread_of: (handle: number) => number;
  readonly value_is_valid_of: (value: number) => number;
  readonly library_type: (state: number, value: number) => number;
  readonly library_base_truthy: (value: number) => number;
  readonly library_base_to_boolean: (value: number) => number;
  readonly library_base_to_integer: (value: number) => number;
  readonly library_base_to_float: (state: number, value: number) => number;
  readonly library_base_getmetatable: (value: number) => number;
  readonly library_base_setmetatable: (
    value: number,
    metatable: number,
  ) => number;
  readonly library_base_pcall_status: (
    state: number,
    prototype: number,
  ) => number;
  readonly library_base_pcall_result_count: (prototype: number) => number;
  readonly library_base_pcall_result_value: (
    prototype: number,
    index: number,
  ) => number;
  readonly library_base_next_key: (value: number, cursor: number) => number;
  readonly library_base_next_value: (value: number, cursor: number) => number;
  readonly library_base_ipairs_next: (value: number, index: number) => number;
  readonly library_string_length: (value: number) => number;
  readonly library_table_length: (value: number) => number;
  readonly library_raw_length: (value: number) => number;
  readonly library_string_byte: (value: number, index: number) => number;
  readonly library_string_byte_at: (value: number, index: number) => number;
  readonly library_string_equal: (left: number, right: number) => number;
  readonly library_string_concat: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_string_sub: (
    state: number,
    value: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_string_reverse: (state: number, value: number) => number;
  readonly library_string_lower: (state: number, value: number) => number;
  readonly library_string_upper: (state: number, value: number) => number;
  readonly library_raw_get: (value: number, key: number) => number;
  readonly library_raw_set: (
    value: number,
    key: number,
    output: number,
  ) => number;
  readonly library_table_insert: (
    value: number,
    position: number,
    output: number,
  ) => number;
  readonly library_table_remove: (value: number, position: number) => number;
  readonly library_table_concat: (
    state: number,
    value: number,
    separator: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_math_abs: (value: number) => number;
  readonly library_math_min: (left: number, right: number) => number;
  readonly library_math_max: (left: number, right: number) => number;
  readonly library_math_abs_value: (state: number, value: number) => number;
  readonly library_math_min_value: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_math_max_value: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_utf8_length: (value: number) => number;
  readonly library_utf8_byte: (value: number, index: number) => number;
  readonly library_utf8_is_valid: (value: number) => number;
  readonly library_utf8_codepoint: (value: number, index: number) => number;
  readonly library_coroutine_status: (status: number) => number;
  readonly library_coroutine_can_resume: (status: number) => number;
  readonly library_coroutine_resume_status: (status: number) => number;
  readonly library_coroutine_close_status: (status: number) => number;
  readonly library_coroutine_resume_result: (
    state: number,
    prototype: number,
  ) => number;
  readonly library_coroutine_close_result: (state: number) => number;
  readonly library_package_default_path: () => number;
  readonly library_package_default_path_value: () => number;
  readonly library_package_load_status: (status: number) => number;
  readonly library_package_can_load: (status: number) => number;
  readonly library_debug_trace_mask: (mask: number) => number;
  readonly library_debug_trace_allowed: (enabled: number) => number;
  readonly library_debug_trace_enabled: (mask: number, flag: number) => number;
  readonly intern_string: (
    state: number,
    hash: number,
    length: number,
  ) => number;
  readonly find_string: (state: number, hash: number, length: number) => number;
  readonly next_string: (handle: number) => number;
  readonly intern_string_bytes: (
    state: number,
    pointer: number,
    length: number,
  ) => number;
  readonly string_byte_value: (handle: number, index: number) => number;
  readonly string_size: (handle: number) => number;
  readonly strings_equal: (left: number, right: number) => number;
  readonly new_table: (state: number, key: number, value: number) => number;
  readonly new_empty_table: (state: number) => number;
  readonly table_value: (handle: number, key: number) => number;
  readonly set_table_value: (
    handle: number,
    key: number,
    value: number,
  ) => void;
  readonly table_size: (handle: number) => number;
  readonly table_next_entry: (handle: number, cursor: number) => number;
  readonly table_next_key_value: (handle: number, cursor: number) => number;
  readonly table_next_value_value: (handle: number, cursor: number) => number;
  readonly new_closure: (
    state: number,
    functionId: number,
    upvalue: number,
  ) => number;
  readonly closure_value: (handle: number) => number;
  readonly new_upvalue: (state: number, value: number) => number;
  readonly upvalue_value: (handle: number) => number;
  readonly set_upvalue: (handle: number, value: number) => number;
  readonly new_thread: (state: number, status: number, stack: number) => number;
  readonly thread_value: (handle: number) => number;
  readonly new_frame: (
    state: number,
    previous: number,
    prototype: number,
    returnPc: number,
  ) => number;
  readonly push_frame: (thread: number, frame: number) => number;
  readonly current_frame: (thread: number) => number;
  readonly set_thread_yield: (thread: number, value: number) => void;
  readonly thread_yield_result: (thread: number) => number;
  readonly collect_state: (state: number, root: number) => number;
  readonly object_count: (state: number) => number;
  readonly set_root: (state: number, index: number, value: number) => number;
  readonly root_value: (state: number, index: number) => number;
  readonly owns_handle: (state: number, handle: number) => number;
  readonly set_allocation_limit: (state: number, limit: number) => void;
  readonly allocation_error: (state: number) => number;
  readonly state_is_valid: (state: number) => number;
  readonly lex_token_count: (pointer: number, length: number) => number;
  readonly load: (state: number, pointer: number, length: number) => number;
  readonly call: (state: number, prototype: number) => number;
  readonly resume: (state: number, prototype: number) => number;
  readonly close_state: (state: number) => number;
  readonly state_status: (state: number) => number;
  readonly loaded_chunk_format: (prototype: number) => number;
  readonly loaded_chunk_source_length: (prototype: number) => number;
  readonly loaded_chunk_error: (prototype: number) => number;
  readonly result_count: (prototype: number) => number;
  readonly result_value: (prototype: number, index: number) => number;
}

export function asWebLuaExports(exports: WebAssembly.Exports): WebLuaExports {
  validateWebLuaExports(exports);
  return exports as unknown as WebLuaExports;
}

export function validateWebLuaExports(
  exports: WebAssembly.Exports | object,
): void {
  const candidate = exports as Record<string, unknown>;
  const missing = WEB_LUA_RUNTIME_EXPORTS.filter(
    (name) => !(name in candidate),
  );
  if (missing.length > 0)
    throw new Error(
      `WebLua artifact is missing WebLua exports: ${missing.join(", ")}`,
    );
  if (!(candidate.memory instanceof WebAssembly.Memory))
    throw new TypeError("WebLua memory export is invalid.");
  const invalidFunctions = WEB_LUA_RUNTIME_EXPORTS.filter(
    (name) => name !== "memory" && typeof candidate[name] !== "function",
  );
  if (invalidFunctions.length > 0)
    throw new TypeError(
      `WebLua exports are not callable: ${invalidFunctions.join(", ")}`,
    );
}

export function assertMemoryRange(
  memory: WebAssembly.Memory,
  pointer: number,
  length: number,
): void {
  if (
    !Number.isSafeInteger(pointer) ||
    !Number.isSafeInteger(length) ||
    pointer < 0 ||
    length < 0
  ) {
    throw new RangeError(
      "WebLua memory range must use non-negative integer bounds.",
    );
  }
  if (
    pointer > memory.buffer.byteLength ||
    length > memory.buffer.byteLength - pointer
  ) {
    throw new RangeError("WebLua memory range is outside guest linear memory.");
  }
}
