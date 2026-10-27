import type {
  FlintFieldInfo,
  FlintModule,
  FlintStructDeclaration,
  FlintTypeInfo,
  FlintTypeName,
} from "@mission-platform/flint-ast";
import {
  isPrimitiveName,
  TypeAlgebra,
  type CStructFieldLayout,
  type TargetPlatformTriplet,
  type TypeId,
  type TypeLayout,
} from "@mission-platform/flint-types";

/**
 * Normalizes short platform names (e.g. 'wasm32', 'x86_64-linux') to canonical TargetPlatformTriplet.
 */
export function normalizeTargetPlatform(
  platform: string,
): TargetPlatformTriplet {
  if (platform === "wasm32" || platform === "wasm32-unknown-unknown")
    return "wasm32-unknown-unknown";
  if (platform === "wasm64" || platform === "wasm64-unknown-unknown")
    return "wasm64-unknown-unknown";
  if (platform === "x86_64-linux" || platform === "x86_64-unknown-linux-gnu")
    return "x86_64-unknown-linux-gnu";
  if (platform === "x86_64-windows" || platform === "x86_64-pc-windows-msvc")
    return "x86_64-pc-windows-msvc";
  if (platform === "aarch64-darwin" || platform === "aarch64-apple-darwin")
    return "aarch64-apple-darwin";
  if (platform === "i686-linux" || platform === "i686-unknown-linux-gnu")
    return "i686-unknown-linux-gnu";
  return "wasm32-unknown-unknown";
}

/**
 * Compile-time Type Introspection Engine.
 *
 * Implements zero-cost compile-time introspection querying target-specific layouts
 * from `TypeAlgebra` across all supported platform ABIs (`wasm32`, `wasm64`, `x86_64-linux`, `aarch64-darwin`).
 */
export class FlintIntrospectionEngine {
  public readonly platform: TargetPlatformTriplet;
  public readonly algebra: TypeAlgebra;

  public constructor(
    platform: string = "wasm32-unknown-unknown",
    algebra?: TypeAlgebra,
  ) {
    const normalized = normalizeTargetPlatform(platform);
    this.platform = normalized;
    this.algebra = algebra ?? new TypeAlgebra(normalized);
  }

  /**
   * Registers a struct declaration into the introspection engine's type algebra.
   */
  public registerStruct(struct: FlintStructDeclaration): void {
    this.algebra.defineAggregatesFromModule({ structs: [struct] });
  }

  /**
   * Registers all struct declarations in a module.
   */
  public registerModule(
    module:
      FlintModule | { readonly structs: readonly FlintStructDeclaration[] },
  ): void {
    this.algebra.defineAggregatesFromModule(module);
  }

  /**
   * Resolves a type input into a canonical `TypeId`.
   */
  public toTypeId(type: FlintTypeName | TypeId | string): TypeId {
    if (typeof type === "number") {
      return type;
    }
    if (typeof type === "string") {
      if (isPrimitiveName(type)) {
        return this.algebra.primitive(type);
      }
      return this.algebra.nominal(type, []);
    }
    return this.algebra.fromAst(type);
  }

  /**
   * Computes the byte size of a type on the target platform ABI.
   */
  public sizeOf(type: FlintTypeName | TypeId | string): number {
    const typeId = this.toTypeId(type);
    return this.algebra.layout(typeId).size;
  }

  /**
   * Computes the required byte alignment of a type on the target platform ABI.
   */
  public alignOf(type: FlintTypeName | TypeId | string): number {
    const typeId = this.toTypeId(type);
    return this.algebra.layout(typeId).alignment;
  }

  /**
   * Computes the byte offset of a named field within an aggregate type.
   */
  public offsetOf(
    type: FlintTypeName | TypeId | string,
    fieldName: string,
  ): number {
    const fields = this.fieldsOf(type);
    const field = fields.find((f) => f.name === fieldName);
    if (!field) {
      const typeNameStr =
        typeof type === "string"
          ? type
          : typeof type === "number"
            ? this.algebra.display(type)
            : (type.reference ?? type.name);
      throw new Error(
        `Field '${fieldName}' not found on type '${typeNameStr}'.`,
      );
    }
    return field.offset;
  }

