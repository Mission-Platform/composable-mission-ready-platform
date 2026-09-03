import { forgeWebScriptTypeNameToString, type ForgeWebScriptModule, type ForgeWebScriptTypeName } from './ast.js';
import { lowerForgeWebScriptToIr } from './ir.js';
import { FORGE_WEB_SCRIPT_ABI_VERSION, FORGE_WEB_SCRIPT_LANGUAGE_VERSION } from './manifest.js';

import type { ForgeWebScriptSourceSpan } from './diagnostics.js';
import type { ForgeWebScriptIrExpression, ForgeWebScriptIrModule, ForgeWebScriptIrStatement } from './ir.js';

export const FORGE_WEB_SCRIPT_SON_SCHEMA_VERSION = '1.0' as const;
export type ForgeWebScriptSoNOptimization = 'debug' | 'release';
export type ForgeWebScriptSoNBoundsChecks = 'runtime' | 'proven-safe' | 'excluded-by-profile';
export type ForgeWebScriptSoNMemoryModel = 'region-arc-checked-linear';
export type ForgeWebScriptSoNEffect = 'pure' | 'read' | 'write' | 'call' | 'control' | 'allocation' | 'unknown';
export type ForgeWebScriptSoNAliasFact = 'none' | 'local' | 'borrowed' | 'mutable' | 'unknown';
export type ForgeWebScriptSoNOwnershipFact = 'value' | 'borrowed' | 'owned' | 'shared' | 'unknown';

export interface ForgeWebScriptSoNNode {
  readonly id: number;
  readonly kind: string;
  readonly functionName: string;
  readonly inputs: readonly number[];
  readonly effects: readonly ForgeWebScriptSoNEffect[];
  readonly alias: ForgeWebScriptSoNAliasFact;
  readonly ownership: ForgeWebScriptSoNOwnershipFact;
  readonly type?: string;
  readonly value?: boolean | number | string;
  /** Set only for `call` nodes; used by reachability-pruning to keep called functions live. */
  readonly callee?: string;
  readonly span?: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptSoNControlRegion {
  readonly id: number;
  readonly functionName: string;
  readonly kind: 'function' | 'block' | 'branch' | 'loop' | 'switch';
  readonly parent?: number;
  readonly nodes: readonly number[];
}

export interface ForgeWebScriptSoNFunction {
  readonly name: string;
  readonly entry: number;
  readonly exported: boolean;
}

export interface ForgeWebScriptSoNPassReport {
  readonly name:
    | 'constant-propagation'
    | 'copy-propagation'
    | 'global-value-numbering'
    | 'cfg-simplification'
    | 'dead-node-elimination'
    | 'reachability-pruning'
    | 'purity-analysis'
    | 'inlining'
    | 'escape-analysis'
    | 'switch-density'
    | 'bounds-proof';
  readonly applied: number;
  readonly skipped: number;
  readonly reason?: string;
}

export interface ForgeWebScriptSoNOptimizationReport {
  readonly mode: ForgeWebScriptSoNOptimization;
  readonly passes: readonly ForgeWebScriptSoNPassReport[];
  readonly nodesBefore: number;
  readonly nodesAfter: number;
  readonly graphHashBefore: string;
  readonly graphHashAfter: string;
}

export interface ForgeWebScriptSoNModule {
  readonly schemaVersion: typeof FORGE_WEB_SCRIPT_SON_SCHEMA_VERSION;
  readonly compilerVersion: string;
  readonly languageVersion: string;
  readonly abiVersion: string;
  readonly sourceHash: string;
  readonly graphHash: string;
  readonly optimization: ForgeWebScriptSoNOptimization;
  readonly boundsChecks: ForgeWebScriptSoNBoundsChecks;
  readonly memoryModel: ForgeWebScriptSoNMemoryModel;
  readonly functions: readonly ForgeWebScriptSoNFunction[];
  readonly nodes: readonly ForgeWebScriptSoNNode[];
  readonly regions: readonly ForgeWebScriptSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: ForgeWebScriptSourceSpan }[];
  readonly optimizationReport?: ForgeWebScriptSoNOptimizationReport;
}

export type ForgeWebScriptSoNArtifact = ForgeWebScriptSoNModule;

export interface ForgeWebScriptSoNBuildOptions {
  readonly compilerVersion: string;
  readonly sourceHash: string;
  readonly optimization?: ForgeWebScriptSoNOptimization;
  readonly boundsChecks?: ForgeWebScriptSoNBoundsChecks;
  readonly languageVersion?: string;
  readonly abiVersion?: string;
}

function hash(value: string): string {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619) >>> 0;
  }
  return result.toString(16).padStart(8, '0');
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  return value;
}

function graphIdentity(
  module: ForgeWebScriptSoNModule | Omit<ForgeWebScriptSoNModule, 'graphHash' | 'optimizationReport'>,
): string {
  const { graphHash: _graphHash, optimizationReport: _report, ...base } = module as ForgeWebScriptSoNModule;
  const sanitized = {
    ...base,
    nodes: base.nodes.map(({ span: _span, ...node }) => node),
    sourceMap: [],
  };
  return hash(JSON.stringify(stableValue(sanitized)));
}

