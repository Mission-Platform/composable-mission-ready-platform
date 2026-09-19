import type { FlintExpression, FlintModule, FlintPrimitiveType, FlintStatement } from './ast.js';

/**
 * Metadata emitted in WAT comments describing compiler, optimization, and provenance details.
 */
export interface FlintWatMetadata {
  /** Compiler version identifier. */
  readonly compilerVersion?: string;
  /** Active optimization profile mode. */
  readonly optimization?: 'debug' | 'release';
  /** Deterministic graph hash identifier. */
  readonly graphHash?: string;
  /** Source file names contributing to the module. */
  readonly sourceFiles?: readonly string[];
}

/**
 * Maps a Flint primitive type to its corresponding WebAssembly value type string.
 *
 * @param type - Primitive type to convert.
 * @returns WebAssembly value type name ('i32', 'i64', 'f32', or 'f64').
 */
function valueType(type: FlintPrimitiveType): string {
  if (type === 'f32') return 'f32';
  if (type === 'f64') return 'f64';
  if (type === 'i64' || type === 'u64') return 'i64';
  return 'i32';
}

/**
 * Maps a Flint primitive type to the list of WebAssembly value types it produces.
 *
 * @param type - Primitive type to evaluate.
 * @returns Array of WebAssembly type names.
 */
function resultTypes(type: FlintPrimitiveType): readonly string[] {
  if (type === 'string' || type === 'bytes') return ['i32', 'i32'];
  if (type === 'unit') return [];
  return [valueType(type)];
}

/**
 * Formats a literal scalar value into its WebAssembly text representation.
 *
 * @param value - Scalar literal value to format.
 * @returns Formatted numeric string.
 */
function watNumber(value: boolean | number | string): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return '0';
  return Number.isFinite(value) ? String(value) : '0';
}

const BINARY_OP_MAP: Readonly<Record<string, string>> = {
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
};

/**
 * Emits WAT instructions for composite expressions (containers, indices, match arms).
 *
 * @param value - Composite expression node.
 * @param indent - Current indentation string.
 * @returns List of WAT instruction lines.
 */
function renderCompositeExpression(value: FlintExpression, indent: string): readonly string[] {
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
  return [];
}

/**
 * Emits WAT instructions for binary expressions.
 *
 * @param left - Left-hand operand.
 * @param right - Right-hand operand.
 * @param operator - Binary operator symbol.
 * @param indent - Current indentation string.
 * @returns List of WAT instruction lines.
 */
function renderBinaryExpression(
  left: FlintExpression,
  right: FlintExpression,
  operator: string,
  indent: string,
): readonly string[] {
  const lines = [...renderExpression(left, indent), ...renderExpression(right, indent)];
  const op = BINARY_OP_MAP[operator] ?? 'add';
  lines.push(`${indent}i32.${op}`);
  return lines;
}

/**
 * Renders an AST expression into WebAssembly text format instructions.
 *
 * @param value - AST expression to render.
 * @param indent - Indentation string for alignment.
 * @returns Array of rendered WAT lines.
 */
function renderExpression(value: FlintExpression, indent: string): readonly string[] {
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
  if (value.kind === 'binary') return renderBinaryExpression(value.left, value.right, value.operator, indent);
  return renderCompositeExpression(value, indent);
}

/**
 * Collects local variables from loop statement bodies.
 *
 * @param statement - Statement to inspect for loop bodies.
 * @param names - Accumulator set of variable names with types.
 */
