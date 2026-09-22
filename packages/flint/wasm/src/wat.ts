/* eslint-disable unicorn/prefer-switch, unicorn/prefer-single-call */

import type {
  FlintWasmExpression,
  FlintWasmModule,
  FlintWasmPrimitiveType,
  FlintWasmStatement,
  FlintTargetFeatures,
} from './contracts.js';

/**
 * Maps a Flint primitive type to its WebAssembly value type representation.
 *
 * @param type - Primitive type to convert.
 * @returns WebAssembly value type identifier string.
 */
// skipcq: JS-R1005
function valueType(type: FlintWasmPrimitiveType): string {
  if (type === 'f32') return 'f32';
  if (type === 'f64') return 'f64';
  if (type === 'i64' || type === 'u64') return 'i64';
  if (type === 'v128') return 'v128';
  return 'i32';
}

/**
 * Returns WebAssembly result type names corresponding to a Flint primitive type.
 *
 * @param type - Primitive type to evaluate.
 * @returns Array of result type strings.
 */
function resultTypes(type: FlintWasmPrimitiveType): readonly string[] {
  return type === 'string' || type === 'bytes' ? ['i32', 'i32'] : type === 'unit' ? [] : [valueType(type)];
}

/**
 * Formats a primitive literal value into a WebAssembly text literal string.
 *
 * @param value - Literal value to format.
 * @returns WebAssembly literal string representation.
 */
function watNumber(value: boolean | number | string): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return '0';
  return Number.isFinite(value) ? String(value) : '0';
}

/**
 * Lowers an IR expression into WebAssembly text format (WAT) instructions.
 *
 * @param value - Expression node to render.
 * @param indent - Indentation string for formatting.
 * @returns Array of rendered instruction lines.
 */