function typeOfExpression(expression: ForgeWebScriptIrExpression): string | undefined {
  if (expression.kind === 'literal') return expression.type;
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return forgeWebScriptTypeNameToString(expression.type);
  if (expression.kind === 'struct-value' || expression.kind === 'enum-value')
    return forgeWebScriptTypeNameToString(expression.type);
  return undefined;
}

function ownershipOfType(type: string | undefined): ForgeWebScriptSoNOwnershipFact {
  if (type === undefined) return 'unknown';
  return type.startsWith('&mut ') ? 'borrowed' : type.startsWith('&') ? 'borrowed' : 'value';
}

function expressionEffects(expression: ForgeWebScriptIrExpression): readonly ForgeWebScriptSoNEffect[] {
  if (expression.kind === 'call') return expression.standardLibrary === undefined ? ['call', 'unknown'] : ['pure'];
  if (expression.kind === 'identifier') return ['read'];
  if (expression.kind === 'literal' || expression.kind === 'function-value') return ['pure'];
  if (expression.kind === 'binary' || expression.kind === 'unary') return ['pure'];
  return ['allocation'];
}

class SoNBuilder {
  private nextNode = 1;
  private nextRegion = 1;
  private readonly nodes: ForgeWebScriptSoNNode[] = [];
  private readonly regions: ForgeWebScriptSoNControlRegion[] = [];
  private readonly sourceMap: { node: number; span: ForgeWebScriptSourceSpan }[] = [];

  private readonly module: ForgeWebScriptIrModule;

  constructor(module: ForgeWebScriptIrModule) {
    this.module = module;
  }

  private node(
    functionName: string,
    kind: string,
    inputs: readonly number[],
    span: ForgeWebScriptSourceSpan | undefined,
    expression?: ForgeWebScriptIrExpression,
  ): number {
    const id = this.nextNode++;
    const type = expression === undefined ? undefined : typeOfExpression(expression);
    const effects =
      expression === undefined
        ? kind === 'let' || kind === 'function-entry'
          ? ['pure' as const]
          : kind.includes('control') || kind === 'return' || kind === 'yield'
            ? ['control' as const]
            : ['write' as const]
        : expressionEffects(expression);
    const node: ForgeWebScriptSoNNode = {
      id,
      kind,
      functionName,
      inputs: [...inputs],
      effects,
      alias: kind === 'read' ? 'local' : kind.includes('assign') ? 'mutable' : 'none',
      ownership: ownershipOfType(type),
      ...(type === undefined ? {} : { type }),
      ...(expression?.kind === 'literal' ? { value: expression.value } : {}),
      ...(expression?.kind === 'call' ? { callee: expression.callee } : {}),
      ...(span === undefined ? {} : { span }),
    };
    this.nodes.push(node);
    if (span !== undefined) this.sourceMap.push({ node: id, span });
    return id;
  }

  private expression(functionName: string, expression: ForgeWebScriptIrExpression): number {
    switch (expression.kind) {
      case 'literal':
      case 'identifier':
      case 'function-value': {
        return this.node(
          functionName,
          expression.kind === 'identifier' ? 'read' : expression.kind,
          [],
          expression.span,
          expression,
        );
      }
      case 'call': {
        return this.node(
          functionName,
          'call',
          expression.arguments.map((argument) => this.expression(functionName, argument)),
          expression.span,
          expression,
        );
      }
      case 'binary': {
        return this.node(
          functionName,
          `binary.${expression.operator}`,
          [this.expression(functionName, expression.left), this.expression(functionName, expression.right)],
          expression.span,
          expression,
        );
      }
      case 'unary': {
        return this.node(
          functionName,
          `unary.${expression.operator}`,
          [this.expression(functionName, expression.operand)],
          expression.span,
          expression,
        );
      }
      case 'struct-value': {
        return this.node(
          functionName,
          'struct-value',
          Object.values(expression.fields).map((value) => this.expression(functionName, value)),
          expression.span,
          expression,
        );
      }
      case 'enum-value': {
        return this.node(
          functionName,
          'enum-value',
          expression.arguments.map((value) => this.expression(functionName, value)),
          expression.span,
          expression,
        );
      }
      case 'array-literal':
      case 'vector-literal': {
        return this.node(
          functionName,
          expression.kind,
          expression.elements.map((value) => this.expression(functionName, value)),
          expression.span,
          expression,
        );
      }
      case 'index': {
        return this.node(
          functionName,
          'index',
          [this.expression(functionName, expression.receiver), this.expression(functionName, expression.index)],
          expression.span,
          expression,
        );
      }
      case 'match': {
        return this.node(
          functionName,
          'match',
          [
            this.expression(functionName, expression.value),
            ...expression.arms.map((arm) => this.expression(functionName, arm.value)),
          ],
          expression.span,
          expression,
        );
      }
    }
  }

  private region(
    functionName: string,
    kind: ForgeWebScriptSoNControlRegion['kind'],
    nodes: readonly number[],
    parent?: number,
  ): number {
    const id = this.nextRegion++;
    this.regions.push({ id, functionName, kind, ...(parent === undefined ? {} : { parent }), nodes: [...nodes] });
    return id;
  }

