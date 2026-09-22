/* eslint-disable unicorn/no-array-for-each, unicorn/no-negated-condition */

import type { FlintWasmFunction, FlintWasmPrimitiveType, FlintWasmStatement } from './contracts.js';

/**
 * Role category of an SSA value in the control flow representation.
 */
export type FlintWasmSsaValueKind = 'parameter' | 'definition' | 'phi';

/**
 * Single static assignment (SSA) value node tracking definition provenance and type.
 */
export interface FlintWasmSsaValue {
  readonly id: number;
  readonly name: string;
  readonly type: FlintWasmPrimitiveType;
  readonly kind: FlintWasmSsaValueKind;
  readonly reference?: string;
  readonly length?: number;
  readonly pointeeType?: string;
}

/**
 * Mapping of variable names to their active SSA values at a program point.
 */
export type FlintWasmSsaBindings = ReadonlyMap<string, FlintWasmSsaValue>;

/**
 * Basic block or control-flow node in the WebAssembly control flow graph.
 */
export interface FlintWasmSsaBlock {
  readonly id: number;
  readonly kind: 'entry' | 'basic' | 'branch' | 'join' | 'loop-header' | 'loop-body' | 'loop-exit' | 'return' | 'exit';
  readonly predecessors: readonly number[];
  readonly successors: readonly number[];
}

/**
 * Complete SSA and CFG analysis plan for a WebAssembly function.
 */
export interface FlintWasmSsaPlan {
  readonly values: readonly FlintWasmSsaValue[];
  readonly parameters: ReadonlyMap<string, FlintWasmSsaValue>;
  readonly entryBindings: ReadonlyMap<FlintWasmStatement, FlintWasmSsaBindings>;
  readonly exitBindings: ReadonlyMap<FlintWasmStatement, FlintWasmSsaBindings>;
  readonly definitionValues: ReadonlyMap<FlintWasmStatement, FlintWasmSsaValue>;
  /** Fallthrough bindings for if/switch edges, in source order. */
  readonly branchOutputs: ReadonlyMap<FlintWasmStatement, readonly (FlintWasmSsaBindings | undefined)[]>;
  readonly loopInitialBindings: ReadonlyMap<FlintWasmStatement, FlintWasmSsaBindings>;
  readonly loopHeaders: ReadonlyMap<FlintWasmStatement, FlintWasmSsaBindings>;
  readonly loopBackedges: ReadonlyMap<FlintWasmStatement, FlintWasmSsaBindings | undefined>;
  readonly blocks: readonly FlintWasmSsaBlock[];
  readonly exitReachable: boolean;
}

/**
 * Internal record capturing SSA bindings and fallthrough state after analyzing a statement list.
 */
interface AnalysisResult {
  readonly bindings: Map<string, FlintWasmSsaValue>;
  readonly fallsThrough: boolean;
}

/**
 * Incremental builder constructing the basic block graph for a function.
 */
class BlockBuilder {
  private nextId = 0;
  private readonly mutable = new Map<
    number,
    { kind: FlintWasmSsaBlock['kind']; predecessors: Set<number>; successors: Set<number> }
  >();

  public readonly entry = this.create('entry');
  public readonly exit = this.create('exit');

  /**
   * Allocates a new control flow block with the given kind.
   *
   * @param kind - Block category.
   * @returns Newly allocated block ID.
   */
  public create(kind: FlintWasmSsaBlock['kind']): number {
    const id = this.nextId++;
    this.mutable.set(id, { kind, predecessors: new Set(), successors: new Set() });
    return id;
  }

  /**
   * Connects a directed control-flow edge from one block to another.
   *
   * @param from - Source block ID.
   * @param to - Destination block ID.
   */
  public connect(from: number, to: number): void {
    this.mutable.get(from)?.successors.add(to);
    this.mutable.get(to)?.predecessors.add(from);
  }

