import {
  isCPrimitiveType,
  layoutCPrimitive,
  PLATFORM_CONFIGS,
  type PlatformAbiConfig,
  type TargetPlatform,
} from '@mission-platform/flint-c-abi';

import {
  type FlintModule,
  type FlintOwnership,
  type FlintPrimitiveType,
  type FlintReferenceMode,
  type FlintStructDeclaration,
  type FlintStructRepr,
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

/** Discriminated union of interned structural type node shapes. */
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

/** Computed ABI layout (size, alignment, and dedup fingerprint) for an interned type. */
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

/** Generic instantiation policy: value monomorphization, or descriptor-boundary interface/iterator surfaces. */
export type FlintGenericBoundary = 'value' | 'interface' | 'iterator';

/** A concrete generic application with its interned type id and computed layout. */
export interface MonomorphizedSpecialization {
  readonly specialization: FlintSpecialization;
  readonly typeId: TypeId;
  readonly layout: TypeLayout;
  /** True when an earlier specialization already owns this layout key. */
  readonly sharedLayout: boolean;
  readonly layoutOwnerId?: string;
}

/** Request to monomorphize a generic struct declaration against concrete type arguments. */
export interface MonomorphizeStructRequest {
  readonly declaration: Pick<FlintStructDeclaration, 'name' | 'genericParameters' | 'fields' | 'record'>;
  readonly arguments: readonly TypeId[];
  readonly boundary?: FlintGenericBoundary;
}

/** Registered field-layout definition for a user-defined nominal aggregate (struct). */
export interface AggregateLayoutDefinition {
  readonly name: string;
  readonly genericParameters?: readonly string[];
  readonly fields: readonly { readonly name: string; readonly type: TypeId }[];
  readonly record?: true | boolean;
  /**
   * Explicit C ABI struct layout (deprecated, use repr?.kind === 'c').
   * @deprecated Use `repr?.kind === 'c'`.
   */
  readonly c_struct?: boolean;
  readonly repr?: FlintStructRepr;
  readonly packed?: number;
  readonly align?: number;
}

export {
  PLATFORM_CONFIGS,
  type PlatformAbiConfig,
  type TargetPlatform,
  type TargetPlatformTriplet,
} from '@mission-platform/flint-c-abi';

/** Detailed field layout offset and padding for C structs. */
export interface CStructFieldLayout {
  readonly name: string;
  readonly offset: number;
  readonly size: number;
  readonly alignment: number;
  readonly layoutKey: string;
}

/** Computed ABI layout for C structs with explicit field offsets and tail padding. */
export interface CStructLayout extends TypeLayout {
  readonly fields: readonly CStructFieldLayout[];
  readonly tailPadding: number;
}

const PRIMITIVE_TYPE_NAMES = new Set<string>([
  'unit',
  'bool',
  'i32',
  'u32',
  'f32',
  'i64',
  'u64',
  'f64',
  'string',
  'bytes',
  'u8',
  'i8',
  'c_char',
  'c_uchar',
  'c_short',
  'c_ushort',
  'c_int',
  'c_uint',
  'c_long',
  'c_ulong',
  'c_longlong',
  'c_ulonglong',
  'c_size',
  'c_ssize',
  'c_float',
  'c_double',
  'c_void',
]);

const VALUE_COLLECTIONS = new Set(['Array', 'Vector', 'Option', 'Result', 'iterResult']);
const DESCRIPTOR_COLLECTIONS = new Set(['Iterable', 'Iterator', 'Fn']);
const RESULT_LIKE_NOMINAL_NAMES = new Set(['Result', 'iterResult']);
const COLLECTION_HANDLE_NOMINAL_NAMES = new Set(['Array', 'Vector']);
const FOREIGN_POINTER_NAMES = new Set(['CPtr', 'MutCPtr', 'COpaquePtr']);

/**
 * Determines whether a name refers to a built-in Flint primitive type.
 *
 * @param name - Candidate type name.
 * @returns True if `name` is a registered primitive type name.
 */
function isPrimitiveName(name: string): name is FlintPrimitiveType {
  return PRIMITIVE_TYPE_NAMES.has(name);
}

/**
 * Rounds an offset up to the nearest multiple of the given alignment.
 *
 * @param offset - Unaligned byte offset.
 * @param alignment - Required alignment in bytes (must be a power of two, or `<= 1` for no-op).
 * @returns The aligned byte offset.
 */
function alignOffset(offset: number, alignment: number): number {
  if (alignment <= 1) return offset;
  const mask = alignment - 1;
  return (offset + mask) & ~mask;
}

const FIXED_PRIMITIVE_LAYOUTS: Readonly<Record<string, { readonly size: number; readonly alignment: number }>> = {
  unit: { size: 0, alignment: 1 },
  c_void: { size: 0, alignment: 1 },
  bool: { size: 4, alignment: 4 },
  u8: { size: 1, alignment: 1 },
  i8: { size: 1, alignment: 1 },
  c_char: { size: 1, alignment: 1 },
  c_uchar: { size: 1, alignment: 1 },
  c_short: { size: 2, alignment: 2 },
  c_ushort: { size: 2, alignment: 2 },
  i32: { size: 4, alignment: 4 },
  u32: { size: 4, alignment: 4 },
  f32: { size: 4, alignment: 4 },
  c_int: { size: 4, alignment: 4 },
  c_uint: { size: 4, alignment: 4 },
  c_float: { size: 4, alignment: 4 },
};

/**
 * Hash-consing table and structural operations over interned types.
 */
export class TypeAlgebra {
  public readonly platform: PlatformAbiConfig;
  private readonly nodes: TypeNode[] = [];
  private readonly internTable = new Map<string, TypeId>();
  private readonly aggregates = new Map<string, AggregateLayoutDefinition>();
  private readonly layoutCache = new Map<TypeId, TypeLayout>();

  constructor(target: TargetPlatform = 'wasm32-unknown-unknown') {
    this.platform = PLATFORM_CONFIGS[target] ?? PLATFORM_CONFIGS['wasm32-unknown-unknown'];
  }

  /** Register a nominal aggregate so monomorphization can expand field layouts. */
  defineAggregate(definition: AggregateLayoutDefinition): void {
    this.aggregates.set(definition.name, definition);
    this.layoutCache.clear();
  }

  /**
   * Converts a module struct declaration AST node into an aggregate layout definition.
   *
   * @param declaration - Struct declaration AST node.
   * @returns Aggregate layout definition ready for registration.
   */
  // skipcq: JS-R1005
  private convertStructDeclaration(declaration: FlintModule['structs'][number]): AggregateLayoutDefinition {
    const genericParameters = declaration.genericParameters.map(({ name }) => name);
    return {
      name: declaration.name,
      genericParameters,
      fields: declaration.fields.map((field) => ({
        name: field.name,
        type: this.fromAst(field.type, new Set(genericParameters)),
      })),
      ...(declaration.record ? { record: true as const } : {}),
      ...(declaration.repr ? { repr: declaration.repr } : {}),
      ...(declaration.repr?.kind === 'c' || declaration.c_struct ? { c_struct: true as const } : {}),
      ...(declaration.packed === undefined ? {} : { packed: declaration.packed }),
      ...(declaration.align === undefined ? {} : { align: declaration.align }),
    };
  }

  /**
   * Registers aggregate layout definitions for every struct declared in a module.
   *
   * @param module - Module (or struct-only slice) supplying struct declarations.
   */
  defineAggregatesFromModule(module: Pick<FlintModule, 'structs'>): void {
    for (const declaration of module.structs) {
      this.defineAggregate(this.convertStructDeclaration(declaration));
    }
  }

  /**
   * Interns a type node, returning the existing id when an equivalent node was
   * already hash-consed, or allocating and freezing a new id otherwise.
   *
   * @param node - Structural type node to intern.
   * @returns The interned `TypeId`.
   */
  intern(node: TypeNode): TypeId {
    const key = TypeAlgebra.nodeKey(node);
    const existing = this.internTable.get(key);
    if (existing !== undefined) return existing;
    const id = this.nodes.length as TypeId;
    this.nodes.push(TypeAlgebra.freezeNode(node));
    this.internTable.set(key, id);
    return id;
  }

  /**
   * Resolves the interned type node for a `TypeId`.
   *
   * @param id - Type id to resolve.
   * @returns The interned type node.
   * @throws {RangeError} If `id` is not a known interned type id.
   */
  node(id: TypeId): TypeNode {
    const value = this.nodes[id];
    if (value === undefined) throw new RangeError(`Unknown TypeId ${id}`);
    return value;
  }

  /**
   * Compares two type ids for identity equality.
   *
   * @param left - First type id.
   * @param right - Second type id.
   * @returns True if both ids refer to the same interned type.
   */
  // skipcq: JS-0105
  equal(left: TypeId, right: TypeId): boolean {
    return left === right;
  }

  /**
   * Interns a primitive type node.
   *
   * @param name - Primitive type name.
   * @returns The interned `TypeId` for the primitive.
   */
  primitive(name: FlintPrimitiveType): TypeId {
    return this.intern({ kind: 'primitive', name });
  }

  /**
   * Interns a generic type-parameter placeholder node.
   *
   * @param name - Type parameter name.
   * @returns The interned `TypeId` for the type parameter.
   */
  param(name: string): TypeId {
    return this.intern({ kind: 'param', name });
  }

  /**
   * Interns a nominal (named, possibly generic) type node.
   *
   * @param name - Nominal type name.
   * @param arguments_ - Generic type arguments applied to the nominal type.
   * @returns The interned `TypeId`, collapsing to a primitive id when the name is a
   *   zero-argument primitive.
   */
  nominal(name: string, arguments_: readonly TypeId[] = []): TypeId {
    if (arguments_.length === 0 && isPrimitiveName(name)) return this.primitive(name);
    return this.intern({ kind: 'nominal', name, args: [...arguments_] });
  }

  /**
   * Resolves the base (unwrapped) type id for an AST type name, before array-length
   * and reference-mode wrappers are applied.
   *
   * @param baseName - Resolved base name (reference alias or literal name).
   * @param type - Source AST type name.
   * @param typeParameters - Names bound as generic type parameters in the current scope.
   * @returns The interned base `TypeId`.
   */
  // skipcq: JS-R1005
  private resolveBaseTypeId(baseName: string, type: FlintTypeName, typeParameters: ReadonlySet<string>): TypeId {
    if (type.arguments !== undefined && type.arguments.length > 0) {
      return this.nominal(
        baseName,
        type.arguments.map((argument) => this.fromAst(argument, typeParameters)),
      );
    }
    if (typeParameters.has(baseName)) {
      return this.param(baseName);
    }
    if (type.reference === undefined && isPrimitiveName(type.name)) {
      return this.primitive(type.name);
    }
    return this.nominal(baseName);
  }

  /**
   * Applies fixed-array-length and reference-mode wrappers on top of a base type id.
   *
   * @param id - Base type id to wrap.
   * @param type - Source AST type name carrying optional `length`/`referenceMode`.
   * @returns The (possibly wrapped) `TypeId`.
   */
  private applyTypeModifiers(id: TypeId, type: FlintTypeName): TypeId {
    let result = id;
    if (type.length !== undefined) result = this.intern({ kind: 'array', element: result, length: type.length });
    if (type.referenceMode !== undefined) {
      result = this.intern({ kind: 'reference', mode: type.referenceMode, inner: result });
    }
    return result;
  }

  /**
   * Intern an AST type. Names listed in `typeParameters` become type-param nodes
   * rather than unresolved nominals.
   */
  fromAst(type: FlintTypeName, typeParameters: ReadonlySet<string> = new Set()): TypeId {
    const baseName = type.reference ?? type.name;
    const id = this.resolveBaseTypeId(baseName, type, typeParameters);
    return this.applyTypeModifiers(id, type);
  }

  /** Canonical checker/specialization key (no spaces), matching historical `typeNameKey`. */
  // skipcq: JS-R1005
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
      default: {
        const exhaustiveCheck: never = node;
        throw new Error(`Unexpected type node kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /** Human-readable form matching `flintTypeNameToString`. */
  pretty(id: TypeId): string {
    return flintTypeNameToString(this.toAst(id));
  }

  /**
   * Reconstructs the AST form of a nominal type node, including reference alias
   * and generic argument list wrappers.
   *
   * @param node - Interned nominal type node.
   * @param span - Placeholder source span reused for synthesized AST nodes.
   * @returns The equivalent `FlintTypeName` AST node.
   */
  private toAstNominal(node: Extract<TypeNode, { kind: 'nominal' }>, span: FlintTypeName['span']): FlintTypeName {
    const isPlainPrimitive = isPrimitiveName(node.name);
    const primitive = isPlainPrimitive ? node.name : ('unit' as const);
    return {
      kind: 'type-name',
      name: primitive,
      ...(isPlainPrimitive && node.args.length === 0 ? {} : { reference: node.name }),
      ...(node.args.length === 0 ? {} : { arguments: node.args.map((argument) => this.toAst(argument)) }),
      span,
    };
  }

  /**
   * Reconstructs the AST `FlintTypeName` form of an interned type id.
   *
   * @param id - Interned type id.
   * @returns The equivalent AST type name, using a placeholder zero-width span.
   */
  // skipcq: JS-R1005
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
        return this.toAstNominal(node, span);
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
      default: {
        const exhaustiveCheck: never = node;
        throw new Error(`Unexpected type node kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Substitutes generic parameters within a nominal type's argument list.
   *
   * @param node - Interned nominal type node.
   * @param environment - Map of generic parameter names to concrete type ids.
   * @returns The substituted `TypeId`, reusing the original id when unchanged.
   */
  private substituteNominal(
    id: TypeId,
    node: Extract<TypeNode, { kind: 'nominal' }>,
    environment: ReadonlyMap<string, TypeId>,
  ): TypeId {
    const arguments_ = node.args.map((argument) => this.substitute(argument, environment));
    const unchanged = arguments_.every((argument, index) => argument === node.args[index]);
    return unchanged ? id : this.nominal(node.name, arguments_);
  }

  /**
   * Substitutes generic parameters within an array type's element type.
   *
   * @param node - Interned array type node.
   * @param environment - Map of generic parameter names to concrete type ids.
   * @returns The substituted `TypeId`, reusing the original id when unchanged.
   */
  private substituteArray(
    id: TypeId,
    node: Extract<TypeNode, { kind: 'array' }>,
    environment: ReadonlyMap<string, TypeId>,
  ): TypeId {
    const element = this.substitute(node.element, environment);
    return element === node.element ? id : this.intern({ kind: 'array', element, length: node.length });
  }

  /**
   * Substitutes generic parameters within a reference type's inner type.
   *
   * @param node - Interned reference type node.
   * @param environment - Map of generic parameter names to concrete type ids.
   * @returns The substituted `TypeId`, reusing the original id when unchanged.
   */
  private substituteReference(
    id: TypeId,
    node: Extract<TypeNode, { kind: 'reference' }>,
    environment: ReadonlyMap<string, TypeId>,
  ): TypeId {
    const inner = this.substitute(node.inner, environment);
    return inner === node.inner ? id : this.intern({ kind: 'reference', mode: node.mode, inner });
  }

  /**
   * Substitutes generic parameters within a function type's parameter and result types.
   *
   * @param node - Interned function type node.
   * @param environment - Map of generic parameter names to concrete type ids.
   * @returns The substituted `TypeId`, reusing the original id when unchanged.
   */
  private substituteFn(
    id: TypeId,
    node: Extract<TypeNode, { kind: 'fn' }>,
    environment: ReadonlyMap<string, TypeId>,
  ): TypeId {
    const parameters = node.parameters.map((parameter) => this.substitute(parameter, environment));
    const result = this.substitute(node.result, environment);
    const unchanged =
      result === node.result && parameters.every((parameter, index) => parameter === node.parameters[index]);
    return unchanged ? id : this.intern({ kind: 'fn', parameters, result });
  }

  /**
   * Substitutes generic type parameters throughout a type id with concrete bindings.
   *
   * @param id - Type id to substitute within.
   * @param environment - Map of generic parameter names to concrete type ids.
   * @returns The substituted `TypeId`, reusing `id` when no parameters were bound within it.
   */
  // skipcq: JS-R1005
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
        return this.substituteNominal(id, node, environment);
      }
      case 'array': {
        return this.substituteArray(id, node, environment);
      }
      case 'reference': {
        return this.substituteReference(id, node, environment);
      }
      case 'fn': {
        return this.substituteFn(id, node, environment);
      }
      default: {
        const exhaustiveCheck: never = node;
        throw new Error(`Unexpected type node kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Returns target-dependent primitive layout (size and alignment).
   *
   * @param name - Primitive type name.
   * @returns The primitive's size and alignment.
   */
  // skipcq: JS-R1005
  primitiveLayout(name: FlintPrimitiveType): Omit<TypeLayout, 'layoutKey'> {
    const fixed = FIXED_PRIMITIVE_LAYOUTS[name];
    if (fixed !== undefined) return fixed;

    if (isCPrimitiveType(name)) {
      return layoutCPrimitive(name, this.platform);
    }

    switch (name) {
      case 'i64':
      case 'u64':
      case 'f64': {
        return { size: 8, alignment: this.platform.i64StructAlignment };
      }
      case 'string':
      case 'bytes': {
        return {
          size: this.platform.pointerSize * 2,
          alignment: this.platform.pointerAlignment,
        };
      }
      default: {
        throw new Error(`Unsupported primitive type for layout: ${name}`);
      }
    }
  }

  /**
   * Computes the layout for a reference type node.
   *
   * @param node - Interned reference type node.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The reference type's layout.
   */
  private layoutReference(
    node: Extract<TypeNode, { kind: 'reference' }>,
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    const inner = this.layout(node.inner, visiting, visitingAggregates);
    return {
      size: this.platform.pointerSize,
      alignment: this.platform.pointerAlignment,
      layoutKey: `ref:${node.mode}:${inner.layoutKey}`,
    };
  }

  /**
   * Computes the layout for a fixed-length array type node.
   *
   * @param node - Interned array type node.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The array type's layout.
   */
  private layoutArray(
    node: Extract<TypeNode, { kind: 'array' }>,
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    const element = this.layout(node.element, visiting, visitingAggregates);
    const stride = alignOffset(element.size === 0 ? 0 : element.size, element.alignment);
    return {
      size: stride * node.length,
      alignment: Math.max(element.alignment, 1),
      layoutKey: `array:${element.layoutKey}:${node.length}`,
    };
  }

  /**
   * Dispatches layout computation for an interned type node by kind.
   *
   * @param id - Type id under evaluation, used for `fn` display formatting.
   * @param node - Interned type node.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The computed layout for the node.
   */
  // skipcq: JS-R1005
  private layoutForNode(
    id: TypeId,
    node: TypeNode,
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    switch (node.kind) {
      case 'primitive': {
        const primitive = this.primitiveLayout(node.name);
        return { ...primitive, layoutKey: `prim:${node.name}` };
      }
      case 'param': {
        // Unresolved parameters are opaque handles until monomorphized.
        return { size: 4, alignment: 4, layoutKey: `param:${node.name}` };
      }
      case 'reference': {
        return this.layoutReference(node, visiting, visitingAggregates);
      }
      case 'array': {
        return this.layoutArray(node, visiting, visitingAggregates);
      }
      case 'fn': {
        return { size: 4, alignment: 4, layoutKey: `fn:${this.display(id)}` };
      }
      case 'nominal': {
        return this.layoutNominal(node.name, node.args, visiting, visitingAggregates);
      }
      default: {
        const exhaustiveCheck: never = node;
        throw new Error(`Unexpected type node kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Computes (and caches) the ABI layout of an interned type id, guarding against
   * unbounded recursion through cyclic aggregate references.
   *
   * @param id - Type id to compute the layout for.
   * @param visiting - Type ids currently on the recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The computed (or cached) type layout.
   */
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
    const layout = this.layoutForNode(id, node, nextVisiting, visitingAggregates);
    this.layoutCache.set(id, layout);
    return layout;
  }

  /**
   * Determines whether a type id refers to the built-in `Option<T>` nominal type.
   *
   * @param id - Type id to inspect.
   * @returns True if the type is `Option`.
   */
  isOption(id: TypeId): boolean {
    const node = this.node(id);
    return node.kind === 'nominal' && node.name === 'Option';
  }

  /**
   * Determines whether a type id refers to an `Iterable` or `Iterator` descriptor type.
   *
   * @param id - Type id to inspect.
   * @returns True if the type is `Iterable` or `Iterator`.
   */
  isIteratorLike(id: TypeId): boolean {
    const node = this.node(id);
    return node.kind === 'nominal' && (node.name === 'Iterable' || node.name === 'Iterator');
  }

  /**
   * Resolves the collection family (`Array`/`Vector`) for a type id, unwrapping
   * fixed-length array wrappers.
   *
   * @param id - Type id to inspect.
   * @returns `'Array'` or `'Vector'` if the type is a collection, otherwise `undefined`.
   */
  collectionKind(id: TypeId): 'Array' | 'Vector' | undefined {
    const node = this.node(id);
    if (node.kind === 'array') return this.collectionKind(node.element);
    if (node.kind !== 'nominal') return undefined;
    if (node.name === 'Array' || node.name === 'Vector') return node.name;
    return undefined;
  }

  /**
   * Resolves the element type carried by a fixed array or generic collection nominal.
   *
   * @param id - Type id to inspect.
   * @returns The element `TypeId`, or `undefined` if the type carries no element type.
   */
  // skipcq: JS-R1005
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

  /**
   * Resolves the generic argument list of a nominal type id.
   *
   * @param id - Type id to inspect.
   * @returns The nominal type's argument ids, or an empty array for non-nominal types.
   */
  genericArguments(id: TypeId): readonly TypeId[] {
    const node = this.node(id);
    return node.kind === 'nominal' ? node.args : [];
  }

  /**
   * Resolves the parameter and result types of a function type id, including the
   * `Fn<Args..., Result>` nominal encoding.
   *
   * @param id - Type id to inspect.
   * @returns The parameter/result type ids, or `undefined` if the type is not function-shaped.
   */
  // skipcq: JS-R1005
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
  // skipcq: JS-0105, JS-R1005
  defaultBoundary(generic: string, requested?: FlintGenericBoundary): FlintGenericBoundary {
    if (requested !== undefined) return requested;
    if (DESCRIPTOR_COLLECTIONS.has(generic)) return generic === 'Fn' ? 'interface' : 'iterator';
    if (VALUE_COLLECTIONS.has(generic) || this.aggregates.has(generic)) return 'value';
    return 'value';
  }

  /**
   * Maps a generic boundary policy to its specialization representation kind.
   *
   * @param boundary - Generic instantiation boundary.
   * @returns `'monomorphized'` for value boundaries, otherwise `'descriptor-boundary'`.
   */
  // skipcq: JS-0105
  representationFor(boundary: FlintGenericBoundary): FlintSpecialization['representation'] {
    if (this.nodes.length === 0) return boundary === 'value' ? 'monomorphized' : 'descriptor-boundary';
    return boundary === 'value' ? 'monomorphized' : 'descriptor-boundary';
  }

  /**
   * Determines whether an interned type qualifies for null-pointer niche optimization in Option<T>.
   *
   * @param typeId - Interned type identifier.
   * @returns True if the type is a reference or foreign pointer type.
   */
  private isNullablePointerPayload(typeId: TypeId): boolean {
    const node = this.node(typeId);
    if (node.kind === 'reference') return true;
    if (node.kind === 'nominal') {
      return node.name === 'CPtr' || node.name === 'MutCPtr' || node.name === 'COpaquePtr';
    }
    return false;
  }

  /**
   * Computes the layout for the built-in `Option<T>` nominal type.
   *
   * @param arguments_ - Generic type arguments applied to `Option`.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The tagged-payload layout for `Option`.
   */
  private layoutOption(
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    const payloadId = arguments_[0];
    const payload =
      payloadId === undefined
        ? { size: 0, alignment: 1, layoutKey: 'prim:unit' }
        : this.layout(payloadId, visiting, visitingAggregates);

    if (payloadId !== undefined && this.isNullablePointerPayload(payloadId)) {
      return {
        size: this.platform.pointerSize,
        alignment: this.platform.pointerAlignment,
        layoutKey: `option-nullable-ptr:${payload.layoutKey}`,
      };
    }

    const size = alignOffset(4 + payload.size, Math.max(4, payload.alignment));
    return {
      size,
      alignment: Math.max(4, payload.alignment),
      layoutKey: `option:${payload.layoutKey}`,
    };
  }

  /**
   * Computes the layout for the built-in `Result<T, E>` / `iterResult<T, E>` nominal types.
   *
   * @param arguments_ - Generic type arguments applied to the result-like nominal.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The tagged-union layout for the result-like type.
   */
  private layoutResultLike(
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
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

  /**
   * Computes the layout for the built-in `Array<T>` / `Vector<T>` handle nominal types.
   *
   * @param name - Either `'Array'` or `'Vector'`.
   * @param arguments_ - Generic type arguments applied to the collection nominal.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The owned-handle layout for the collection type.
   */
  private layoutCollectionHandle(
    name: string,
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
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

  /**
   * Computes the layout for descriptor-boundary nominal types (`Iterable`, `Iterator`, `Fn`).
   *
   * @param name - Descriptor nominal type name.
   * @param arguments_ - Generic type arguments applied to the descriptor nominal.
   * @returns The fixed descriptor-handle layout.
   */
  private layoutDescriptor(name: string, arguments_: readonly TypeId[]): TypeLayout {
    return {
      size: 4,
      alignment: 4,
      layoutKey: `descriptor:${name}:${arguments_.map((argument) => this.display(argument)).join(',')}`,
    };
  }

  /**
   * Builds the generic-parameter substitution environment for a user-defined aggregate.
   *
   * @param aggregate - Aggregate layout definition being expanded.
   * @param arguments_ - Concrete type arguments applied at the use site.
   * @returns A map from generic parameter name to concrete type id.
   */
  // skipcq: JS-0105
  private buildAggregateEnvironment(
    aggregate: AggregateLayoutDefinition,
    arguments_: readonly TypeId[],
  ): Map<string, TypeId> {
    const environment = new Map<string, TypeId>();
    for (const [index, parameter] of (aggregate.genericParameters ?? []).entries()) {
      const argument = arguments_[index];
      if (argument !== undefined) environment.set(parameter, argument);
    }
    return environment;
  }

  /**
   * Computes the alignment for a C struct from the maximum field alignment and repr options.
   *
   * @param maxFieldAlignment - Maximum alignment across all fields in the struct.
   * @param aggregate - Struct layout definition.
   * @returns Calculated struct alignment.
   */
  // skipcq: JS-0105
  private computeCStructAlignment(maxFieldAlignment: number, aggregate: AggregateLayoutDefinition): number {
    let structAlignment = maxFieldAlignment;
    if (aggregate.packed !== undefined) {
      structAlignment = Math.min(structAlignment, aggregate.packed);
    }
    if (aggregate.align !== undefined) {
      structAlignment = Math.max(structAlignment, aggregate.align);
    }
    return Math.max(structAlignment, 1);
  }

  /**
   * Derives the representation flag string for a C struct layout key.
   *
   * @param aggregate - Struct layout definition.
   * @returns Representation key component string.
   */
  // skipcq: JS-0105
  private computeReprFlag(aggregate: AggregateLayoutDefinition): string {
    if (aggregate.packed !== undefined) {
      return `packed(${aggregate.packed})`;
    }
    if (aggregate.align !== undefined) {
      return `align(${aggregate.align})`;
    }
    return 'c';
  }

  /**
   * Computes layout for C structs with target-specific natural alignment,
   * packed clamping, and tail alignment.
   *
   * @param aggregate - Aggregate layout definition being expanded.
   * @param environment - Generic-parameter substitution environment.
   * @param visiting - Type ids currently on the layout recursion stack.
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The computed C struct layout.
   */
  layoutCStruct(
    aggregate: AggregateLayoutDefinition,
    environment: ReadonlyMap<string, TypeId> = new Map(),
    visiting: ReadonlySet<TypeId> = new Set(),
    visitingAggregates: ReadonlySet<string> = new Set(),
  ): CStructLayout {
    let offset = 0;
    let maxFieldAlignment = 1;
    const fields: CStructFieldLayout[] = [];
    const packClamp = aggregate.packed;

    for (const field of aggregate.fields) {
      const fieldType = this.substitute(field.type, environment);
      const fieldLayout = this.layout(fieldType, visiting, visitingAggregates);

      let effectiveAlignment = fieldLayout.alignment;
      if (packClamp !== undefined) {
        effectiveAlignment = Math.min(effectiveAlignment, packClamp);
      }
      effectiveAlignment = Math.max(effectiveAlignment, 1);

      offset = alignOffset(offset, effectiveAlignment);
      fields.push({
        name: field.name,
        offset,
        size: fieldLayout.size,
        alignment: effectiveAlignment,
        layoutKey: fieldLayout.layoutKey,
      });

      offset += fieldLayout.size;
      maxFieldAlignment = Math.max(maxFieldAlignment, effectiveAlignment);
    }

    const structAlignment = this.computeCStructAlignment(maxFieldAlignment, aggregate);
    const alignedSize = alignOffset(offset, structAlignment);
    const tailPadding = alignedSize - offset;

    const fieldKeys = fields.map((f) => `${f.name}:${f.layoutKey}@${f.offset}`);
    const reprFlag = this.computeReprFlag(aggregate);

    return {
      size: alignedSize,
      alignment: structAlignment,
      tailPadding,
      fields,
      layoutKey: `c_struct[${this.platform.platform}:${reprFlag}]{${fieldKeys.join(';')}}`,
    };
  }

  /**
   * Determines whether an aggregate layout represents a C struct layout.
   *
   * @param aggregate - Aggregate definition under check.
   * @returns True if C struct representation or alignment rules apply.
   */
  // skipcq: JS-0105
  private isCStructLayout(aggregate: AggregateLayoutDefinition): boolean {
    return (
      aggregate.repr?.kind === 'c' ||
      aggregate.c_struct === true ||
      aggregate.packed !== undefined ||
      aggregate.align !== undefined
    );
  }

  /**
   * Computes the struct-style field layout for a user-defined aggregate.
   *
   * @param aggregate - Aggregate layout definition being expanded.
   * @param environment - Generic-parameter substitution environment.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The packed field layout for the aggregate.
   */
  private layoutAggregateFields(
    aggregate: AggregateLayoutDefinition,
    environment: ReadonlyMap<string, TypeId>,
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    if (this.isCStructLayout(aggregate)) {
      return this.layoutCStruct(aggregate, environment, visiting, visitingAggregates);
    }
    let offset = 0;
    let alignment = 1;
    const fieldKeys: string[] = [];
    for (const field of aggregate.fields) {
      const fieldType = this.substitute(field.type, environment);
      const fieldLayout = this.layout(fieldType, visiting, visitingAggregates);
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

  /**
   * Computes the layout for a user-defined aggregate nominal type, expanding its
   * registered field definitions and guarding against recursive aggregate cycles.
   *
   * @param name - Aggregate nominal type name.
   * @param arguments_ - Generic type arguments applied at the use site.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The aggregate's layout, or an opaque/cycle placeholder layout.
   */
  private layoutAggregate(
    name: string,
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
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
    const environment = this.buildAggregateEnvironment(aggregate, arguments_);
    return this.layoutAggregateFields(aggregate, environment, visiting, nextVisitingAggregates);
  }

  /**
   * Computes layout for foreign pointer types (CPtr, MutCPtr, COpaquePtr).
   *
   * @param name - Pointer family nominal type name.
   * @param arguments_ - Generic type arguments applied to the pointer.
   * @param visiting - Type ids currently on the layout recursion stack.
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The pointer type layout.
   */
  private layoutForeignPointer(
    name: string,
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    const target = arguments_[0];
    const targetKey = target === undefined ? 'opaque' : this.layout(target, visiting, visitingAggregates).layoutKey;
    return {
      size: this.platform.pointerSize,
      alignment: this.platform.pointerAlignment,
      layoutKey: `${name}:${targetKey}`,
    };
  }

  /**
   * Dispatches nominal-type layout computation by built-in family, falling back to
   * user-defined aggregate expansion.
   *
   * @param name - Nominal type name.
   * @param arguments_ - Generic type arguments applied at the use site.
   * @param visiting - Type ids currently on the layout recursion stack (cycle guard).
   * @param visitingAggregates - Aggregate names currently on the recursion stack.
   * @returns The computed layout for the nominal type.
   */
  // skipcq: JS-R1005
  private layoutNominal(
    name: string,
    arguments_: readonly TypeId[],
    visiting: ReadonlySet<TypeId>,
    visitingAggregates: ReadonlySet<string>,
  ): TypeLayout {
    if (name === 'Option') {
      return this.layoutOption(arguments_, visiting, visitingAggregates);
    }
    if (FOREIGN_POINTER_NAMES.has(name)) {
      return this.layoutForeignPointer(name, arguments_, visiting, visitingAggregates);
    }
    if (RESULT_LIKE_NOMINAL_NAMES.has(name)) {
      return this.layoutResultLike(arguments_, visiting, visitingAggregates);
    }
    if (COLLECTION_HANDLE_NOMINAL_NAMES.has(name)) {
      return this.layoutCollectionHandle(name, arguments_, visiting, visitingAggregates);
    }
    if (DESCRIPTOR_COLLECTIONS.has(name)) {
      return this.layoutDescriptor(name, arguments_);
    }
    return this.layoutAggregate(name, arguments_, visiting, visitingAggregates);
  }

  /**
   * Computes the structural interning key for a type node, used for hash-consing.
   *
   * @param node - Structural type node.
   * @returns A stable string key uniquely identifying the node's shape.
   */
  // skipcq: JS-0105, JS-R1005
  private static nodeKey(node: TypeNode): string {
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
      default: {
        const exhaustiveCheck: never = node;
        throw new Error(`Unexpected type node kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
      }
    }
  }

  /**
   * Freezes the mutable argument/parameter arrays of a type node before interning,
   * so hash-consed nodes are safe to share by reference.
   *
   * @param node - Structural type node to freeze.
   * @returns The frozen (or unchanged) type node.
   */
  // skipcq: JS-0105
  private static freezeNode(node: TypeNode): TypeNode {
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

  /**
   * Creates a monomorphization cache backed by a shared type algebra instance.
   *
   * @param algebra - Type algebra used to intern and lay out specialized types.
   */
  constructor(algebra: TypeAlgebra) {
    this.algebra = algebra;
  }

  /** Number of distinct recorded specializations. */
  get size(): number {
    return this.specializations.size;
  }

  /**
   * Looks up a recorded specialization by its stable specialization id.
   *
   * @param id - Specialization id (as produced by {@link MonomorphizationCache.monomorphize}).
   * @returns The recorded specialization, or `undefined` if not found.
   */
  get(id: string): MonomorphizedSpecialization | undefined {
    return this.specializations.get(id);
  }

  /**
   * Lists all recorded specializations, sorted by specialization id for determinism.
   *
   * @returns The recorded specializations in stable sorted order.
   */
  values(): readonly MonomorphizedSpecialization[] {
    return [...this.specializations.values()].toSorted((left, right) =>
      left.specialization.id.localeCompare(right.specialization.id),
    );
  }

  /**
   * Lists the manifest-facing specialization records only, dropping cache-internal fields.
   *
   * @returns The recorded specializations' `FlintSpecialization` payloads.
   */
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

  /**
   * Registers a generic struct declaration's field layout and monomorphizes it
   * against the requested concrete type arguments.
   *
   * @param request - Struct declaration slice and concrete type arguments to apply.
   * @returns The resulting monomorphized specialization.
   * @throws {RangeError} If the number of supplied arguments does not match the
   *   struct's generic parameter count.
   */
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
   * Visits a single AST type reference, monomorphizing any concrete nominal
   * application and recursing into its generic arguments.
   *
   * @param seen - Set of already-visited type ids, preventing repeated work.
   * @param type - Source AST type name.
   * @param typeParameters - Names bound as generic type parameters in the current scope.
   */
  // skipcq: JS-R1005
  private visitModuleType(seen: Set<TypeId>, type: FlintTypeName, typeParameters: ReadonlySet<string>): void {
    const id = this.algebra.fromAst(type, typeParameters);
    if (seen.has(id)) return;
    seen.add(id);
    const node = this.algebra.node(id);
    if (node.kind === 'nominal' && node.args.length > 0) {
      this.monomorphize(node.name, node.args);
    }
    if (type.arguments !== undefined) {
      for (const argument of type.arguments) this.visitModuleType(seen, argument, typeParameters);
    }
  }

  /**
   * Visits struct field types for generic-application discovery.
   *
   * @param structs - Struct declarations from the module.
   * @param seen - Set of already-visited type ids.
   */
  private collectFromStructs(structs: FlintModule['structs'], seen: Set<TypeId>): void {
    for (const declaration of structs) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      for (const field of declaration.fields) this.visitModuleType(seen, field.type, parameters);
    }
  }

  /**
   * Visits enum variant field types for generic-application discovery.
   *
   * @param enums - Enum declarations from the module.
   * @param seen - Set of already-visited type ids.
   */
  private collectFromEnums(enums: FlintModule['enums'], seen: Set<TypeId>): void {
    for (const declaration of enums) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      for (const variant of declaration.variants) {
        for (const field of variant.fields) this.visitModuleType(seen, field.type, parameters);
      }
    }
  }

  /**
   * Visits function signature and body types for generic-application discovery.
   *
   * @param functions - Function declarations from the module.
   * @param seen - Set of already-visited type ids.
   */
  private collectFromFunctions(functions: FlintModule['functions'], seen: Set<TypeId>): void {
    for (const declaration of functions) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      this.visitModuleType(seen, declaration.result, parameters);
      for (const parameter of declaration.parameters) this.visitModuleType(seen, parameter.type, parameters);
      visitStatements(declaration.body, parameters, (type, typeParameters) =>
        this.visitModuleType(seen, type, typeParameters),
      );
    }
  }

  /**
   * Visits interface member signature types for generic-application discovery.
   *
   * @param interfaces - Interface declarations from the module.
   * @param seen - Set of already-visited type ids.
   */
  private collectFromInterfaces(interfaces: FlintModule['interfaces'], seen: Set<TypeId>): void {
    for (const declaration of interfaces) {
      const parameters = new Set(declaration.genericParameters.map(({ name }) => name));
      for (const required of declaration.functions) {
        const nested = new Set([...parameters, ...required.genericParameters.map(({ name }) => name)]);
        this.visitModuleType(seen, required.result, nested);
        for (const parameter of required.parameters) this.visitModuleType(seen, parameter.type, nested);
      }
    }
  }

  /**
   * Discover concrete generic applications from a module and monomorphize value
   * boundaries. Iterator/interface applications remain descriptor specializations.
   */
  collectFromModule(module: FlintModule): readonly MonomorphizedSpecialization[] {
    this.algebra.defineAggregatesFromModule(module);
    const seen = new Set<TypeId>();
    this.collectFromStructs(module.structs, seen);
    this.collectFromEnums(module.enums, seen);
    this.collectFromFunctions(module.functions, seen);
    this.collectFromInterfaces(module.interfaces, seen);
    return this.values();
  }
}

/**
 * Visits the nested type references within an `if` statement's branches.
 *
 * @param statement - Branching `if` statement node.
 * @param typeParameters - Names bound as generic type parameters in the current scope.
 * @param visit - Callback invoked for each discovered type reference.
 */
function visitIfStatement(
  statement: Extract<FlintModule['functions'][number]['body'][number], { kind: 'if' }>,
  typeParameters: ReadonlySet<string>,
  visit: (type: FlintTypeName, typeParameters: ReadonlySet<string>) => void,
): void {
  visitStatements(statement.consequent, typeParameters, visit);
  if (statement.alternate !== undefined) visitStatements(statement.alternate, typeParameters, visit);
}

/**
 * Visits the nested type references within a `switch` statement's cases.
 *
 * @param statement - `switch` statement node.
 * @param typeParameters - Names bound as generic type parameters in the current scope.
 * @param visit - Callback invoked for each discovered type reference.
 */
function visitSwitchStatement(
  statement: Extract<FlintModule['functions'][number]['body'][number], { kind: 'switch' }>,
  typeParameters: ReadonlySet<string>,
  visit: (type: FlintTypeName, typeParameters: ReadonlySet<string>) => void,
): void {
  for (const arm of statement.cases) visitStatements(arm.body, typeParameters, visit);
  if (statement.defaultCase !== undefined) visitStatements(statement.defaultCase, typeParameters, visit);
}

/**
 * Identifies loop statements that share a single nested `body` statement list.
 *
 * @param statement - Candidate statement.
 * @returns True if statement is while, do-while, for, or iterator-loop.
 */
function isLoopLikeModuleStatement(
  statement: FlintModule['functions'][number]['body'][number],
): statement is Extract<
  FlintModule['functions'][number]['body'][number],
  { kind: 'while' | 'do-while' | 'for' | 'iterator-loop' }
> {
  const kind = statement.kind;
  return kind === 'while' || kind === 'do-while' || kind === 'for' || kind === 'iterator-loop';
}

/**
 * Visits the nested type references of a single statement, dispatching by statement kind.
 *
 * @param statement - Source statement.
 * @param typeParameters - Names bound as generic type parameters in the current scope.
 * @param visit - Callback invoked for each discovered type reference.
 */
function visitStatement(
  statement: FlintModule['functions'][number]['body'][number],
  typeParameters: ReadonlySet<string>,
  visit: (type: FlintTypeName, typeParameters: ReadonlySet<string>) => void,
): void {
  if (statement.kind === 'let') {
    visit(statement.type, typeParameters);
    return;
  }
  if (statement.kind === 'if') {
    visitIfStatement(statement, typeParameters, visit);
    return;
  }
  if (isLoopLikeModuleStatement(statement)) {
    visitStatements(statement.body, typeParameters, visit);
    return;
  }
  if (statement.kind === 'switch') {
    visitSwitchStatement(statement, typeParameters, visit);
  }
}

/**
 * Visits the nested type references of a statement sequence, dispatching each
 * statement by kind.
 *
 * @param statements - Sequence of statements to visit.
 * @param typeParameters - Names bound as generic type parameters in the current scope.
 * @param visit - Callback invoked for each discovered type reference.
 */
function visitStatements(
  statements: FlintModule['functions'][number]['body'],
  typeParameters: ReadonlySet<string>,
  visit: (type: FlintTypeName, typeParameters: ReadonlySet<string>) => void,
): void {
  for (const statement of statements) {
    visitStatement(statement, typeParameters, visit);
  }
}

/** Shared algebra instance helpers for call sites that do not need a private table. */
export function createTypeAlgebra(
  moduleOrTarget?: Pick<FlintModule, 'structs'> | TargetPlatform,
  maybeTarget?: TargetPlatform,
): TypeAlgebra {
  let target: TargetPlatform = 'wasm32-unknown-unknown';
  let module: Pick<FlintModule, 'structs'> | undefined;

  if (typeof moduleOrTarget === 'string') {
    target = moduleOrTarget;
  } else if (moduleOrTarget !== undefined) {
    module = moduleOrTarget;
    if (maybeTarget !== undefined) target = maybeTarget;
  }

  const algebra = new TypeAlgebra(target);
  if (module !== undefined) algebra.defineAggregatesFromModule(module);
  return algebra;
}

/**
 * Creates a paired type algebra and monomorphization cache, optionally seeding
 * aggregate definitions from a module's struct declarations.
 *
 * @param module - Optional module (or struct-only slice) to seed aggregate definitions from.
 * @param target - Optional target platform profile.
 * @returns The paired `algebra` and `cache`.
 */
export function createMonomorphizationCache(
  module?: Pick<FlintModule, 'structs'>,
  target?: TargetPlatform,
): {
  readonly algebra: TypeAlgebra;
  readonly cache: MonomorphizationCache;
} {
  const algebra = createTypeAlgebra(module, target);
  return { algebra, cache: new MonomorphizationCache(algebra) };
}

/**
 * Computes the canonical checker/specialization key for an AST type name.
 *
 * @param type - Source AST type name.
 * @param algebra - Type algebra used for interning; defaults to a fresh instance.
 * @returns The canonical (no-spaces) type key.
 */
export function typeNameKeyFromAlgebra(type: FlintTypeName, algebra = createTypeAlgebra()): string {
  return algebra.display(algebra.fromAst(type));
}

/**
 * Looks up the fixed ABI layout for a primitive type name on the specified target platform.
 *
 * @param name - Primitive type name.
 * @param target - Target platform profile.
 * @returns The primitive's size and alignment (without a layout key).
 */
export function primitiveLayout(
  name: FlintPrimitiveType,
  target: TargetPlatform = 'wasm32-unknown-unknown',
): Omit<TypeLayout, 'layoutKey'> {
  const algebra = new TypeAlgebra(target);
  return algebra.primitiveLayout(name);
}

/**
 * Reads the ownership annotation carried by an AST type name.
 *
 * @param type - Source AST type name.
 * @returns The declared ownership mode, or `undefined` if unset.
 */
export function ownershipFromType(type: FlintTypeName): FlintOwnership | undefined {
  return type.ownership;
}
