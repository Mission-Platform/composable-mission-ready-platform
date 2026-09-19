import {
  type FlintModule,
  type FlintOwnership,
  type FlintPrimitiveType,
  type FlintReferenceMode,
  type FlintStructDeclaration,
  type FlintTypeName,
  flintTypeNameToString,
} from './ast.js';

import type { FlintSpecialization } from './manifest.js';

/**
 * Interned structural type algebra for Flint.
 *
 * Types are hash-consed into dense `TypeId` values so equality is pointer identity,
 * generic substitution is structural, and monomorphization can cache concrete
 * layouts by a stable layout key rather than by surface type name alone.
 */

export type TypeId = number & { readonly __typeIdBrand: unique symbol };

export type TypeNode =
  | { readonly kind: 'primitive'; readonly name: FlintPrimitiveType }
  | { readonly kind: 'param'; readonly name: string }
  | { readonly kind: 'nominal'; readonly name: string; readonly args: readonly TypeId[] }
  | { readonly kind: 'array'; readonly element: TypeId; readonly length: number }
  | {
      readonly kind: 'reference';
      readonly mode: Exclude<FlintReferenceMode, 'value'>;
      readonly inner: TypeId;
    }
  | { readonly kind: 'fn'; readonly parameters: readonly TypeId[]; readonly result: TypeId };

export interface TypeLayout {
  /** Byte size after alignment padding. */
  readonly size: number;
  readonly alignment: number;
  /**
   * Structural layout fingerprint used for monomorphization deduplication.
   * Two distinct nominal types may share a layout key when their expanded
   * field layouts are identical.
   */
  readonly layoutKey: string;
}

export type FlintGenericBoundary = 'value' | 'interface' | 'iterator';

export interface MonomorphizedSpecialization {
  readonly specialization: FlintSpecialization;
  readonly typeId: TypeId;
  readonly layout: TypeLayout;
  /** True when an earlier specialization already owns this layout key. */
  readonly sharedLayout: boolean;
  readonly layoutOwnerId?: string;
}

export interface MonomorphizeStructRequest {
  readonly declaration: Pick<FlintStructDeclaration, 'name' | 'genericParameters' | 'fields' | 'record'>;
  readonly arguments: readonly TypeId[];
  readonly boundary?: FlintGenericBoundary;
}

export interface AggregateLayoutDefinition {
  readonly name: string;
  readonly genericParameters: readonly string[];
  readonly fields: readonly { readonly name: string; readonly type: TypeId }[];
  readonly record?: true;
}

const PRIMITIVE_LAYOUTS: Readonly<Record<FlintPrimitiveType, Omit<TypeLayout, 'layoutKey'>>> = {
  unit: { size: 0, alignment: 1 },
  bool: { size: 4, alignment: 4 },
  i32: { size: 4, alignment: 4 },
  u32: { size: 4, alignment: 4 },
  f32: { size: 4, alignment: 4 },
  i64: { size: 8, alignment: 8 },
  u64: { size: 8, alignment: 8 },
  f64: { size: 8, alignment: 8 },
  // ABI carriers are pointer+length pairs on the host boundary.
  string: { size: 8, alignment: 4 },
  bytes: { size: 8, alignment: 4 },
};

const VALUE_COLLECTIONS = new Set(['Array', 'Vector', 'Option', 'Result', 'iterResult']);
const DESCRIPTOR_COLLECTIONS = new Set(['Iterable', 'Iterator', 'Fn']);

function isPrimitiveName(name: string): name is FlintPrimitiveType {
  return Object.hasOwn(PRIMITIVE_LAYOUTS, name);
}

function alignOffset(offset: number, alignment: number): number {
  if (alignment <= 1) return offset;
  const mask = alignment - 1;
  return (offset + mask) & ~mask;
}

/**
 * Hash-consing table and structural operations over interned types.
 */
export class TypeAlgebra {
  private readonly nodes: TypeNode[] = [];
  private readonly internTable = new Map<string, TypeId>();
  private readonly aggregates = new Map<string, AggregateLayoutDefinition>();
  private readonly layoutCache = new Map<TypeId, TypeLayout>();

  /** Register a nominal aggregate so monomorphization can expand field layouts. */
  defineAggregate(definition: AggregateLayoutDefinition): void {
    this.aggregates.set(definition.name, definition);
    this.layoutCache.clear();
  }

