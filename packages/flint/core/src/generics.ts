import {
  MonomorphizationCache,
  type FlintGenericBoundary,
  type MonomorphizedSpecialization,
  type TypeAlgebra,
  createTypeAlgebra,
} from './type-algebra.js';

import type { FlintOwnership, FlintTypeName } from './ast.js';
import type { FlintIteratorBoundaryDescriptor, FlintSpecialization } from './manifest.js';

export type { FlintGenericBoundary } from './type-algebra.js';

export interface FlintGenericSpecializationRequest {
  readonly generic: string;
  readonly arguments: readonly FlintTypeName[];
  readonly boundary?: FlintGenericBoundary;
  /** Optional shared algebra so callers can reuse interned ids across requests. */
  readonly algebra?: TypeAlgebra;
}

export interface FlintMonomorphizeRequest extends FlintGenericSpecializationRequest {
  /** Optional shared monomorphization cache; created when omitted. */
  readonly cache?: MonomorphizationCache;
}

function canonicalType(type: FlintTypeName, algebra = createTypeAlgebra()): string {
  return algebra.display(algebra.fromAst(type));
}

export function flintGenericRepresentation(
  boundary: FlintGenericBoundary = 'value',
): FlintSpecialization['representation'] {
  return boundary === 'value' ? 'monomorphized' : 'descriptor-boundary';
}

/**
 * Build a manifest specialization descriptor using interned TypeAlgebra keys.
 * Prefer `monomorphizeFlintGeneric` when layout metadata is required.
 */
export function createFlintGenericSpecialization(request: FlintGenericSpecializationRequest): FlintSpecialization {
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
export function monomorphizeFlintGeneric(request: FlintMonomorphizeRequest): MonomorphizedSpecialization {
  const algebra = request.algebra ?? createTypeAlgebra();
  const cache = request.cache ?? new MonomorphizationCache(algebra);
  const argumentIds = request.arguments.map((argument) => algebra.fromAst(argument));
  return cache.monomorphize(request.generic, argumentIds, request.boundary);
}

export function createFlintIteratorBoundaryDescriptor(
  generic: string,
  elementType: FlintTypeName,
  nextFunction: string,
  ownership: FlintOwnership = 'borrowed',
): FlintIteratorBoundaryDescriptor {
  return {
    id: `${generic}<${canonicalType(elementType)}>`,
    generic,
    elementType: canonicalType(elementType),
    nextFunction,
    representation: 'descriptor-boundary',
    ownership,
  };
}

export function sortFlintSpecializations(
  specializations: readonly FlintSpecialization[],
): readonly FlintSpecialization[] {
  return [...specializations].toSorted((left, right) => left.id.localeCompare(right.id));
}

export { MonomorphizationCache, TypeAlgebra, createMonomorphizationCache, createTypeAlgebra } from './type-algebra.js';
