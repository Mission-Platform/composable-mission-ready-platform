/* eslint-disable unicorn/no-array-for-each, unicorn/no-negated-condition, unicorn/prefer-switch */

import type {
  ForgeWebScriptWasmFunction,
  ForgeWebScriptWasmPrimitiveType,
  ForgeWebScriptWasmStatement,
} from './contracts.js';

export type ForgeWebScriptWasmSsaValueKind = 'parameter' | 'definition' | 'phi';

export interface ForgeWebScriptWasmSsaValue {
  readonly id: number;
  readonly name: string;
  readonly type: ForgeWebScriptWasmPrimitiveType;
  readonly kind: ForgeWebScriptWasmSsaValueKind;
  readonly reference?: string;
  readonly length?: number;
}

export type ForgeWebScriptWasmSsaBindings = ReadonlyMap<string, ForgeWebScriptWasmSsaValue>;

export interface ForgeWebScriptWasmSsaBlock {
  readonly id: number;
  readonly kind: 'entry' | 'basic' | 'branch' | 'join' | 'loop-header' | 'loop-body' | 'loop-exit' | 'return' | 'exit';
  readonly predecessors: readonly number[];
  readonly successors: readonly number[];
}

export interface ForgeWebScriptWasmSsaPlan {
  readonly values: readonly ForgeWebScriptWasmSsaValue[];
  readonly parameters: ReadonlyMap<string, ForgeWebScriptWasmSsaValue>;
  readonly entryBindings: ReadonlyMap<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>;
  readonly exitBindings: ReadonlyMap<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>;
  readonly definitionValues: ReadonlyMap<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaValue>;
  /** Fallthrough bindings for if/switch edges, in source order. */
  readonly branchOutputs: ReadonlyMap<
    ForgeWebScriptWasmStatement,
    readonly (ForgeWebScriptWasmSsaBindings | undefined)[]
  >;
  readonly loopInitialBindings: ReadonlyMap<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>;
  readonly loopHeaders: ReadonlyMap<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>;
  readonly loopBackedges: ReadonlyMap<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings | undefined>;
  readonly blocks: readonly ForgeWebScriptWasmSsaBlock[];
  readonly exitReachable: boolean;
}

interface AnalysisResult {
  readonly bindings: Map<string, ForgeWebScriptWasmSsaValue>;
  readonly fallsThrough: boolean;
}

class BlockBuilder {
  private nextId = 0;
  private readonly mutable = new Map<
    number,
    { kind: ForgeWebScriptWasmSsaBlock['kind']; predecessors: Set<number>; successors: Set<number> }
  >();

  public readonly entry = this.create('entry');
  public readonly exit = this.create('exit');

  public create(kind: ForgeWebScriptWasmSsaBlock['kind']): number {
    const id = this.nextId++;
    this.mutable.set(id, { kind, predecessors: new Set(), successors: new Set() });
    return id;
  }

  public connect(from: number, to: number): void {
    this.mutable.get(from)?.successors.add(to);
    this.mutable.get(to)?.predecessors.add(from);
  }

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

  public finish(): readonly ForgeWebScriptWasmSsaBlock[] {
    return [...this.mutable.entries()].map(([id, block]) => ({
      id,
      kind: block.kind,
      predecessors: [...block.predecessors].toSorted((left, right) => left - right),
      successors: [...block.successors].toSorted((left, right) => left - right),
    }));
  }
}

function assignedNames(statements: readonly ForgeWebScriptWasmStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    if (statement.kind === 'assignment' && statement.index === undefined) names.add(statement.name);
    else if (statement.kind === 'if') {
      assignedNames(statement.consequent, names);
      if (statement.alternate !== undefined) assignedNames(statement.alternate, names);
    } else if (statement.kind === 'switch') {
      statement.cases.forEach(({ body }) => assignedNames(body, names));
      if (statement.defaultCase !== undefined) assignedNames(statement.defaultCase, names);
    } else if (statement.kind === 'while' || statement.kind === 'do-while') assignedNames(statement.body, names);
    else if (statement.kind === 'for') {
      if (statement.initializer !== undefined) assignedNames([statement.initializer], names);
      if (statement.update !== undefined) assignedNames([statement.update], names);
      assignedNames(statement.body, names);
    } else if (statement.kind === 'iterator-loop') assignedNames(statement.body, names);
  }
  return names;
}