  defineAggregatesFromModule(module: Pick<FlintModule, 'structs'>): void {
    for (const declaration of module.structs) {
      this.defineAggregate({
        name: declaration.name,
        genericParameters: declaration.genericParameters.map(({ name }) => name),
        fields: declaration.fields.map((field) => ({
          name: field.name,
          type: this.fromAst(field.type, new Set(declaration.genericParameters.map(({ name }) => name))),
        })),
        ...(declaration.record === true ? { record: true as const } : {}),
      });
    }
  }

  intern(node: TypeNode): TypeId {
    const key = this.nodeKey(node);
    const existing = this.internTable.get(key);
    if (existing !== undefined) return existing;
    const id = this.nodes.length as TypeId;
    this.nodes.push(this.freezeNode(node));
    this.internTable.set(key, id);
    return id;
  }

  node(id: TypeId): TypeNode {
    const value = this.nodes[id];
    if (value === undefined) throw new RangeError(`Unknown TypeId ${id}`);
    return value;
  }

  equal(left: TypeId, right: TypeId): boolean {
    return left === right;
  }

  primitive(name: FlintPrimitiveType): TypeId {
    return this.intern({ kind: 'primitive', name });
  }

  param(name: string): TypeId {
    return this.intern({ kind: 'param', name });
  }

  nominal(name: string, arguments_: readonly TypeId[] = []): TypeId {
    if (arguments_.length === 0 && isPrimitiveName(name)) return this.primitive(name);
    return this.intern({ kind: 'nominal', name, args: [...arguments_] });
  }

  /**
   * Intern an AST type. Names listed in `typeParameters` become type-param nodes
   * rather than unresolved nominals.
   */
  fromAst(type: FlintTypeName, typeParameters: ReadonlySet<string> = new Set()): TypeId {
    const baseName = type.reference ?? type.name;
    let id: TypeId;
    if (type.arguments !== undefined && type.arguments.length > 0) {
      id = this.nominal(
        baseName,
        type.arguments.map((argument) => this.fromAst(argument, typeParameters)),
      );
    } else if (typeParameters.has(baseName)) {
      id = this.param(baseName);
    } else if (type.reference === undefined && isPrimitiveName(type.name)) {
      id = this.primitive(type.name);
    } else {
      id = this.nominal(baseName);
    }

    if (type.length !== undefined) id = this.intern({ kind: 'array', element: id, length: type.length });
    if (type.referenceMode !== undefined) id = this.intern({ kind: 'reference', mode: type.referenceMode, inner: id });
    return id;
  }

  /** Canonical checker/specialization key (no spaces), matching historical `typeNameKey`. */
  display(id: TypeId): string {
    const node = this.node(id);
    switch (node.kind) {
      case 'primitive': {
        return node.name;
      }
      case 'param': {
        return node.name;
      }
      case 'nominal': {
        return node.args.length === 0
          ? node.name
          : `${node.name}<${node.args.map((argument) => this.display(argument)).join(',')}>`;
      }
      case 'array': {
        return `${this.display(node.element)}[${node.length}]`;
      }
      case 'reference': {
        return `&${node.mode === 'mut-ref' ? 'mut ' : ''}${this.display(node.inner)}`;
      }
      case 'fn': {
        return `Fn<${[...node.parameters, node.result].map((part) => this.display(part)).join(',')}>`;
      }
    }
  }

  /** Human-readable form matching `flintTypeNameToString`. */
  pretty(id: TypeId): string {
    return flintTypeNameToString(this.toAst(id));
  }

  toAst(id: TypeId): FlintTypeName {
    const span = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
    const node = this.node(id);
    switch (node.kind) {
      case 'primitive': {
        return { kind: 'type-name', name: node.name, span };
      }
      case 'param': {
        return { kind: 'type-name', name: 'unit', reference: node.name, span };
      }
      case 'nominal': {
        const primitive = isPrimitiveName(node.name) ? node.name : ('unit' as const);
        return {
          kind: 'type-name',
          name: primitive,
          ...(isPrimitiveName(node.name) && node.args.length === 0 ? {} : { reference: node.name }),
          ...(node.args.length === 0 ? {} : { arguments: node.args.map((argument) => this.toAst(argument)) }),
          span,
        };
      }
      case 'array': {
        const element = this.toAst(node.element);
        return { ...element, length: node.length };
      }
      case 'reference': {
        const inner = this.toAst(node.inner);
        return { ...inner, referenceMode: node.mode };
      }
      case 'fn': {
        return {
          kind: 'type-name',
          name: 'unit',
          reference: 'Fn',
          arguments: [...node.parameters, node.result].map((part) => this.toAst(part)),
          span,
        };
      }
    }
  }

