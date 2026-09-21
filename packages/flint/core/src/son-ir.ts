import { flintTypeNameToString, type FlintModule, type FlintTypeName } from './ast.js';
import { lowerFlintToIr } from './ir.js';
import { FLINT_ABI_VERSION, FLINT_LANGUAGE_VERSION } from './manifest.js';

import type { FlintSourceSpan } from './diagnostics.js';
import type { FlintIrExpression, FlintIrModule, FlintIrStatement } from './ir.js';

/** Schema format version supported by the Flint semantic-operation graph. */
export const FLINT_SON_SCHEMA_VERSION = '1.0' as const;
/** Optimization profile used when building or optimizing a SoN module. */
export type FlintSoNOptimization = 'debug' | 'release';
/** Bounds-check policy recorded in a SoN module. */
export type FlintSoNBoundsChecks = 'runtime' | 'proven-safe' | 'excluded-by-profile';
/** Memory-management model implemented by a SoN module. */
export type FlintSoNMemoryModel = 'region-arc-checked-linear';
/** Observable effect category associated with a SoN node. */
export type FlintSoNEffect = 'pure' | 'read' | 'write' | 'call' | 'control' | 'allocation' | 'unknown';
/** Alias classification inferred for a SoN node. */
export type FlintSoNAliasFact = 'none' | 'local' | 'borrowed' | 'mutable' | 'unknown';
/** Ownership classification inferred for a SoN node. */
export type FlintSoNOwnershipFact = 'value' | 'borrowed' | 'owned' | 'shared' | 'unknown';

/** A node in the persisted semantic-operation graph. */
export interface FlintSoNNode {
  readonly id: number;
  readonly kind: string;
  readonly functionName: string;
  readonly inputs: readonly number[];
  readonly effects: readonly FlintSoNEffect[];
  readonly alias: FlintSoNAliasFact;
  readonly ownership: FlintSoNOwnershipFact;
  readonly type?: string;
  readonly value?: boolean | number | string;
  /** Set only for `call` nodes; used by reachability-pruning to keep called functions live. */
  readonly callee?: string;
  readonly span?: FlintSourceSpan;
}

/** A control-flow region grouping nodes in one function. */
export interface FlintSoNControlRegion {
  readonly id: number;
  readonly functionName: string;
  readonly kind: 'function' | 'block' | 'branch' | 'loop' | 'switch';
  readonly parent?: number;
  readonly nodes: readonly number[];
}

/** The entry node and export status for a function represented in the graph. */
export interface FlintSoNFunction {
  readonly name: string;
  readonly entry: number;
  readonly exported: boolean;
}

/** Accounting information for one SoN optimization pass. */
export interface FlintSoNPassReport {
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

/** Aggregate accounting information for a complete SoN optimization run. */
export interface FlintSoNOptimizationReport {
  readonly mode: FlintSoNOptimization;
  readonly passes: readonly FlintSoNPassReport[];
  readonly nodesBefore: number;
  readonly nodesAfter: number;
  readonly graphHashBefore: string;
  readonly graphHashAfter: string;
}

/** Persisted semantic-operation graph and its compiler metadata. */
export interface FlintSoNModule {
  readonly schemaVersion: typeof FLINT_SON_SCHEMA_VERSION;
  readonly compilerVersion: string;
  readonly languageVersion: string;
  readonly abiVersion: string;
  readonly sourceHash: string;
  readonly graphHash: string;
  readonly optimization: FlintSoNOptimization;
  readonly boundsChecks: FlintSoNBoundsChecks;
  readonly memoryModel: FlintSoNMemoryModel;
  readonly functions: readonly FlintSoNFunction[];
  readonly nodes: readonly FlintSoNNode[];
  readonly regions: readonly FlintSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: FlintSourceSpan }[];
  readonly optimizationReport?: FlintSoNOptimizationReport;
}

/** Compatibility alias for the serializable SoN module artifact. */
export type FlintSoNArtifact = FlintSoNModule;

/** Inputs required to build a deterministic SoN module from lowered IR. */
export interface FlintSoNBuildOptions {
  readonly compilerVersion: string;
  readonly sourceHash: string;
  readonly optimization?: FlintSoNOptimization;
  readonly boundsChecks?: FlintSoNBoundsChecks;
  readonly languageVersion?: string;
  readonly abiVersion?: string;
}

/**
 * Computes a compact deterministic hash for graph-identity inputs.
 *
 * @param value - Textual value to hash.
 * @returns An eight-character hexadecimal hash.
 */
function hash(value: string): string {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619) >>> 0;
  }
  return result.toString(16).padStart(8, '0');
}

/**
 * Recursively sorts object keys so serialized graph metadata remains deterministic.
 *
 * @param value - Serializable value to stabilize.
 * @returns A value with every object key sorted recursively.
 */
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  return value;
}

/**
 * Derives the content identity of a graph while excluding generated identity and source-location fields.
 *
 * @param module - Complete or pre-identity SoN module.
 * @returns Deterministic graph hash.
 */
function graphIdentity(module: FlintSoNModule | Omit<FlintSoNModule, 'graphHash' | 'optimizationReport'>): string {
  const base = graphIdentityBase(module);
  const sanitized = {
    ...base,
    nodes: base.nodes.map(({ span: _span, ...node }) => node),
    sourceMap: [],
  };
  return hash(JSON.stringify(stableValue(sanitized)));
}

/**
 * Removes generated identity fields from an input accepted by graph hashing.
 *
 * @param module - Complete or pre-identity SoN module.
 * @returns Module fields that participate in graph identity.
 */
function graphIdentityBase(
  module: FlintSoNModule | Omit<FlintSoNModule, 'graphHash' | 'optimizationReport'>,
): Omit<FlintSoNModule, 'graphHash' | 'optimizationReport'> {
  if ('graphHash' in module) {
    const { graphHash: _graphHash, optimizationReport: _report, ...base } = module;
    return base;
  }
  return module;
}

/**
 * Extracts a printable type from IR expressions that retain concrete type information.
 *
 * @param expression - IR expression to inspect.
 * @returns Printable type, or undefined when the expression is untyped.
 */
// skipcq: JS-R1005
function typeOfExpression(expression: FlintIrExpression): string | undefined {
  if (expression.kind === 'literal') return expression.type;
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return flintTypeNameToString(expression.type);
  if (expression.kind === 'struct-value' || expression.kind === 'enum-value')
    return flintTypeNameToString(expression.type);
  return undefined;
}

/**
 * Classifies ownership from a printable Flint type.
 *
 * @param type - Optional printable type.
 * @returns Ownership fact inferred from the type's reference prefix.
 */
function ownershipOfType(type: string | undefined): FlintSoNOwnershipFact {
  if (type === undefined) return 'unknown';
  return type.startsWith('&mut ') ? 'borrowed' : type.startsWith('&') ? 'borrowed' : 'value';
}

/**
 * Derives observable effects for an IR expression.
 *
 * @param expression - IR expression to classify.
 * @returns Effect tags associated with evaluating the expression.
 */
// skipcq: JS-R1005
function expressionEffects(expression: FlintIrExpression): readonly FlintSoNEffect[] {
  if (expression.kind === 'call') return expression.standardLibrary === undefined ? ['call', 'unknown'] : ['pure'];
  if (expression.kind === 'identifier') return ['read'];
  if (expression.kind === 'literal' || expression.kind === 'function-value') return ['pure'];
  if (expression.kind === 'binary' || expression.kind === 'unary') return ['pure'];
  return ['allocation'];
}

/**
 * Derives node effects for statement-shaped (non-expression) SoN nodes, based on node kind alone.
 *
 * @param kind - SoN node kind string (e.g. `'let'`, `'control.if'`, `'assign'`).
 * @returns The effect tags for the node.
 */
// skipcq: JS-R1005
function nonExpressionNodeEffects(kind: string): readonly FlintSoNEffect[] {
  if (kind === 'let' || kind === 'function-entry') return ['pure'];
  if (kind.includes('control') || kind === 'return' || kind === 'yield') return ['control'];
  return ['write'];
}

/**
 * Derives the effect tags for a SoN node, dispatching by whether it carries a source expression.
 *
 * @param kind - SoN node kind string.
 * @param expression - Source IR expression, when the node represents an evaluated expression.
 * @returns The effect tags for the node.
 */
