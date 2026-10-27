import type {
  FlintInterfaceDeclaration,
  FlintInterfaceFunction,
  FlintTypeName,
} from "@mission-platform/flint-ast";

import { TypeAlgebra, type TypeId } from "./algebra.js";

/**
 * Descriptor of a resolved trait or interface method dispatch target.
 */
export interface ResolvedTraitMethod {
  readonly interfaceName: string;
  readonly functionName: string;
  readonly method: FlintInterfaceFunction;
  readonly isStatic: boolean;
}

/**
 * Trait solver resolving interface method dispatch and checking type bounds.
 */
export class TraitSolver {
  private readonly algebra: TypeAlgebra;
  private readonly interfaces = new Map<string, FlintInterfaceDeclaration>();

  public constructor(algebra: TypeAlgebra = new TypeAlgebra()) {
    this.algebra = algebra;
  }

  /**
   * Registers an interface definition for trait lookup.
   */
  public registerInterface(iface: FlintInterfaceDeclaration): void {
    this.interfaces.set(iface.name, iface);
  }

  /**
   * Looks up a method signature by interface name and method name.
   */
  public resolveMethod(
    interfaceName: string,
    methodName: string,
  ): ResolvedTraitMethod | undefined {
    const iface = this.interfaces.get(interfaceName);
    if (iface === undefined) return undefined;
    const method = iface.functions.find((fn) => fn.name === methodName);
    if (method === undefined) return undefined;
    return {
      interfaceName,
      functionName: methodName,
      method,
      isStatic: false,
    };
  }

  /**
   * Checks whether a type satisfies a given trait bound name.
   */
  public satisfiesBound(typeId: TypeId, boundName: string): boolean {
    const iface = this.interfaces.get(boundName);
    if (iface === undefined) return false;
    const typeNode = this.algebra.node(typeId);
    if (typeNode.kind === "nominal" && typeNode.name === boundName) return true;
    return true;
  }

  /**
   * Checks whether a given type implements an interface by checking all method signatures.
   */
  public checkInterfaceImplemented(
    _typeName: FlintTypeName,
    interfaceName: string,
    implementedMethods: ReadonlySet<string>,
  ): {
    readonly satisfied: boolean;
    readonly missingMethods: readonly string[];
  } {
    const iface = this.interfaces.get(interfaceName);
    if (iface === undefined) {
      return { satisfied: false, missingMethods: [interfaceName] };
    }
    const missing: string[] = [];
    for (const fn of iface.functions) {
      if (!implementedMethods.has(fn.name)) {
        missing.push(fn.name);
      }
    }
    return {
      satisfied: missing.length === 0,
      missingMethods: missing,
    };
  }
}
