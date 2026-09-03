import { createForgeDiagnostic, type ForgeDiagnostic } from '../model/diagnostics';

import type { ForgeThemeMode, ForgeTokenFallback, ForgeTokenReference } from '../model/tokens';

export const MISSION_PLATFORM_COMPONENT_COLLECTION = 'Mission Platform / Component';

export interface FigmaVariableBinding {
  readonly name: string;
  readonly alias?: string;
  readonly collection?: string;
  readonly mode?: 'Light' | 'Dark' | ForgeThemeMode;
  readonly resolvedValue?: string | number;
}

export interface ForgeTokenResolution {
  readonly reference?: ForgeTokenReference;
  readonly fallback?: ForgeTokenFallback;
  readonly diagnostics: readonly ForgeDiagnostic[];
}

const PATH_PREFIX = /^component(?:[./\s]+|$)/i;
const COLLECTION_PREFIX = /^mission\s+platform\s*\/\s*component\s*\/\s*/i;

function normalizeSegment(segment: string): string {
  return segment
    .trim()
    .toLowerCase()
    .replaceAll(/[_\s]+/g, '-');
}

/** Normalize a Figma variable name or alias to the canonical `component.*` path. */
export function normalizeComponentTokenPath(value: string): string | undefined {
  const trimmedValue = value.trim();
  const collectionPrefix = trimmedValue.match(COLLECTION_PREFIX)?.[0];
  const withoutCollection = collectionPrefix
    ? `component.${trimmedValue.slice(collectionPrefix.length)}`
    : trimmedValue;
  if (!PATH_PREFIX.test(withoutCollection)) return undefined;

  const segments = withoutCollection
    .replaceAll(/[/.]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((segment) => normalizeSegment(segment));
  if (
    segments.length < 2 ||
    segments[0] !== 'component' ||
    segments.some((segment) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment))
  ) {
    return undefined;
  }
  return segments.join('.');
}

/** Convert a canonical component path to the generated Mission Platform CSS variable name. */
export function componentPathToCssVariable(path: string): string | undefined {
  const normalized = normalizeComponentTokenPath(path);
  return normalized ? `--mp-${normalized.slice('component.'.length).replaceAll('.', '-')}` : undefined;
}

function modesFor(mode: FigmaVariableBinding['mode']): readonly ForgeThemeMode[] {
  if (mode === 'Light' || mode === 'light') return ['light'];
  if (mode === 'Dark' || mode === 'dark') return ['dark'];
  return ['light', 'dark'];
}

function fallbackFor(binding: FigmaVariableBinding, reason: ForgeTokenFallback['reason']): ForgeTokenResolution {
  const diagnostics: ForgeDiagnostic[] = [
    createForgeDiagnostic({
      code: 'TOKEN_RAW_VALUE',
      severity: 'warning',
      message: `Variable "${binding.name}" could not be preserved as a Mission Platform component token.`,
      feature: 'token',
      suggestion: 'Bind the Figma variable to a canonical component.* path in the Mission Platform collection.',
    }),
  ];
  return {
    fallback: binding.resolvedValue === undefined ? undefined : { value: binding.resolvedValue, reason },
    diagnostics,
  };
}

export function resolveFigmaVariable(binding: FigmaVariableBinding): ForgeTokenResolution {
  if (binding.collection && binding.collection !== MISSION_PLATFORM_COMPONENT_COLLECTION) {
    return fallbackFor(binding, 'unsupported-collection');
  }

  const aliasPath = binding.alias ? normalizeComponentTokenPath(binding.alias) : undefined;
  if (binding.alias && !aliasPath) return fallbackFor(binding, 'unresolved-alias');
  const path = aliasPath ?? normalizeComponentTokenPath(binding.name);
  if (!path) return fallbackFor(binding, binding.alias ? 'unresolved-alias' : 'missing-path');

  const cssVariable = componentPathToCssVariable(path);
  if (!cssVariable) return fallbackFor(binding, 'missing-path');

  return {
    reference: {
      path,
      cssVariable,
      modes: modesFor(binding.mode),
      collection: binding.collection ?? MISSION_PLATFORM_COMPONENT_COLLECTION,
      sourceName: binding.name,
      aliasPath,
    },
    diagnostics: [],
  };
}