  private statements(
    functionName: string,
    statements: readonly ForgeWebScriptIrStatement[],
    parentRegion?: number,
  ): readonly number[] {
    const result: number[] = [];
    for (const statement of statements) {
      let node: number;
      switch (statement.kind) {
        case 'let': {
          node = this.node(functionName, 'let', [this.expression(functionName, statement.value)], statement.span);
          break;
        }
        case 'assignment': {
          node = this.node(functionName, 'assign', [this.expression(functionName, statement.value)], statement.span);
          break;
        }
        case 'return': {
          node = this.node(
            functionName,
            'return',
            statement.value === undefined ? [] : [this.expression(functionName, statement.value)],
            statement.span,
          );
          break;
        }
        case 'expression-statement': {
          node = this.node(
            functionName,
            'expression',
            [this.expression(functionName, statement.expression)],
            statement.span,
          );
          break;
        }
        case 'yield': {
          node = this.node(functionName, 'yield', [this.expression(functionName, statement.value)], statement.span);
          break;
        }
        case 'if': {
          const body = this.statements(functionName, statement.consequent, parentRegion);
          const alternate =
            statement.alternate === undefined ? [] : this.statements(functionName, statement.alternate, parentRegion);
          node = this.node(
            functionName,
            'control.if',
            [this.expression(functionName, statement.condition), ...body, ...alternate],
            statement.span,
          );
          this.region(functionName, 'branch', [node, ...body, ...alternate], parentRegion);
          break;
        }
        case 'while':
        case 'do-while': {
          const body = this.statements(functionName, statement.body, parentRegion);
          node = this.node(
            functionName,
            `control.${statement.kind}`,
            [this.expression(functionName, statement.condition), ...body],
            statement.span,
          );
          this.region(functionName, 'loop', [node, ...body], parentRegion);
          break;
        }
        case 'switch': {
          const arms = statement.cases.flatMap((arm) => this.statements(functionName, arm.body, parentRegion));
          const fallback =
            statement.defaultCase === undefined
              ? []
              : this.statements(functionName, statement.defaultCase, parentRegion);
          node = this.node(
            functionName,
            'control.switch',
            [this.expression(functionName, statement.value), ...arms, ...fallback],
            statement.span,
          );
          this.region(functionName, 'switch', [node, ...arms, ...fallback], parentRegion);
          break;
        }
        case 'match-statement': {
          const arms = statement.arms.map((arm) => this.expression(functionName, arm.value));
          node = this.node(
            functionName,
            'control.match',
            [this.expression(functionName, statement.value), ...arms],
            statement.span,
          );
          this.region(functionName, 'branch', [node, ...arms], parentRegion);
          break;
        }
        case 'iterator-loop': {
          const body = this.statements(functionName, statement.body, parentRegion);
          node = this.node(
            functionName,
            'control.iterator-loop',
            [this.expression(functionName, statement.iterator), ...body],
            statement.span,
          );
          this.region(functionName, 'loop', [node, ...body], parentRegion);
          break;
        }
      }
      result.push(node);
    }
    return result;
  }

  build(options: ForgeWebScriptSoNBuildOptions): ForgeWebScriptSoNModule {
    const functions: ForgeWebScriptSoNFunction[] = [];
    for (const declaration of this.module.functions.toSorted((a, b) => a.name.localeCompare(b.name))) {
      const entry = this.node(declaration.name, 'function-entry', [], declaration.span);
      const body = this.statements(declaration.name, declaration.body);
      this.region(declaration.name, 'function', [entry, ...body]);
      functions.push({ name: declaration.name, entry, exported: declaration.exported });
    }
    const base = {
      schemaVersion: FORGE_WEB_SCRIPT_SON_SCHEMA_VERSION,
      compilerVersion: options.compilerVersion,
      languageVersion: options.languageVersion ?? FORGE_WEB_SCRIPT_LANGUAGE_VERSION,
      abiVersion: options.abiVersion ?? FORGE_WEB_SCRIPT_ABI_VERSION,
      sourceHash: options.sourceHash,
      optimization: options.optimization ?? 'debug',
      boundsChecks: options.boundsChecks ?? 'runtime',
      memoryModel: 'region-arc-checked-linear' as const,
      functions,
      nodes: this.nodes,
      regions: this.regions,
      sourceMap: this.sourceMap,
    };
    return { ...base, graphHash: graphIdentity(base) };
  }
}

export function buildForgeWebScriptSoN(
  module: ForgeWebScriptIrModule,
  options: ForgeWebScriptSoNBuildOptions,
): ForgeWebScriptSoNModule {
  return new SoNBuilder(module).build(options);
}

/** Compatibility adapter for consumers that still own an AST module. */
export function buildForgeWebScriptSoNFromAst(
  module: ForgeWebScriptModule,
  options: ForgeWebScriptSoNBuildOptions,
): ForgeWebScriptSoNModule {
  return buildForgeWebScriptSoN(lowerForgeWebScriptToIr(module), options);
}