function sameValue(
  values: readonly (ForgeWebScriptWasmSsaValue | undefined)[],
): ForgeWebScriptWasmSsaValue | undefined {
  const first = values[0];
  return first !== undefined && values.every((value) => value?.id === first.id) ? first : undefined;
}

function mergeBindings(
  incoming: readonly Map<string, ForgeWebScriptWasmSsaValue>[],
  names: readonly string[],
  createPhi: (name: string, type: ForgeWebScriptWasmPrimitiveType) => ForgeWebScriptWasmSsaValue,
): Map<string, ForgeWebScriptWasmSsaValue> {
  const merged = new Map<string, ForgeWebScriptWasmSsaValue>();
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

function analyzeCfg(
  statements: readonly ForgeWebScriptWasmStatement[],
  builder: BlockBuilder,
  incoming: readonly number[],
): number[] {
  let current = [...incoming];
  for (const statement of statements) {
    if (current.length === 0) break;
    if (statement.kind === 'return') {
      const block = builder.create('return');
      current.forEach((predecessor) => builder.connect(predecessor, block));
      current = [];
      continue;
    }
    if (statement.kind === 'if') {
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
      current = [join];
      continue;
    }
    if (statement.kind === 'switch') {
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
      } else exits.push(branch);
      const join = builder.create('join');
      exits.forEach((predecessor) => builder.connect(predecessor, join));
      current = [join];
      continue;
    }
    if (statement.kind === 'while' || statement.kind === 'for') {
      if (statement.kind === 'for' && statement.initializer !== undefined)
        current = analyzeCfg([statement.initializer], builder, current);
      if (current.length === 0) break;
      const header = builder.create('loop-header');
      current.forEach((predecessor) => builder.connect(predecessor, header));
      const body = builder.create('loop-body');
      const exit = builder.create('loop-exit');
      builder.connect(header, body);
      builder.connect(header, exit);
      const bodyStatements =
        statement.kind === 'for'
          ? [...statement.body, statement.update].filter(
              (value): value is ForgeWebScriptWasmStatement => value !== undefined,
            )
          : statement.body;
      analyzeCfg(bodyStatements, builder, [body]).forEach((predecessor) => builder.connect(predecessor, header));
      current = [exit];
      continue;
    }
    if (statement.kind === 'do-while' || statement.kind === 'iterator-loop') {
      const body = builder.create('loop-body');
      current.forEach((predecessor) => builder.connect(predecessor, body));
      const header = builder.create('loop-header');
      const exit = builder.create('loop-exit');
      analyzeCfg(statement.body, builder, [body]).forEach((predecessor) => builder.connect(predecessor, header));
      builder.connect(header, body);
      builder.connect(header, exit);
      current = [exit];
      continue;
    }
    const block = builder.create('basic');
    current.forEach((predecessor) => builder.connect(predecessor, block));
    current = [block];
  }
  return current;
}

