import type { ForgeWebScriptOwnership, ForgeWebScriptTypeName } from './ast.js';
import type { ForgeWebScriptIteratorBoundaryDescriptor, ForgeWebScriptSpecialization } from './manifest.js';

export type ForgeWebScriptGenericBoundary = 'value' | 'interface' | 'iterator';

export interface ForgeWebScriptGenericSpecializationRequest {
  readonly generic: string;
  readonly arguments: readonly ForgeWebScriptTypeName[];
  readonly boundary?: ForgeWebScriptGenericBoundary;
}

function canonicalType(type: ForgeWebScriptTypeName): string {
  const base = type.reference ?? type.name;
  const arguments_ = type.arguments?.map((argument) => canonicalType(argument)).join(',') ?? '';
  return `${base}${arguments_.length === 0 ? '' : `<${arguments_}>`}`;
}

export function forgeWebScriptGenericRepresentation(
  boundary: ForgeWebScriptGenericBoundary = 'value',
): ForgeWebScriptSpecialization['representation'] {
  return boundary === 'value' ? 'monomorphized' : 'descriptor-boundary';
}

export function createForgeWebScriptGenericSpecialization(
  request: ForgeWebScriptGenericSpecializationRequest,
): ForgeWebScriptSpecialization {
  const arguments_ = request.arguments.map((argument) => canonicalType(argument));
  return {
    id: `${request.generic}<${arguments_.join(',')}>:${request.boundary ?? 'value'}`,
    generic: request.generic,
    arguments: arguments_,
    representation: forgeWebScriptGenericRepresentation(request.boundary),
  };
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