export function forgeWebScriptSoNGraphHash(module: ForgeWebScriptSoNModule): string {
  return graphIdentity(module);
}

const orderedPasses: readonly ForgeWebScriptSoNPassReport['name'][] = [
  'constant-propagation',
  'copy-propagation',
  'global-value-numbering',
  'cfg-simplification',
  'dead-node-elimination',
  'reachability-pruning',
  'purity-analysis',
  'inlining',
  'escape-analysis',
  'switch-density',
  'bounds-proof',
];

type SoNIrLiteral = Extract<ForgeWebScriptIrExpression, { kind: 'literal' }>;

function sonAnnotateBounds(module: ForgeWebScriptIrModule): number {
  let annotated = 0;
  for (const function_ of module.functions) {
    // Track local variable types to identify Array/Vector with known lengths.
    const localTypes = new Map<string, ForgeWebScriptTypeName>();
    for (const parameter of function_.parameters) {
      localTypes.set(parameter.name, parameter.type);
    }

    function visitExpression(expression: ForgeWebScriptIrExpression): void {
      if (expression.kind === 'index') {
        const receiver = expression.receiver;
        const index = expression.index;
        if (index.kind === 'literal' && typeof index.value === 'number') {
          // Case 1: identifier-receiver Array/Vector with known length (fixed array).
          if (receiver.kind === 'identifier') {
            const receiverType = localTypes.get(receiver.name);
            if (
              receiverType !== undefined &&
              receiverType.length !== undefined &&
              index.value >= 0 &&
              index.value < receiverType.length
            ) {
              (expression as any).boundsCheck = 'proven-safe';
              annotated += 1;
            }
          }
          // Case 2: literal-receiver Array/Vector with known length.
          else if (receiver.kind === 'array-literal' || receiver.kind === 'vector-literal') {
            const length = receiver.type.length;
            if (length !== undefined && index.value >= 0 && index.value < length) {
              (expression as any).boundsCheck = 'proven-safe';
              annotated += 1;
            }
          }
        }
      }
      // Recurse
      switch (expression.kind) {
        case 'call': {
          expression.arguments.forEach(visitExpression);
          break;
        }
        case 'binary': {
          visitExpression(expression.left);
          visitExpression(expression.right);

          break;
        }
        case 'unary': {
          visitExpression(expression.operand);
          break;
        }
        case 'struct-value': {
          Object.values(expression.fields).forEach(visitExpression);
          break;
        }
        case 'enum-value': {
          expression.arguments.forEach(visitExpression);
          break;
        }
        case 'match': {
          visitExpression(expression.value);
          for (const arm of expression.arms) visitExpression(arm.value);

          break;
        }
        case 'array-literal':
        case 'vector-literal': {
          expression.elements.forEach(visitExpression);
          break;
        }
        case 'index': {
          visitExpression(expression.receiver);
          visitExpression(expression.index);

          break;
        }
        // No default
      }
    }

    function visitStatement(statement: ForgeWebScriptIrStatement): void {
      switch (statement.kind) {
        case 'let': {
          localTypes.set(statement.name, statement.type);
          visitExpression(statement.value);

          break;
        }
        case 'assignment': {
          visitExpression(statement.value);

          break;
        }
        case 'expression-statement': {
          visitExpression(statement.expression);

          break;
        }
        default: {
          if (statement.kind === 'return' && statement.value !== undefined) {
            visitExpression(statement.value);
          } else
            switch (statement.kind) {
              case 'if': {
                visitExpression(statement.condition);
                statement.consequent.forEach(visitStatement);
                statement.alternate?.forEach(visitStatement);

                break;
              }
              case 'switch': {
                visitExpression(statement.value);
                for (const arm of statement.cases) arm.body.forEach(visitStatement);
                statement.defaultCase?.forEach(visitStatement);

                break;
              }
              case 'while':
              case 'do-while': {
                visitExpression(statement.condition);
                statement.body.forEach(visitStatement);

                break;
              }
              case 'iterator-loop': {
                visitExpression(statement.iterator);
                statement.body.forEach(visitStatement);

                break;
              }
              // No default
            }
        }
      }
    }

    function_.body.forEach(visitStatement);
  }
  return annotated;
}
function sonEvaluateBinary(
  operator: string,
  left: SoNIrLiteral,
  right: SoNIrLiteral,
): boolean | number | string | undefined {
  if (operator === '&&' && typeof left.value === 'boolean' && typeof right.value === 'boolean')
    return left.value && right.value;
  if (operator === '||' && typeof left.value === 'boolean' && typeof right.value === 'boolean')
    return left.value || right.value;
  if (operator === '==' || operator === '!=')
    return operator === '==' ? left.value === right.value : left.value !== right.value;
  if (typeof left.value === 'string' || typeof right.value === 'string') return undefined;
  if (typeof left.value !== 'number' || typeof right.value !== 'number') return undefined;
  if ((operator === '/' || operator === '%') && right.value === 0) return undefined;
  switch (operator) {
    case '+': {
      return left.value + right.value;
    }
    case '-': {
      return left.value - right.value;
    }
    case '*': {
      return left.value * right.value;
    }
    case '/': {
      return left.value / right.value;
    }
    case '%': {
      return left.value % right.value;
    }
    case '<': {
      return left.value < right.value;
    }
    case '<=': {
      return left.value <= right.value;
    }
    case '>': {
      return left.value > right.value;
    }
    case '>=': {
      return left.value >= right.value;
    }
    default: {
      return undefined;
    }
  }
}