function collectLoopLocalDeclarations(statement: FlintStatement, names: Set<string>): void {
  switch (statement.kind) {
    case 'while':
    case 'do-while': {
      localDeclarations(statement.body, names);
      break;
    }
    case 'for': {
      if (statement.initializer !== undefined) localDeclarations([statement.initializer], names);
      if (statement.update !== undefined) localDeclarations([statement.update], names);
      localDeclarations(statement.body, names);
      break;
    }
    case 'iterator-loop': {
      names.add(`${statement.binding}:i32`);
      localDeclarations(statement.body, names);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Collects local variables from branching statements.
 *
 * @param statement - Branching statement to inspect.
 * @param names - Accumulator set of variable names with types.
 */
function collectBranchLocalDeclarations(statement: FlintStatement, names: Set<string>): void {
  switch (statement.kind) {
    case 'if': {
      localDeclarations(statement.consequent, names);
      if (statement.alternate !== undefined) localDeclarations(statement.alternate, names);
      break;
    }
    case 'match-statement': {
      const arm = statement.arms[0];
      if (arm !== undefined) {
        localDeclarations(
          [
            {
              kind: 'expression-statement',
              expression: arm.value,
              span: statement.span,
            } satisfies FlintStatement,
          ],
          names,
        );
      }
      break;
    }
    case 'switch': {
      for (const arm of statement.cases) localDeclarations(arm.body, names);
      if (statement.defaultCase !== undefined) localDeclarations(statement.defaultCase, names);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Traverses statements recursively to discover all local declarations.
 *
 * @param statementsToRender - Statements to inspect.
 * @param names - Set of collected local names.
 * @returns Array of WAT local declaration statements.
 */
function localDeclarations(
  statementsToRender: readonly FlintStatement[],
  names = new Set<string>(),
): readonly string[] {
  for (const statement of statementsToRender) {
    if (statement.kind === 'let') {
      names.add(`${statement.name}:${valueType(statement.type.name)}`);
    } else if (statement.kind === 'assignment') {
      continue;
    } else {
      collectLoopLocalDeclarations(statement, names);
      collectBranchLocalDeclarations(statement, names);
    }
  }
  return [...names].toSorted().map((name) => {
    const [localName, type] = name.split(':');
    return `(local $${localName} ${type})`;
  });
}

/**
 * Emits WAT instructions for basic variable and expression statements.
 *
 * @param statement - Basic statement node.
 * @param indent - Current indentation string.
 * @returns Array of rendered WAT lines.
 */
function renderBasicStatement(statement: FlintStatement, indent: string): readonly string[] {
  if (statement.kind === 'let') {
    return [
      `${indent};; let ${statement.name}: ${statement.type.name}`,
      ...renderExpression(statement.value, indent),
      `${indent}local.set $${statement.name}`,
    ];
  }
  if (statement.kind === 'assignment') {
    return [...renderExpression(statement.value, indent), `${indent}local.set $${statement.name}`];
  }
  if (statement.kind === 'return') {
    const valueLines: readonly string[] =
      statement.value === undefined ? [] : renderExpression(statement.value, indent);
    return [...valueLines, `${indent}return`];
  }
  if (statement.kind === 'expression-statement' || statement.kind === 'yield') {
    const expr = statement.kind === 'expression-statement' ? statement.expression : statement.value;
    return [...renderExpression(expr, indent), `${indent}drop`];
  }
  return [];
}

/**
 * Emits WAT instructions for while and do-while loops.
 *
 * @param statement - Loop statement node.
 * @param indent - Current indentation string.
 * @returns Array of rendered WAT lines.
 */
function renderWhileLoop(statement: FlintStatement, indent: string): readonly string[] {
  if (statement.kind === 'while') {
    return [
      `${indent}block`,
      `${indent}  loop`,
      ...renderExpression(statement.condition, `${indent}    `),
      `${indent}    i32.eqz`,
      `${indent}    br_if 1`,
      ...statements(statement.body, `${indent}    `),
      `${indent}    br 0`,
      `${indent}  end`,
      `${indent}end`,
    ];
  }
  if (statement.kind === 'do-while') {
    return [
      `${indent}block`,
      `${indent}  loop`,
      ...statements(statement.body, `${indent}    `),
      ...renderExpression(statement.condition, `${indent}    `),
      `${indent}    i32.eqz`,
      `${indent}    br_if 1`,
      `${indent}    br 0`,
      `${indent}  end`,
      `${indent}end`,
    ];
  }
  return [];
}

/**
 * Emits WAT instructions for for-loops and iterator loops.
 *
 * @param statement - Loop statement node.
 * @param indent - Current indentation string.
 * @returns Array of rendered WAT lines.
 */
function renderForOrIterLoop(statement: FlintStatement, indent: string): readonly string[] {
  if (statement.kind === 'for') {
    const initLines = statement.initializer === undefined ? [] : statements([statement.initializer], indent);
    return [
      ...initLines,
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
    ];
  }
  if (statement.kind === 'iterator-loop') {
    return [`${indent};; iterator loop ${statement.binding}`, ...statements(statement.body, `${indent}  `)];
  }
  return [];
}

/**
 * Emits WAT instructions for branching statements (if, switch, match).
 *
 * @param statement - Branch statement node.
 * @param indent - Current indentation string.
 * @returns Array of rendered WAT lines.
 */
function renderBranchStatement(statement: FlintStatement, indent: string): readonly string[] {
  if (statement.kind === 'if') {
    const alternateLines: readonly string[] =
      statement.alternate === undefined ? [] : [`${indent}else`, ...statements(statement.alternate, `${indent}  `)];
    return [
      `${indent};; if source ${statement.span.line}:${statement.span.column}`,
      ...renderExpression(statement.condition, indent),
      `${indent}if`,
      ...statements(statement.consequent, `${indent}  `),
      ...alternateLines,
      `${indent}end`,
    ];
  }
  if (statement.kind === 'switch') {
    const caseLines: string[] = [];
    for (const arm of statement.cases)
      caseLines.push(`${indent};; case ${String(arm.value)}`, ...statements(arm.body, `${indent}  `));
    if (statement.defaultCase !== undefined)
      caseLines.push(`${indent};; default`, ...statements(statement.defaultCase, `${indent}  `));
    return [
      `${indent};; switch source ${statement.span.line}:${statement.span.column}`,
      ...renderExpression(statement.value, indent),
      `${indent}drop`,
      ...caseLines,
    ];
  }
  if (statement.kind === 'match-statement') {
    const arm = statement.arms[0];
    return arm === undefined ? [] : [...renderExpression(arm.value, indent), `${indent}drop`];
  }
  return [];
}

const BASIC_STATEMENT_KINDS = new Set(['let', 'assignment', 'return', 'expression-statement', 'yield']);

/**
 * Emits WAT instructions for a single statement.
 *
 * @param statement - Statement to render.
 * @param indent - Indentation string.
 * @returns Array of rendered WAT lines.
 */
function renderStatement(statement: FlintStatement, indent: string): readonly string[] {
  if (BASIC_STATEMENT_KINDS.has(statement.kind)) return renderBasicStatement(statement, indent);
  if (statement.kind === 'while' || statement.kind === 'do-while') return renderWhileLoop(statement, indent);
  if (statement.kind === 'for' || statement.kind === 'iterator-loop') return renderForOrIterLoop(statement, indent);
  return renderBranchStatement(statement, indent);
}

/**
 * Renders statements into WebAssembly text format lines.
 *
 * @param statementsToRender - Array of statements to render.
 * @param indent - Indentation string for nested blocks.
 * @returns Array of rendered WAT lines.
 */
function statements(statementsToRender: readonly FlintStatement[], indent: string): readonly string[] {
  return statementsToRender.flatMap((statement) => renderStatement(statement, indent));
}

/**
 * Emits complete WebAssembly Text format representation for a compiled Flint module.
 *
 * @param module - Compiled AST module to render.
 * @param metadata - Optional compiler and provenance metadata for comments.
 * @returns WebAssembly Text representation as a string.
 */
export function renderFlintWat(module: FlintModule, metadata: FlintWatMetadata = {}): string {
  const lines = [
    '(module',
    `  ;; flint module: ${module.name}`,
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
    '  (func $flint_alloc (param $size i32) (result i32) i32.const 1024)',
    '  (export "flint_alloc" (func $flint_alloc))',
    '  (func $flint_dealloc (param $pointer i32) (param $size i32))',
    '  (export "flint_dealloc" (func $flint_dealloc))',
    ')',
  );
  return `${lines.join('\n')}\n`;
}