export function lowerForgeWebScriptWasmFunctionToSsa(
  declaration: ForgeWebScriptWasmFunction,
): ForgeWebScriptWasmSsaPlan {
  let nextValueId = 0;
  const values: ForgeWebScriptWasmSsaValue[] = [];
  const parameters = new Map<string, ForgeWebScriptWasmSsaValue>();
  const entryBindings = new Map<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>();
  const exitBindings = new Map<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>();
  const definitionValues = new Map<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaValue>();
  const branchOutputs = new Map<ForgeWebScriptWasmStatement, readonly (ForgeWebScriptWasmSsaBindings | undefined)[]>();
  const loopInitialBindings = new Map<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>();
  const loopHeaders = new Map<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings>();
  const loopBackedges = new Map<ForgeWebScriptWasmStatement, ForgeWebScriptWasmSsaBindings | undefined>();
  const createValue = (
    name: string,
    type: ForgeWebScriptWasmPrimitiveType,
    kind: ForgeWebScriptWasmSsaValueKind,
    reference?: string,
    length?: number,
  ): ForgeWebScriptWasmSsaValue => {
    const value = {
      id: nextValueId++,
      name,
      type,
      kind,
      ...(reference === undefined ? {} : { reference }),
      ...(length === undefined ? {} : { length }),
    };
    values.push(value);
    return value;
  };
  for (const parameter of declaration.parameters)
    parameters.set(
      parameter.name,
      createValue(parameter.name, parameter.type.name, 'parameter', parameter.type.reference, parameter.type.length),
    );

  const analyze = (
    items: readonly ForgeWebScriptWasmStatement[],
    initial: Map<string, ForgeWebScriptWasmSsaValue>,
  ): AnalysisResult => {
    let bindings = new Map(initial);
    for (const statement of items) {
      entryBindings.set(statement, new Map(bindings));
      if (statement.kind === 'let') {
        const value = createValue(
          statement.name,
          statement.type.name,
          'definition',
          statement.type.reference,
          statement.type.length,
        );
        definitionValues.set(statement, value);
        bindings.set(statement.name, value);
      } else if (statement.kind === 'assignment' && statement.index === undefined) {
        const previous = bindings.get(statement.name);
        if (previous !== undefined) {
          const value = createValue(statement.name, previous.type, 'definition');
          definitionValues.set(statement, value);
          bindings.set(statement.name, value);
        }
      } else if (statement.kind === 'if') {
        const consequent = analyze(statement.consequent, new Map(bindings));
        const alternate =
          statement.alternate === undefined
            ? { bindings: new Map(bindings), fallsThrough: true }
            : analyze(statement.alternate, new Map(bindings));
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
        bindings = new Map(merged);
      } else if (statement.kind === 'switch') {
        const outputs: (Map<string, ForgeWebScriptWasmSsaValue> | undefined)[] = [];
        for (const arm of statement.cases) {
          const result = analyze(arm.body, new Map(bindings));
          outputs.push(result.fallsThrough ? result.bindings : undefined);
        }
        if (statement.defaultCase === undefined) outputs.push(new Map(bindings));
        else {
          const result = analyze(statement.defaultCase, new Map(bindings));
          outputs.push(result.fallsThrough ? result.bindings : undefined);
        }
        const incoming = outputs.filter(
          (output): output is Map<string, ForgeWebScriptWasmSsaValue> => output !== undefined,
        );
        branchOutputs.set(statement, outputs);
        if (incoming.length === 0) return { bindings, fallsThrough: false };
        const merged = mergeBindings(incoming, [...bindings.keys()], (name, type) => createValue(name, type, 'phi'));
        exitBindings.set(statement, new Map(merged));
        bindings = new Map(merged);
      } else if (statement.kind === 'while' || statement.kind === 'for' || statement.kind === 'do-while') {
        let loopBindings = new Map(bindings);
        if (statement.kind === 'for' && statement.initializer !== undefined) {
          const initializer = analyze([statement.initializer], new Map(bindings));
          bindings = initializer.bindings;
          loopBindings = new Map(bindings);
        }
        const assigned = assignedNames(
          statement.kind === 'for'
            ? [...statement.body, statement.update].filter(
                (value): value is ForgeWebScriptWasmStatement => value !== undefined,
              )
            : statement.body,
        );
        for (const name of assigned) {
          const incoming = bindings.get(name);
          if (incoming !== undefined) loopBindings.set(name, createValue(name, incoming.type, 'phi'));
        }
        loopInitialBindings.set(statement, new Map(bindings));
        loopHeaders.set(statement, new Map(loopBindings));
        const loopItems =
          statement.kind === 'for'
            ? [...statement.body, statement.update].filter(
                (value): value is ForgeWebScriptWasmStatement => value !== undefined,
              )
            : statement.body;
        const result = analyze(loopItems, new Map(loopBindings));
        loopBackedges.set(statement, result.fallsThrough ? result.bindings : undefined);
        exitBindings.set(statement, new Map(loopBindings));
        bindings = new Map(loopBindings);
      } else if (statement.kind === 'return') return { bindings, fallsThrough: false };
    }
    return { bindings, fallsThrough: true };
  };

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