  /**
   * Traverses and returns the set of block IDs reachable from the entry block.
   *
   * @returns Set of reachable block IDs.
   */
  // skipcq: JS-R1005
  public blocksReachableFromEntry(): Set<number> {
    const reachable = new Set<number>();
    const pending = [this.entry];
    while (pending.length > 0) {
      const block = pending.pop();
      if (block === undefined || reachable.has(block)) continue;
      reachable.add(block);
      for (const successor of this.mutable.get(block)?.successors ?? []) pending.push(successor);
    }
    return reachable;
  }

  /**
   * Finalizes and returns the array of structured SSA blocks sorted by identifier.
   *
   * @returns Sorted array of finalized basic blocks.
   */
  public finish(): readonly FlintWasmSsaBlock[] {
    return [...this.mutable.entries()].map(([id, block]) => ({
      id,
      kind: block.kind,
      predecessors: [...block.predecessors].toSorted((left, right) => left - right),
      successors: [...block.successors].toSorted((left, right) => left - right),
    }));
  }
}

/**
 * Scans branch statements (if, switch) for assigned variable names.
 *
 * @param statement - Branch statement.
 * @param names - Mutable accumulator set of assigned variable names.
 */
function scanBranchAssignedNames(
  statement: Extract<FlintWasmStatement, { kind: 'if' | 'switch' }>,
  names: Set<string>,
): void {
  if (statement.kind === 'if') {
    assignedNames(statement.consequent, names);
    if (statement.alternate !== undefined) assignedNames(statement.alternate, names);
    return;
  }
  for (const arm of statement.cases) assignedNames(arm.body, names);
  if (statement.defaultCase !== undefined) assignedNames(statement.defaultCase, names);
}

/**
 * Scans loop statements for assigned variable names.
 *
 * @param statement - Loop statement.
 * @param names - Mutable accumulator set of assigned variable names.
 */
function scanLoopAssignedNames(
  statement: Extract<FlintWasmStatement, { kind: 'while' | 'do-while' | 'iterator-loop' | 'for' }>,
  names: Set<string>,
): void {
  if (statement.kind === 'for') {
    if (statement.initializer !== undefined) assignedNames([statement.initializer], names);
    if (statement.update !== undefined) assignedNames([statement.update], names);
  }
  assignedNames(statement.body, names);
}

/**
 * Scans a single statement for assigned variable names and recurses into sub-statements.
 *
 * @param statement - Statement to scan.
 * @param names - Mutable accumulator set of assigned variable names.
 */
// skipcq: JS-R1005
function scanStatementAssignedNames(statement: FlintWasmStatement, names: Set<string>): void {
  if (statement.kind === 'assignment' && statement.index === undefined) {
    names.add(statement.name);
    return;
  }
  if (statement.kind === 'if' || statement.kind === 'switch') {
    scanBranchAssignedNames(statement, names);
    return;
  }
  if (
    statement.kind === 'while' ||
    statement.kind === 'do-while' ||
    statement.kind === 'iterator-loop' ||
    statement.kind === 'for'
  ) {
    scanLoopAssignedNames(statement, names);
  }
}

/**
 * Traverses statements collecting names of all assigned local variables.
 *
 * @param statements - Statements to inspect.
 * @param names - Optional accumulator set.
 * @returns Set of assigned variable identifiers.
 */
function assignedNames(statements: readonly FlintWasmStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) scanStatementAssignedNames(statement, names);
  return names;
}

/**
 * Determines whether all incoming SSA values share an identical value ID.
 *
 * @param values - Array of candidate SSA values.
 * @returns Common SSA value or undefined if divergent.
 */
function sameValue(values: readonly (FlintWasmSsaValue | undefined)[]): FlintWasmSsaValue | undefined {
  const first = values[0];
  return first !== undefined && values.every((value) => value?.id === first.id) ? first : undefined;
}

/**
 * Merges multiple incoming SSA binding environments, inserting phi nodes when values diverge.
 *
 * @param incoming - Array of incoming binding maps from predecessor blocks.
 * @param names - Variable names to merge.
 * @param createPhi - Factory callback creating phi SSA nodes.
 * @returns Merged binding environment.
 */