function effectsForSonNode(kind: string, expression: FlintIrExpression | undefined): readonly FlintSoNEffect[] {
  return expression === undefined ? nonExpressionNodeEffects(kind) : expressionEffects(expression);
}

/**
 * Derives the alias fact for a SoN node from its kind.
 *
 * @param kind - SoN node kind string.
 * @returns The alias fact classification.
 */
function aliasForSonNodeKind(kind: string): FlintSoNAliasFact {
  if (kind === 'read') return 'local';
  if (kind.includes('assign')) return 'mutable';
  return 'none';
}

/**
 * Identifies leaf IR expressions that map directly to a single, childless SoN node.
 *
 * @param expression - Candidate IR expression.
 * @returns True if expression is a literal, identifier, or function-value reference.
 */
function isLeafSonExpression(
  expression: FlintIrExpression,
): expression is Extract<FlintIrExpression, { kind: 'literal' | 'identifier' | 'function-value' }> {
  const kind = expression.kind;
  return kind === 'literal' || kind === 'identifier' || kind === 'function-value';
}

/**
 * Identifies aggregate-shaped IR expressions built from a homogeneous list of child values.
 *
 * @param expression - Candidate IR expression.
 * @returns True if expression is a struct-value, enum-value, array-literal, or vector-literal.
 */
