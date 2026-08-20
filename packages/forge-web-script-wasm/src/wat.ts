/* eslint-disable unicorn/prefer-switch, unicorn/prefer-single-call */

import type {
  ForgeWebScriptWasmExpression,
  ForgeWebScriptWasmModule,
  ForgeWebScriptWasmPrimitiveType,
  ForgeWebScriptWasmStatement,
  ForgeWebScriptTargetFeatures,
} from './contracts.js';

function valueType(type: ForgeWebScriptWasmPrimitiveType): string {
  if (type === 'f32') return 'f32';
  if (type === 'f64') return 'f64';
  if (type === 'i64' || type === 'u64') return 'i64';
  return 'i32';
}

function resultTypes(type: ForgeWebScriptWasmPrimitiveType): readonly string[] {
  return type === 'string' || type === 'bytes' ? ['i32', 'i32'] : type === 'unit' ? [] : [valueType(type)];
}

function watNumber(value: boolean | number | string): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return '0';
  return Number.isFinite(value) ? String(value) : '0';
}

function renderExpression(value: ForgeWebScriptWasmExpression, indent: string): readonly string[] {
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
  if (value.kind === 'call')
    return [
      ...value.arguments.flatMap((argument) => renderExpression(argument, indent)),
      `${indent}call $${value.standardLibrary === undefined ? value.callee : `fws_${value.standardLibrary}`}`,
    ];
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
    return [...renderExpression(value.receiver, indent), ...renderExpression(value.index, indent), `${indent}call $fws_${isArray ? 'array' : 'vector'}-get`];
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

function localDeclarations(
  statements: readonly ForgeWebScriptWasmStatement[],
  names = new Set<string>(),
): readonly string[] {
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

function statements(items: readonly ForgeWebScriptWasmStatement[], indent: string): readonly string[] {
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
      const useBrTable = values.length > 0 && tableLength <= 65_536 && tableLength <= values.length * 4;
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
          for (let index = 0; index < values.length; index += 1) lines.push(`${indent}    block ;; case ${values[index]}`);
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
            lines.push(`${indent}    end`, ...statements(statement.cases[index]!.body, `${indent}    `), `${indent}    br ${index + 1}`);
          }
          lines.push(`${indent}  end`);
        } else {
          for (const [index, value] of values.entries()) {
            lines.push(
              `${indent}  local.get $__switch_${statement.span.start}`,
              `${indent}  i32.const ${value}`,
              `${indent}  i32.eq`,
              `${indent}  if`,
              ...statements(statement.cases[index]!.body, `${indent}    `),
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
      lines.push(
        ...renderExpression(statement.value, indent),
        `${indent}i64.extend_i32_u`,
        `${indent}return ;; yield`,
      );
    } else if (statement.kind === 'iterator-loop') {
      lines.push(`${indent};; iterator-loop ${statement.binding}`, `${indent}i64.const 4294967296`, `${indent}return`);
    }
  }
  return lines;
}

export interface ForgeWebScriptWasmWatMetadata {
  readonly compilerVersion?: string;
  readonly optimization?: 'debug' | 'release';
  readonly graphHash?: string;
  readonly sourceFiles?: readonly string[];
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
}

function renderMemory(targetFeatures: ForgeWebScriptTargetFeatures | undefined): string {
  if (targetFeatures?.memory64 === true && targetFeatures.threads === true)
    return '  (memory (export "memory") i64 1 1 shared)';
  if (targetFeatures?.memory64 === true) return '  (memory (export "memory") i64 1)';
  if (targetFeatures?.threads === true) return '  (memory (export "memory") 1 1 shared)';
  return '  (memory (export "memory") 1)';
}

export function renderForgeWebScriptWasmWat(
  module: ForgeWebScriptWasmModule,
  metadata: ForgeWebScriptWasmWatMetadata = {},
): string {
  const lines = [
    '(module',
    `  ;; forge-web-script module: ${module.name}`,
    ...(metadata.compilerVersion === undefined ? [] : [`  ;; compiler: ${metadata.compilerVersion}`]),
    ...(metadata.optimization === undefined ? [] : [`  ;; optimization: ${metadata.optimization}`]),
    ...(metadata.graphHash === undefined ? [] : [`  ;; graph-hash: ${metadata.graphHash}`]),
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