function mergeBindings(
  incoming: readonly Map<string, FlintWasmSsaValue>[],
  names: readonly string[],
  createPhi: (name: string, type: FlintWasmPrimitiveType) => FlintWasmSsaValue,
): Map<string, FlintWasmSsaValue> {
  const merged = new Map<string, FlintWasmSsaValue>();
  for (const name of names) {
    const values = incoming.map((bindings) => bindings.get(name));
    const value = sameValue(values);
    if (value !== undefined) merged.set(name, value);
    else {
      const first = values.find((candidate) => candidate !== undefined);
      if (first !== undefined) merged.set(name, createPhi(name, first.type));
    }
  }
  return merged;
}

/**
 * Analyzes CFG branches and joins for an if-statement.
 *
 * @param statement - If statement node.
 * @param builder - Basic block builder.
 * @param current - Predecessor block IDs.
 * @returns Exit join block IDs.
 */
function analyzeIfCfg(
  statement: Extract<FlintWasmStatement, { kind: 'if' }>,
  builder: BlockBuilder,
  current: readonly number[],
): number[] {
  const branch = builder.create('branch');
  current.forEach((predecessor) => builder.connect(predecessor, branch));
  const consequent = builder.create('basic');
  builder.connect(branch, consequent);
  const consequentExits = analyzeCfg(statement.consequent, builder, [consequent]);
  const alternate = builder.create('basic');
  builder.connect(branch, alternate);
  const alternateExits =
    statement.alternate === undefined ? [alternate] : analyzeCfg(statement.alternate, builder, [alternate]);
  const join = builder.create('join');
  [...consequentExits, ...alternateExits].forEach((predecessor) => builder.connect(predecessor, join));
  return [join];
}

/**
 * Analyzes CFG branches and joins for a switch-statement.
 *
 * @param statement - Switch statement node.
 * @param builder - Basic block builder.
 * @param current - Predecessor block IDs.
 * @returns Exit join block IDs.
 */
function analyzeSwitchCfg(
  statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
  builder: BlockBuilder,
  current: readonly number[],
): number[] {
  const branch = builder.create('branch');
  current.forEach((predecessor) => builder.connect(predecessor, branch));
  const exits: number[] = [];
  for (const arm of statement.cases) {
    const armEntry = builder.create('basic');
    builder.connect(branch, armEntry);
    exits.push(...analyzeCfg(arm.body, builder, [armEntry]));
  }
  if (statement.defaultCase !== undefined) {
    const defaultEntry = builder.create('basic');
    builder.connect(branch, defaultEntry);
    exits.push(...analyzeCfg(statement.defaultCase, builder, [defaultEntry]));
  } else {
    exits.push(branch);
  }
  const join = builder.create('join');
  exits.forEach((predecessor) => builder.connect(predecessor, join));
  return [join];
}

/**
 * Analyzes CFG blocks and loopback edges for while and for loops.
 *
 * @param statement - Loop statement node.
 * @param builder - Basic block builder.
 * @param incoming - Predecessor block IDs.
 * @returns Loop exit block IDs.
 */
function analyzeLoopCfg(
  statement: Extract<FlintWasmStatement, { kind: 'while' | 'for' }>,
  builder: BlockBuilder,
  incoming: readonly number[],
): number[] {
  let current = incoming;
  if (statement.kind === 'for' && statement.initializer !== undefined)
    current = analyzeCfg([statement.initializer], builder, current);
  if (current.length === 0) return [];
  const header = builder.create('loop-header');
  current.forEach((predecessor) => builder.connect(predecessor, header));
  const body = builder.create('loop-body');
  const exit = builder.create('loop-exit');
  builder.connect(header, body);
  builder.connect(header, exit);
  const bodyStatements =
    statement.kind === 'for'
      ? [...statement.body, statement.update].filter((value): value is FlintWasmStatement => value !== undefined)
      : statement.body;
  analyzeCfg(bodyStatements, builder, [body]).forEach((predecessor) => builder.connect(predecessor, header));
  return [exit];
}

/**
 * Analyzes CFG blocks and loopback edges for do-while loops.
 *
 * @param statement - Do-while statement node.
 * @param builder - Basic block builder.
 * @param current - Predecessor block IDs.
 * @returns Loop exit block IDs.
 */
