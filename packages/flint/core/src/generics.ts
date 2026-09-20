import {
  MonomorphizationCache,
  type FlintGenericBoundary,
  type MonomorphizedSpecialization,
  type TypeAlgebra,
  createTypeAlgebra,
} from './type-algebra.js';

import type { FlintOwnership, FlintTypeName } from './ast.js';
import type { FlintIteratorBoundaryDescriptor, FlintSpecialization } from './manifest.js';

/**
 * Request payload for creating a generic specialization descriptor.
 */
export interface FlintGenericSpecializationRequest {
  readonly generic: string;
  readonly arguments: readonly FlintTypeName[];
  readonly boundary?: FlintGenericBoundary;
  /** Optional shared algebra so callers can reuse interned ids across requests. */
  readonly algebra?: TypeAlgebra;
}

/**
 * Request payload for monomorphizing a generic type application with layout caching.
 */
export interface FlintMonomorphizeRequest extends FlintGenericSpecializationRequest {
  /** Optional shared monomorphization cache; created when omitted. */
  readonly cache?: MonomorphizationCache;
}

/**
 * Computes the canonical display string representation for an AST type name.
 *
 * @param type - AST type name.
 * @param algebra - Optional TypeAlgebra instance for interning and stringification.
 * @returns Canonical type string representation.
 */
function canonicalType(type: FlintTypeName, algebra = createTypeAlgebra()): string {
  return algebra.display(algebra.fromAst(type));
}

/**
 * Resolves the specialization representation kind for a given generic boundary mode.
 *
 * @param boundary - Generic boundary strategy ('value' or 'descriptor').
 * @returns Specialization representation kind string.
 */
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

/**
 * Creates an iterator boundary descriptor for crossing module or runtime boundaries.
 *
 * @param generic - Name of the generic iterator type.
 * @param elementType - Element type produced by the iterator.
 * @param nextFunction - Function name to invoke for iterator step advancement.
 * @param ownership - Element ownership semantics ('borrowed' or 'owned').
 * @returns Structured iterator boundary descriptor for the module manifest.
 */
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

/**
 * Deterministically sorts a collection of generic specializations by their unique identifier.
 *
 * @param specializations - Readonly array of generic specializations to sort.
 * @returns New sorted array of generic specializations.
 */
export function sortFlintSpecializations(
  specializations: readonly FlintSpecialization[],
): readonly FlintSpecialization[] {
  return [...specializations].toSorted((left, right) => left.id.localeCompare(right.id));
}