  substitute(id: TypeId, environment: ReadonlyMap<string, TypeId>): TypeId {
    const node = this.node(id);
    switch (node.kind) {
      case 'primitive': {
        return id;
      }
      case 'param': {
        return environment.get(node.name) ?? id;
      }
      case 'nominal': {
        const arguments_ = node.args.map((argument) => this.substitute(argument, environment));
        const unchanged = arguments_.every((argument, index) => argument === node.args[index]);
        return unchanged ? id : this.nominal(node.name, arguments_);
      }
      case 'array': {
        const element = this.substitute(node.element, environment);
        return element === node.element ? id : this.intern({ kind: 'array', element, length: node.length });
      }
      case 'reference': {
        const inner = this.substitute(node.inner, environment);
        return inner === node.inner ? id : this.intern({ kind: 'reference', mode: node.mode, inner });
      }
      case 'fn': {
        const parameters = node.parameters.map((parameter) => this.substitute(parameter, environment));
        const result = this.substitute(node.result, environment);
        const unchanged =
          result === node.result && parameters.every((parameter, index) => parameter === node.parameters[index]);
        return unchanged ? id : this.intern({ kind: 'fn', parameters, result });
      }
    }
  }

  layout(
    id: TypeId,
    visiting: ReadonlySet<TypeId> = new Set(),
    visitingAggregates: ReadonlySet<string> = new Set(),
  ): TypeLayout {
    const cached = this.layoutCache.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) {
      return { size: 4, alignment: 4, layoutKey: `cycle(${id})` };
    }
    if (visiting.size >= 32) {
      return { size: 4, alignment: 4, layoutKey: `cycle(depth:${id})` };
    }