function analyzeDoWhileCfg(
  statement: Extract<FlintWasmStatement, { kind: 'do-while' | 'iterator-loop' }>,
  builder: BlockBuilder,
  current: readonly number[],
): number[] {
  const body = builder.create('loop-body');
  current.forEach((predecessor) => builder.connect(predecessor, body));
  const header = builder.create('loop-header');
  const exit = builder.create('loop-exit');
  analyzeCfg(statement.body, builder, [body]).forEach((predecessor) => builder.connect(predecessor, header));
  builder.connect(header, body);
  builder.connect(header, exit);
  return [exit];
}

/**
 * Analyzes CFG edges for a single statement.
 *
 * @param statement - Statement to analyze.
 * @param builder - Basic block builder.
 * @param current - Predecessor block IDs.
 * @returns Exit block IDs.
 */
// skipcq: JS-R1005
function analyzeSingleStatementCfg(
  statement: FlintWasmStatement,
  builder: BlockBuilder,
  current: readonly number[],
): number[] {
  if (statement.kind === 'return') {
    const block = builder.create('return');
    current.forEach((predecessor) => builder.connect(predecessor, block));
    return [];
  }
  if (statement.kind === 'if') return analyzeIfCfg(statement, builder, current);
  if (statement.kind === 'switch') return analyzeSwitchCfg(statement, builder, current);
  if (statement.kind === 'while' || statement.kind === 'for') return analyzeLoopCfg(statement, builder, current);
  if (statement.kind === 'do-while' || statement.kind === 'iterator-loop')
    return analyzeDoWhileCfg(statement, builder, current);
  const block = builder.create('basic');
  current.forEach((predecessor) => builder.connect(predecessor, block));
  return [block];
}

/**
 * Recursively constructs basic blocks and edges for a sequence of IR statements.
 *
 * @param statements - Statements to lower to CFG blocks.
 * @param builder - Basic block builder.
 * @param incoming - Predecessor block IDs entering these statements.
 * @returns Array of exit block IDs.
 */
function analyzeCfg(
  statements: readonly FlintWasmStatement[],
  builder: BlockBuilder,
  incoming: readonly number[],
): number[] {
  let current = [...incoming];
  for (const statement of statements) {
    if (current.length === 0) break;
    current = analyzeSingleStatementCfg(statement, builder, current);
  }
  return current;
}

function extractPointeeType(
  type:
    | {
        readonly name: string;
        readonly reference?: string;
        readonly arguments?: readonly { readonly name?: string; readonly reference?: string }[];
        readonly referenceMode?: 'ref' | 'mut-ref';
      }
    | undefined,
): string | undefined {
  if (type === undefined) return undefined;
  if (type.reference === 'CPtr' || type.reference === 'MutCPtr') {
    const argument = type.arguments?.[0];
    return argument?.reference ?? argument?.name;
  }
  if (typeof type.reference === 'string') {
    if (type.reference.startsWith('CPtr<') && type.reference.endsWith('>')) return type.reference.slice(5, -1);
    if (type.reference.startsWith('MutCPtr<') && type.reference.endsWith('>')) return type.reference.slice(8, -1);
    if (type.reference.startsWith('&mut ')) return type.reference.slice(5);
    if (type.reference.startsWith('&')) return type.reference.slice(1);
  }
  if (type.referenceMode !== undefined) {
    return type.reference ?? type.name;
  }
  return undefined;
}

/**
 * Lowers a WebAssembly function intermediate representation into an SSA plan with basic blocks and control flow graph.
 *
 * @param declaration - Function IR declaration to analyze.
 * @returns Complete SSA plan containing values, bindings, and basic blocks.
 */
