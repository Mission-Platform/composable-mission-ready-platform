export type ForgeWebScriptBytes = readonly [pointer: number, length: number];

export type ForgeWebScriptManifestPrimitiveType =
  | "bool"
  | "bytes"
  | "f32"
  | "f64"
  | "i32"
  | "i64"
  | "string"
  | "u32"
  | "u64"
  | "unit";
export type ForgeWebScriptManifestOwnership = "borrowed" | "owned" | "shared";
export interface ForgeWebScriptManifestSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface ForgeWebScriptManifestTypeName {
  readonly kind: "type-name";
  readonly name: ForgeWebScriptManifestPrimitiveType;
  readonly reference?: string;
  readonly arguments?: readonly ForgeWebScriptManifestTypeName[];
  readonly length?: number;
  readonly ownership?: ForgeWebScriptManifestOwnership;
  readonly span: ForgeWebScriptManifestSourceSpan;
}

export interface ForgeWebScriptManifestParameter {
  readonly name: string;
  readonly type: ForgeWebScriptManifestPrimitiveType;
  readonly reference?: string;
  readonly arguments?: readonly ForgeWebScriptManifestTypeName[];
  readonly length?: number;
  readonly ownership?: ForgeWebScriptManifestOwnership;
}

export interface ForgeWebScriptManifestFunction {
  readonly name: string;
  readonly parameters: readonly ForgeWebScriptManifestParameter[];
  readonly result: ForgeWebScriptManifestPrimitiveType;
  readonly resultReference?: string;
  readonly resultArguments?: readonly ForgeWebScriptManifestTypeName[];
  readonly resultLength?: number;
  readonly resultOwnership?: ForgeWebScriptManifestOwnership;
}

export interface ForgeWebScriptManifestHostImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: ForgeWebScriptManifestFunction;
}

export interface ForgeWebScriptManifestMemoryLayout {
  readonly pageSize: 65536;
  readonly addressType: "u32" | "u64";
  readonly ownership: "caller-owned";
  readonly stringEncoding: "utf8";
  readonly byteArrayRepresentation: "pointer-length";
  readonly allocatorExport: "fws_alloc";
  readonly deallocatorExport: "fws_dealloc";
  readonly reallocatorExport: "fws_realloc";
}

export type ForgeWebScriptManifestValueRepresentation =
  | "bool-i32"
  | "f32"
  | "f64"
  | "i32"
  | "i64"
  | "pointer-length-u32"
  | "pointer-length-u64"
  | "u32"
  | "u64"
  | "unit";

export interface ForgeWebScriptAggregateLayout {
  readonly name: string;
  readonly kind: "struct" | "enum";
  readonly size: number;
  readonly alignment: number;
  readonly discriminantSize?: 1 | 2 | 4;
  readonly fields: readonly {
    readonly name: string;
    readonly type: string;
    readonly offset: number;
    readonly size: number;
    readonly alignment: number;
    readonly ownership: ForgeWebScriptManifestOwnership;
  }[];
  readonly immutable: true;
}

export interface ForgeWebScriptManifestSourceImport {
  readonly source: string;
  readonly alias: string;
  readonly resolvedModuleId?: string;
  readonly linkMode?: "static" | "dynamic";
  readonly exports?: readonly ForgeWebScriptManifestFunction[];
}

export interface ForgeWebScriptManifestLinkedExport {
  readonly name: string;
  readonly moduleId: string;
  readonly parameters: readonly ForgeWebScriptManifestParameter[];
  readonly result: ForgeWebScriptManifestPrimitiveType;
  readonly resultReference?: string;
  readonly resultArguments?: readonly ForgeWebScriptManifestTypeName[];
  readonly resultLength?: number;
  readonly resultOwnership?: ForgeWebScriptManifestOwnership;
}

export interface ForgeWebScriptManifestStandardLibrary {
  readonly regexBytecodeVersion: string;
  readonly regexCorpusHash?: string;
}

export interface ForgeWebScriptManifestSpecialization {
  readonly id: string;
  readonly generic: string;
  readonly arguments: readonly string[];
  readonly representation: "monomorphized" | "descriptor-boundary";
}

export interface ForgeWebScriptManifestIteratorDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: "descriptor-boundary";
  readonly ownership: ForgeWebScriptManifestOwnership;
}

export interface ForgeWebScriptManifestAsync {
  readonly capabilities: readonly (
    "scheduler.microtask" | "scheduler.worker"
  )[];
  readonly deterministic: true;
  readonly taskIdRepresentation: "u32";
  readonly messageRepresentation: "owned-bytes";
  readonly ordering: "sequence";
}

export interface ForgeWebScriptManifestTargetFeatures {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
}

export interface ForgeWebScriptManifest {
  readonly format: "forge-web-script-module";
  readonly languageVersion: "1.0";
  readonly abiVersion: "1.2";
  readonly moduleName: string;
  readonly exports: readonly ForgeWebScriptManifestFunction[];
  readonly imports: readonly ForgeWebScriptManifestHostImport[];
  readonly sourceImports: readonly ForgeWebScriptManifestSourceImport[];
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: "static" | "dynamic";
  readonly linkProfile?: "static" | "dynamic";
  readonly optimizationProfile?:
    "standard" | "static-aggressive" | "dynamic-conservative";
  readonly linkedExports?: readonly ForgeWebScriptManifestLinkedExport[];
  readonly requiredCapabilities: readonly string[];
  readonly memory: ForgeWebScriptManifestMemoryLayout;
  readonly valueRepresentations: Readonly<
    Record<
      ForgeWebScriptManifestPrimitiveType,
      ForgeWebScriptManifestValueRepresentation
    >
  >;
  readonly trapModel: "explicit-trap";
  readonly standardLibrary: ForgeWebScriptManifestStandardLibrary;
  readonly aggregateLayouts: readonly ForgeWebScriptAggregateLayout[];
  readonly enumDeclarations: readonly {
    readonly name: string;
    readonly exported: boolean;
    readonly representation: "i32";
    readonly variants: readonly {
      readonly name: string;
      readonly value: number;
    }[];
  }[];
  readonly collectionLayouts: readonly {
    readonly type: string;
    readonly kind: "array" | "vector";
    readonly elementType: string;
    readonly length?: number;
    readonly representation: "contiguous" | "owned-handle";
    readonly ownership: ForgeWebScriptManifestOwnership;
  }[];
  readonly specializations: readonly ForgeWebScriptManifestSpecialization[];
  readonly iteratorDescriptors: readonly ForgeWebScriptManifestIteratorDescriptor[];
  readonly async?: ForgeWebScriptManifestAsync;
  readonly targetFeatures?: ForgeWebScriptManifestTargetFeatures;
}
export type ForgeWebScriptAbiManifest = ForgeWebScriptManifest;

export interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly allocation_error: (state: number) => number;
  readonly api_call: (state: number, prototype: number) => number;
  readonly api_chunk_error: (prototype: number) => number;
  readonly api_chunk_format: (prototype: number) => number;
  readonly api_chunk_source_length: (prototype: number) => number;
  readonly api_close: (state: number) => number;
  readonly api_is_invalid: (
    state: number,
    prototype: number,
    closed: number,
  ) => number;
  readonly api_load: (state: number, source: ForgeWebScriptBytes) => number;
  readonly api_result_count: (prototype: number) => number;
  readonly api_result_value: (prototype: number, index: number) => number;
  readonly api_resume: (state: number, prototype: number) => number;
  readonly api_status: (state: number) => number;
  readonly base_boolean: (input: number) => number;
  readonly base_getmetatable: (input: number) => number;
  readonly base_ipairs_next: (input: number, index: number) => number;
  readonly base_next_key: (input: number, cursor: number) => number;
  readonly base_next_value: (input: number, cursor: number) => number;
  readonly base_pcall_result_count: (prototype: number) => number;
  readonly base_pcall_result_value: (
    prototype: number,
    index: number,
  ) => number;
  readonly base_pcall_status: (heap: number, prototype: number) => number;
  readonly base_raw_length: (input: number) => number;
  readonly base_setmetatable: (input: number, metatable: number) => number;
  readonly base_to_boolean: (input: number) => number;
  readonly base_to_float: (heap: number, input: number) => number;
  readonly base_to_integer: (input: number) => number;
  readonly base_truthy: (input: number) => number;
  readonly base_type: (heap: number, input: number) => number;
  readonly boolean_value: (value_input: number) => number;
  readonly call: (state: number, prototype: number) => number;
  readonly capability_clock_now_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_clock_now_status: (allowed: number) => number;
  readonly capability_debug_trace_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_debug_trace_status: (allowed: number) => number;
  readonly capability_io_read_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_io_read_status: (allowed: number) => number;
  readonly capability_io_write_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_io_write_status: (allowed: number) => number;
  readonly capability_os_command_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_os_command_status: (allowed: number) => number;
  readonly capability_package_load_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_package_load_status: (allowed: number) => number;
  readonly capability_random_bytes_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_random_bytes_status: (allowed: number) => number;
  readonly chunk_error: (prototype: number) => number;
  readonly chunk_format: (prototype: number) => number;
  readonly chunk_format_binary: () => number;
  readonly chunk_format_invalid: () => number;
  readonly chunk_format_text: () => number;
  readonly chunk_source_length: (prototype: number) => number;
  readonly clock_now_result: (allowed: number, result: number) => number;
  readonly clock_now_status: (allowed: number) => number;
  readonly close_state: (state: number) => number;
  readonly closure_function: (closure: number) => number;
  readonly closure_new: (
    heap: number,
    function_id: number,
    upvalue: number,
  ) => number;
  readonly closure_upvalue: (closure: number) => number;
  readonly closure_value: (handle: number) => number;
  readonly collect: (heap: number, root: number) => number;
  readonly collect_state: (state: number, root: number) => number;
  readonly compile_chunk: (source: ForgeWebScriptBytes) => number;
  readonly compile_functions: (node: number, head: number) => number;
  readonly compile_nested_function: (node: number) => number;
  readonly copy_identifier: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly copy_long_string_literal: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly copy_string_literal: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly coroutine_can_resume: (status: number) => number;
  readonly coroutine_close_result: (heap: number) => number;
  readonly coroutine_close_status: (status: number) => number;
  readonly coroutine_resume_result: (heap: number, prototype: number) => number;
  readonly coroutine_resume_status: (status: number) => number;
  readonly coroutine_status_value: (status: number) => number;
  readonly create_state: () => number;
  readonly current_frame: (thread_handle: number) => number;
  readonly debug_trace_allowed: (enabled: number) => number;
  readonly debug_trace_enabled: (mask: number, flag: number) => number;
  readonly debug_trace_mask: (mask: number) => number;
  readonly emit: (
    node: number,
    code: number,
    index: number,
    expected: number,
  ) => number;
  readonly emit_arguments: (
    node: number,
    code: number,
    index: number,
    expected: number,
  ) => number;
  readonly emit_list: (node: number, code: number, index: number) => number;
  readonly emit_statement: (
    node: number,
    code: number,
    index: number,
  ) => number;
  readonly emit_stores: (names: number, code: number, index: number) => number;
  readonly emit_table_entries: (
    node: number,
    code: number,
    index: number,
  ) => number;
  readonly execute: (prototype: number) => void;
  readonly execute_result: (prototype: number) => number;
  readonly execute_result_count: (prototype: number) => number;
  readonly execute_result_value: (prototype: number, index: number) => number;
  readonly find_string: (state: number, hash: number, length: number) => number;
  readonly float_number_of: (value_input: number) => number;
  readonly float_value: (state: number, value_input: number) => number;
  readonly frame_new: (
    heap: number,
    previous: number,
    prototype: number,
    return_pc: number,
  ) => number;
  readonly heap_alloc: (heap: number, size: number, link: number) => number;
  readonly heap_allocation_error: (heap: number) => number;
  readonly heap_chunk: (heap: number) => number;
  readonly heap_closed: (heap: number) => number;
  readonly heap_collect: (heap: number, root: number) => number;
  readonly heap_decrement_objects: (heap: number) => void;
  readonly heap_free: (heap: number, block: number) => void;
  readonly heap_global_get: (heap: number, name: number) => number;
  readonly heap_global_set: (
    heap: number,
    name: number,
    value: number,
  ) => number;
  readonly heap_has_roots: (heap: number) => number;
  readonly heap_increment_objects: (heap: number) => void;
  readonly heap_is_root: (heap: number, value: number) => number;
  readonly heap_new: () => number;
  readonly heap_object_count: (heap: number) => number;
  readonly heap_object_head: (heap: number) => number;
  readonly heap_open: (heap: number) => number;
  readonly heap_owns: (heap: number, handle: number) => number;
  readonly heap_root: (heap: number, index: number) => number;
  readonly heap_set_chunk: (heap: number, chunk: number) => void;
  readonly heap_set_closed: (heap: number, closed: number) => void;
  readonly heap_set_limit: (heap: number, limit: number) => void;
  readonly heap_set_root: (
    heap: number,
    index: number,
    value: number,
  ) => number;
  readonly heap_set_status: (heap: number, status: number) => void;
  readonly heap_set_string_head: (heap: number, value: number) => void;
  readonly heap_status: (heap: number) => number;
  readonly heap_string_head: (heap: number) => number;
  readonly heap_valid: (heap: number) => number;
  readonly identifier_hash: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly integer_value: (value_input: number) => number;
  readonly intern_string: (
    state: number,
    hash: number,
    length: number,
  ) => number;
  readonly intern_string_bytes: (
    state: number,
    source: ForgeWebScriptBytes,
  ) => number;
  readonly io_read_result: (allowed: number, result: number) => number;
  readonly io_read_status: (allowed: number) => number;
  readonly io_write_result: (allowed: number, result: number) => number;
  readonly io_write_status: (allowed: number) => number;
  readonly is_bitand_operator: (kind: number) => number;
  readonly is_bitor_operator: (kind: number) => number;
  readonly is_bitxor_operator: (kind: number) => number;
  readonly is_break: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_comparison_operator: (kind: number) => number;
  readonly is_concat_operator: (kind: number) => number;
  readonly is_digit: (value: number) => number;
  readonly is_do: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_else: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_elseif: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_end: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_expression_operator: (kind: number) => number;
  readonly is_extended_expression_operator: (kind: number) => number;
  readonly is_false: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_for: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_function: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly is_global: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_goto: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_identifier_continue: (value: number) => number;
  readonly is_identifier_start: (value: number) => number;
  readonly is_if: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_in: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_line_comment: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly is_local: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_long_comment: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly is_nil: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_repeat: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_return: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_shift_operator: (kind: number) => number;
  readonly is_space: (value: number) => number;
  readonly is_term_operator: (kind: number) => number;
  readonly is_then: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_true: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_until: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_while: (source: ForgeWebScriptBytes, position: number) => number;
  readonly is_word: (
    source: ForgeWebScriptBytes,
    position: number,
    first: number,
    second: number,
    third: number,
    fourth: number,
    length: number,
  ) => number;
  readonly is_yield: (source: ForgeWebScriptBytes, position: number) => number;
  readonly lex_token_count: (source: ForgeWebScriptBytes) => number;
  readonly lexer_count: (source: ForgeWebScriptBytes) => number;
  readonly lexer_float: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_integer: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_long_string_content_length: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_long_string_content_start: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_skip: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_string_content_length: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_string_content_start: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_string_token_kind: (
    source: ForgeWebScriptBytes,
    position: number,
    quote: number,
  ) => number;
  readonly lexer_token_end: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly lexer_token_kind: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly library_base_getmetatable: (value_input: number) => number;
  readonly library_base_ipairs_next: (
    value_input: number,
    index: number,
  ) => number;
  readonly library_base_next_key: (
    value_input: number,
    cursor: number,
  ) => number;
  readonly library_base_next_value: (
    value_input: number,
    cursor: number,
  ) => number;
  readonly library_base_pcall_result_count: (prototype: number) => number;
  readonly library_base_pcall_result_value: (
    prototype: number,
    index: number,
  ) => number;
  readonly library_base_pcall_status: (
    state: number,
    prototype: number,
  ) => number;
  readonly library_base_setmetatable: (
    value_input: number,
    metatable: number,
  ) => number;
  readonly library_base_to_boolean: (value_input: number) => number;
  readonly library_base_to_float: (
    state: number,
    value_input: number,
  ) => number;
  readonly library_base_to_integer: (value_input: number) => number;
  readonly library_base_truthy: (value_input: number) => number;
  readonly library_coroutine_can_resume: (status: number) => number;
  readonly library_coroutine_close_result: (state: number) => number;
  readonly library_coroutine_close_status: (status: number) => number;
  readonly library_coroutine_resume_result: (
    state: number,
    prototype: number,
  ) => number;
  readonly library_coroutine_resume_status: (status: number) => number;
  readonly library_coroutine_status: (status: number) => number;
  readonly library_debug_trace_allowed: (enabled: number) => number;
  readonly library_debug_trace_enabled: (mask: number, flag: number) => number;
  readonly library_debug_trace_mask: (mask: number) => number;
  readonly library_init: (heap: number) => number;
  readonly library_init_marker: () => number;
  readonly library_math_abs: (input: number) => number;
  readonly library_math_abs_value: (
    state: number,
    value_input: number,
  ) => number;
  readonly library_math_max: (left: number, right: number) => number;
  readonly library_math_max_value: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_math_min: (left: number, right: number) => number;
  readonly library_math_min_value: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_package_can_load: (status: number) => number;
  readonly library_package_default_path: () => number;
  readonly library_package_default_path_value: () => number;
  readonly library_package_load_status: (status: number) => number;
  readonly library_raw_get: (value_input: number, key: number) => number;
  readonly library_raw_length: (value_input: number) => number;
  readonly library_raw_set: (
    value_input: number,
    key: number,
    output: number,
  ) => number;
  readonly library_string_byte: (value_input: number, index: number) => number;
  readonly library_string_byte_at: (
    value_input: number,
    index: number,
  ) => number;
  readonly library_string_byte_at_impl: (
    input: number,
    index: number,
  ) => number;
  readonly library_string_byte_impl: (input: number, index: number) => number;
  readonly library_string_concat: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_string_concat_impl: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly library_string_equal: (left: number, right: number) => number;
  readonly library_string_equal_impl: (left: number, right: number) => number;
  readonly library_string_gsub_impl: (
    heap: number,
    input: number,
    pattern_input: number,
    replacement_input: number,
    count_record: number,
  ) => number;
  readonly library_string_length: (value_input: number) => number;
  readonly library_string_length_impl: (input: number) => number;
  readonly library_string_lower: (state: number, value_input: number) => number;
  readonly library_string_lower_impl: (heap: number, input: number) => number;
  readonly library_string_rep_impl: (
    heap: number,
    input: number,
    count_value: number,
    sep_value: number,
  ) => number;
  readonly library_string_reverse: (
    state: number,
    value_input: number,
  ) => number;
  readonly library_string_reverse_impl: (heap: number, input: number) => number;
  readonly library_string_sub: (
    state: number,
    value_input: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_string_sub_impl: (
    heap: number,
    input: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_string_upper: (state: number, value_input: number) => number;
  readonly library_string_upper_impl: (heap: number, input: number) => number;
  readonly library_table_concat: (
    state: number,
    value_input: number,
    separator: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_table_insert: (
    value_input: number,
    position: number,
    output: number,
  ) => number;
  readonly library_table_length: (value_input: number) => number;
  readonly library_table_remove: (
    value_input: number,
    position: number,
  ) => number;
  readonly library_type: (state: number, value_input: number) => number;
  readonly library_utf8_byte: (value_input: number, index: number) => number;
  readonly library_utf8_codepoint: (
    value_input: number,
    index: number,
  ) => number;
  readonly library_utf8_is_valid: (value_input: number) => number;
  readonly library_utf8_length: (value_input: number) => number;
  readonly load: (state: number, source: ForgeWebScriptBytes) => number;
  readonly loaded_chunk_error: (prototype: number) => number;
  readonly loaded_chunk_format: (prototype: number) => number;
  readonly loaded_chunk_source_length: (prototype: number) => number;
  readonly lua_string_concat: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly lua_string_length: (string: number) => number;
  readonly math_abs_number: (heap: number, input: number) => number;
  readonly math_abs_value: (input: number) => number;
  readonly math_max_number: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly math_max_value: (left: number, right: number) => number;
  readonly math_min_number: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly math_min_value: (left: number, right: number) => number;
  readonly new_closure: (
    state: number,
    function_id: number,
    upvalue: number,
  ) => number;
  readonly new_empty_table: (state: number) => number;
  readonly new_frame: (
    state: number,
    previous: number,
    prototype: number,
    return_pc: number,
  ) => number;
  readonly new_table: (
    state: number,
    key: number,
    value_input: number,
  ) => number;
  readonly new_thread: (state: number, status: number, stack: number) => number;
  readonly new_upvalue: (state: number, value_input: number) => number;
  readonly next_string: (handle: number) => number;
  readonly nil_value: () => number;
  readonly node: (kind: number, left: number, right: number) => number;
  readonly node_extra: (
    kind: number,
    first: number,
    second: number,
    third: number,
  ) => number;
  readonly node_full: (
    kind: number,
    first: number,
    second: number,
    third: number,
    fourth: number,
  ) => number;
  readonly object_count: (state: number) => number;
  readonly os_command_result: (allowed: number, result: number) => number;
  readonly os_command_status: (allowed: number) => number;
  readonly owns_handle: (state: number, handle: number) => number;
  readonly package_can_load: (status: number) => number;
  readonly package_default_path: () => number;
  readonly package_default_path_value: () => number;
  readonly package_load_status: (status: number) => number;
  readonly parameter_count: (parameters: number) => number;
  readonly parameters_are_vararg: (parameters: number) => number;
  readonly parse_arithmetic: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_bitand: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_bitor: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_bitxor: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_block: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_chunk: (source: ForgeWebScriptBytes) => number;
  readonly parse_concat: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_expression: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_expression_list: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_factor: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_function_expression: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_index_suffix: (
    source: ForgeWebScriptBytes,
    base: number,
    position: number,
  ) => number;
  readonly parse_parameters: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_shift: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_statement: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly parse_table_entries: (
    source: ForgeWebScriptBytes,
    position: number,
    next_index: number,
  ) => number;
  readonly parse_term: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly push_frame: (thread_handle: number, frame: number) => number;
  readonly random_bytes_result: (allowed: number, result: number) => number;
  readonly random_bytes_status: (allowed: number) => number;
  readonly result: (position: number, node: number, status: number) => number;
  readonly result_count: (prototype: number) => number;
  readonly result_value: (prototype: number, index: number) => number;
  readonly resume: (state: number, prototype: number) => number;
  readonly root_value: (state: number, index: number) => number;
  readonly set_allocation_limit: (state: number, limit: number) => void;
  readonly set_root: (
    state: number,
    index: number,
    value_input: number,
  ) => number;
  readonly set_table_value: (
    handle: number,
    key: number,
    value_input: number,
  ) => void;
  readonly set_thread_yield: (
    thread_handle: number,
    value_input: number,
  ) => void;
  readonly set_upvalue: (handle: number, value_input: number) => number;
  readonly skip_line_comment: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly skip_long_comment: (
    source: ForgeWebScriptBytes,
    position: number,
  ) => number;
  readonly state_is_valid: (state: number) => number;
  readonly state_status: (state: number) => number;
  readonly status_division_by_zero: () => number;
  readonly status_for_chunk_error: (error: number) => number;
  readonly status_malformed_chunk: () => number;
  readonly status_ok: () => number;
  readonly status_runtime_error: () => number;
  readonly status_syntax_error: () => number;
  readonly status_yield: () => number;
  readonly string_byte: (string: number, index: number) => number;
  readonly string_byte_value: (handle: number, index: number) => number;
  readonly string_equal: (left: number, right: number) => number;
  readonly string_find: (heap: number, hash: number, length: number) => number;
  readonly string_hash: (string: number) => number;
  readonly string_intern: (
    heap: number,
    hash: number,
    length: number,
  ) => number;
  readonly string_intern_bytes: (
    heap: number,
    source: ForgeWebScriptBytes,
  ) => number;
  readonly string_intern_record: (heap: number, record: number) => number;
  readonly string_next: (string: number) => number;
  readonly string_size: (handle: number) => number;
  readonly strings_equal: (left: number, right: number) => number;
  readonly table_concat: (
    heap: number,
    input: number,
    separator: number,
    start: number,
    finish: number,
  ) => number;
  readonly table_get: (table: number, key: number) => number;
  readonly table_get_raw: (table: number, key: number) => number;
  readonly table_hash_count: (table: number) => number;
  readonly table_insert: (
    input: number,
    position: number,
    item: number,
  ) => number;
  readonly table_length: (table: number) => number;
  readonly table_metatable: (table: number) => number;
  readonly table_new: (heap: number, key: number, value: number) => number;
  readonly table_new_empty: (heap: number) => number;
  readonly table_next: (table: number, cursor: number) => number;
  readonly table_next_entry: (handle: number, cursor: number) => number;
  readonly table_next_from_key: (table: number, key: number) => number;
  readonly table_next_key: (table: number, cursor: number) => number;
  readonly table_next_key_value: (handle: number, cursor: number) => number;
  readonly table_next_value: (table: number, cursor: number) => number;
  readonly table_next_value_value: (handle: number, cursor: number) => number;
  readonly table_raw_get: (input: number, key: number) => number;
  readonly table_raw_length: (input: number) => number;
  readonly table_raw_set: (
    input: number,
    key: number,
    output: number,
  ) => number;
  readonly table_remove: (input: number, position: number) => number;
  readonly table_set: (table: number, key: number, value: number) => void;
  readonly table_set_metatable: (table: number, metatable: number) => number;
  readonly table_set_raw: (table: number, key: number, value: number) => void;
  readonly table_size: (handle: number) => number;
  readonly table_value: (handle: number, key: number) => number;
  readonly thread_frame: (thread: number) => number;
  readonly thread_new: (heap: number, status: number, stack: number) => number;
  readonly thread_push_frame: (thread: number, frame: number) => number;
  readonly thread_result_count: (thread: number) => number;
  readonly thread_set_result_count: (thread: number, count: number) => void;
  readonly thread_set_status: (thread: number, status: number) => void;
  readonly thread_set_yield: (thread: number, value: number) => void;
  readonly thread_status: (thread: number) => number;
  readonly thread_value: (handle: number) => number;
  readonly thread_yield_result: (thread_handle: number) => number;
  readonly thread_yield_value: (thread: number) => number;
  readonly tracked_objects: (heap: number) => number;
  readonly upvalue_get: (upvalue: number) => number;
  readonly upvalue_new: (heap: number, value: number) => number;
  readonly upvalue_set: (upvalue: number, value: number) => number;
  readonly upvalue_value: (handle: number) => number;
  readonly utf8_byte_value: (input: number, index: number) => number;
  readonly utf8_codepoint_value: (input: number, index: number) => number;
  readonly utf8_is_valid_value: (input: number) => number;
  readonly utf8_length_value: (input: number) => number;
  readonly value_boolean: (value: number) => number;
  readonly value_float: (handle: number) => number;
  readonly value_float_new: (heap: number, number: number) => number;
  readonly value_float_number: (value: number) => number;
  readonly value_float_of: (handle: number) => number;
  readonly value_function: (handle: number) => number;
  readonly value_function_of: (handle: number) => number;
  readonly value_integer: (value: number) => number;
  readonly value_is_collectable: (value: number) => number;
  readonly value_is_valid: (value: number) => number;
  readonly value_is_valid_of: (value_input: number) => number;
  readonly value_kind: (value: number) => number;
  readonly value_kind_of: (value_input: number) => number;
  readonly value_nil: () => number;
  readonly value_payload: (value: number) => number;
  readonly value_payload_of: (value_input: number) => number;
  readonly value_string: (handle: number) => number;
  readonly value_string_of: (handle: number) => number;
  readonly value_table: (handle: number) => number;
  readonly value_table_of: (handle: number) => number;
  readonly value_thread: (handle: number) => number;
  readonly value_thread_of: (handle: number) => number;
  readonly value_userdata: (handle: number) => number;
  readonly vm_adjust_results: (
    prototype: number,
    stack: number,
    depth: number,
    expected_count: number,
    actual_count: number,
  ) => number;
  readonly vm_binary_opcode: (
    prototype: number,
    opcode: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_bind_parameters: (
    stack: number,
    argument_base: number,
    local_base: number,
    parameters: number,
    count: number,
  ) => number;
  readonly vm_bit_and: (left: number, right: number) => number;
  readonly vm_bit_not: (value: number) => number;
  readonly vm_bit_or: (left: number, right: number) => number;
  readonly vm_bit_xor: (left: number, right: number) => number;
  readonly vm_bitwise_opcode: (
    prototype: number,
    opcode: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_clear_locals: (local_base: number) => void;
  readonly vm_const_error: () => number;
  readonly vm_declare_local: (
    local_base: number,
    declaration: number,
    value: number,
  ) => number;
  readonly vm_division_error: () => number;
  readonly vm_find_function: (head: number, name: number) => number;
  readonly vm_is_binary: (opcode: number) => number;
  readonly vm_is_bitwise_opcode: (opcode: number) => number;
  readonly vm_is_running: (pc: number, count: number, status: number) => number;
  readonly vm_is_string_opcode: (opcode: number) => number;
  readonly vm_is_table_opcode: (opcode: number) => number;
  readonly vm_is_yielded: (prototype: number) => number;
  readonly vm_load_captured: (local_base: number, name: number) => number;
  readonly vm_load_local: (local_base: number, name: number) => number;
  readonly vm_load_local_or_global: (
    heap: number,
    local_base: number,
    name: number,
  ) => number;
  readonly vm_load_local_or_global_with_upvalue: (
    heap: number,
    local_base: number,
    upvalue: number,
    name: number,
  ) => number;
  readonly vm_malformed_chunk: () => number;
  readonly vm_negate: (value: number) => number;
  readonly vm_push_varargs: (
    prototype: number,
    stack: number,
    depth: number,
    local_base: number,
  ) => number;
  readonly vm_remainder: (left: number, right: number) => number;
  readonly vm_shift_left: (value: number, amount: number) => number;
  readonly vm_shift_right: (value: number, amount: number) => number;
  readonly vm_stack_address: (stack: number, index: number) => number;
  readonly vm_stack_error: () => number;
  readonly vm_store_local: (
    local_base: number,
    name: number,
    value: number,
  ) => number;
  readonly vm_store_local_or_global: (
    heap: number,
    local_base: number,
    name: number,
    value: number,
  ) => number;
  readonly vm_store_local_or_global_with_upvalue: (
    heap: number,
    local_base: number,
    upvalue: number,
    name: number,
    value: number,
  ) => number;
  readonly vm_store_varargs: (
    stack: number,
    argument_base: number,
    count: number,
    local_base: number,
  ) => void;
  readonly vm_string_opcode: (
    prototype: number,
    opcode: number,
    operand: number,
    heap: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_table_opcode: (
    prototype: number,
    opcode: number,
    heap: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_true: () => number;
  readonly vm_yield_status: () => number;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
}

export interface ForgeWebScriptRawExports {
  readonly memory: WebAssembly.Memory;
  readonly allocation_error: (state: number) => number;
  readonly api_call: (state: number, prototype: number) => number;
  readonly api_chunk_error: (prototype: number) => number;
  readonly api_chunk_format: (prototype: number) => number;
  readonly api_chunk_source_length: (prototype: number) => number;
  readonly api_close: (state: number) => number;
  readonly api_is_invalid: (
    state: number,
    prototype: number,
    closed: number,
  ) => number;
  readonly api_load: (
    state: number,
    sourcePointer: number,
    sourceLength: number,
  ) => number;
  readonly api_result_count: (prototype: number) => number;
  readonly api_result_value: (prototype: number, index: number) => number;
  readonly api_resume: (state: number, prototype: number) => number;
  readonly api_status: (state: number) => number;
  readonly base_boolean: (input: number) => number;
  readonly base_getmetatable: (input: number) => number;
  readonly base_ipairs_next: (input: number, index: number) => number;
  readonly base_next_key: (input: number, cursor: number) => number;
  readonly base_next_value: (input: number, cursor: number) => number;
  readonly base_pcall_result_count: (prototype: number) => number;
  readonly base_pcall_result_value: (
    prototype: number,
    index: number,
  ) => number;
  readonly base_pcall_status: (heap: number, prototype: number) => number;
  readonly base_raw_length: (input: number) => number;
  readonly base_setmetatable: (input: number, metatable: number) => number;
  readonly base_to_boolean: (input: number) => number;
  readonly base_to_float: (heap: number, input: number) => number;
  readonly base_to_integer: (input: number) => number;
  readonly base_truthy: (input: number) => number;
  readonly base_type: (heap: number, input: number) => number;
  readonly boolean_value: (value_input: number) => number;
  readonly call: (state: number, prototype: number) => number;
  readonly capability_clock_now_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_clock_now_status: (allowed: number) => number;
  readonly capability_debug_trace_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_debug_trace_status: (allowed: number) => number;
  readonly capability_io_read_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_io_read_status: (allowed: number) => number;
  readonly capability_io_write_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_io_write_status: (allowed: number) => number;
  readonly capability_os_command_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_os_command_status: (allowed: number) => number;
  readonly capability_package_load_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_package_load_status: (allowed: number) => number;
  readonly capability_random_bytes_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_random_bytes_status: (allowed: number) => number;
  readonly chunk_error: (prototype: number) => number;
  readonly chunk_format: (prototype: number) => number;
  readonly chunk_format_binary: () => number;
  readonly chunk_format_invalid: () => number;
  readonly chunk_format_text: () => number;
  readonly chunk_source_length: (prototype: number) => number;
  readonly clock_now_result: (allowed: number, result: number) => number;
  readonly clock_now_status: (allowed: number) => number;
  readonly close_state: (state: number) => number;
  readonly closure_function: (closure: number) => number;
  readonly closure_new: (
    heap: number,
    function_id: number,
    upvalue: number,
  ) => number;
  readonly closure_upvalue: (closure: number) => number;
  readonly closure_value: (handle: number) => number;
  readonly collect: (heap: number, root: number) => number;
  readonly collect_state: (state: number, root: number) => number;
  readonly compile_chunk: (
    sourcePointer: number,
    sourceLength: number,
  ) => number;
  readonly compile_functions: (node: number, head: number) => number;
  readonly compile_nested_function: (node: number) => number;
  readonly copy_identifier: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly copy_long_string_literal: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly copy_string_literal: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly coroutine_can_resume: (status: number) => number;
  readonly coroutine_close_result: (heap: number) => number;
  readonly coroutine_close_status: (status: number) => number;
  readonly coroutine_resume_result: (heap: number, prototype: number) => number;
  readonly coroutine_resume_status: (status: number) => number;
  readonly coroutine_status_value: (status: number) => number;
  readonly create_state: () => number;
  readonly current_frame: (thread_handle: number) => number;
  readonly debug_trace_allowed: (enabled: number) => number;
  readonly debug_trace_enabled: (mask: number, flag: number) => number;
  readonly debug_trace_mask: (mask: number) => number;
  readonly emit: (
    node: number,
    code: number,
    index: number,
    expected: number,
  ) => number;
  readonly emit_arguments: (
    node: number,
    code: number,
    index: number,
    expected: number,
  ) => number;
  readonly emit_list: (node: number, code: number, index: number) => number;
  readonly emit_statement: (
    node: number,
    code: number,
    index: number,
  ) => number;
  readonly emit_stores: (names: number, code: number, index: number) => number;
  readonly emit_table_entries: (
    node: number,
    code: number,
    index: number,
  ) => number;
  readonly execute: (prototype: number) => void;
  readonly execute_result: (prototype: number) => number;
  readonly execute_result_count: (prototype: number) => number;
  readonly execute_result_value: (prototype: number, index: number) => number;
  readonly find_string: (state: number, hash: number, length: number) => number;
  readonly float_number_of: (value_input: number) => number;
  readonly float_value: (state: number, value_input: number) => number;
  readonly frame_new: (
    heap: number,
    previous: number,
    prototype: number,
    return_pc: number,
  ) => number;
  readonly heap_alloc: (heap: number, size: number, link: number) => number;
  readonly heap_allocation_error: (heap: number) => number;
  readonly heap_chunk: (heap: number) => number;
  readonly heap_closed: (heap: number) => number;
  readonly heap_collect: (heap: number, root: number) => number;
  readonly heap_decrement_objects: (heap: number) => void;
  readonly heap_free: (heap: number, block: number) => void;
  readonly heap_global_get: (heap: number, name: number) => number;
  readonly heap_global_set: (
    heap: number,
    name: number,
    value: number,
  ) => number;
  readonly heap_has_roots: (heap: number) => number;
  readonly heap_increment_objects: (heap: number) => void;
  readonly heap_is_root: (heap: number, value: number) => number;
  readonly heap_new: () => number;
  readonly heap_object_count: (heap: number) => number;
  readonly heap_object_head: (heap: number) => number;
  readonly heap_open: (heap: number) => number;
  readonly heap_owns: (heap: number, handle: number) => number;
  readonly heap_root: (heap: number, index: number) => number;
  readonly heap_set_chunk: (heap: number, chunk: number) => void;
  readonly heap_set_closed: (heap: number, closed: number) => void;
  readonly heap_set_limit: (heap: number, limit: number) => void;
  readonly heap_set_root: (
    heap: number,
    index: number,
    value: number,
  ) => number;
  readonly heap_set_status: (heap: number, status: number) => void;
  readonly heap_set_string_head: (heap: number, value: number) => void;
  readonly heap_status: (heap: number) => number;
  readonly heap_string_head: (heap: number) => number;
  readonly heap_valid: (heap: number) => number;
  readonly identifier_hash: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly integer_value: (value_input: number) => number;
  readonly intern_string: (
    state: number,
    hash: number,
    length: number,
  ) => number;
  readonly intern_string_bytes: (
    state: number,
    sourcePointer: number,
    sourceLength: number,
  ) => number;
  readonly io_read_result: (allowed: number, result: number) => number;
  readonly io_read_status: (allowed: number) => number;
  readonly io_write_result: (allowed: number, result: number) => number;
  readonly io_write_status: (allowed: number) => number;
  readonly is_bitand_operator: (kind: number) => number;
  readonly is_bitor_operator: (kind: number) => number;
  readonly is_bitxor_operator: (kind: number) => number;
  readonly is_break: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_comparison_operator: (kind: number) => number;
  readonly is_concat_operator: (kind: number) => number;
  readonly is_digit: (value: number) => number;
  readonly is_do: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_else: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_elseif: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_end: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_expression_operator: (kind: number) => number;
  readonly is_extended_expression_operator: (kind: number) => number;
  readonly is_false: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_for: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_function: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_global: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_goto: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_identifier_continue: (value: number) => number;
  readonly is_identifier_start: (value: number) => number;
  readonly is_if: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_in: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_line_comment: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_local: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_long_comment: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_nil: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_repeat: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_return: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_shift_operator: (kind: number) => number;
  readonly is_space: (value: number) => number;
  readonly is_term_operator: (kind: number) => number;
  readonly is_then: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_true: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_until: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_while: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly is_word: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
    first: number,
    second: number,
    third: number,
    fourth: number,
    length: number,
  ) => number;
  readonly is_yield: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lex_token_count: (
    sourcePointer: number,
    sourceLength: number,
  ) => number;
  readonly lexer_count: (sourcePointer: number, sourceLength: number) => number;
  readonly lexer_float: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_integer: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_long_string_content_length: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_long_string_content_start: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_skip: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_string_content_length: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_string_content_start: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_string_token_kind: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
    quote: number,
  ) => number;
  readonly lexer_token_end: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly lexer_token_kind: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly library_base_getmetatable: (value_input: number) => number;
  readonly library_base_ipairs_next: (
    value_input: number,
    index: number,
  ) => number;
  readonly library_base_next_key: (
    value_input: number,
    cursor: number,
  ) => number;
  readonly library_base_next_value: (
    value_input: number,
    cursor: number,
  ) => number;
  readonly library_base_pcall_result_count: (prototype: number) => number;
  readonly library_base_pcall_result_value: (
    prototype: number,
    index: number,
  ) => number;
  readonly library_base_pcall_status: (
    state: number,
    prototype: number,
  ) => number;
  readonly library_base_setmetatable: (
    value_input: number,
    metatable: number,
  ) => number;
  readonly library_base_to_boolean: (value_input: number) => number;
  readonly library_base_to_float: (
    state: number,
    value_input: number,
  ) => number;
  readonly library_base_to_integer: (value_input: number) => number;
  readonly library_base_truthy: (value_input: number) => number;
  readonly library_coroutine_can_resume: (status: number) => number;
  readonly library_coroutine_close_result: (state: number) => number;
  readonly library_coroutine_close_status: (status: number) => number;
  readonly library_coroutine_resume_result: (
    state: number,
    prototype: number,
  ) => number;
  readonly library_coroutine_resume_status: (status: number) => number;
  readonly library_coroutine_status: (status: number) => number;
  readonly library_debug_trace_allowed: (enabled: number) => number;
  readonly library_debug_trace_enabled: (mask: number, flag: number) => number;
  readonly library_debug_trace_mask: (mask: number) => number;
  readonly library_init: (heap: number) => number;
  readonly library_init_marker: () => number;
  readonly library_math_abs: (input: number) => number;
  readonly library_math_abs_value: (
    state: number,
    value_input: number,
  ) => number;
  readonly library_math_max: (left: number, right: number) => number;
  readonly library_math_max_value: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_math_min: (left: number, right: number) => number;
  readonly library_math_min_value: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_package_can_load: (status: number) => number;
  readonly library_package_default_path: () => number;
  readonly library_package_default_path_value: () => number;
  readonly library_package_load_status: (status: number) => number;
  readonly library_raw_get: (value_input: number, key: number) => number;
  readonly library_raw_length: (value_input: number) => number;
  readonly library_raw_set: (
    value_input: number,
    key: number,
    output: number,
  ) => number;
  readonly library_string_byte: (value_input: number, index: number) => number;
  readonly library_string_byte_at: (
    value_input: number,
    index: number,
  ) => number;
  readonly library_string_byte_at_impl: (
    input: number,
    index: number,
  ) => number;
  readonly library_string_byte_impl: (input: number, index: number) => number;
  readonly library_string_concat: (
    state: number,
    left: number,
    right: number,
  ) => number;
  readonly library_string_concat_impl: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly library_string_equal: (left: number, right: number) => number;
  readonly library_string_equal_impl: (left: number, right: number) => number;
  readonly library_string_gsub_impl: (
    heap: number,
    input: number,
    pattern_input: number,
    replacement_input: number,
    count_record: number,
  ) => number;
  readonly library_string_length: (value_input: number) => number;
  readonly library_string_length_impl: (input: number) => number;
  readonly library_string_lower: (state: number, value_input: number) => number;
  readonly library_string_lower_impl: (heap: number, input: number) => number;
  readonly library_string_rep_impl: (
    heap: number,
    input: number,
    count_value: number,
    sep_value: number,
  ) => number;
  readonly library_string_reverse: (
    state: number,
    value_input: number,
  ) => number;
  readonly library_string_reverse_impl: (heap: number, input: number) => number;
  readonly library_string_sub: (
    state: number,
    value_input: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_string_sub_impl: (
    heap: number,
    input: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_string_upper: (state: number, value_input: number) => number;
  readonly library_string_upper_impl: (heap: number, input: number) => number;
  readonly library_table_concat: (
    state: number,
    value_input: number,
    separator: number,
    start: number,
    finish: number,
  ) => number;
  readonly library_table_insert: (
    value_input: number,
    position: number,
    output: number,
  ) => number;
  readonly library_table_length: (value_input: number) => number;
  readonly library_table_remove: (
    value_input: number,
    position: number,
  ) => number;
  readonly library_type: (state: number, value_input: number) => number;
  readonly library_utf8_byte: (value_input: number, index: number) => number;
  readonly library_utf8_codepoint: (
    value_input: number,
    index: number,
  ) => number;
  readonly library_utf8_is_valid: (value_input: number) => number;
  readonly library_utf8_length: (value_input: number) => number;
  readonly load: (
    state: number,
    sourcePointer: number,
    sourceLength: number,
  ) => number;
  readonly loaded_chunk_error: (prototype: number) => number;
  readonly loaded_chunk_format: (prototype: number) => number;
  readonly loaded_chunk_source_length: (prototype: number) => number;
  readonly lua_string_concat: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly lua_string_length: (string: number) => number;
  readonly math_abs_number: (heap: number, input: number) => number;
  readonly math_abs_value: (input: number) => number;
  readonly math_max_number: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly math_max_value: (left: number, right: number) => number;
  readonly math_min_number: (
    heap: number,
    left: number,
    right: number,
  ) => number;
  readonly math_min_value: (left: number, right: number) => number;
  readonly new_closure: (
    state: number,
    function_id: number,
    upvalue: number,
  ) => number;
  readonly new_empty_table: (state: number) => number;
  readonly new_frame: (
    state: number,
    previous: number,
    prototype: number,
    return_pc: number,
  ) => number;
  readonly new_table: (
    state: number,
    key: number,
    value_input: number,
  ) => number;
  readonly new_thread: (state: number, status: number, stack: number) => number;
  readonly new_upvalue: (state: number, value_input: number) => number;
  readonly next_string: (handle: number) => number;
  readonly nil_value: () => number;
  readonly node: (kind: number, left: number, right: number) => number;
  readonly node_extra: (
    kind: number,
    first: number,
    second: number,
    third: number,
  ) => number;
  readonly node_full: (
    kind: number,
    first: number,
    second: number,
    third: number,
    fourth: number,
  ) => number;
  readonly object_count: (state: number) => number;
  readonly os_command_result: (allowed: number, result: number) => number;
  readonly os_command_status: (allowed: number) => number;
  readonly owns_handle: (state: number, handle: number) => number;
  readonly package_can_load: (status: number) => number;
  readonly package_default_path: () => number;
  readonly package_default_path_value: () => number;
  readonly package_load_status: (status: number) => number;
  readonly parameter_count: (parameters: number) => number;
  readonly parameters_are_vararg: (parameters: number) => number;
  readonly parse_arithmetic: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_bitand: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_bitor: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_bitxor: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_block: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_chunk: (sourcePointer: number, sourceLength: number) => number;
  readonly parse_concat: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_expression: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_expression_list: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_factor: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_function_expression: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_index_suffix: (
    sourcePointer: number,
    sourceLength: number,
    base: number,
    position: number,
  ) => number;
  readonly parse_parameters: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_shift: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_statement: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly parse_table_entries: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
    next_index: number,
  ) => number;
  readonly parse_term: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly push_frame: (thread_handle: number, frame: number) => number;
  readonly random_bytes_result: (allowed: number, result: number) => number;
  readonly random_bytes_status: (allowed: number) => number;
  readonly result: (position: number, node: number, status: number) => number;
  readonly result_count: (prototype: number) => number;
  readonly result_value: (prototype: number, index: number) => number;
  readonly resume: (state: number, prototype: number) => number;
  readonly root_value: (state: number, index: number) => number;
  readonly set_allocation_limit: (state: number, limit: number) => void;
  readonly set_root: (
    state: number,
    index: number,
    value_input: number,
  ) => number;
  readonly set_table_value: (
    handle: number,
    key: number,
    value_input: number,
  ) => void;
  readonly set_thread_yield: (
    thread_handle: number,
    value_input: number,
  ) => void;
  readonly set_upvalue: (handle: number, value_input: number) => number;
  readonly skip_line_comment: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly skip_long_comment: (
    sourcePointer: number,
    sourceLength: number,
    position: number,
  ) => number;
  readonly state_is_valid: (state: number) => number;
  readonly state_status: (state: number) => number;
  readonly status_division_by_zero: () => number;
  readonly status_for_chunk_error: (error: number) => number;
  readonly status_malformed_chunk: () => number;
  readonly status_ok: () => number;
  readonly status_runtime_error: () => number;
  readonly status_syntax_error: () => number;
  readonly status_yield: () => number;
  readonly string_byte: (string: number, index: number) => number;
  readonly string_byte_value: (handle: number, index: number) => number;
  readonly string_equal: (left: number, right: number) => number;
  readonly string_find: (heap: number, hash: number, length: number) => number;
  readonly string_hash: (string: number) => number;
  readonly string_intern: (
    heap: number,
    hash: number,
    length: number,
  ) => number;
  readonly string_intern_bytes: (
    heap: number,
    sourcePointer: number,
    sourceLength: number,
  ) => number;
  readonly string_intern_record: (heap: number, record: number) => number;
  readonly string_next: (string: number) => number;
  readonly string_size: (handle: number) => number;
  readonly strings_equal: (left: number, right: number) => number;
  readonly table_concat: (
    heap: number,
    input: number,
    separator: number,
    start: number,
    finish: number,
  ) => number;
  readonly table_get: (table: number, key: number) => number;
  readonly table_get_raw: (table: number, key: number) => number;
  readonly table_hash_count: (table: number) => number;
  readonly table_insert: (
    input: number,
    position: number,
    item: number,
  ) => number;
  readonly table_length: (table: number) => number;
  readonly table_metatable: (table: number) => number;
  readonly table_new: (heap: number, key: number, value: number) => number;
  readonly table_new_empty: (heap: number) => number;
  readonly table_next: (table: number, cursor: number) => number;
  readonly table_next_entry: (handle: number, cursor: number) => number;
  readonly table_next_from_key: (table: number, key: number) => number;
  readonly table_next_key: (table: number, cursor: number) => number;
  readonly table_next_key_value: (handle: number, cursor: number) => number;
  readonly table_next_value: (table: number, cursor: number) => number;
  readonly table_next_value_value: (handle: number, cursor: number) => number;
  readonly table_raw_get: (input: number, key: number) => number;
  readonly table_raw_length: (input: number) => number;
  readonly table_raw_set: (
    input: number,
    key: number,
    output: number,
  ) => number;
  readonly table_remove: (input: number, position: number) => number;
  readonly table_set: (table: number, key: number, value: number) => void;
  readonly table_set_metatable: (table: number, metatable: number) => number;
  readonly table_set_raw: (table: number, key: number, value: number) => void;
  readonly table_size: (handle: number) => number;
  readonly table_value: (handle: number, key: number) => number;
  readonly thread_frame: (thread: number) => number;
  readonly thread_new: (heap: number, status: number, stack: number) => number;
  readonly thread_push_frame: (thread: number, frame: number) => number;
  readonly thread_result_count: (thread: number) => number;
  readonly thread_set_result_count: (thread: number, count: number) => void;
  readonly thread_set_status: (thread: number, status: number) => void;
  readonly thread_set_yield: (thread: number, value: number) => void;
  readonly thread_status: (thread: number) => number;
  readonly thread_value: (handle: number) => number;
  readonly thread_yield_result: (thread_handle: number) => number;
  readonly thread_yield_value: (thread: number) => number;
  readonly tracked_objects: (heap: number) => number;
  readonly upvalue_get: (upvalue: number) => number;
  readonly upvalue_new: (heap: number, value: number) => number;
  readonly upvalue_set: (upvalue: number, value: number) => number;
  readonly upvalue_value: (handle: number) => number;
  readonly utf8_byte_value: (input: number, index: number) => number;
  readonly utf8_codepoint_value: (input: number, index: number) => number;
  readonly utf8_is_valid_value: (input: number) => number;
  readonly utf8_length_value: (input: number) => number;
  readonly value_boolean: (value: number) => number;
  readonly value_float: (handle: number) => number;
  readonly value_float_new: (heap: number, number: number) => number;
  readonly value_float_number: (value: number) => number;
  readonly value_float_of: (handle: number) => number;
  readonly value_function: (handle: number) => number;
  readonly value_function_of: (handle: number) => number;
  readonly value_integer: (value: number) => number;
  readonly value_is_collectable: (value: number) => number;
  readonly value_is_valid: (value: number) => number;
  readonly value_is_valid_of: (value_input: number) => number;
  readonly value_kind: (value: number) => number;
  readonly value_kind_of: (value_input: number) => number;
  readonly value_nil: () => number;
  readonly value_payload: (value: number) => number;
  readonly value_payload_of: (value_input: number) => number;
  readonly value_string: (handle: number) => number;
  readonly value_string_of: (handle: number) => number;
  readonly value_table: (handle: number) => number;
  readonly value_table_of: (handle: number) => number;
  readonly value_thread: (handle: number) => number;
  readonly value_thread_of: (handle: number) => number;
  readonly value_userdata: (handle: number) => number;
  readonly vm_adjust_results: (
    prototype: number,
    stack: number,
    depth: number,
    expected_count: number,
    actual_count: number,
  ) => number;
  readonly vm_binary_opcode: (
    prototype: number,
    opcode: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_bind_parameters: (
    stack: number,
    argument_base: number,
    local_base: number,
    parameters: number,
    count: number,
  ) => number;
  readonly vm_bit_and: (left: number, right: number) => number;
  readonly vm_bit_not: (value: number) => number;
  readonly vm_bit_or: (left: number, right: number) => number;
  readonly vm_bit_xor: (left: number, right: number) => number;
  readonly vm_bitwise_opcode: (
    prototype: number,
    opcode: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_clear_locals: (local_base: number) => void;
  readonly vm_const_error: () => number;
  readonly vm_declare_local: (
    local_base: number,
    declaration: number,
    value: number,
  ) => number;
  readonly vm_division_error: () => number;
  readonly vm_find_function: (head: number, name: number) => number;
  readonly vm_is_binary: (opcode: number) => number;
  readonly vm_is_bitwise_opcode: (opcode: number) => number;
  readonly vm_is_running: (pc: number, count: number, status: number) => number;
  readonly vm_is_string_opcode: (opcode: number) => number;
  readonly vm_is_table_opcode: (opcode: number) => number;
  readonly vm_is_yielded: (prototype: number) => number;
  readonly vm_load_captured: (local_base: number, name: number) => number;
  readonly vm_load_local: (local_base: number, name: number) => number;
  readonly vm_load_local_or_global: (
    heap: number,
    local_base: number,
    name: number,
  ) => number;
  readonly vm_load_local_or_global_with_upvalue: (
    heap: number,
    local_base: number,
    upvalue: number,
    name: number,
  ) => number;
  readonly vm_malformed_chunk: () => number;
  readonly vm_negate: (value: number) => number;
  readonly vm_push_varargs: (
    prototype: number,
    stack: number,
    depth: number,
    local_base: number,
  ) => number;
  readonly vm_remainder: (left: number, right: number) => number;
  readonly vm_shift_left: (value: number, amount: number) => number;
  readonly vm_shift_right: (value: number, amount: number) => number;
  readonly vm_stack_address: (stack: number, index: number) => number;
  readonly vm_stack_error: () => number;
  readonly vm_store_local: (
    local_base: number,
    name: number,
    value: number,
  ) => number;
  readonly vm_store_local_or_global: (
    heap: number,
    local_base: number,
    name: number,
    value: number,
  ) => number;
  readonly vm_store_local_or_global_with_upvalue: (
    heap: number,
    local_base: number,
    upvalue: number,
    name: number,
    value: number,
  ) => number;
  readonly vm_store_varargs: (
    stack: number,
    argument_base: number,
    count: number,
    local_base: number,
  ) => void;
  readonly vm_string_opcode: (
    prototype: number,
    opcode: number,
    operand: number,
    heap: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_table_opcode: (
    prototype: number,
    opcode: number,
    heap: number,
    stack: number,
    depth: number,
  ) => number;
  readonly vm_true: () => number;
  readonly vm_yield_status: () => number;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
}

export type ForgeWebScriptRawImports = WebAssembly.Imports;

export interface ForgeWebScriptDynamicModuleExports {
  // This module has no dynamic source-module links.
}

export interface ForgeWebScriptDynamicModuleLoaders {
  // This module has no dynamic source-module links.
}

export interface ForgeWebScriptImports {
  readonly "lua.io.write": {
    readonly io_write: (message: number) => void;
  };
  readonly "lua.package.load": {
    readonly package_load: (path: number) => ForgeWebScriptBytes;
  };
  readonly "lua.core.source": {
    readonly string_to_bytes: (string: number) => ForgeWebScriptBytes;
  };
}

export interface ForgeWebScriptDynamicLinkMetadata {
  readonly artifactId: string;
  readonly manifestHash: string;
  readonly modules: readonly {
    readonly moduleId: string;
    readonly alias: string;
    readonly exports: readonly ForgeWebScriptManifestFunction[];
  }[];
}

export const manifest: ForgeWebScriptManifest;
export const abiManifest: ForgeWebScriptManifest;
export const dynamicLinkMetadata: ForgeWebScriptDynamicLinkMetadata | undefined;
export function resolveDynamicExport(
  alias: string,
  exportName: string,
  imports?: ForgeWebScriptImports,
): Promise<(...args: readonly number[]) => unknown>;
export function resolveDynamicExportSync(
  alias: string,
  exportName: string,
  imports?: ForgeWebScriptImports,
): (...args: readonly number[]) => unknown;
export function clearDynamicLinkCache(): void;
export function load(
  imports?: ForgeWebScriptImports,
): Promise<ForgeWebScriptExports>;
export function loadSync(
  imports?: ForgeWebScriptImports,
): ForgeWebScriptExports;
declare const library: typeof loadSync;
export default library;
export function loadRaw(
  imports?: ForgeWebScriptRawImports,
): Promise<ForgeWebScriptRawExports>;
export function loadRawSync(
  imports?: ForgeWebScriptRawImports,
): ForgeWebScriptRawExports;