interface SoNPropagationCounters {
  constantsFolded: number;
  copiesPropagated: number;
}

function sonAssignedNames(statements: readonly ForgeWebScriptIrStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    switch (statement.kind) {
      case 'assignment': {
        names.add(statement.name);
        break;
      }
      case 'if': {
        sonAssignedNames(statement.consequent, names);
        if (statement.alternate !== undefined) sonAssignedNames(statement.alternate, names);
        break;
      }
      case 'switch': {
        for (const arm of statement.cases) sonAssignedNames(arm.body, names);
        if (statement.defaultCase !== undefined) sonAssignedNames(statement.defaultCase, names);
        break;
      }
      case 'while':
      case 'do-while': {
        sonAssignedNames(statement.body, names);
        break;
      }
      case 'iterator-loop': {
        sonAssignedNames(statement.body, names);
        break;
      }
      // No default
    }
  }
  return names;
}

/**
 * Folds constants and propagates copies (identifier-to-identifier aliases, not
 * only literals) directly over the unoptimized semantic tree. This is the
 * SoN optimizer's own constant/copy-propagation implementation: it is run
 * before the SoN graph is (re)built from its result, so the persisted graph
 * reflects genuine transformations rather than mirroring another optimizer.
 */
function sonTransformExpression(
  expression: ForgeWebScriptIrExpression,
  locals: ReadonlyMap<string, ForgeWebScriptIrExpression>,
  counters: SoNPropagationCounters,
): ForgeWebScriptIrExpression {
  if (expression.kind === 'identifier') {
    const replacement = locals.get(expression.name);
    if (replacement === undefined) return expression;
    if (replacement.kind === 'literal') counters.constantsFolded += 1;
    else counters.copiesPropagated += 1;
    return { ...replacement, span: expression.span };
  }
  if (expression.kind === 'literal' || expression.kind === 'function-value') return expression;
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => sonTransformExpression(argument, locals, counters)),
    };
  if (expression.kind === 'struct-value')
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [
          name,
          sonTransformExpression(value, locals, counters),
        ]),
      ),
    };
  if (expression.kind === 'enum-value')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => sonTransformExpression(argument, locals, counters)),
    };
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return {
      ...expression,
      elements: expression.elements.map((element) => sonTransformExpression(element, locals, counters)),
    };
  if (expression.kind === 'index')
    return {
      ...expression,
      receiver: sonTransformExpression(expression.receiver, locals, counters),
      index: sonTransformExpression(expression.index, locals, counters),
    };
  if (expression.kind === 'match')
    return {
      ...expression,
      value: sonTransformExpression(expression.value, locals, counters),
      arms: expression.arms.map((arm) => ({ ...arm, value: sonTransformExpression(arm.value, locals, counters) })),
    };
  if (expression.kind === 'unary') {
    const operand = sonTransformExpression(expression.operand, locals, counters);
    if (operand.kind === 'literal' && expression.operator === '!' && typeof operand.value === 'boolean') {
      counters.constantsFolded += 1;
      return { ...operand, value: !operand.value, span: expression.span };
    }
    if (operand.kind === 'literal' && expression.operator === '-' && typeof operand.value === 'number') {
      counters.constantsFolded += 1;
      return { ...operand, value: -operand.value, span: expression.span };
    }
    return { ...expression, operand };
  }
  if (expression.kind === 'binary') {
    const left = sonTransformExpression(expression.left, locals, counters);
    const right = sonTransformExpression(expression.right, locals, counters);
    if (left.kind === 'literal' && right.kind === 'literal') {
      const value = sonEvaluateBinary(expression.operator, left, right);
      if (value !== undefined) {
        counters.constantsFolded += 1;
        return {
          ...left,
          value,
          type: ['&&', '||', '<', '<=', '==', '!=', '>', '>='].includes(expression.operator) ? 'bool' : left.type,
          span: expression.span,
        };
      }
    }
    return { ...expression, left, right };
  }
  return expression;
}

