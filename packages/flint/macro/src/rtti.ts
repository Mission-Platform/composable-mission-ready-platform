import type {
  FlintEnumDeclaration,
  FlintModule,
  FlintStructDeclaration,
} from "@mission-platform/flint-ast";

import { FlintIntrospectionEngine } from "./introspection.js";

/**
 * Runtime Type Information (RTTI) descriptor for an aggregate field.
 */
export interface FlintRttiFieldDescriptor {
  readonly name: string;
  readonly type: string;
  readonly offset: number;
  readonly size: number;
  readonly alignment: number;
}

/**
 * Runtime Type Information (RTTI) descriptor for an aggregate struct or record.
 */
export interface FlintRttiStructDescriptor {
  readonly kind: "struct";
  readonly name: string;
  readonly isRecord: boolean;
  readonly size: number;
  readonly alignment: number;
  readonly fields: readonly FlintRttiFieldDescriptor[];
}

/**
 * Runtime Type Information (RTTI) descriptor for an algebraic enum variant.
 */
export interface FlintRttiVariantDescriptor {
  readonly name: string;
  readonly tag: number;
  readonly fieldTypes: readonly string[];
}

/**
 * Runtime Type Information (RTTI) descriptor for an enum type.
 */
export interface FlintRttiEnumDescriptor {
  readonly kind: "enum";
  readonly name: string;
  readonly variants: readonly FlintRttiVariantDescriptor[];
}

export type FlintRttiDescriptor =
  FlintRttiStructDescriptor | FlintRttiEnumDescriptor;

/**
 * Generates runtime type information (RTTI) tables from AST modules for reflection and introspection.
 */
export class FlintRttiGenerator {
  private readonly introspection: FlintIntrospectionEngine;

  public constructor(platform = "wasm32") {
    this.introspection = new FlintIntrospectionEngine(platform);
  }

  /**
   * Generates RTTI descriptors for all structs and enums in a module.
   */
  public generateModuleRtti(
    module: FlintModule,
  ): readonly FlintRttiDescriptor[] {
    this.introspection.registerModule(module);
    const descriptors: FlintRttiDescriptor[] = [];

    for (const struct of module.structs) {
      descriptors.push(this.generateStructRtti(struct));
    }

    for (const enumeration of module.enums) {
      descriptors.push(this.generateEnumRtti(enumeration));
    }

    return descriptors;
  }

  public generateStructRtti(
    struct: FlintStructDeclaration,
  ): FlintRttiStructDescriptor {
    const info = this.introspection.typeInfo(struct.name);
    return {
      kind: "struct",
      name: struct.name,
      isRecord: struct.record === true,
      size: info.size,
      alignment: info.alignment,
      fields: info.fields.map((f) => ({
        name: f.name,
        type: f.typeName,
        offset: f.offset,
        size: f.size,
        alignment: f.alignment,
      })),
    };
  }

  public generateEnumRtti(
    enumeration: FlintEnumDeclaration,
  ): FlintRttiEnumDescriptor {
    return {
      kind: "enum",
      name: enumeration.name,
      variants: enumeration.variants.map((v) => ({
        name: v.name,
        tag: v.tag,
        fieldTypes: v.fields.map((f) => f.type.reference ?? f.type.name),
      })),
    };
  }
}