    const nextVisiting = new Set(visiting).add(id);
    const node = this.node(id);
    let layout: TypeLayout;
    switch (node.kind) {
      case 'primitive': {
        const primitive = PRIMITIVE_LAYOUTS[node.name];
        layout = { ...primitive, layoutKey: `prim:${node.name}` };
        break;
      }
      case 'param': {
        // Unresolved parameters are opaque handles until monomorphized.
        layout = { size: 4, alignment: 4, layoutKey: `param:${node.name}` };
        break;
      }
      case 'reference': {
        const inner = this.layout(node.inner, nextVisiting, visitingAggregates);
        layout = {
          size: 4,
          alignment: 4,
          layoutKey: `ref:${node.mode}:${inner.layoutKey}`,
        };
        break;
      }
      case 'array': {
        const element = this.layout(node.element, nextVisiting, visitingAggregates);
        const stride = alignOffset(element.size === 0 ? 0 : element.size, element.alignment);
        layout = {
          size: stride * node.length,
          alignment: Math.max(element.alignment, 1),
          layoutKey: `array:${element.layoutKey}:${node.length}`,
        };
        break;
      }
      case 'fn': {
        layout = { size: 4, alignment: 4, layoutKey: `fn:${this.display(id)}` };
        break;
      }
      case 'nominal': {
        layout = this.layoutNominal(node.name, node.args, nextVisiting, visitingAggregates);
        break;
      }
    }
    this.layoutCache.set(id, layout);
    return layout;
  }

  isOption(id: TypeId): boolean {
    const node = this.node(id);
    return node.kind === 'nominal' && node.name === 'Option';
  }

  isIteratorLike(id: TypeId): boolean {
    const node = this.node(id);
    return node.kind === 'nominal' && (node.name === 'Iterable' || node.name === 'Iterator');
  }

  collectionKind(id: TypeId): 'Array' | 'Vector' | undefined {
    const node = this.node(id);
    if (node.kind === 'array') return this.collectionKind(node.element);
    if (node.kind !== 'nominal') return undefined;
    if (node.name === 'Array' || node.name === 'Vector') return node.name;
    return undefined;
  }

  elementType(id: TypeId): TypeId | undefined {
    const node = this.node(id);
    if (node.kind === 'array') {
      // Fixed arrays are displayed as `Array<T>[N]` / `T[N]`. Collection payloads
      // live in the nominal type arguments; bare element arrays use the element id.
      const inner = this.node(node.element);
      if (inner.kind === 'nominal' && (inner.name === 'Array' || inner.name === 'Vector') && inner.args.length > 0) {
        return inner.args[0];
      }
      return node.element;
    }
    if (node.kind === 'nominal' && node.args.length > 0) return node.args[0];
    return undefined;
  }

  genericArguments(id: TypeId): readonly TypeId[] {
    const node = this.node(id);
    return node.kind === 'nominal' ? node.args : [];
  }

  functionParts(id: TypeId): { readonly parameters: readonly TypeId[]; readonly result: TypeId } | undefined {
    const node = this.node(id);
    if (node.kind === 'fn') return { parameters: node.parameters, result: node.result };
    if (node.kind === 'nominal' && node.name === 'Fn' && node.args.length > 0) {
      const result = node.args.at(-1);
      if (result === undefined) return undefined;
      return {
        parameters: node.args.slice(0, -1),
        result,
      };
    }
    return undefined;
  }

  /**
   * Boundary policy for built-in and user generics: value collections monomorphize;
   * iterator/interface surfaces remain descriptor boundaries.
   */
  defaultBoundary(generic: string, requested?: FlintGenericBoundary): FlintGenericBoundary {
    if (requested !== undefined) return requested;
    if (DESCRIPTOR_COLLECTIONS.has(generic)) return generic === 'Fn' ? 'interface' : 'iterator';
    if (VALUE_COLLECTIONS.has(generic)) return 'value';
    return 'value';
  }

  representationFor(boundary: FlintGenericBoundary): FlintSpecialization['representation'] {
    return boundary === 'value' ? 'monomorphized' : 'descriptor-boundary';
  }

  private layoutNominal(
    name: string,
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    if (name === 'Option') {
      const payload =
        arguments_[0] === undefined
          ? { size: 0, alignment: 1, layoutKey: 'prim:unit' }
          : this.layout(arguments_[0], visiting, visitingAggregates);
      const size = alignOffset(4 + payload.size, Math.max(4, payload.alignment));
      return {
        size,
        alignment: Math.max(4, payload.alignment),
        layoutKey: `option:${payload.layoutKey}`,
      };
    }
    if (name === 'Result' || name === 'iterResult') {
      const left =
        arguments_[0] === undefined
          ? this.layout(this.primitive('unit'), visiting, visitingAggregates)
          : this.layout(arguments_[0], visiting, visitingAggregates);
      const right =
        arguments_[1] === undefined
          ? this.layout(this.primitive('unit'), visiting, visitingAggregates)
          : this.layout(arguments_[1], visiting, visitingAggregates);
      const payload = Math.max(left.size, right.size);
      const alignment = Math.max(4, left.alignment, right.alignment);
      return {
        size: alignOffset(4 + payload, alignment),
        alignment,
        layoutKey: `result:${left.layoutKey}|${right.layoutKey}`,
      };
    }
    if (name === 'Array' || name === 'Vector') {
      const element =
        arguments_[0] === undefined
          ? this.layout(this.primitive('unit'), visiting, visitingAggregates)
          : this.layout(arguments_[0], visiting, visitingAggregates);
      // Dynamic vectors and sliced arrays are owned handles in the seed ABI.
      return {
        size: 8,
        alignment: 4,
        layoutKey: `${name.toLowerCase()}-handle:${element.layoutKey}`,
      };
    }
    if (name === 'Iterable' || name === 'Iterator' || name === 'Fn') {
      return {
        size: 4,
        alignment: 4,
        layoutKey: `descriptor:${name}:${arguments_.map((argument) => this.display(argument)).join(',')}`,
      };
    }

    const aggregate = this.aggregates.get(name);
    if (aggregate === undefined) {
      return {
        size: 4,
        alignment: 4,
        layoutKey: `opaque:${name}:${arguments_.map((argument) => this.display(argument)).join(',')}`,
      };
    }

    if (visitingAggregates.has(name)) {
      return {
        size: 4,
        alignment: 4,
        layoutKey: `cycle(${name})`,
      };
    }
    const nextVisitingAggregates = new Set(visitingAggregates).add(name);

    const environment = new Map<string, TypeId>();
    for (const [index, parameter] of aggregate.genericParameters.entries()) {
      const argument = arguments_[index];
      if (argument !== undefined) environment.set(parameter, argument);
    }

    let offset = 0;
    let alignment = 1;
    const fieldKeys: string[] = [];
    for (const field of aggregate.fields) {
      const fieldType = this.substitute(field.type, environment);
      const fieldLayout = this.layout(fieldType, visiting, nextVisitingAggregates);
      offset = alignOffset(offset, fieldLayout.alignment);
      fieldKeys.push(`${field.name}:${fieldLayout.layoutKey}@${offset}`);
      offset += fieldLayout.size;
      alignment = Math.max(alignment, fieldLayout.alignment);
    }
    return {
      size: alignOffset(offset, alignment === 0 ? 1 : alignment),
      alignment: Math.max(alignment, 1),
      layoutKey: `struct{${fieldKeys.join(';')}}`,
    };
  }

  private nodeKey(node: TypeNode): string {
    switch (node.kind) {
      case 'primitive': {
        return `p:${node.name}`;
      }
      case 'param': {
        return `t:${node.name}`;
      }
      case 'nominal': {
        return `n:${node.name}<${node.args.join(',')}>`;
      }
      case 'array': {
        return `a:${node.element}:${node.length}`;
      }
      case 'reference': {
        return `r:${node.mode}:${node.inner}`;
      }
      case 'fn': {
        return `f:${node.parameters.join(',')}->${node.result}`;
      }
    }
  }

  private freezeNode(node: TypeNode): TypeNode {
    switch (node.kind) {
      case 'nominal': {
        return { kind: 'nominal', name: node.name, args: Object.freeze([...node.args]) };
      }
      case 'fn': {
        return { kind: 'fn', parameters: Object.freeze([...node.parameters]), result: node.result };
      }
      default: {
        return node;
      }
    }
  }
}