  /**
   * Returns complete field introspection metadata for an aggregate type.
   */
  public fieldsOf(
    type: FlintTypeName | TypeId | string,
  ): readonly FlintFieldInfo[] {
    const aggregateName =
      typeof type === "string"
        ? type
        : typeof type === "object"
          ? (type.reference ?? type.name)
          : this.algebra.display(type);
    const aggregate = this.algebra.getAggregate(aggregateName);
    if (!aggregate) {
      return [];
    }

    if (
      aggregate.repr?.kind === "c" ||
      aggregate.c_struct === true ||
      aggregate.packed !== undefined ||
      aggregate.align !== undefined
    ) {
      const cLayout = this.algebra.layoutCStruct(aggregate);
      return cLayout.fields.map((f: CStructFieldLayout) => ({
        name: f.name,
        offset: f.offset,
        size: f.size,
        alignment: f.alignment,
        typeName: f.layoutKey,
      }));
    }

    const fieldInfos: FlintFieldInfo[] = [];
    let currentOffset = 0;
    let maxAlign = 1;

    for (const field of aggregate.fields) {
      const fieldLayout = this.algebra.layout(field.type);
      const align = fieldLayout.alignment;
      if (align > maxAlign) maxAlign = align;

      const offset = (currentOffset + align - 1) & ~(align - 1);
      fieldInfos.push({
        name: field.name,
        offset,
        size: fieldLayout.size,
        alignment: align,
        typeName: this.algebra.display(field.type),
      });
      currentOffset = offset + fieldLayout.size;
    }

    return fieldInfos;
  }

  /**
   * Returns complete type introspection metadata for any type on the target platform ABI.
   */
  public typeInfo(type: FlintTypeName | TypeId | string): FlintTypeInfo {
    const typeId = this.toTypeId(type);
    const layout: TypeLayout = this.algebra.layout(typeId);
    const typeNode = this.algebra.node(typeId);
    const typeNameStr =
      typeof type === "string"
        ? type
        : typeof type === "number"
          ? this.algebra.display(typeId)
          : (type.reference ?? type.name);

    let fields: readonly FlintFieldInfo[] = [];
    if (typeNode.kind === "nominal") {
      fields = this.fieldsOf(typeNode.name);
    }

    return {
      name: typeNameStr,
      size: layout.size,
      alignment: layout.alignment,
      fields,
    };
  }
}

/**
 * Options for generating runtime reflection metadata.
 */
export interface FlintRttiGenerationOptions {
  readonly targetPlatform?: string;
  readonly includePrivate?: boolean;
}

/**
 * Generates capability-attenuated runtime type information (RTTI) metadata.
 *
 * Ensures capability safety: private capabilities and opaque host handles are never
 * synthesized or forged via reflection.
 */
export function generateFlintRtti(
  module: FlintModule,
  options: FlintRttiGenerationOptions = {},
): {
  readonly enabled: boolean;
  readonly types: readonly FlintTypeInfo[];
} {
  const engine = new FlintIntrospectionEngine(
    options.targetPlatform ?? "wasm32",
  );
  engine.registerModule(module);

  const types: FlintTypeInfo[] = [];

  for (const structDecl of module.structs) {
    const info = engine.typeInfo(structDecl.name);
    // Sanitize any capability fields to ensure deny-by-default capability security
    const sanitizedFields = info.fields.map((field) => {
      const isCapability =
        field.name.toLowerCase().includes("capability") ||
        field.name.startsWith("cap_") ||
        field.typeName.toLowerCase().includes("capability") ||
        field.typeName.startsWith("cap_");

      if (isCapability) {
        return {
          ...field,
          typeName: "<opaque-capability-handle>",
        };
      }
      return field;
    });

    types.push({
      ...info,
      fields: sanitizedFields,
    });
  }

  return {
    enabled: true,
    types,
  };
}
