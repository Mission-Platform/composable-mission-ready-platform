import type {
  ForgeWebScriptExpression,
  ForgeWebScriptModule,
  ForgeWebScriptPrimitiveType,
  ForgeWebScriptStatement,
} from './ast.js';

export interface ForgeWebScriptWatMetadata {
  readonly compilerVersion?: string;
  readonly optimization?: 'debug' | 'release';
  readonly graphHash?: string;
  readonly sourceFiles?: readonly string[];
}

function valueType(type: ForgeWebScriptPrimitiveType): string {
  if (type === 'f32') return 'f32';
  if (type === 'f64') return 'f64';
  if (type === 'i64' || type === 'u64') return 'i64';
  return 'i32';
}

function resultTypes(type: ForgeWebScriptPrimitiveType): readonly string[] {
  return type === 'string' || type === 'bytes' ? ['i32', 'i32'] : type === 'unit' ? [] : [valueType(type)];
}

function watNumber(value: boolean | number | string): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return '0';
  return Number.isFinite(value) ? String(value) : '0';
}

function renderExpression(value: ForgeWebScriptExpression, indent: string): readonly string[] {
  if (value.kind === 'literal') {
    const type = resultTypes(value.type)[0] ?? 'i32';
    return [`${indent}${type}.const ${watNumber(value.value)} ;; source ${value.span.line}:${value.span.column}`];
  }
  if (value.kind === 'identifier') return [`${indent}local.get $${value.name}`];
  if (value.kind === 'call')
    return [
      ...value.arguments.flatMap((argument) => renderExpression(argument, indent)),
      `${indent}call $${value.callee}`,
    ];
  if (value.kind === 'unary') {
    const lines = [...renderExpression(value.operand, indent)];
    if (value.operator === '!') lines.push(`${indent}i32.eqz`);
    else lines.push(`${indent}i32.const -1`, `${indent}i32.mul ;; unary negation`);
    return lines;
  }
  if (value.kind === 'function-value') return [`${indent};; function value ${value.name}`];
  if (value.kind === 'struct-value')
    return Object.values(value.fields).flatMap((field) => renderExpression(field, indent));
  if (value.kind === 'enum-value') return value.arguments.flatMap((argument) => renderExpression(argument, indent));
  if (value.kind === 'match') {
    const arm = value.arms[0];
    return arm === undefined ? [] : renderExpression(arm.value, indent);
  }
  if (value.kind === 'array-literal' || value.kind === 'vector-literal')
    return value.elements.flatMap((element) => renderExpression(element, indent));
  if (value.kind === 'index')
    return [...renderExpression(value.receiver, indent), ...renderExpression(value.index, indent), `${indent}i32.add`];
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
      '&&': 'and',
      '||': 'or',
    }[value.operator] ?? 'add';
  lines.push(`${indent}i32.${op}`);
  return lines;
}

function localDeclarations(
  statementsToRender: readonly ForgeWebScriptStatement[],
  names = new Set<string>(),
): readonly string[] {
  for (const statement of statementsToRender) {
    switch (statement.kind) {
      case 'let': {
        names.add(`${statement.name}:${valueType(statement.type.name)}`);
        break;
      }
      case 'assignment': {
        continue;
        break;
      }
      case 'if': {
        localDeclarations(statement.consequent, names);
        if (statement.alternate !== undefined) localDeclarations(statement.alternate, names);

        break;
      }
      case 'switch': {
        for (const arm of statement.cases) localDeclarations(arm.body, names);
        if (statement.defaultCase !== undefined) localDeclarations(statement.defaultCase, names);
        break;
      }
      case 'while': {
        {
          localDeclarations(statement.body, names);
          // No default
        }
        break;
      }
      case 'for': {
        if (statement.initializer !== undefined) localDeclarations([statement.initializer], names);
        if (statement.update !== undefined) localDeclarations([statement.update], names);
        localDeclarations(statement.body, names);
        break;
      }
      case 'do-while': {
        localDeclarations(statement.body, names);
        break;
      }
      case 'iterator-loop': {
        names.add(`${statement.binding}:i32`);
        localDeclarations(statement.body, names);
        break;
      }
      case 'yield':
      case 'return':
      case 'expression-statement':
        break;
      case 'match-statement': {
        localDeclarations(
          [
            ...(statement.arms[0] === undefined
              ? []
              : [{ kind: 'expression-statement' as const, expression: statement.arms[0].value, span: statement.span }]),
          ],
          names,
        );
        break;
      }
      case 'switch': {
        for (const arm of statement.cases) localDeclarations(arm.body, names);
        if (statement.defaultCase !== undefined) localDeclarations(statement.defaultCase, names);
        break;
      }
    }
  }
  return [...names].toSorted().map((name) => {
    const [localName, type] = name.split(':');
    return `(local $${localName} ${type})`;
  });
}