/**
 * Monomorphization cache: concrete generic instantiations keyed by interned
 * argument tuples, with layout-key deduplication across distinct nominal types.
 */
export class MonomorphizationCache {
  private readonly specializations = new Map<string, MonomorphizedSpecialization>();
  private readonly layoutOwners = new Map<string, string>();
  private readonly algebra: TypeAlgebra;

  constructor(algebra: TypeAlgebra) {
    this.algebra = algebra;
  }

  get size(): number {
    return this.specializations.size;
  }

  get(id: string): MonomorphizedSpecialization | undefined {
    return this.specializations.get(id);
  }

  values(): readonly MonomorphizedSpecialization[] {
    return [...this.specializations.values()].toSorted((left, right) =>
      left.specialization.id.localeCompare(right.specialization.id),
    );
  }

  specializationsOnly(): readonly FlintSpecialization[] {
    return this.values().map((entry) => entry.specialization);
  }

  /**
   * Intern a concrete application `Generic<Args...>` and record a specialization.
   * When the expanded layout matches a previous entry, `sharedLayout` is set and
   * both specializations retain independent ids while sharing layout ownership.
   */
  monomorphize(
    generic: string,
    argumentIds: readonly TypeId[],
    boundary?: FlintGenericBoundary,
  ): MonomorphizedSpecialization {
    const resolvedBoundary = this.algebra.defaultBoundary(generic, boundary);
    const typeId = this.algebra.nominal(generic, argumentIds);
    const argumentKeys = argumentIds.map((argument) => this.algebra.display(argument));
    const id = `${generic}<${argumentKeys.join(',')}>:${resolvedBoundary}`;
    const existing = this.specializations.get(id);
    if (existing !== undefined) return existing;

    const layout = this.algebra.layout(typeId);
    const owner = this.layoutOwners.get(layout.layoutKey);
    const sharedLayout = owner !== undefined && owner !== id;
    if (owner === undefined) this.layoutOwners.set(layout.layoutKey, id);

    const entry: MonomorphizedSpecialization = {
      specialization: {
        id,
        generic,
        arguments: argumentKeys,
        representation: this.algebra.representationFor(resolvedBoundary),
      },
      typeId,
      layout,
      sharedLayout,
      ...(sharedLayout ? { layoutOwnerId: owner } : {}),
    };
    this.specializations.set(id, entry);
    return entry;
  }