function sonTransformStatements(
  statements: readonly ForgeWebScriptIrStatement[],
  locals: Map<string, ForgeWebScriptIrExpression>,
  counters: SoNPropagationCounters,
): readonly ForgeWebScriptIrStatement[] {
  const mutableNames = sonAssignedNames(statements);
  const result: ForgeWebScriptIrStatement[] = [];
  for (const statement of statements) {
    switch (statement.kind) {
      case 'let': {
        const value = sonTransformExpression(statement.value, locals, counters);
        if ((value.kind === 'literal' || value.kind === 'identifier') && !mutableNames.has(statement.name))
          locals.set(statement.name, value);
        else locals.delete(statement.name);
        result.push({ ...statement, value });
        break;
      }
      case 'assignment': {
        const value = sonTransformExpression(statement.value, locals, counters);
        locals.clear();
        result.push({ ...statement, value });
        break;
      }
      case 'return': {
        result.push({
          ...statement,
          ...(statement.value === undefined
            ? {}
            : { value: sonTransformExpression(statement.value, locals, counters) }),
        });
        break;
      }
      case 'expression-statement': {
        result.push({ ...statement, expression: sonTransformExpression(statement.expression, locals, counters) });
        break;
      }
      case 'yield': {
        result.push({ ...statement, value: sonTransformExpression(statement.value, locals, counters) });
        break;
      }
      case 'match-statement': {
        result.push({
          ...statement,
          value: sonTransformExpression(statement.value, locals, counters),
          arms: statement.arms.map((arm) => ({ ...arm, value: sonTransformExpression(arm.value, locals, counters) })),
        });
        break;
      }
      case 'if': {
        const condition = sonTransformExpression(statement.condition, locals, counters);
        const consequent = sonTransformStatements(statement.consequent, new Map(locals), counters);
        const alternate =
          statement.alternate === undefined
            ? undefined
            : sonTransformStatements(statement.alternate, new Map(locals), counters);
        if (
          sonAssignedNames(statement.consequent).size > 0 ||
          (statement.alternate !== undefined && sonAssignedNames(statement.alternate).size > 0)
        )
          locals.clear();
        result.push({ ...statement, condition, consequent, ...(alternate === undefined ? {} : { alternate }) });
        break;
      }
      case 'while':
      case 'do-while': {
        const bodyLocals = new Map(locals);
        for (const name of sonAssignedNames(statement.body)) bodyLocals.delete(name);
        const condition = sonTransformExpression(statement.condition, bodyLocals, counters);
        const body = sonTransformStatements(statement.body, bodyLocals, counters);
        if (sonAssignedNames(statement.body).size > 0) locals.clear();
        result.push({ ...statement, condition, body });
        break;
      }
      case 'switch': {
        const value = sonTransformExpression(statement.value, locals, counters);
        const cases = statement.cases.map((arm) => ({
          ...arm,
          body: sonTransformStatements(arm.body, new Map(locals), counters),
        }));
        const defaultCase =
          statement.defaultCase === undefined
            ? undefined
            : sonTransformStatements(statement.defaultCase, new Map(locals), counters);
        if (
          statement.cases.some((arm) => sonAssignedNames(arm.body).size > 0) ||
          (statement.defaultCase !== undefined && sonAssignedNames(statement.defaultCase).size > 0)
        )
          locals.clear();
        result.push({ ...statement, value, cases, ...(defaultCase === undefined ? {} : { defaultCase }) });
        break;
      }
      case 'iterator-loop': {
        const bodyLocals = new Map(locals);
        for (const name of sonAssignedNames(statement.body)) bodyLocals.delete(name);
        bodyLocals.delete(statement.binding);
        const iterator = sonTransformExpression(statement.iterator, locals, counters);
        const body = sonTransformStatements(statement.body, bodyLocals, counters);
        if (sonAssignedNames(statement.body).size > 0) locals.clear();
        result.push({ ...statement, iterator, body });
        break;
      }
      // No default
    }
  }
  return result;
}

function sonPropagateIr(module: ForgeWebScriptIrModule): {
  readonly ir: ForgeWebScriptIrModule;
  readonly constantsFolded: number;
  readonly copiesPropagated: number;
} {
  const counters: SoNPropagationCounters = { constantsFolded: 0, copiesPropagated: 0 };
  const functions = module.functions.map((declaration) => ({
    ...declaration,
    body: sonTransformStatements(declaration.body, new Map(), counters),
  }));
  return {
    ir: { ...module, functions },
    constantsFolded: counters.constantsFolded,
    copiesPropagated: counters.copiesPropagated,
  };
}

/**
 * Structural value-numbering / CSE over the flat node list. Nodes are stored
 * in dependency order (a node's inputs always have lower ids), so a single
 * forward pass is sufficient: duplicate pure literal/unary/binary nodes
 * within the same function are collapsed to their first occurrence and every
 * later reference is remapped to the canonical id.
 */
function sonCanonicalizeNodes(nodes: readonly ForgeWebScriptSoNNode[]): {
  readonly nodes: readonly ForgeWebScriptSoNNode[];
  readonly remap: ReadonlyMap<number, number>;
  readonly deduped: number;
} {
  const remap = new Map<number, number>();
  const canonicalByKey = new Map<string, number>();
  const output: ForgeWebScriptSoNNode[] = [];
  let deduped = 0;
  for (const node of nodes) {
    const inputs = node.inputs.map((id) => remap.get(id) ?? id);
    const eligible =
      node.effects.length === 1 &&
      node.effects[0] === 'pure' &&
      (node.kind === 'literal' || node.kind.startsWith('binary.') || node.kind.startsWith('unary.'));
    if (eligible) {
      const key = `${node.functionName}\u0000${node.kind}\u0000${JSON.stringify(inputs)}\u0000${JSON.stringify(node.value)}\u0000${node.type ?? ''}`;
      const existing = canonicalByKey.get(key);
      if (existing !== undefined) {
        remap.set(node.id, existing);
        deduped += 1;
        continue;
      }
      canonicalByKey.set(key, node.id);
    }
    const changed = inputs.length !== node.inputs.length || inputs.some((id, index) => id !== node.inputs[index]);
    output.push(changed ? { ...node, inputs } : node);
  }
  return { nodes: output, remap, deduped };
}