function isAggregateSonExpression(
  expression: FlintIrExpression,
): expression is Extract<
  FlintIrExpression,
  { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' }
> {
  const kind = expression.kind;
  return kind === 'struct-value' || kind === 'enum-value' || kind === 'array-literal' || kind === 'vector-literal';
}

/**
 * Identifies IR statements that lower to a single childless-control SoN node
 * (no nested statement bodies or regions).
 *
 * @param statement - Candidate IR statement.
 * @returns True if statement is let, assignment, return, expression-statement, or yield.
 */
function isLinearSonStatement(
  statement: FlintIrStatement,
): statement is Extract<
  FlintIrStatement,
  { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' }
> {
  const kind = statement.kind;
  return (
    kind === 'let' || kind === 'assignment' || kind === 'return' || kind === 'expression-statement' || kind === 'yield'
  );
}

/** Builds a deterministic SoN graph from a lowered Flint module. */
class SoNBuilder {
  private nextNode = 1;
  private nextRegion = 1;
  private readonly nodes: FlintSoNNode[] = [];
  private readonly regions: FlintSoNControlRegion[] = [];
  private readonly sourceMap: { node: number; span: FlintSourceSpan }[] = [];

  private readonly module: FlintIrModule;

  /**
   * Creates a graph builder for one lowered module.
   *
   * @param module - Lowered IR module to encode.
   */
  constructor(module: FlintIrModule) {
    this.module = module;
  }

  /**
   * Appends a node and its optional source mapping to the graph under construction.
   *
   * @param functionName - Enclosing function name.
   * @param kind - Semantic node kind.
   * @param inputs - Dependency node ids.
   * @param span - Source span for diagnostic mapping, if available.
   * @param expression - Source expression supplying type/value metadata, if any.
   * @returns The allocated node id.
   */
  // skipcq: JS-R1005
  private node(
    functionName: string,
    kind: string,
    inputs: readonly number[],
    span: FlintSourceSpan | undefined,
    expression?: FlintIrExpression,
  ): number {
    const id = this.nextNode++;
    const type = expression === undefined ? undefined : typeOfExpression(expression);
    const node: FlintSoNNode = {
      id,
      kind,
      functionName,
      inputs: [...inputs],
      effects: effectsForSonNode(kind, expression),
      alias: aliasForSonNodeKind(kind),
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

  /**
   * Builds a childless SoN node for a leaf expression (literal, identifier, or function-value).
   *
   * @param functionName - Enclosing function name.
   * @param expression - Leaf IR expression.
   * @returns The id of the created node.
   */
  private expressionLeaf(
    functionName: string,
    expression: Extract<FlintIrExpression, { kind: 'literal' | 'identifier' | 'function-value' }>,
  ): number {
    return this.node(
      functionName,
      expression.kind === 'identifier' ? 'read' : expression.kind,
      [],
      expression.span,
      expression,
    );
  }

  /**
   * Builds a SoN node for a call expression, recursively lowering its arguments.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR call expression.
   * @returns The id of the created node.
   */
  private expressionCall(functionName: string, expression: Extract<FlintIrExpression, { kind: 'call' }>): number {
    return this.node(
      functionName,
      'call',
      expression.arguments.map((argument) => this.expression(functionName, argument)),
      expression.span,
      expression,
    );
  }

  /**
   * Builds a SoN node for a binary expression, recursively lowering both operands.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR binary expression.
   * @returns The id of the created node.
   */
  private expressionBinary(functionName: string, expression: Extract<FlintIrExpression, { kind: 'binary' }>): number {
    return this.node(
      functionName,
      `binary.${expression.operator}`,
      [this.expression(functionName, expression.left), this.expression(functionName, expression.right)],
      expression.span,
      expression,
    );
  }

  /**
   * Builds a SoN node for a unary expression, recursively lowering its operand.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR unary expression.
   * @returns The id of the created node.
   */
  private expressionUnary(functionName: string, expression: Extract<FlintIrExpression, { kind: 'unary' }>): number {
    return this.node(
      functionName,
      `unary.${expression.operator}`,
      [this.expression(functionName, expression.operand)],
      expression.span,
      expression,
    );
  }

  /**
   * Builds a SoN node for an index expression, recursively lowering the receiver and index.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR index expression.
   * @returns The id of the created node.
   */
  private expressionIndex(functionName: string, expression: Extract<FlintIrExpression, { kind: 'index' }>): number {
    return this.node(
      functionName,
      'index',
      [this.expression(functionName, expression.receiver), this.expression(functionName, expression.index)],
      expression.span,
      expression,
    );
  }

  /**
   * Builds a SoN node for a match expression, recursively lowering the scrutinee and arm values.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR match expression.
   * @returns The id of the created node.
   */
  private expressionMatch(functionName: string, expression: Extract<FlintIrExpression, { kind: 'match' }>): number {
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

  /**
   * Builds a SoN node for an aggregate expression (struct-value, enum-value, array-literal,
   * vector-literal), recursively lowering its child values.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR aggregate expression.
   * @returns The id of the created node.
   */
  private expressionAggregate(
    functionName: string,
    expression: Extract<
      FlintIrExpression,
      { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' }
    >,
  ): number {
    switch (expression.kind) {
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
      default: {
        const exhaustiveCheck: never = expression;
        throw new Error(`Unexpected aggregate expression kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Lowers a single IR expression into a SoN node, dispatching by expression shape.
   *
   * @param functionName - Enclosing function name.
   * @param expression - IR expression to lower.
   * @returns The id of the created (or recursively created) node.
   */
  // skipcq: JS-R1005
  private expression(functionName: string, expression: FlintIrExpression): number {
    if (isLeafSonExpression(expression)) return this.expressionLeaf(functionName, expression);
    if (expression.kind === 'call') return this.expressionCall(functionName, expression);
    if (expression.kind === 'binary') return this.expressionBinary(functionName, expression);
    if (expression.kind === 'unary') return this.expressionUnary(functionName, expression);
    if (expression.kind === 'index') return this.expressionIndex(functionName, expression);
    if (isAggregateSonExpression(expression)) return this.expressionAggregate(functionName, expression);
    return this.expressionMatch(functionName, expression);
  }

  /**
   * Appends a control-flow region covering the provided nodes.
   *
   * @param functionName - Enclosing function name.
   * @param kind - Control-flow region kind.
   * @param nodes - Node ids contained by the region.
   * @param parent - Parent region id, if this region is nested.
   * @returns The allocated region id.
   */
  private region(
    functionName: string,
    kind: FlintSoNControlRegion['kind'],
    nodes: readonly number[],
    parent?: number,
  ): number {
    const id = this.nextRegion++;
    this.regions.push({ id, functionName, kind, ...(parent === undefined ? {} : { parent }), nodes: [...nodes] });
    return id;
  }

  /**
   * Builds a SoN node for a linear (non-control-flow) statement.
   *
   * @param functionName - Enclosing function name.
   * @param statement - Linear IR statement.
   * @returns The id of the created node.
   */
  // skipcq: JS-R1005
  private linearStatementNode(
    functionName: string,
    statement: Extract<FlintIrStatement, { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' }>,
  ): number {
    switch (statement.kind) {
      case 'let': {
        return this.node(functionName, 'let', [this.expression(functionName, statement.value)], statement.span);
      }
      case 'assignment': {
        return this.node(functionName, 'assign', [this.expression(functionName, statement.value)], statement.span);
      }
      case 'return': {
        return this.node(
          functionName,
          'return',
          statement.value === undefined ? [] : [this.expression(functionName, statement.value)],
          statement.span,
        );
      }
      case 'expression-statement': {
        return this.node(
          functionName,
          'expression',
          [this.expression(functionName, statement.expression)],
          statement.span,
        );
      }
      case 'yield': {
        return this.node(functionName, 'yield', [this.expression(functionName, statement.value)], statement.span);
      }
      default: {
        const exhaustiveCheck: never = statement;
        throw new Error(`Unexpected linear statement kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Builds a SoN node (and branch region) for an `if` statement.
   *
   * @param functionName - Enclosing function name.
   * @param statement - IR `if` statement.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created control node.
   */
  private ifStatementNode(
    functionName: string,
    statement: Extract<FlintIrStatement, { kind: 'if' }>,
    parentRegion: number | undefined,
  ): number {
    const body = this.statements(functionName, statement.consequent, parentRegion);
    const alternate =
      statement.alternate === undefined ? [] : this.statements(functionName, statement.alternate, parentRegion);
    const node = this.node(
      functionName,
      'control.if',
      [this.expression(functionName, statement.condition), ...body, ...alternate],
      statement.span,
    );
    this.region(functionName, 'branch', [node, ...body, ...alternate], parentRegion);
    return node;
  }

  /**
   * Builds a SoN node (and loop region) for a `while`/`do-while` statement.
   *
   * @param functionName - Enclosing function name.
   * @param statement - IR `while` or `do-while` statement.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created control node.
   */
  private loopStatementNode(
    functionName: string,
    statement: Extract<FlintIrStatement, { kind: 'while' | 'do-while' }>,
    parentRegion: number | undefined,
  ): number {
    const body = this.statements(functionName, statement.body, parentRegion);
    const node = this.node(
      functionName,
      `control.${statement.kind}`,
      [this.expression(functionName, statement.condition), ...body],
      statement.span,
    );
    this.region(functionName, 'loop', [node, ...body], parentRegion);
    return node;
  }

  /**
   * Builds a SoN node (and switch region) for a `switch` statement.
   *
   * @param functionName - Enclosing function name.
   * @param statement - IR `switch` statement.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created control node.
   */
  private switchStatementNode(
    functionName: string,
    statement: Extract<FlintIrStatement, { kind: 'switch' }>,
    parentRegion: number | undefined,
  ): number {
    const arms = statement.cases.flatMap((arm) => this.statements(functionName, arm.body, parentRegion));
    const fallback =
      statement.defaultCase === undefined ? [] : this.statements(functionName, statement.defaultCase, parentRegion);
    const node = this.node(
      functionName,
      'control.switch',
      [this.expression(functionName, statement.value), ...arms, ...fallback],
      statement.span,
    );
    this.region(functionName, 'switch', [node, ...arms, ...fallback], parentRegion);
    return node;
  }

  /**
   * Builds a SoN node (and branch region) for a `match-statement`.
   *
   * @param functionName - Enclosing function name.
   * @param statement - IR match statement.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created control node.
   */
  private matchStatementNode(
    functionName: string,
    statement: Extract<FlintIrStatement, { kind: 'match-statement' }>,
    parentRegion: number | undefined,
  ): number {
    const arms = statement.arms.map((arm) => this.expression(functionName, arm.value));
    const node = this.node(
      functionName,
      'control.match',
      [this.expression(functionName, statement.value), ...arms],
      statement.span,
    );
    this.region(functionName, 'branch', [node, ...arms], parentRegion);
    return node;
  }

  /**
   * Builds a SoN node (and loop region) for an `iterator-loop` statement.
   *
   * @param functionName - Enclosing function name.
   * @param statement - IR iterator-loop statement.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created control node.
   */
  private iteratorLoopStatementNode(
    functionName: string,
    statement: Extract<FlintIrStatement, { kind: 'iterator-loop' }>,
    parentRegion: number | undefined,
  ): number {
    const body = this.statements(functionName, statement.body, parentRegion);
    const node = this.node(
      functionName,
      'control.iterator-loop',
      [this.expression(functionName, statement.iterator), ...body],
      statement.span,
    );
    this.region(functionName, 'loop', [node, ...body], parentRegion);
    return node;
  }

  /**
   * Builds a SoN node for a control-flow statement, dispatching by statement kind.
   *
   * @param functionName - Enclosing function name.
   * @param statement - Control-flow IR statement.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created control node.
   */
  // skipcq: JS-R1005
  private controlStatementNode(
    functionName: string,
    statement: Extract<
      FlintIrStatement,
      { kind: 'if' | 'while' | 'do-while' | 'switch' | 'match-statement' | 'iterator-loop' }
    >,
    parentRegion: number | undefined,
  ): number {
    switch (statement.kind) {
      case 'if': {
        return this.ifStatementNode(functionName, statement, parentRegion);
      }
      case 'while':
      case 'do-while': {
        return this.loopStatementNode(functionName, statement, parentRegion);
      }
      case 'switch': {
        return this.switchStatementNode(functionName, statement, parentRegion);
      }
      case 'match-statement': {
        return this.matchStatementNode(functionName, statement, parentRegion);
      }
      case 'iterator-loop': {
        return this.iteratorLoopStatementNode(functionName, statement, parentRegion);
      }
      default: {
        const exhaustiveCheck: never = statement;
        throw new Error(`Unexpected control statement kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Builds a SoN node for a single statement, dispatching between linear and control-flow shapes.
   *
   * @param functionName - Enclosing function name.
   * @param statement - IR statement to lower.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns The id of the created node.
   */
  private statementNode(functionName: string, statement: FlintIrStatement, parentRegion: number | undefined): number {
    if (isLinearSonStatement(statement)) return this.linearStatementNode(functionName, statement);
    return this.controlStatementNode(functionName, statement, parentRegion);
  }

  /**
   * Lowers an ordered statement list into SoN nodes.
   *
   * @param functionName - Enclosing function name.
   * @param statements - IR statements to lower.
   * @param parentRegion - Enclosing control region id, if any.
   * @returns Node ids created for the statement list.
   */
  private statements(
    functionName: string,
    statements: readonly FlintIrStatement[],
    parentRegion?: number,
  ): readonly number[] {
    const result: number[] = [];
    for (const statement of statements) {
      result.push(this.statementNode(functionName, statement, parentRegion));
    }
    return result;
  }

  /**
   * Builds the complete SoN module and computes its deterministic graph identity.
   *
   * @param options - Build metadata and optional profile selections.
   * @returns Persisted semantic-operation graph.
   */
  // skipcq: JS-R1005
  build(options: FlintSoNBuildOptions): FlintSoNModule {
    const functions: FlintSoNFunction[] = [];
    for (const declaration of this.module.functions.toSorted((leftDecl, rightDecl) =>
      leftDecl.name.localeCompare(rightDecl.name),
    )) {
      const entry = this.node(declaration.name, 'function-entry', [], declaration.span);
      const body = this.statements(declaration.name, declaration.body);
      this.region(declaration.name, 'function', [entry, ...body]);
      functions.push({ name: declaration.name, entry, exported: declaration.exported });
    }
    const base = {
      schemaVersion: FLINT_SON_SCHEMA_VERSION,
      compilerVersion: options.compilerVersion,
      languageVersion: options.languageVersion ?? FLINT_LANGUAGE_VERSION,
      abiVersion: options.abiVersion ?? FLINT_ABI_VERSION,
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

/**
 * Builds a semantic-operation graph from already-lowered Flint IR.
 *
 * @param module - Lowered IR module to encode.
 * @param options - Build metadata and profile selections.
 * @returns Deterministic SoN module.
 */
export function buildFlintSoN(module: FlintIrModule, options: FlintSoNBuildOptions): FlintSoNModule {
  return new SoNBuilder(module).build(options);
}

/**
 * Builds a semantic-operation graph from an AST module through the standard IR lowering pass.
 *
 * @param module - AST module to lower and encode.
 * @param options - Build metadata and profile selections.
 * @returns Deterministic SoN module.
 */
export function buildFlintSoNFromAst(module: FlintModule, options: FlintSoNBuildOptions): FlintSoNModule {
  return buildFlintSoN(lowerFlintToIr(module), options);
}

/**
 * Computes the deterministic identity of an existing SoN module.
 *
 * @param module - SoN module to hash.
 * @returns Stable graph identity hash.
 */
export function flintSoNGraphHash(module: FlintSoNModule): string {
  return graphIdentity(module);
}

const orderedPasses: readonly FlintSoNPassReport['name'][] = [
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

/** Literal IR expression alias used by constant-folding helpers. */
type SoNIrLiteral = Extract<FlintIrExpression, { kind: 'literal' }>;

/** Mutable counter passed by reference through the bounds-annotation visitors. */
interface SoNBoundsAnnotationCounter {
  value: number;
}

/**
 * Marks an index expression as provably in-bounds, bypassing the node's
 * `readonly` modifier through a typed object-assignment operation.
 *
 * @param expression - Index expression to annotate.
 */
function markIndexBoundsProvenSafe(expression: Extract<FlintIrExpression, { kind: 'index' }>): void {
  Object.assign(expression, { boundsCheck: 'proven-safe' } satisfies { boundsCheck: 'proven-safe' });
}

/**
 * Proves (and annotates) constant-index bounds safety for an identifier-receiver
 * index expression against a statically known fixed-array length.
 *
 * @param expression - Index expression to annotate.
 * @param receiver - Identifier receiver expression.
 * @param indexValue - Constant numeric index value.
 * @param localTypes - Known local variable types in the enclosing function.
 * @param counter - Mutable annotation counter, incremented when proven safe.
 */
function annotateIdentifierReceiverIndexBounds(
  expression: Extract<FlintIrExpression, { kind: 'index' }>,
  receiver: Extract<FlintIrExpression, { kind: 'identifier' }>,
  indexValue: number,
  localTypes: ReadonlyMap<string, FlintTypeName>,
  counter: SoNBoundsAnnotationCounter,
): void {
  const receiverType = localTypes.get(receiver.name);
  const provenSafe =
    receiverType !== undefined &&
    receiverType.length !== undefined &&
    indexValue >= 0 &&
    indexValue < receiverType.length;
  if (provenSafe) {
    markIndexBoundsProvenSafe(expression);
    counter.value += 1;
  }
}

/**
 * Proves (and annotates) constant-index bounds safety for a literal-receiver
 * (array-literal/vector-literal) index expression against its fixed length.
 *
 * @param expression - Index expression to annotate.
 * @param receiver - Array-literal or vector-literal receiver expression.
 * @param indexValue - Constant numeric index value.
 * @param counter - Mutable annotation counter, incremented when proven safe.
 */
function annotateLiteralReceiverIndexBounds(
  expression: Extract<FlintIrExpression, { kind: 'index' }>,
  receiver: Extract<FlintIrExpression, { kind: 'array-literal' | 'vector-literal' }>,
  indexValue: number,
  counter: SoNBoundsAnnotationCounter,
): void {
  const length = receiver.type.length;
  const provenSafe = length !== undefined && indexValue >= 0 && indexValue < length;
  if (provenSafe) {
    markIndexBoundsProvenSafe(expression);
    counter.value += 1;
  }
}

/**
 * Attempts to prove constant-index bounds safety for an index expression,
 * dispatching by receiver shape.
 *
 * @param expression - Index expression to inspect and possibly annotate.
 * @param localTypes - Known local variable types in the enclosing function.
 * @param counter - Mutable annotation counter, incremented when proven safe.
 */
// skipcq: JS-R1005
function annotateIndexExpressionBounds(
  expression: Extract<FlintIrExpression, { kind: 'index' }>,
  localTypes: ReadonlyMap<string, FlintTypeName>,
  counter: SoNBoundsAnnotationCounter,
): void {
  const receiver = expression.receiver;
  const index = expression.index;
  if (index.kind !== 'literal' || typeof index.value !== 'number') return;
  if (receiver.kind === 'identifier') {
    annotateIdentifierReceiverIndexBounds(expression, receiver, index.value, localTypes, counter);
  } else if (receiver.kind === 'array-literal' || receiver.kind === 'vector-literal') {
    annotateLiteralReceiverIndexBounds(expression, receiver, index.value, counter);
  }
}

/**
 * Recurses into the children of an aggregate expression (struct-value, enum-value,
 * array-literal, vector-literal) for bounds annotation.
 *
 * @param expression - Aggregate IR expression.
 * @param visit - Callback invoked for each child expression.
 */
function recurseSonBoundsAggregateExpression(
  expression: Extract<FlintIrExpression, { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' }>,
  visit: (expression: FlintIrExpression) => void,
): void {
  switch (expression.kind) {
    case 'struct-value': {
      Object.values(expression.fields).forEach(visit);
      break;
    }
    case 'enum-value': {
      expression.arguments.forEach(visit);
      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      expression.elements.forEach(visit);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Recurses into the children of a non-aggregate compound expression for bounds annotation.
 *
 * @param expression - IR expression whose children (if any) should be visited.
 * @param visit - Callback invoked for each child expression.
 */
// skipcq: JS-R1005
function recurseSonBoundsExpression(
  expression: FlintIrExpression,
  visit: (expression: FlintIrExpression) => void,
): void {
  if (isAggregateSonExpression(expression)) {
    recurseSonBoundsAggregateExpression(expression, visit);
    return;
  }
  switch (expression.kind) {
    case 'call': {
      expression.arguments.forEach(visit);
      break;
    }
    case 'binary': {
      visit(expression.left);
      visit(expression.right);
      break;
    }
    case 'unary': {
      visit(expression.operand);
      break;
    }
    case 'match': {
      visit(expression.value);
      for (const arm of expression.arms) visit(arm.value);
      break;
    }
    case 'index': {
      visit(expression.receiver);
      visit(expression.index);
      break;
    }
    // No default
  }
}

/**
 * Visits an expression for constant-index bounds proofs, annotating index
 * expressions in place and recursing into all child expressions.
 *
 * @param expression - IR expression to visit.
 * @param localTypes - Known local variable types in the enclosing function.
 * @param counter - Mutable annotation counter, incremented for each proof found.
 */
function visitSonBoundsExpression(
  expression: FlintIrExpression,
  localTypes: ReadonlyMap<string, FlintTypeName>,
  counter: SoNBoundsAnnotationCounter,
): void {
  if (expression.kind === 'index') {
    annotateIndexExpressionBounds(expression, localTypes, counter);
  }
  recurseSonBoundsExpression(expression, (child) => visitSonBoundsExpression(child, localTypes, counter));
}

/**
 * Identifies statements handled directly (without further statement recursion
 * beyond their own expression) during bounds annotation.
 *
 * @param statement - Candidate IR statement.
 * @returns True if statement is let, assignment, or expression-statement.
 */
function isSimpleSonBoundsStatement(
  statement: FlintIrStatement,
): statement is Extract<FlintIrStatement, { kind: 'let' | 'assignment' | 'expression-statement' }> {
  const kind = statement.kind;
  return kind === 'let' || kind === 'assignment' || kind === 'expression-statement';
}

/**
 * Identifies control-flow statements that recurse into nested statement bodies
 * during bounds annotation.
 *
 * @param statement - Candidate IR statement.
 * @returns True if statement is if, switch, while, do-while, or iterator-loop.
 */
function isControlSonBoundsStatement(
  statement: FlintIrStatement,
): statement is Extract<FlintIrStatement, { kind: 'if' | 'switch' | 'while' | 'do-while' | 'iterator-loop' }> {
  const kind = statement.kind;
  return kind === 'if' || kind === 'switch' || kind === 'while' || kind === 'do-while' || kind === 'iterator-loop';
}

/**
 * Visits a `let`/`assignment`/`expression-statement` statement for bounds annotation,
 * tracking newly declared local variable types.
 *
 * @param statement - Simple IR statement.
 * @param localTypes - Local variable types, updated in place for `let` declarations.
 * @param counter - Mutable annotation counter.
 */
function visitSonBoundsSimpleStatement(
  statement: Extract<FlintIrStatement, { kind: 'let' | 'assignment' | 'expression-statement' }>,
  localTypes: Map<string, FlintTypeName>,
  counter: SoNBoundsAnnotationCounter,
): void {
  switch (statement.kind) {
    case 'let': {
      localTypes.set(statement.name, statement.type);
      visitSonBoundsExpression(statement.value, localTypes, counter);
      break;
    }
    case 'assignment': {
      visitSonBoundsExpression(statement.value, localTypes, counter);
      break;
    }
    case 'expression-statement': {
      visitSonBoundsExpression(statement.expression, localTypes, counter);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Visits a control-flow statement for bounds annotation, recursing into nested
 * statement bodies via the supplied statement visitor callback.
 *
 * @param statement - Control-flow IR statement.
 * @param localTypes - Local variable types in the enclosing function.
 * @param counter - Mutable annotation counter.
 * @param visitStatement - Callback invoked for each nested statement.
 */
// skipcq: JS-R1005
function visitSonBoundsControlStatement(
  statement: Extract<FlintIrStatement, { kind: 'if' | 'switch' | 'while' | 'do-while' | 'iterator-loop' }>,
  localTypes: ReadonlyMap<string, FlintTypeName>,
  counter: SoNBoundsAnnotationCounter,
  visitStatement: (statement: FlintIrStatement) => void,
): void {
  // skipcq: JS-D1001
  const visitExpr = (expression: FlintIrExpression): void => visitSonBoundsExpression(expression, localTypes, counter);
  switch (statement.kind) {
    case 'if': {
      visitExpr(statement.condition);
      statement.consequent.forEach(visitStatement);
      statement.alternate?.forEach(visitStatement);
      break;
    }
    case 'switch': {
      visitExpr(statement.value);
      for (const arm of statement.cases) arm.body.forEach(visitStatement);
      statement.defaultCase?.forEach(visitStatement);
      break;
    }
    case 'while':
    case 'do-while': {
      visitExpr(statement.condition);
      statement.body.forEach(visitStatement);
      break;
    }
    case 'iterator-loop': {
      visitExpr(statement.iterator);
      statement.body.forEach(visitStatement);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Visits a statement for constant-index bounds proofs, dispatching by statement shape.
 *
 * @param statement - IR statement to visit.
 * @param localTypes - Local variable types, updated in place for `let` declarations.
 * @param counter - Mutable annotation counter.
 */
function visitSonBoundsStatement(
  statement: FlintIrStatement,
  localTypes: Map<string, FlintTypeName>,
  counter: SoNBoundsAnnotationCounter,
): void {
  if (isSimpleSonBoundsStatement(statement)) {
    visitSonBoundsSimpleStatement(statement, localTypes, counter);
    return;
  }
  if (statement.kind === 'return' && statement.value !== undefined) {
    visitSonBoundsExpression(statement.value, localTypes, counter);
    return;
  }
  if (isControlSonBoundsStatement(statement)) {
    visitSonBoundsControlStatement(statement, localTypes, counter, (child) =>
      visitSonBoundsStatement(child, localTypes, counter),
    );
  }
}

/**
 * Proves and annotates statically-safe constant-index array/vector accesses
 * across every function in a module, so the backend can elide their runtime
 * bounds checks.
 *
 * @param module - Unoptimized IR module to annotate in place.
 * @returns The number of index expressions proven safe.
 */
function sonAnnotateBounds(module: FlintIrModule): number {
  const counter: SoNBoundsAnnotationCounter = { value: 0 };
  for (const function_ of module.functions) {
    // Track local variable types to identify Array/Vector with known lengths.
    const localTypes = new Map<string, FlintTypeName>();
    for (const parameter of function_.parameters) {
      localTypes.set(parameter.name, parameter.type);
    }
    function_.body.forEach((statement) => visitSonBoundsStatement(statement, localTypes, counter));
  }
  return counter.value;
}

const SON_BOOLEAN_OPERATORS: Readonly<Record<string, (left: boolean, right: boolean) => boolean>> = {
  '&&': (left: boolean, right: boolean): boolean => left && right,
  '||': (left: boolean, right: boolean): boolean => left || right,
} satisfies Readonly<Record<string, (left: boolean, right: boolean) => boolean>>;

const SON_NUMERIC_OPERATORS: Readonly<Record<string, (left: number, right: number) => boolean | number>> = {
  '+': (left: number, right: number): number => left + right,
  '-': (left: number, right: number): number => left - right,
  '*': (left: number, right: number): number => left * right,
  '/': (left: number, right: number): number => left / right,
  '%': (left: number, right: number): number => left % right,
  '<': (left: number, right: number): boolean => left < right,
  '<=': (left: number, right: number): boolean => left <= right,
  '>': (left: number, right: number): boolean => left > right,
  '>=': (left: number, right: number): boolean => left >= right,
} satisfies Readonly<Record<string, (left: number, right: number) => boolean | number>>;

/**
 * Evaluates a supported boolean binary operation on literal operands.
 *
 * @param operator - Candidate binary operator.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @returns Folded boolean result, or undefined when the operands/operator do not match.
 */
function sonEvaluateBooleanBinary(operator: string, left: SoNIrLiteral, right: SoNIrLiteral): boolean | undefined {
  const evaluator = SON_BOOLEAN_OPERATORS[operator];
  if (evaluator === undefined || typeof left.value !== 'boolean' || typeof right.value !== 'boolean') return undefined;
  return evaluator(left.value, right.value);
}

/**
 * Evaluates a supported numeric or comparison binary operation on literal operands.
 *
 * @param operator - Candidate binary operator.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @returns Folded numeric or boolean result, or undefined when it cannot be folded.
 */
// skipcq: JS-R1005
function sonEvaluateNumericBinary(
  operator: string,
  left: SoNIrLiteral,
  right: SoNIrLiteral,
): boolean | number | undefined {
  const evaluator = SON_NUMERIC_OPERATORS[operator];
  if (evaluator === undefined || typeof left.value !== 'number' || typeof right.value !== 'number') return undefined;
  if ((operator === '/' || operator === '%') && right.value === 0) return undefined;
  return evaluator(left.value, right.value);
}

/**
 * Folds a binary operation when its literal operands admit a semantics-preserving result.
 *
 * @param operator - Binary operator to evaluate.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @returns Folded value, or undefined when the operation is not safely foldable.
 */
function sonEvaluateBinary(
  operator: string,
  left: SoNIrLiteral,
  right: SoNIrLiteral,
): boolean | number | string | undefined {
  const booleanResult = sonEvaluateBooleanBinary(operator, left, right);
  if (booleanResult !== undefined) return booleanResult;
  if (operator === '==') return left.value === right.value;
  if (operator === '!=') return left.value !== right.value;
  return sonEvaluateNumericBinary(operator, left, right);
}

/** Counts constant and copy substitutions performed during tree propagation. */
interface SoNPropagationCounters {
  constantsFolded: number;
  copiesPropagated: number;
}

/**
 * Collects assignments in one statement, including nested control-flow bodies.
 *
 * @param statement - Statement to inspect.
 * @param names - Mutable collection receiving assigned names.
 */
// skipcq: JS-R1005
function sonCollectAssignedNames(statement: FlintIrStatement, names: Set<string>): void {
  if (statement.kind === 'assignment') {
    names.add(statement.name);
    return;
  }
  if (statement.kind === 'if') {
    sonAssignedNames(statement.consequent, names);
    if (statement.alternate !== undefined) sonAssignedNames(statement.alternate, names);
    return;
  }
  if (statement.kind === 'switch') {
    for (const arm of statement.cases) sonAssignedNames(arm.body, names);
    if (statement.defaultCase !== undefined) sonAssignedNames(statement.defaultCase, names);
    return;
  }
  if (isSoNAssignmentLoop(statement)) {
    sonAssignedNames(statement.body, names);
  }
}

/**
 * Identifies loop statements whose bodies can contain assignments.
 *
 * @param statement - Candidate IR statement.
 * @returns True when the statement has a recursively visited loop body.
 */
function isSoNAssignmentLoop(
  statement: FlintIrStatement,
): statement is Extract<FlintIrStatement, { kind: 'while' | 'do-while' | 'iterator-loop' }> {
  return new Set<FlintIrStatement['kind']>(['while', 'do-while', 'iterator-loop']).has(statement.kind);
}

/**
 * Finds local names that can be reassigned anywhere in a statement list.
 *
 * @param statements - Statements whose nested assignments should be collected.
 * @param names - Existing set to extend during recursive traversal.
 * @returns The supplied set after collecting every assigned name.
 */
function sonAssignedNames(statements: readonly FlintIrStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    sonCollectAssignedNames(statement, names);
  }
  return names;
}

/**
 * Substitutes one identifier using the local propagation environment.
 *
 * @param expression - Identifier expression to transform.
 * @param locals - Current local copy/constant environment.
 * @param counters - Mutable propagation accounting.
 * @returns The replacement expression, or the original identifier when unknown.
 */
function sonTransformIdentifier(
  expression: Extract<FlintIrExpression, { kind: 'identifier' }>,
  locals: ReadonlyMap<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrExpression {
  const replacement = locals.get(expression.name);
  if (replacement === undefined) return expression;
  if (replacement.kind === 'literal') counters.constantsFolded += 1;
  else counters.copiesPropagated += 1;
  return { ...replacement, span: expression.span };
}

/**
 * Transforms one aggregate expression and all of its nested value expressions.
 *
 * @param expression - Aggregate expression to transform.
 * @param locals - Current local copy/constant environment.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent aggregate expression with transformed children.
 */
function sonTransformAggregateExpression(
  expression: Extract<FlintIrExpression, { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' }>,
  locals: ReadonlyMap<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrExpression {
  if (expression.kind === 'struct-value') {
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [
          name,
          sonTransformExpression(value, locals, counters),
        ]),
      ),
    };
  }
  if (expression.kind === 'enum-value') {
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => sonTransformExpression(argument, locals, counters)),
    };
  }
  return {
    ...expression,
    elements: expression.elements.map((element) => sonTransformExpression(element, locals, counters)),
  };
}

/**
 * Transforms and folds a unary expression when its operand is literal.
 *
 * @param expression - Unary expression to transform.
 * @param locals - Current local copy/constant environment.
 * @param counters - Mutable propagation accounting.
 * @returns Transformed expression, possibly replaced with a folded literal.
 */
// skipcq: JS-R1005
function sonTransformUnaryExpression(
  expression: Extract<FlintIrExpression, { kind: 'unary' }>,
  locals: ReadonlyMap<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrExpression {
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

/**
 * Transforms and folds a binary expression when both operands become literals.
 *
 * @param expression - Binary expression to transform.
 * @param locals - Current local copy/constant environment.
 * @param counters - Mutable propagation accounting.
 * @returns Transformed expression, possibly replaced with a folded literal.
 */
function sonTransformBinaryExpression(
  expression: Extract<FlintIrExpression, { kind: 'binary' }>,
  locals: ReadonlyMap<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrExpression {
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

/**
 * Identifies expressions that do not contain values eligible for propagation.
 *
 * @param expression - Candidate IR expression.
 * @returns True for literal and function-value expressions.
 */
function isSonPropagationTerminalExpression(
  expression: FlintIrExpression,
): expression is Extract<FlintIrExpression, { kind: 'literal' | 'function-value' }> {
  return new Set<FlintIrExpression['kind']>(['literal', 'function-value']).has(expression.kind);
}

/**
 * Folds constants and propagates copies (identifier-to-identifier aliases, not
 * only literals) directly over the unoptimized semantic tree. This is the
 * SoN optimizer's own constant/copy-propagation implementation: it is run
 * before the SoN graph is (re)built from its result, so the persisted graph
 * reflects genuine transformations rather than mirroring another optimizer.
 *
 * @param expression - IR expression to transform.
 * @param locals - Current local copy/constant environment.
 * @param counters - Mutable propagation accounting.
 * @returns Semantically equivalent transformed expression.
 */
// skipcq: JS-R1005
function sonTransformExpression(
  expression: FlintIrExpression,
  locals: ReadonlyMap<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrExpression {
  if (expression.kind === 'identifier') return sonTransformIdentifier(expression, locals, counters);
  if (isSonPropagationTerminalExpression(expression)) return expression;
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => sonTransformExpression(argument, locals, counters)),
    };
  if (isAggregateSonExpression(expression)) return sonTransformAggregateExpression(expression, locals, counters);
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
  if (expression.kind === 'unary') return sonTransformUnaryExpression(expression, locals, counters);
  if (expression.kind === 'binary') return sonTransformBinaryExpression(expression, locals, counters);
  return expression;
}

/** Statements whose transformations do not recurse into a statement body. */
type SoNLinearPropagationStatement = Extract<
  FlintIrStatement,
  { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' | 'match-statement' }
>;

/**
 * Identifies a statement that can be transformed without creating a nested local environment.
 *
 * @param statement - Candidate IR statement.
 * @returns True when the statement is linear for propagation purposes.
 */
function isSoNLinearPropagationStatement(statement: FlintIrStatement): statement is SoNLinearPropagationStatement {
  return new Set<FlintIrStatement['kind']>([
    'let',
    'assignment',
    'return',
    'expression-statement',
    'yield',
    'match-statement',
  ]).has(statement.kind);
}

/**
 * Transforms a `let` statement and records only stable literal or identifier aliases.
 *
 * @param statement - Let statement to transform.
 * @param locals - Local copy/constant environment updated for the binding.
 * @param mutableNames - Names assigned in the containing statement list.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed let statement.
 */
function sonTransformLetStatement(
  statement: Extract<FlintIrStatement, { kind: 'let' }>,
  locals: Map<string, FlintIrExpression>,
  mutableNames: ReadonlySet<string>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
  const value = sonTransformExpression(statement.value, locals, counters);
  if ((value.kind === 'literal' || value.kind === 'identifier') && !mutableNames.has(statement.name)) {
    locals.set(statement.name, value);
  } else {
    locals.delete(statement.name);
  }
  return { ...statement, value };
}

/**
 * Transforms a non-control-flow statement and updates the current local environment.
 *
 * @param statement - Linear statement to transform.
 * @param locals - Local copy/constant environment updated in statement order.
 * @param mutableNames - Names assigned in the containing statement list.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed statement.
 */
// skipcq: JS-R1005
function sonTransformLinearStatement(
  statement: SoNLinearPropagationStatement,
  locals: Map<string, FlintIrExpression>,
  mutableNames: ReadonlySet<string>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
  switch (statement.kind) {
    case 'let': {
      return sonTransformLetStatement(statement, locals, mutableNames, counters);
    }
    case 'assignment': {
      const value = sonTransformExpression(statement.value, locals, counters);
      locals.clear();
      return { ...statement, value };
    }
    case 'return': {
      return {
        ...statement,
        ...(statement.value === undefined ? {} : { value: sonTransformExpression(statement.value, locals, counters) }),
      };
    }
    case 'expression-statement': {
      return { ...statement, expression: sonTransformExpression(statement.expression, locals, counters) };
    }
    case 'yield': {
      return { ...statement, value: sonTransformExpression(statement.value, locals, counters) };
    }
    case 'match-statement': {
      return {
        ...statement,
        value: sonTransformExpression(statement.value, locals, counters),
        arms: statement.arms.map((arm) => ({ ...arm, value: sonTransformExpression(arm.value, locals, counters) })),
      };
    }
    default: {
      const exhaustiveCheck: never = statement;
      throw new Error(`Unexpected linear statement kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
    }
  }
}

/**
 * Transforms an `if` statement using isolated local environments for each branch.
 *
 * @param statement - Conditional statement to transform.
 * @param locals - Enclosing local environment, cleared when a branch assigns.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed conditional statement.
 */
// skipcq: JS-R1005
function sonTransformIfStatement(
  statement: Extract<FlintIrStatement, { kind: 'if' }>,
  locals: Map<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
  const condition = sonTransformExpression(statement.condition, locals, counters);
  const consequent = sonTransformStatements(statement.consequent, new Map(locals), counters);
  const alternate =
    statement.alternate === undefined
      ? undefined
      : sonTransformStatements(statement.alternate, new Map(locals), counters);
  if (
    sonAssignedNames(statement.consequent).size > 0 ||
    (statement.alternate !== undefined && sonAssignedNames(statement.alternate).size > 0)
  ) {
    locals.clear();
  }
  return { ...statement, condition, consequent, ...(alternate === undefined ? {} : { alternate }) };
}

/**
 * Transforms a `while` or `do-while` statement while excluding loop-mutated locals from its body environment.
 *
 * @param statement - Loop statement to transform.
 * @param locals - Enclosing local environment, cleared when the loop assigns.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed loop statement.
 */
function sonTransformConditionLoopStatement(
  statement: Extract<FlintIrStatement, { kind: 'while' | 'do-while' }>,
  locals: Map<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
  const assignedNames = sonAssignedNames(statement.body);
  const bodyLocals = new Map(locals);
  for (const name of assignedNames) bodyLocals.delete(name);
  const condition = sonTransformExpression(statement.condition, bodyLocals, counters);
  const body = sonTransformStatements(statement.body, bodyLocals, counters);
  if (assignedNames.size > 0) locals.clear();
  return { ...statement, condition, body };
}

/**
 * Transforms a `switch` statement with isolated environments for every arm.
 *
 * @param statement - Switch statement to transform.
 * @param locals - Enclosing local environment, cleared when an arm assigns.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed switch statement.
 */
// skipcq: JS-R1005
function sonTransformSwitchStatement(
  statement: Extract<FlintIrStatement, { kind: 'switch' }>,
  locals: Map<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
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
  ) {
    locals.clear();
  }
  return { ...statement, value, cases, ...(defaultCase === undefined ? {} : { defaultCase }) };
}

/**
 * Transforms an iterator loop while preventing the binding and mutated names from propagating into its body.
 *
 * @param statement - Iterator loop to transform.
 * @param locals - Enclosing local environment, cleared when the body assigns.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed iterator loop.
 */
function sonTransformIteratorLoopStatement(
  statement: Extract<FlintIrStatement, { kind: 'iterator-loop' }>,
  locals: Map<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
  const assignedNames = sonAssignedNames(statement.body);
  const bodyLocals = new Map(locals);
  for (const name of assignedNames) bodyLocals.delete(name);
  bodyLocals.delete(statement.binding);
  const iterator = sonTransformExpression(statement.iterator, locals, counters);
  const body = sonTransformStatements(statement.body, bodyLocals, counters);
  if (assignedNames.size > 0) locals.clear();
  return { ...statement, iterator, body };
}

/**
 * Transforms one statement while retaining the source transformer's local-environment invalidation rules.
 *
 * @param statement - Statement to transform.
 * @param locals - Local copy/constant environment updated in statement order.
 * @param mutableNames - Names assigned in the containing statement list.
 * @param counters - Mutable propagation accounting.
 * @returns Equivalent transformed statement.
 */
// skipcq: JS-R1005
function sonTransformStatement(
  statement: FlintIrStatement,
  locals: Map<string, FlintIrExpression>,
  mutableNames: ReadonlySet<string>,
  counters: SoNPropagationCounters,
): FlintIrStatement {
  if (isSoNLinearPropagationStatement(statement)) {
    return sonTransformLinearStatement(statement, locals, mutableNames, counters);
  }
  if (statement.kind === 'if') return sonTransformIfStatement(statement, locals, counters);
  if (statement.kind === 'while' || statement.kind === 'do-while') {
    return sonTransformConditionLoopStatement(statement, locals, counters);
  }
  if (statement.kind === 'switch') return sonTransformSwitchStatement(statement, locals, counters);
  return sonTransformIteratorLoopStatement(statement, locals, counters);
}

/**
 * Folds constants and propagates copies through an ordered statement list.
 *
 * @param statements - Statements to transform.
 * @param locals - Local copy/constant environment updated in statement order.
 * @param counters - Mutable propagation accounting.
 * @returns Semantically equivalent transformed statements.
 */
function sonTransformStatements(
  statements: readonly FlintIrStatement[],
  locals: Map<string, FlintIrExpression>,
  counters: SoNPropagationCounters,
): readonly FlintIrStatement[] {
  const mutableNames = sonAssignedNames(statements);
  return statements.map((statement) => sonTransformStatement(statement, locals, mutableNames, counters));
}

/**
 * Applies tree-level copy and constant propagation before rebuilding the SoN graph.
 *
 * @param module - Lowered IR module to transform.
 * @returns Transformed IR and propagation accounting.
 */
function sonPropagateIr(module: FlintIrModule): {
  readonly ir: FlintIrModule;
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
 * Determines whether a node can be safely deduplicated by global value numbering.
 *
 * @param node - SoN node to inspect.
 * @returns True when the node is pure and structurally eligible for CSE.
 */
function isEligibleForSonCse(node: FlintSoNNode): boolean {
  return (
    node.effects.length === 1 &&
    node.effects[0] === 'pure' &&
    (node.kind === 'literal' || node.kind.startsWith('binary.') || node.kind.startsWith('unary.'))
  );
}

/**
 * Builds the stable key used to identify equivalent CSE candidates.
 *
 * @param node - Eligible SoN node.
 * @param inputs - Inputs after transitive canonical-id remapping.
 * @returns Stable key scoped to the node's containing function.
 */
function sonCanonicalNodeKey(node: FlintSoNNode, inputs: readonly number[]): string {
  return `${node.functionName}\u0000${node.kind}\u0000${JSON.stringify(inputs)}\u0000${JSON.stringify(node.value)}\u0000${node.type ?? ''}`;
}

/**
 * Retrieves an existing canonical node id or records the first eligible node for its key.
 *
 * @param node - SoN node being visited.
 * @param inputs - Inputs after transitive canonical-id remapping.
 * @param canonicalByKey - Canonical-id index updated for first occurrences.
 * @returns Existing canonical id when the node is a duplicate, otherwise undefined.
 */
function sonCanonicalNodeId(
  node: FlintSoNNode,
  inputs: readonly number[],
  canonicalByKey: Map<string, number>,
): number | undefined {
  if (!isEligibleForSonCse(node)) return undefined;
  const key = sonCanonicalNodeKey(node, inputs);
  const existing = canonicalByKey.get(key);
  if (existing === undefined) canonicalByKey.set(key, node.id);
  return existing;
}

/**
 * Replaces a node's inputs only when a canonical-id remapping changed one.
 *
 * @param node - Original SoN node.
 * @param inputs - Remapped input ids.
 * @returns Original node or an equivalent node with updated inputs.
 */
function sonNodeWithCanonicalInputs(node: FlintSoNNode, inputs: readonly number[]): FlintSoNNode {
  if (inputs.every((id, index) => id === node.inputs[index])) return node;
  return { ...node, inputs };
}

/**
 * Structural value-numbering / CSE over the flat node list. Nodes are stored
 * in dependency order (a node's inputs always have lower ids), so a single
 * forward pass is sufficient: duplicate pure literal/unary/binary nodes
 * within the same function are collapsed to their first occurrence and every
 * later reference is remapped to the canonical id.
 *
 * @param nodes - Nodes to canonicalize in dependency order.
 * @returns Canonical nodes, duplicate-id remapping, and deduplication count.
 */
function sonCanonicalizeNodes(nodes: readonly FlintSoNNode[]): {
  readonly nodes: readonly FlintSoNNode[];
  readonly remap: ReadonlyMap<number, number>;
  readonly deduped: number;
} {
  const remap = new Map<number, number>();
  const canonicalByKey = new Map<string, number>();
  const output: FlintSoNNode[] = [];
  let deduped = 0;
  for (const node of nodes) {
    const inputs = node.inputs.map((id) => remap.get(id) ?? id);
    const existing = sonCanonicalNodeId(node, inputs, canonicalByKey);
    if (existing !== undefined) {
      remap.set(node.id, existing);
      deduped += 1;
      continue;
    }
    output.push(sonNodeWithCanonicalInputs(node, inputs));
  }
  return { nodes: output, remap, deduped };
}

/**
 * Seeds graph reachability with live function entries and their effectful nodes.
 *
 * @param graph - SoN graph being pruned.
 * @param liveFunctions - Names of functions currently known to be live.
 * @returns Initial referenced node ids.
 */
// skipcq: JS-R1005
function sonSeedReferencedNodes(graph: FlintSoNModule, liveFunctions: ReadonlySet<string>): Set<number> {
  const referenced = new Set<number>();
  for (const entry of graph.functions) {
    if (liveFunctions.has(entry.name)) referenced.add(entry.entry);
  }
  for (const node of graph.nodes) {
    if (liveFunctions.has(node.functionName) && node.effects.some((effect) => effect !== 'pure')) {
      referenced.add(node.id);
    }
  }
  return referenced;
}

/**
 * Traverses input edges until every dependency of a referenced node is referenced.
 *
 * @param byId - Node index by id.
 * @param referenced - Referenced ids to expand in place.
 */
// skipcq: JS-R1005
function sonExpandReferencedInputs(byId: ReadonlyMap<number, FlintSoNNode>, referenced: Set<number>): void {
  const pending = [...referenced];
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined) continue;
    const inputs = byId.get(id)?.inputs ?? [];
    for (const inputId of inputs) {
      if (!referenced.has(inputId)) {
        referenced.add(inputId);
        pending.push(inputId);
      }
    }
  }
}

/**
 * Adds declared callees reached through referenced call nodes to the live-function set.
 *
 * @param referenced - Nodes reachable from currently-live functions.
 * @param byId - Node index by id.
 * @param functionNames - All declared function names.
 * @param liveFunctions - Live function names updated in place.
 * @returns True when at least one new live function was discovered.
 */
// skipcq: JS-R1005
function sonGrowLiveFunctions(
  referenced: ReadonlySet<number>,
  byId: ReadonlyMap<number, FlintSoNNode>,
  functionNames: ReadonlySet<string>,
  liveFunctions: Set<string>,
): boolean {
  let grew = false;
  for (const id of referenced) {
    const node = byId.get(id);
    if (
      node?.kind === 'call' &&
      node.callee !== undefined &&
      functionNames.has(node.callee) &&
      !liveFunctions.has(node.callee)
    ) {
      liveFunctions.add(node.callee);
      grew = true;
    }
  }
  return grew;
}

/**
 * Reachability over both nodes and functions. Node reachability starts from
 * function entries and effectful nodes, transitively through inputs.
 * Function reachability starts from exported entries and grows whenever a
 * reachable `call` node's callee names another declared function, matching
 * the legacy tree-IR pruner's call-graph semantics but computed on the graph.
 *
 * @param graph - SoN graph to prune.
 * @returns Retained graph collections and removed node count.
 */
function sonPruneGraph(graph: FlintSoNModule): {
  readonly nodes: readonly FlintSoNNode[];
  readonly functions: readonly FlintSoNFunction[];
  readonly regions: readonly FlintSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: FlintSourceSpan }[];
  readonly removedNodes: number;
} {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const functionNames = new Set(graph.functions.map(({ name }) => name));
  const liveFunctions = new Set(graph.functions.filter(({ exported }) => exported).map(({ name }) => name));
  let referenced = new Set<number>();
  let changed = true;
  while (changed) {
    referenced = sonSeedReferencedNodes(graph, liveFunctions);
    sonExpandReferencedInputs(byId, referenced);
    changed = sonGrowLiveFunctions(referenced, byId, functionNames, liveFunctions);
  }
  const nodes = graph.nodes.filter(({ id }) => referenced.has(id));
  const functions = graph.functions.filter(({ name }) => liveFunctions.has(name));
  const regions = graph.regions.filter(({ functionName }) => liveFunctions.has(functionName));
  const sourceMap = graph.sourceMap.filter(({ node }) => referenced.has(node));
  return { nodes, functions, regions, sourceMap, removedNodes: graph.nodes.length - nodes.length };
}

/**
 * Node ids must stay a dense `1..N` sequence for cache validation and stable
 * array-style access (see `validateFlintSoN`). CSE and DCE both
 * remove nodes, leaving gaps and stale references in regions/functions/the
 * source map that this step compacts back into a dense, deterministic graph.
 *
 * @param pruned - Retained graph collections whose references use pre-compaction ids.
 * @returns Equivalent graph collections with dense node ids and remapped references.
 */
function sonRenumberGraph(pruned: {
  readonly nodes: readonly FlintSoNNode[];
  readonly functions: readonly FlintSoNFunction[];
  readonly regions: readonly FlintSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: FlintSourceSpan }[];
}): {
  readonly nodes: readonly FlintSoNNode[];
  readonly functions: readonly FlintSoNFunction[];
  readonly regions: readonly FlintSoNControlRegion[];
  readonly sourceMap: readonly { readonly node: number; readonly span: FlintSourceSpan }[];
} {
  const keptIds = new Set(pruned.nodes.map(({ id }) => id));
  const idMap = new Map(pruned.nodes.map(({ id }, index) => [id, index + 1]));
  // skipcq: JS-D1001
  const remapKeptId = (id: number): number => {
    const remapped = idMap.get(id);
    if (remapped === undefined) {
      throw new RangeError(`Cannot renumber SoN node id ${id}: it was not retained by pruning.`);
    }
    return remapped;
  };
  const nodes = pruned.nodes.map((node, index) => ({
    ...node,
    id: index + 1,
    inputs: node.inputs.map((id) => remapKeptId(id)),
  }));
  const regions = pruned.regions.map((region) => ({
    ...region,
    nodes: region.nodes.filter((id) => keptIds.has(id)).map((id) => remapKeptId(id)),
  }));
  const functions = pruned.functions.map((entry) => ({ ...entry, entry: remapKeptId(entry.entry) }));
  const sourceMap = pruned.sourceMap
    .filter(({ node }) => keptIds.has(node))
    .map(({ node, span }) => ({ node: remapKeptId(node), span }));
  return { nodes, functions, regions, sourceMap };
}

/** Optimized SoN module, backend-compatible IR, and pass accounting from one optimization run. */
export interface FlintSoNOptimizationResult {
  readonly module: FlintSoNModule;
  /** Compatibility-lowered tree IR carrying the SoN graph's real decisions; this is what the backend should consume. */
  readonly ir: FlintIrModule;
  readonly report: FlintSoNOptimizationReport;
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
 *
 * @param baseline - Unoptimized SoN module and build metadata.
 * @param sourceIr - Unoptimized lowered IR used for tree-level propagation.
 * @param mode - Optimization profile to apply.
 * @returns Optimized SoN module, compatible IR, and pass report.
 */
export function optimizeFlintSoN(
  baseline: FlintSoNModule,
  sourceIr: FlintIrModule,
  mode: FlintSoNOptimization = baseline.optimization,
): FlintSoNOptimizationResult {
  const beforeHash = flintSoNGraphHash(baseline);
  if (mode === 'debug') {
    const passes = orderedPasses.map((name) => ({
      name,
      applied: 0,
      skipped: 1,
      reason: 'debug optimization disabled',
    }));
    const report: FlintSoNOptimizationReport = {
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
  const propagatedGraph = buildFlintSoN(propagated.ir, {
    compilerVersion: baseline.compilerVersion,
    sourceHash: baseline.sourceHash,
    optimization: mode,
    boundsChecks: baseline.boundsChecks,
    languageVersion: baseline.languageVersion,
    abiVersion: baseline.abiVersion,
  });

  const canonical = sonCanonicalizeNodes(propagatedGraph.nodes);
  // skipcq: JS-D1001
  const remapId = (id: number): number => canonical.remap.get(id) ?? id;
  const preDceGraph: FlintSoNModule = {
    ...propagatedGraph,
    nodes: canonical.nodes,
    regions: propagatedGraph.regions.map((region) => ({ ...region, nodes: region.nodes.map(remapId) })),
    functions: propagatedGraph.functions.map((entry) => ({ ...entry, entry: remapId(entry.entry) })),
    sourceMap: propagatedGraph.sourceMap.filter(({ node }) => !canonical.remap.has(node)),
  };

  const pruned = sonPruneGraph(preDceGraph);
  const liveFunctionNames = new Set(pruned.functions.map(({ name }) => name));
  const finalIr: FlintIrModule = {
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
  const passes: FlintSoNPassReport[] = [
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
  const report: FlintSoNOptimizationReport = {
    mode,
    passes,
    nodesBefore: baseline.nodes.length,
    nodesAfter: pruned.nodes.length,
    graphHashBefore: beforeHash,
    graphHashAfter,
  };
  return { module: { ...base, graphHash: graphHashAfter, optimizationReport: report }, ir: finalIr, report };
}