  monomorphizeStruct(request: MonomorphizeStructRequest): MonomorphizedSpecialization {
    const parameterNames = request.declaration.genericParameters.map(({ name }) => name);
    if (request.arguments.length !== parameterNames.length) {
      throw new RangeError(
        `Generic '${request.declaration.name}' expects ${parameterNames.length} type argument(s), got ${request.arguments.length}.`,
      );
    }
    this.algebra.defineAggregate({
      name: request.declaration.name,
      genericParameters: parameterNames,
      fields: request.declaration.fields.map((field) => ({
        name: field.name,
        type: this.algebra.fromAst(field.type, new Set(parameterNames)),
      })),
      ...(request.declaration.record === true ? { record: true as const } : {}),
    });
    return this.monomorphize(request.declaration.name, request.arguments, request.boundary ?? 'value');
  }

  /**
   * Discover concrete generic applications from a module and monomorphize value
   * boundaries. Iterator/interface applications remain descriptor specializations.
   */
  collectFromModule(module: FlintModule): readonly MonomorphizedSpecialization[] {
    this.algebra.defineAggregatesFromModule(module);
    const seen = new Set<TypeId>();
    const visit = (type: FlintTypeName, typeParameters: ReadonlySet<string>): void => {
      const id = this.algebra.fromAst(type, typeParameters);
      if (seen.has(id)) return;
      seen.add(id);
      const node = this.algebra.node(id);
      if (node.kind === 'nominal' && node.args.length > 0) {
        this.monomorphize(node.name, node.args);
      }
      if (type.arguments !== undefined) {
        for (const argument of type.arguments) visit(argument, typeParameters);
      }
    };

    for (const declaration of module.structs) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      for (const field of declaration.fields) visit(field.type, parameters);
    }
    for (const declaration of module.enums) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      for (const variant of declaration.variants) for (const field of variant.fields) visit(field.type, parameters);
    }
    for (const declaration of module.functions) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      visit(declaration.result, parameters);
      for (const parameter of declaration.parameters) visit(parameter.type, parameters);
      visitStatements(declaration.body, parameters, visit);
    }
    for (const declaration of module.interfaces) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      for (const required of declaration.functions) {
        const nested = new Set([...parameters, ...required.genericParameters.map(({ name }) => name)]);
        visit(required.result, nested);
        for (const parameter of required.parameters) visit(parameter.type, nested);
      }
    }
    return this.values();
  }
}

function visitStatements(
  statements: FlintModule['functions'][number]['body'],
  typeParameters: ReadonlySet<string>,
  visit: (type: FlintTypeName, typeParameters: ReadonlySet<string>) => void,
): void {
  for (const statement of statements) {
    switch (statement.kind) {
      case 'let': {
        visit(statement.type, typeParameters);
        break;
      }
      case 'if': {
        visitStatements(statement.consequent, typeParameters, visit);
        if (statement.alternate !== undefined) visitStatements(statement.alternate, typeParameters, visit);
        break;
      }
      case 'while':
      case 'do-while':
      case 'for':
      case 'iterator-loop': {
        visitStatements(statement.body, typeParameters, visit);
        break;
      }
      case 'switch': {
        for (const arm of statement.cases) visitStatements(arm.body, typeParameters, visit);
        if (statement.defaultCase !== undefined) visitStatements(statement.defaultCase, typeParameters, visit);
        break;
      }
      default: {
        break;
      }
    }
  }
}

/** Shared algebra instance helpers for call sites that do not need a private table. */
export function createTypeAlgebra(module?: Pick<FlintModule, 'structs'>): TypeAlgebra {
  const algebra = new TypeAlgebra();
  if (module !== undefined) algebra.defineAggregatesFromModule(module);
  return algebra;
}

export function createMonomorphizationCache(module?: Pick<FlintModule, 'structs'>): {
  readonly algebra: TypeAlgebra;
  readonly cache: MonomorphizationCache;
} {
  const algebra = createTypeAlgebra(module);
  return { algebra, cache: new MonomorphizationCache(algebra) };
}

export function typeNameKeyFromAlgebra(type: FlintTypeName, algebra = createTypeAlgebra()): string {
  return algebra.display(algebra.fromAst(type));
}

export function primitiveLayout(name: FlintPrimitiveType): Omit<TypeLayout, 'layoutKey'> {
  return PRIMITIVE_LAYOUTS[name];
}

export function ownershipFromType(type: FlintTypeName): FlintOwnership | undefined {
  return type.ownership;
}