/**
 * Reachability over both nodes and functions. Node reachability starts from
 * function entries and effectful nodes, transitively through inputs.
 * Function reachability starts from exported entries and grows whenever a
 * reachable `call` node's callee names another declared function, matching
 * the legacy tree-IR pruner's call-graph semantics but computed on the graph.
 */
function sonPruneGraph(graph: ForgeWebScriptSoNModule): {
  readonly nodes: readonly ForgeWebScriptSoNNode[];
  readonly functions: readonly ForgeWebScriptSoNFunction[];
  readonly regions: readonly ForgeWebScriptSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: ForgeWebScriptSourceSpan }[];
  readonly removedNodes: number;
} {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const functionNames = new Set(graph.functions.map(({ name }) => name));
  let liveFunctions = new Set(graph.functions.filter(({ exported }) => exported).map(({ name }) => name));
  let referenced = new Set<number>();
  let changed = true;
  while (changed) {
    changed = false;
    referenced = new Set<number>();
    for (const entry of graph.functions) if (liveFunctions.has(entry.name)) referenced.add(entry.entry);
    for (const node of graph.nodes)
      if (liveFunctions.has(node.functionName) && node.effects.some((effect) => effect !== 'pure'))
        referenced.add(node.id);
    const pending = [...referenced];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) continue;
      for (const inputId of byId.get(id)?.inputs ?? [])
        if (!referenced.has(inputId)) {
          referenced.add(inputId);
          pending.push(inputId);
        }
    }
    for (const id of referenced) {
      const node = byId.get(id);
      if (
        node?.kind === 'call' &&
        node.callee !== undefined &&
        functionNames.has(node.callee) &&
        !liveFunctions.has(node.callee)
      ) {
        liveFunctions = new Set(liveFunctions).add(node.callee);
        changed = true;
      }
    }
  }
  const nodes = graph.nodes.filter(({ id }) => referenced.has(id));
  const functions = graph.functions.filter(({ name }) => liveFunctions.has(name));
  const regions = graph.regions.filter(({ functionName }) => liveFunctions.has(functionName));
  const sourceMap = graph.sourceMap.filter(({ node }) => referenced.has(node));
  return { nodes, functions, regions, sourceMap, removedNodes: graph.nodes.length - nodes.length };
}

/**
 * Node ids must stay a dense `1..N` sequence for cache validation and stable
 * array-style access (see `validateForgeWebScriptSoN`). CSE and DCE both
 * remove nodes, leaving gaps and stale references in regions/functions/the
 * source map that this step compacts back into a dense, deterministic graph.
 */
function sonRenumberGraph(pruned: {
  readonly nodes: readonly ForgeWebScriptSoNNode[];
  readonly functions: readonly ForgeWebScriptSoNFunction[];
  readonly regions: readonly ForgeWebScriptSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: ForgeWebScriptSourceSpan }[];
}): {
  readonly nodes: readonly ForgeWebScriptSoNNode[];
  readonly functions: readonly ForgeWebScriptSoNFunction[];
  readonly regions: readonly ForgeWebScriptSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: ForgeWebScriptSourceSpan }[];
} {
  const keptIds = new Set(pruned.nodes.map(({ id }) => id));
  const idMap = new Map(pruned.nodes.map(({ id }, index) => [id, index + 1]));
  const nodes = pruned.nodes.map((node, index) => ({
    ...node,
    id: index + 1,
    inputs: node.inputs.map((id) => idMap.get(id)!),
  }));
  const regions = pruned.regions.map((region) => ({
    ...region,
    nodes: region.nodes.filter((id) => keptIds.has(id)).map((id) => idMap.get(id)!),
  }));
  const functions = pruned.functions.map((entry) => ({ ...entry, entry: idMap.get(entry.entry)! }));
  const sourceMap = pruned.sourceMap
    .filter(({ node }) => keptIds.has(node))
    .map(({ node, span }) => ({ node: idMap.get(node)!, span }));
  return { nodes, functions, regions, sourceMap };
}

export interface ForgeWebScriptSoNOptimizationResult {
  readonly module: ForgeWebScriptSoNModule;
  /** Compatibility-lowered tree IR carrying the SoN graph's real decisions; this is what the backend should consume. */
  readonly ir: ForgeWebScriptIrModule;
  readonly report: ForgeWebScriptSoNOptimizationReport;
}

/**
 * Optimizes a SoN graph built from the *unoptimized* semantic tree
 * (`sourceIr`). SoN is the canonical optimization boundary: this function
 * performs genuine constant/copy-propagation (over the tree, then rebuilds
 * the graph from the result) plus genuine graph-native CSE and node/function
 * reachability pruning, and returns a compatibility-lowered IR tree that
 * reflects those decisions for the tree-shaped Wasm backend to consume.
 * `optimizer.ts`'s tree-IR optimizer remains only as a legacy/compatibility
 * adapter and is no longer the source of truth for the optimized output.
 */