function statements(statementsToRender: readonly ForgeWebScriptStatement[], indent: string): readonly string[] {
  const lines: string[] = [];
  for (const statement of statementsToRender) {
    switch (statement.kind) {
      case 'let': {
        lines.push(
          `${indent};; let ${statement.name}: ${statement.type.name}`,
          ...renderExpression(statement.value, indent),
          `${indent}local.set $${statement.name}`,
        );

        break;
      }
      case 'assignment': {
        lines.push(...renderExpression(statement.value, indent), `${indent}local.set $${statement.name}`);
        break;
      }
      case 'return': {
        lines.push(
          ...(statement.value === undefined ? ([] as readonly string[]) : renderExpression(statement.value, indent)),
          `${indent}return`,
        );

        break;
      }
      case 'expression-statement': {
        lines.push(...renderExpression(statement.expression, indent), `${indent}drop`);

        break;
      }
      case 'while': {
        lines.push(
          `${indent}block`,
          `${indent}  loop`,
          ...renderExpression(statement.condition, `${indent}    `),
          `${indent}    i32.eqz`,
          `${indent}    br_if 1`,
          ...statements(statement.body, `${indent}    `),
          `${indent}    br 0`,
          `${indent}  end`,
          `${indent}end`,
        );
        break;
      }
      case 'for': {
        if (statement.initializer !== undefined) lines.push(...statements([statement.initializer], indent));
        lines.push(
          `${indent}block`,
          `${indent}  loop`,
          ...renderExpression(statement.condition, `${indent}    `),
          `${indent}    i32.eqz`,
          `${indent}    br_if 1`,
          ...statements(statement.body, `${indent}    `),
          ...(statement.update === undefined ? [] : statements([statement.update], `${indent}    `)),
          `${indent}    br 0`,
          `${indent}  end`,
          `${indent}end`,
        );
        break;
      }
      case 'do-while': {
        lines.push(
          `${indent}block`,
          `${indent}  loop`,
          ...statements(statement.body, `${indent}    `),
          ...renderExpression(statement.condition, `${indent}    `),
          `${indent}    i32.eqz`,
          `${indent}    br_if 1`,
          `${indent}    br 0`,
          `${indent}  end`,
          `${indent}end`,
        );
        break;
      }
      case 'match-statement': {
        const arm = statement.arms[0];
        if (arm !== undefined) lines.push(...renderExpression(arm.value, indent), `${indent}drop`);
        break;
      }
      case 'switch': {
        lines.push(`${indent};; switch source ${statement.span.line}:${statement.span.column}`);
        lines.push(...renderExpression(statement.value, indent), `${indent}drop`);
        for (const arm of statement.cases) lines.push(`${indent};; case ${String(arm.value)}`, ...statements(arm.body, `${indent}  `));
        if (statement.defaultCase !== undefined) lines.push(`${indent};; default`, ...statements(statement.defaultCase, `${indent}  `));
        break;
      }
      case 'yield': {
        lines.push(...renderExpression(statement.value, indent), `${indent}drop`);
        break;
      }
      case 'iterator-loop': {
        lines.push(
          `${indent};; iterator loop ${statement.binding}`,
          ...statements(statement.body, `${indent}  `),
        );
        break;
      }
      case 'if': {
        const alternateLines =
          statement.alternate === undefined
            ? ([] as readonly string[])
            : ([`${indent}else`, ...statements(statement.alternate, `${indent}  `)] as readonly string[]);
        lines.push(
          `${indent};; if source ${statement.span.line}:${statement.span.column}`,
          ...renderExpression(statement.condition, indent),
          `${indent}if`,
          ...statements(statement.consequent, `${indent}  `),
          ...alternateLines,
          `${indent}end`,
        );
      }
    }
  }
  return lines;
}

export function renderForgeWebScriptWat(
  module: ForgeWebScriptModule,
  metadata: ForgeWebScriptWatMetadata = {},
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
    '  (memory (export "memory") 1)',
  ];
  for (const declaration of module.functions) {
    const parameters = declaration.parameters.flatMap((parameter) =>
      resultTypes(parameter.type.name).map(
        (type, index) => `(param $${parameter.name}${index === 0 ? '' : `_${index}`} ${type})`,
      ),
    );
    const results = resultTypes(declaration.result.name).map((type) => `(result ${type})`);
    const locals = localDeclarations(declaration.body);
    lines.push(
      `  (func $${declaration.name} ${[...parameters, ...results, ...locals].join(' ')}`,
      ...statements(declaration.body, '    '),
      '  )',
    );
    if (declaration.exported) lines.push(`  (export "${declaration.name}" (func $${declaration.name}))`);
  }
  lines.push(
    '  (func $fws_alloc (param $size i32) (result i32) i32.const 1024)',
    '  (export "fws_alloc" (func $fws_alloc))',
    '  (func $fws_dealloc (param $pointer i32) (param $size i32))',
    '  (export "fws_dealloc" (func $fws_dealloc))',
    ')',
  );
  return `${lines.join('\n')}\n`;
}
