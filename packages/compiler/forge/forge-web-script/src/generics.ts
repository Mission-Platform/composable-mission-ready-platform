import {
  MonomorphizationCache,
  type ForgeWebScriptGenericBoundary,
  type MonomorphizedSpecialization,
  type TypeAlgebra,
  createTypeAlgebra,
} from './type-algebra.js';

import type { ForgeWebScriptOwnership, ForgeWebScriptTypeName } from './ast.js';
import type { ForgeWebScriptIteratorBoundaryDescriptor, ForgeWebScriptSpecialization } from './manifest.js';

export type { ForgeWebScriptGenericBoundary } from './type-algebra.js';

export interface ForgeWebScriptGenericSpecializationRequest {
  readonly generic: string;
  readonly arguments: readonly ForgeWebScriptTypeName[];
  readonly boundary?: ForgeWebScriptGenericBoundary;
  /** Optional shared algebra so callers can reuse interned ids across requests. */
  readonly algebra?: TypeAlgebra;
}

export interface ForgeWebScriptMonomorphizeRequest extends ForgeWebScriptGenericSpecializationRequest {
  /** Optional shared monomorphization cache; created when omitted. */
  readonly cache?: MonomorphizationCache;
}

function canonicalType(type: ForgeWebScriptTypeName, algebra = createTypeAlgebra()): string {
  return algebra.display(algebra.fromAst(type));
}

export function forgeWebScriptGenericRepresentation(
  boundary: ForgeWebScriptGenericBoundary = 'value',
): ForgeWebScriptSpecialization['representation'] {
  return boundary === 'value' ? 'monomorphized' : 'descriptor-boundary';
}

/**
 * Build a manifest specialization descriptor using interned TypeAlgebra keys.
 * Prefer `monomorphizeForgeWebScriptGeneric` when layout metadata is required.
 */
export function createForgeWebScriptGenericSpecialization(
  request: ForgeWebScriptGenericSpecializationRequest,
): ForgeWebScriptSpecialization {
  const algebra = request.algebra ?? createTypeAlgebra();
  const argumentIds = request.arguments.map((argument) => algebra.fromAst(argument));
  const boundary = algebra.defaultBoundary(request.generic, request.boundary);
  const arguments_ = argumentIds.map((argument) => algebra.display(argument));
  return {
    id: `${request.generic}<${arguments_.join(',')}>:${boundary}`,
    generic: request.generic,
    arguments: arguments_,
    representation: algebra.representationFor(boundary),
  };
}

/**
 * Monomorphize a generic application through the layout-aware cache.
 * Identical expanded layouts share a layout owner while keeping distinct specialization ids.
 */
export function monomorphizeForgeWebScriptGeneric(
  request: ForgeWebScriptMonomorphizeRequest,
): MonomorphizedSpecialization {
  const algebra = request.algebra ?? createTypeAlgebra();
  const cache = request.cache ?? new MonomorphizationCache(algebra);
  const argumentIds = request.arguments.map((argument) => algebra.fromAst(argument));
  return cache.monomorphize(request.generic, argumentIds, request.boundary);
}

export function createForgeWebScriptIteratorBoundaryDescriptor(
  generic: string,
  elementType: ForgeWebScriptTypeName,
  nextFunction: string,
  ownership: ForgeWebScriptOwnership = 'borrowed',
): ForgeWebScriptIteratorBoundaryDescriptor {
  return {
    id: `${generic}<${canonicalType(elementType)}>`,
    generic,
    elementType: canonicalType(elementType),
    nextFunction,
    representation: 'descriptor-boundary',
    ownership,
  };
}

export function sortForgeWebScriptSpecializations(
  specializations: readonly ForgeWebScriptSpecialization[],
): readonly ForgeWebScriptSpecialization[] {
  return [...specializations].toSorted((left, right) => left.id.localeCompare(right.id));
}

export { MonomorphizationCache, TypeAlgebra, createMonomorphizationCache, createTypeAlgebra } from './type-algebra.js';