export function lowerFlintWasmFunctionToSsa(declaration: FlintWasmFunction): FlintWasmSsaPlan {
  let nextValueId = 0;
  const values: FlintWasmSsaValue[] = [];
  const parameters = new Map<string, FlintWasmSsaValue>();
  const entryBindings = new Map<FlintWasmStatement, FlintWasmSsaBindings>();
  const exitBindings = new Map<FlintWasmStatement, FlintWasmSsaBindings>();
  const definitionValues = new Map<FlintWasmStatement, FlintWasmSsaValue>();
  const branchOutputs = new Map<FlintWasmStatement, readonly (FlintWasmSsaBindings | undefined)[]>();
  const loopInitialBindings = new Map<FlintWasmStatement, FlintWasmSsaBindings>();
  const loopHeaders = new Map<FlintWasmStatement, FlintWasmSsaBindings>();
  const loopBackedges = new Map<FlintWasmStatement, FlintWasmSsaBindings | undefined>();
  // skipcq: JS-D1001
  const createValue = (
    name: string,
    type: FlintWasmPrimitiveType,
    kind: FlintWasmSsaValueKind,
    reference?: string,
    length?: number,
    pointeeType?: string,
  ): FlintWasmSsaValue => {
    const value = {
      id: nextValueId++,
      name,
      type,
      kind,
      ...(reference === undefined ? {} : { reference }),
      ...(length === undefined ? {} : { length }),
      ...(pointeeType === undefined ? {} : { pointeeType }),
    };
    values.push(value);
    return value;
  };
  for (const parameter of declaration.parameters)
    parameters.set(
      parameter.name,
      createValue(
        parameter.name,
        parameter.type.name,
        'parameter',
        parameter.type.reference,
        parameter.type.length,
        extractPointeeType(parameter.type),
      ),
    );

  // skipcq: JS-D1001, JS-R1005
  function analyzeIfStatement(
    statement: Extract<FlintWasmStatement, { kind: 'if' }>,
    bindings: Map<string, FlintWasmSsaValue>,
  ): AnalysisResult {
    // skipcq: JS-0357
    const consequent = analyze(statement.consequent, new Map(bindings));
    const alternate =
      statement.alternate === undefined
        ? { bindings: new Map(bindings), fallsThrough: true }
        : // skipcq: JS-0357
          analyze(statement.alternate, new Map(bindings));
    const incoming = [
      ...(consequent.fallsThrough ? [consequent.bindings] : []),
      ...(alternate.fallsThrough ? [alternate.bindings] : []),
    ];
    const merged = mergeBindings(incoming, [...bindings.keys()], (name, type) => createValue(name, type, 'phi'));
    branchOutputs.set(statement, [
      consequent.fallsThrough ? consequent.bindings : undefined,
      alternate.fallsThrough ? alternate.bindings : undefined,
    ]);
    if (incoming.length === 0) return { bindings, fallsThrough: false };
    exitBindings.set(statement, new Map(merged));
    return { bindings: new Map(merged), fallsThrough: true };
  }

  // skipcq: JS-D1001, JS-R1005
  function analyzeSwitchStatement(
    statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
    bindings: Map<string, FlintWasmSsaValue>,
  ): AnalysisResult {
    const outputs: (Map<string, FlintWasmSsaValue> | undefined)[] = [];
    for (const arm of statement.cases) {
      // skipcq: JS-0357
      const result = analyze(arm.body, new Map(bindings));
      outputs.push(result.fallsThrough ? result.bindings : undefined);
    }
    if (statement.defaultCase === undefined) outputs.push(new Map(bindings));
    else {
      // skipcq: JS-0357
      const result = analyze(statement.defaultCase, new Map(bindings));
      outputs.push(result.fallsThrough ? result.bindings : undefined);
    }
    const incoming = outputs.filter((output): output is Map<string, FlintWasmSsaValue> => output !== undefined);
    branchOutputs.set(statement, outputs);
    if (incoming.length === 0) return { bindings, fallsThrough: false };
    const merged = mergeBindings(incoming, [...bindings.keys()], (name, type) => createValue(name, type, 'phi'));
    exitBindings.set(statement, new Map(merged));
    return { bindings: new Map(merged), fallsThrough: true };
  }

  // skipcq: JS-D1001, JS-R1005
  function analyzeLoopStatement(
    statement: Extract<FlintWasmStatement, { kind: 'while' | 'for' | 'do-while' }>,
    bindings: Map<string, FlintWasmSsaValue>,
  ): AnalysisResult {
    let currentBindings = new Map(bindings);
    if (statement.kind === 'for' && statement.initializer !== undefined) {
      // skipcq: JS-0357
      const initializer = analyze([statement.initializer], new Map(bindings));
      currentBindings = initializer.bindings;
    }
    const loopBindings = new Map(currentBindings);
    const loopItems =
      statement.kind === 'for'
        ? [...statement.body, statement.update].filter((value): value is FlintWasmStatement => value !== undefined)
        : statement.body;
    const assigned = assignedNames(loopItems);
    for (const name of assigned) {
      const incoming = currentBindings.get(name);
      if (incoming !== undefined) loopBindings.set(name, createValue(name, incoming.type, 'phi'));
    }
    loopInitialBindings.set(statement, new Map(currentBindings));
    loopHeaders.set(statement, new Map(loopBindings));
    // skipcq: JS-0357
    const result = analyze(loopItems, new Map(loopBindings));
    loopBackedges.set(statement, result.fallsThrough ? result.bindings : undefined);
    exitBindings.set(statement, new Map(loopBindings));
    return { bindings: new Map(loopBindings), fallsThrough: true };
  }

  // skipcq: JS-D1001
  function analyzeDefinition(
    statement: Extract<FlintWasmStatement, { kind: 'let' | 'assignment' }>,
    bindings: Map<string, FlintWasmSsaValue>,
  ): void {
    if (statement.kind === 'let') {
      const value = createValue(
        statement.name,
        statement.type.name,
        'definition',
        statement.type.reference,
        statement.type.length,
        extractPointeeType(statement.type),
      );
      definitionValues.set(statement, value);
      bindings.set(statement.name, value);
    } else if (statement.index === undefined) {
      const previous = bindings.get(statement.name);
      if (previous !== undefined) {
        const value = createValue(
          statement.name,
          previous.type,
          'definition',
          previous.reference,
          previous.length,
          previous.pointeeType,
        );
        definitionValues.set(statement, value);
        bindings.set(statement.name, value);
      }
    }
  }

  // skipcq: JS-D1001, JS-R1005
  function analyzeSingleStatement(
    statement: FlintWasmStatement,
    bindings: Map<string, FlintWasmSsaValue>,
  ): AnalysisResult {
    entryBindings.set(statement, new Map(bindings));
    if (statement.kind === 'let' || statement.kind === 'assignment') {
      // skipcq: JS-D1001
      analyzeDefinition(statement, bindings);
      return { bindings, fallsThrough: true };
    }
    if (statement.kind === 'if') return analyzeIfStatement(statement, bindings);
    if (statement.kind === 'switch') return analyzeSwitchStatement(statement, bindings);
    if (statement.kind === 'while' || statement.kind === 'for' || statement.kind === 'do-while') {
      // skipcq: JS-D1001, JS-R1005
      return analyzeLoopStatement(statement, bindings);
    }
    if (statement.kind === 'return') return { bindings, fallsThrough: false };
    return { bindings, fallsThrough: true };
  }

  // skipcq: JS-D1001
  function analyze(
    items: readonly FlintWasmStatement[],
    initialBindings: Map<string, FlintWasmSsaValue>,
  ): AnalysisResult {
    let bindings = new Map(initialBindings);
    for (const statement of items) {
      // skipcq: JS-D1001, JS-R1005
      const result = analyzeSingleStatement(statement, bindings);
      if (!result.fallsThrough) return result;
      bindings = result.bindings;
    }
    return { bindings, fallsThrough: true };
  }

  const initial = new Map(parameters);
  analyze(declaration.body, initial);
  const builder = new BlockBuilder();
  const exits = analyzeCfg(declaration.body, builder, [builder.entry]);
  exits.forEach((predecessor) => builder.connect(predecessor, builder.exit));
  return {
    values,
    parameters,
    entryBindings,
    exitBindings,
    definitionValues,
    branchOutputs,
    loopInitialBindings,
    loopHeaders,
    loopBackedges,
    blocks: builder.finish(),
    exitReachable: builder.blocksReachableFromEntry().has(builder.exit),
  };
}