export function optimizeForgeWebScriptSoN(
  baseline: ForgeWebScriptSoNModule,
  sourceIr: ForgeWebScriptIrModule,
  mode: ForgeWebScriptSoNOptimization = baseline.optimization,
): ForgeWebScriptSoNOptimizationResult {
  const beforeHash = forgeWebScriptSoNGraphHash(baseline);
  if (mode === 'debug') {
    const passes = orderedPasses.map((name) => ({
      name,
      applied: 0,
      skipped: 1,
      reason: 'debug optimization disabled',
    }));
    const report: ForgeWebScriptSoNOptimizationReport = {
      mode,
      passes,
      nodesBefore: baseline.nodes.length,
      nodesAfter: baseline.nodes.length,
      graphHashBefore: beforeHash,
      graphHashAfter: beforeHash,
    };
    return {
      module: { ...baseline, optimization: mode, graphHash: beforeHash, optimizationReport: report },
      ir: sourceIr,
      report,
    };
  }

  const propagated = sonPropagateIr(sourceIr);
  const propagatedGraph = buildForgeWebScriptSoN(propagated.ir, {
    compilerVersion: baseline.compilerVersion,
    sourceHash: baseline.sourceHash,
    optimization: mode,
    boundsChecks: baseline.boundsChecks,
    languageVersion: baseline.languageVersion,
    abiVersion: baseline.abiVersion,
  });

  const canonical = sonCanonicalizeNodes(propagatedGraph.nodes);
  const remapId = (id: number): number => canonical.remap.get(id) ?? id;
  const preDceGraph: ForgeWebScriptSoNModule = {
    ...propagatedGraph,
    nodes: canonical.nodes,
    regions: propagatedGraph.regions.map((region) => ({ ...region, nodes: region.nodes.map(remapId) })),
    functions: propagatedGraph.functions.map((entry) => ({ ...entry, entry: remapId(entry.entry) })),
    sourceMap: propagatedGraph.sourceMap.filter(({ node }) => !canonical.remap.has(node)),
  };

  const pruned = sonPruneGraph(preDceGraph);
  const liveFunctionNames = new Set(pruned.functions.map(({ name }) => name));
  const finalIr: ForgeWebScriptIrModule = {
    ...propagated.ir,
    functions: propagated.ir.functions.filter(({ name }) => liveFunctionNames.has(name)),
  };
  const renumbered = sonRenumberGraph(pruned);

  const base = {
    ...preDceGraph,
    nodes: renumbered.nodes,
    regions: renumbered.regions,
    functions: renumbered.functions,
    sourceMap: renumbered.sourceMap,
    graphHash: '',
  };
  const graphHashAfter = graphIdentity(base);

  const boundsAnnotated = sonAnnotateBounds(finalIr);

  const functionsRemoved = propagatedGraph.functions.length - pruned.functions.length;
  const passes: ForgeWebScriptSoNPassReport[] = [
    { name: 'constant-propagation', applied: propagated.constantsFolded, skipped: 0 },
    { name: 'copy-propagation', applied: propagated.copiesPropagated, skipped: 0 },
    { name: 'global-value-numbering', applied: canonical.deduped, skipped: 0 },
    {
      name: 'cfg-simplification',
      applied: 0,
      skipped: 1,
      reason: 'CFG block merging moves to the Wasm-stage optimizer landing in step 3',
    },
    { name: 'dead-node-elimination', applied: pruned.removedNodes, skipped: 0 },
    { name: 'reachability-pruning', applied: functionsRemoved, skipped: 0 },
    {
      name: 'purity-analysis',
      applied: 0,
      skipped: 1,
      reason: 'Purity facts are not yet attached to SoN nodes; this pass is analysis-only for now',
    },
    {
      name: 'inlining',
      applied: 0,
      skipped: 1,
      reason: 'Call-site cost modeling on the SoN graph is not yet implemented; this pass is analysis-only for now',
    },
    {
      name: 'escape-analysis',
      applied: 0,
      skipped: 1,
      reason:
        'Escape facts are enforced by step-1 safety diagnostics; SoN-native escape tagging is not yet implemented',
    },
    {
      name: 'switch-density',
      applied: 0,
      skipped: 1,
      reason: 'Switch density classification moves to the Wasm-stage optimizer landing in step 3',
    },
    {
      name: 'bounds-proof',
      applied: boundsAnnotated,
      skipped: 0,
      reason: 'Eliding runtime checks for proven-safe constant index reads',
    },
  ];
  const report: ForgeWebScriptSoNOptimizationReport = {
    mode,
    passes,
    nodesBefore: baseline.nodes.length,
    nodesAfter: pruned.nodes.length,
    graphHashBefore: beforeHash,
    graphHashAfter,
  };
  return { module: { ...base, graphHash: graphHashAfter, optimizationReport: report }, ir: finalIr, report };
}