// skipcq: JS-R1005
function renderExpression(value: FlintWasmExpression, indent: string): readonly string[] {
  if (value.kind === 'literal') {
    const types = resultTypes(value.type);
    if (types.length === 2)
      return [
        `${indent}i32.const 0`,
        `${indent}i32.const 0 ;; aggregate literal source ${value.span.line}:${value.span.column}`,
      ];
    return [
      `${indent}${types[0] ?? 'i32'}.const ${watNumber(value.value)} ;; source ${value.span.line}:${value.span.column}`,
    ];
  }
  if (value.kind === 'identifier') return [`${indent}local.get $${value.name}`];
  if (value.kind === 'call') {
    if (value.standardLibrary === 'memory-copy') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}memory.copy`];
    }
    if (value.standardLibrary === 'memory-fill') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}memory.fill`];
    }
    if (value.standardLibrary === 'simd-v128-load') {
      return [
        ...value.arguments.flatMap((argument) => renderExpression(argument, indent)),
        `${indent}v128.load align=4 offset=0`,
      ];
    }
    if (value.standardLibrary === 'simd-v128-store') {
      return [
        ...value.arguments.flatMap((argument) => renderExpression(argument, indent)),
        `${indent}v128.store align=4 offset=0`,
      ];
    }
    if (value.standardLibrary === 'simd-i8x16-splat') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}i8x16.splat`];
    }
    if (value.standardLibrary === 'simd-i8x16-eq') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}i8x16.eq`];
    }
    if (value.standardLibrary === 'simd-i8x16-lt-u') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}i8x16.lt_u`];
    }
    if (value.standardLibrary === 'simd-i8x16-bitmask') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}i8x16.bitmask`];
    }
    if (value.standardLibrary === 'simd-i32x4-splat') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}i32x4.splat`];
    }
    if (value.standardLibrary === 'simd-i32x4-add') {
      return [...value.arguments.flatMap((argument) => renderExpression(argument, indent)), `${indent}i32x4.add`];
    }
    return [
      ...value.arguments.flatMap((argument) => renderExpression(argument, indent)),
      `${indent}call $${value.standardLibrary === undefined ? value.callee : `fws_${value.standardLibrary}`}`,
    ];
  }
  if (value.kind === 'atomic') {
    const lines = [...renderExpression(value.address, indent)];
    if (value.operation === 'load') lines.push(`${indent}i32.atomic.load align=4 offset=0`);
    else {
      if (value.value !== undefined) lines.push(...renderExpression(value.value, indent));
      if (value.operation === 'store') lines.push(`${indent}i32.atomic.store align=4 offset=0`);
      else if (value.operation === 'add') lines.push(`${indent}i32.atomic.rmw.add align=4 offset=0`);
      else {
        if (value.replacement !== undefined) lines.push(...renderExpression(value.replacement, indent));
        lines.push(`${indent}i32.atomic.rmw.cmpxchg align=4 offset=0`);
      }
    }
    return lines;
  }
  if (value.kind === 'unary') {
    const lines = [...renderExpression(value.operand, indent)];
    if (value.operator === '!') lines.push(`${indent}i32.eqz`);
    else lines.push(`${indent}i32.const -1`, `${indent}i32.mul`);
    return lines;
  }
  if (value.kind === 'array-literal' || value.kind === 'vector-literal')
    return [
      `${indent}i32.const ${value.kind === 'array-literal' ? value.elements.length : 0}`,
      `${indent}call $fws_${value.kind === 'array-literal' ? 'array' : 'vector'}-new ;; collection handle`,
    ];
  if (value.kind === 'index') {
    const isArray = value.receiver.kind === 'array-literal';
    return [
      ...renderExpression(value.receiver, indent),
      ...renderExpression(value.index, indent),
      `${indent}call $fws_${isArray ? 'array' : 'vector'}-get`,
    ];
  }
  if (value.kind !== 'binary') return [];
  if (value.operator === '&&' || value.operator === '||') {
    const lines = [...renderExpression(value.left, indent), `${indent}if (result i32)`];
    if (value.operator === '&&') {
      lines.push(...renderExpression(value.right, `${indent}  `), `${indent}else`, `${indent}  i32.const 0`);
    } else {
      lines.push(`${indent}  i32.const 1`, `${indent}else`, ...renderExpression(value.right, `${indent}  `));
    }
    lines.push(`${indent}end`);
    return lines;
  }
  const lines = [...renderExpression(value.left, indent), ...renderExpression(value.right, indent)];
  const op =
    {
      '+': 'add',
      '-': 'sub',
      '*': 'mul',
      '/': 'div_s',
      '%': 'rem_s',
      '<': 'lt_s',
      '<=': 'le_s',
      '==': 'eq',
      '!=': 'ne',
      '>': 'gt_s',
      '>=': 'ge_s',
    }[value.operator] ?? 'add';
  lines.push(`${indent}i32.${op}`);
  return lines;
}

/**
 * Collects local variable declarations required by statements within a function body.
 *
 * @param statements - Sequence of statements to scan for local bindings.
 * @param names - Mutable set tracking encountered local variables.
 * @returns Array of formatted WebAssembly local variable declaration lines.
 */
// skipcq: JS-R1005
function localDeclarations(statements: readonly FlintWasmStatement[], names = new Set<string>()): readonly string[] {
  for (const statement of statements) {
    if (statement.kind === 'let') names.add(`${statement.name}:${valueType(statement.type.name)}`);
    else if (statement.kind === 'assignment') continue;
    else if (statement.kind === 'if') {
      localDeclarations(statement.consequent, names);
      if (statement.alternate !== undefined) localDeclarations(statement.alternate, names);
    } else if (statement.kind === 'switch') {
      names.add(`__switch_${statement.span.start}:i32`);
      for (const arm of statement.cases) localDeclarations(arm.body, names);
      if (statement.defaultCase !== undefined) localDeclarations(statement.defaultCase, names);
    } else if (statement.kind === 'while') {
      localDeclarations(statement.body, names);
    } else if (statement.kind === 'for') {
      if (statement.initializer !== undefined) localDeclarations([statement.initializer], names);
      if (statement.update !== undefined) localDeclarations([statement.update], names);
      localDeclarations(statement.body, names);
    } else if (statement.kind === 'do-while') {
      localDeclarations(statement.body, names);
    }
  }
  return [...names].toSorted().map((name) => {
    const [localName, type] = name.split(':');
    return `(local $${localName} ${type})`;
  });
}

/**
 * Lowers a sequence of IR statements into WebAssembly text format (WAT) instruction lines.
 *
 * @param items - Statements to render.
 * @param indent - Indentation string.
 * @returns Array of rendered WebAssembly instruction lines.
 */
// skipcq: JS-R1005
function statements(items: readonly FlintWasmStatement[], indent: string): readonly string[] {
  const lines: string[] = [];
  for (const statement of items) {
    if (statement.kind === 'let') {
      lines.push(...renderExpression(statement.value, indent), `${indent}local.set $${statement.name}`);
    } else if (statement.kind === 'assignment') {
      lines.push(...renderExpression(statement.value, indent), `${indent}local.set $${statement.name}`);
    } else if (statement.kind === 'return') {
      if (statement.value !== undefined) lines.push(...renderExpression(statement.value, indent));
      lines.push(`${indent}return`);
    } else if (statement.kind === 'expression-statement') {
      lines.push(...renderExpression(statement.expression, indent));
      for (const _ of resultTypes('unit')) lines.push(`${indent}drop`);
    } else if (statement.kind === 'if') {
      lines.push(...renderExpression(statement.condition, indent), `${indent}if`);
      lines.push(...statements(statement.consequent, `${indent}  `));
      if (statement.alternate !== undefined)
        lines.push(`${indent}else`, ...statements(statement.alternate, `${indent}  `));
      lines.push(`${indent}end`);
    } else if (statement.kind === 'switch') {
      lines.push(`${indent};; switch ${statement.span.line}:${statement.span.column}`);
      const values = statement.cases.map((arm) => (typeof arm.value === 'number' ? arm.value : 0));
      const minimum = values.length === 0 ? 0 : Math.min(...values);
      const maximum = values.length === 0 ? 0 : Math.max(...values);
      const tableLength = maximum - minimum + 1;
      const useBrTable =
        statement.strategy === 'br-table' ||
        (statement.strategy === undefined &&
          values.length > 0 &&
          tableLength <= 65_536 &&
          tableLength <= values.length * 4);
      lines.push(...renderExpression(statement.value, indent), `${indent}local.set $__switch_${statement.span.start}`);
      lines.push(`${indent}block ;; switch-exit`);
      if (values.length > 0) {
        if (useBrTable) {
          lines.push(
            `${indent}  block ;; switch-default`,
            `${indent}    local.get $__switch_${statement.span.start}`,
            `${indent}    i32.const ${minimum}`,
            `${indent}    i32.lt_s`,
            `${indent}    if`,
            `${indent}      br 1 ;; exit switch (out-of-range)`,
            `${indent}    end`,
            `${indent}    local.get $__switch_${statement.span.start}`,
            `${indent}    i32.const ${maximum}`,
            `${indent}    i32.gt_s`,
            `${indent}    if`,
            `${indent}      br 1 ;; exit switch (out-of-range)`,
            `${indent}    end`,
          );
          for (const value of values) lines.push(`${indent}    block ;; case ${value}`);
          lines.push(
            `${indent}    local.get $__switch_${statement.span.start}`,
            `${indent}    i32.const ${minimum}`,
            `${indent}    i32.sub`,
            `${indent}    br_table ${Array.from({ length: tableLength }, (_, offset) => {
              const caseIndex = values.indexOf(minimum + offset);
              return caseIndex === -1 ? values.length : values.length - 1 - caseIndex;
            }).join(' ')} ${values.length}`,
          );
          for (let index = values.length - 1; index >= 0; index -= 1) {
            const currentCase = statement.cases[index];
            lines.push(
              `${indent}    end`,
              ...(currentCase === undefined ? [] : statements(currentCase.body, `${indent}    `)),
              `${indent}    br ${index + 1}`,
            );
          }
          lines.push(`${indent}  end`);
        } else {
          for (const [index, value] of values.entries()) {
            const currentCase = statement.cases[index];
            lines.push(
              `${indent}  local.get $__switch_${statement.span.start}`,
              `${indent}  i32.const ${value}`,
              `${indent}  i32.eq`,
              `${indent}  if`,
              ...(currentCase === undefined ? [] : statements(currentCase.body, `${indent}    `)),
              `${indent}    br 1 ;; exit switch`,
              `${indent}  end`,
            );
          }
        }
      }
      if (values.length === 0) {
        lines.push(`${indent}  block ;; switch-default`);
        if (statement.defaultCase !== undefined) lines.push(...statements(statement.defaultCase, `${indent}    `));
        lines.push(`${indent}  end`);
      } else if (statement.defaultCase !== undefined) lines.push(...statements(statement.defaultCase, `${indent}  `));
      lines.push(`${indent}end`);
    } else if (statement.kind === 'while') {
      lines.push(`${indent}block`, `${indent}  loop`);
      lines.push(
        ...renderExpression(statement.condition, `${indent}    `),
        `${indent}    i32.eqz`,
        `${indent}    br_if 1`,
      );
      lines.push(...statements(statement.body, `${indent}    `), `${indent}    br 0`, `${indent}  end`, `${indent}end`);
    } else if (statement.kind === 'for') {
      if (statement.initializer !== undefined) lines.push(...statements([statement.initializer], indent));
      lines.push(`${indent}block`, `${indent}  loop`);
      lines.push(
        ...renderExpression(statement.condition, `${indent}    `),
        `${indent}    i32.eqz`,
        `${indent}    br_if 1`,
      );
      lines.push(...statements(statement.body, `${indent}    `));
      if (statement.update !== undefined) lines.push(...statements([statement.update], `${indent}    `));
      lines.push(`${indent}    br 0`, `${indent}  end`, `${indent}end`);
    } else if (statement.kind === 'do-while') {
      lines.push(`${indent}block`, `${indent}  loop`);
      lines.push(...statements(statement.body, `${indent}    `));
      lines.push(
        ...renderExpression(statement.condition, `${indent}    `),
        `${indent}    i32.eqz`,
        `${indent}    br_if 1`,
        `${indent}    br 0`,
        `${indent}  end`,
        `${indent}end`,
      );
    } else if (statement.kind === 'yield') {
      lines.push(...renderExpression(statement.value, indent), `${indent}i64.extend_i32_u`, `${indent}return ;; yield`);
    } else if (statement.kind === 'iterator-loop') {
      lines.push(`${indent};; iterator-loop ${statement.binding}`, `${indent}i64.const 4294967296`, `${indent}return`);
    }
  }
  return lines;
}

/**
 * Metadata emitted into WebAssembly text format (WAT) comments and headers.
 */
export interface FlintWasmWatMetadata {
  readonly compilerVersion?: string;
  readonly optimization?: 'debug' | 'release';
  readonly graphHash?: string;
  readonly sourceFiles?: readonly string[];
  readonly targetFeatures?: FlintTargetFeatures;
  readonly sonSchemaVersion?: string;
  readonly sonGraphHash?: string;
  readonly boundsChecks?: 'runtime' | 'proven-safe' | 'excluded-by-profile';
  readonly wasmOptimizationPasses?: readonly string[];
}

/** Emits import and export memory declarations when external memory is configured. */
function renderImportedMemory(importMemory: NonNullable<FlintTargetFeatures['importMemory']>): string {
  const isCustom = typeof importMemory === 'object' && importMemory !== null;
  const importModule = isCustom ? importMemory.module : 'env';
  const name = isCustom ? importMemory.name : 'memory';
  return `  (import "${importModule}" "${name}" (memory 1))\n  (export "memory" (memory 0))`;
}

/** Emits local linear memory definition for module-managed memory. */
function renderLocalMemory(targetFeatures: FlintTargetFeatures | undefined): string {
  const isMemory64 = targetFeatures?.memory64 === true;
  const isShared = targetFeatures?.threads === true;
  const memType = isMemory64 ? 'i64 1' : '1';
  const sharedSuffix = isShared ? ' 1 shared' : '';
  return `  (memory (export "memory") ${memType}${sharedSuffix})`;
}

/**
 * Emits the WebAssembly linear memory declaration based on configured target features.
 *
 * @param targetFeatures - Target WebAssembly proposal features.
 * @returns Formatted memory declaration line.
 */
// skipcq: JS-R1005
function renderMemory(targetFeatures: FlintTargetFeatures | undefined): string {
  const importMemory = targetFeatures?.importMemory;
  if (importMemory !== undefined && importMemory !== false) {
    return renderImportedMemory(importMemory);
  }
  return renderLocalMemory(targetFeatures);
}

const STATIC_WAT_TYPES: Readonly<Record<string, string>> = {
  f32: 'f32',
  c_float: 'f32',
  f64: 'f64',
  c_double: 'f64',
  i64: 'i64',
  u64: 'i64',
  c_longlong: 'i64',
  c_ulonglong: 'i64',
};

const POINTER_LIKE_PRIMITIVE_TYPES = new Set(['c_long', 'c_ulong', 'c_size', 'c_ssize']);

/** Resolves the type representation string from a type name or reference for WAT output. */
function resolveWatTypeString(
  type: string | { readonly name?: string; readonly reference?: string } | undefined,
): string {
  if (typeof type === 'string') return type;
  if (!type) return 'i32';
  return type.reference ?? type.name ?? 'i32';
}

/** Checks whether a type behaves as a pointer or pointer-like scalar in WAT. */
function isPointerLikeWatType(typeString: string): boolean {
  return (
    typeString === 'COpaquePtr' ||
    typeString.startsWith('CPtr') ||
    typeString.startsWith('MutCPtr') ||
    POINTER_LIKE_PRIMITIVE_TYPES.has(typeString)
  );
}

/** Maps a Flint or C type representation string to WebAssembly WAT value type. */
// skipcq: JS-R1005
export function toWatType(
  type: string | { readonly name?: string; readonly reference?: string } | undefined,
  memory64 = false,
): string {
  const typeString = resolveWatTypeString(type);
  if (isPointerLikeWatType(typeString)) {
    return memory64 ? 'i64' : 'i32';
  }
  return STATIC_WAT_TYPES[typeString] ?? 'i32';
}

/**
 * Lowers a complete Flint WebAssembly module intermediate representation into textual WAT format.
 *
 * @param module - Compiled module intermediate representation.
 * @param metadata - Compilation metadata and target feature configuration.
 * @returns WebAssembly text representation string.
 */
// skipcq: JS-R1005
export function renderFlintWasmWat(module: FlintWasmModule, metadata: FlintWasmWatMetadata = {}): string {
  const isMemory64 = metadata.targetFeatures?.memory64 === true;
  const lines = [
    '(module',
    `  ;; forge-web-script module: ${module.name}`,
    ...(metadata.compilerVersion === undefined ? [] : [`  ;; compiler: ${metadata.compilerVersion}`]),
    ...(metadata.optimization === undefined ? [] : [`  ;; optimization: ${metadata.optimization}`]),
    ...(metadata.graphHash === undefined ? [] : [`  ;; graph-hash: ${metadata.graphHash}`]),
    ...(metadata.sonSchemaVersion === undefined ? [] : [`  ;; son-schema: ${metadata.sonSchemaVersion}`]),
    ...(metadata.sonGraphHash === undefined ? [] : [`  ;; son-graph-hash: ${metadata.sonGraphHash}`]),
    ...(metadata.boundsChecks === undefined ? [] : [`  ;; bounds-checks: ${metadata.boundsChecks}`]),
    ...(metadata.wasmOptimizationPasses === undefined
      ? []
      : [`  ;; wasm-optimization-passes: ${metadata.wasmOptimizationPasses.join(',')}`]),
    ...(metadata.sourceFiles === undefined
      ? []
      : metadata.sourceFiles.toSorted().map((fileName) => `  ;; source: ${fileName}`)),
    ...(metadata.targetFeatures === undefined
      ? []
      : [`  ;; target-features: ${JSON.stringify(metadata.targetFeatures)}`]),
  ];
  for (const imported of module.imports) {
    const parameters = imported.parameters.flatMap(({ name, type }) =>
      resultTypes(type.name).map((result, index) => `(param $${name}${index === 0 ? '' : `_${index}`} ${result})`),
    );
    const results = resultTypes(imported.result.name).map((result) => `(result ${result})`);
    lines.push(
      `  (import ${JSON.stringify(imported.capability)} ${JSON.stringify(imported.alias)} (func $${imported.alias} ${[...parameters, ...results].join(' ')}))`,
    );
  }
  for (const foreignCap of module.foreignCapabilities ?? []) {
    for (const function_ of foreignCap.functions) {
      const symbol =
        (function_ as { readonly symbol?: string; readonly name?: string }).symbol ??
        (function_ as { readonly symbol?: string; readonly name?: string }).name ??
        '';
      const parameters = function_.parameters.map(
        ({ name, type }) => `(param $${name} ${toWatType(type as never, isMemory64)})`,
      );
      const resultTypeString =
        typeof function_.result === 'string'
          ? function_.result
          : ((function_.result as { readonly name?: string })?.name ?? 'unit');
      const results =
        resultTypeString === 'unit' || resultTypeString === 'c_void'
          ? []
          : [`(result ${toWatType(function_.result as never, isMemory64)})`];
      lines.push(
        `  (import ${JSON.stringify(foreignCap.library)} ${JSON.stringify(symbol)} (func $${symbol} ${[...parameters, ...results].join(' ')}))`,
      );
    }
  }
  lines.push(renderMemory(metadata.targetFeatures));
  for (const descriptor of module.iteratorDescriptors ?? [])
    lines.push(
      `  ;; iterator-export: ${descriptor.id} next=${descriptor.nextFunction} element=${descriptor.elementType} ownership=${descriptor.ownership}`,
    );
  for (const declaration of module.functions) {
    const parameters = declaration.parameters.flatMap(({ name, type }) =>
      resultTypes(type.name).map((result, index) => `(param $${name}${index === 0 ? '' : `_${index}`} ${result})`),
    );
    const results = resultTypes(declaration.result.name).map((result) => `(result ${result})`);
    lines.push(
      `  (func $${declaration.name} ${[...parameters, ...results, ...localDeclarations(declaration.body)].join(' ')}`,
    );
    lines.push(...statements(declaration.body, '    '));
    lines.push('  )');
    if (declaration.exported) lines.push(`  (export ${JSON.stringify(declaration.name)} (func $${declaration.name}))`);
  }
  lines.push(
    '  (func $fws_alloc (param $size i32) (result i32) i32.const 1024)',
    '  (export "fws_alloc" (func $fws_alloc))',
    '  (func $fws_dealloc (param $pointer i32) (param $size i32))',
    '  (export "fws_dealloc" (func $fws_dealloc))',
    '  (func $fws_realloc (param $pointer i32) (param $oldSize i32) (param $newSize i32) (result i32) local.get $pointer)',
    '  (export "fws_realloc" (func $fws_realloc))',
    '  (func $fws_reset)',
    '  (export "fws_reset" (func $fws_reset))',
    ')',
  );
  return `${lines.join('\n')}\n`;
}
