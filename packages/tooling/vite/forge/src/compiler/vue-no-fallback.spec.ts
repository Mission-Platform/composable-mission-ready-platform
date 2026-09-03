/**
 * Repo-wide Vue render-closure audit — a standing regression gate.
 *
 * Compiles every neutral component in `@mission-platform/components` to Vue and
 * inspects whether it emits the native `<template>` form or the
 * `<render v-bind="$attrs" />` render-closure fallback. The set of components
 * that still fall back is pinned to {@link KNOWN_FALLBACKS}, so:
 *
 * - a component that newly regresses to the render closure fails the gate
 *   (guarding the native output that was won), and
 * - a component that is fixed to native output but left in the allowlist also
 *   fails, prompting the allowlist to shrink toward the zero-fallback goal.
 *
 * The audit additionally gates the *contents* of the fallback: a render closure
 * keeps its JSX verbatim, so the neutral (React) `className` attribute has to be
 * translated to Vue's `class` there too — Vue normalises the array/object class
 * forms only under that name.
 *
 * The range composites use a **function-valued node helper** (a
 * `renderRange`-style closure used as a value, not a single-call inlinable
 * callee) that the builder cannot splice into the tree. `ForgeNavbar` has the
 * same dynamic named-slot shape, so both cases take the correct
 * `<script setup lang="tsx">` render-closure form.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { forgeVueFramework } from '../../../../../compiler/plugins/forge-vue/src';

import { compileComponentModule } from './compiler-test-helpers';

const COMPONENTS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../ui/components/src/components',
);

/** Components that still take the Vue render-closure fallback (see file header). */
const KNOWN_FALLBACKS: ReadonlySet<string> = new Set([
  'forge-activity-feed',
  'forge-callout-block',
  'forge-carousel-indicator',
  'forge-command-palette',
  'forge-comment-thread',
  'forge-data-card',
  'forge-date-time-range-input',
  'forge-empty-state',
  'forge-error-page',
  'forge-mention-input',
  'forge-metric-card',
  'forge-navbar',
  'forge-testimonials-section',
  'forge-time-range-input',
]);

const VUE_FRAMEWORK = forgeVueFramework();

/** Current fixture sentinels ensure discovery is neither empty nor partial. */
const DISCOVERY_SENTINELS = [
  'forge-avatar',
  'forge-background-video',
  'forge-button',
  'forge-hero',
  'forge-navbar',
] as const;

/** Convert a kebab-case component folder to its PascalCase exported name. */
function pascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Every `{atoms,molecules,organisms,templates}/<name>/<name>.tsx` neutral component source. */
function discoverComponents(): { name: string; source: string }[] {
  const found: { name: string; source: string }[] = [];
  for (const group of ['atoms', 'molecules', 'organisms', 'templates']) {
    const groupDirectory = path.join(COMPONENTS_ROOT, group);
    let entries: string[];
    try {
      entries = readdirSync(groupDirectory);
    } catch {
      continue;
    }
    for (const name of entries) {
      const componentDirectory = path.join(groupDirectory, name);
      if (!statSync(componentDirectory).isDirectory()) {
        continue;
      }
      const file = path.join(componentDirectory, `${name}.tsx`);
      try {
        found.push({ name, source: readFileSync(file, 'utf8') });
      } catch {
        // Not a `<name>/<name>.tsx` component folder — skip.
      }
    }
  }
  return found;
}

/** Whether a compiled Vue module took the render-closure fallback. */
function fellBack(code: string): boolean {
  return (
    code.includes('<render v-bind="$attrs" />') ||
    code.includes('const render = () =>') ||
    code.includes('native <template> unavailable')
  );
}

describe('Vue render-closure audit (standing zero-fallback regression gate)', () => {
  const components = discoverComponents();

  it('discovers the component library', () => {
    const discovered = new Set(components.map(({ name }) => name));
    expect(components.length).toBe(84);
    expect(DISCOVERY_SENTINELS.every((name) => discovered.has(name))).toBe(true);
  });

  it('no component outside the known-fallback allowlist emits a render closure', () => {
    const unexpected: string[] = [];
    for (const { name, source } of components) {
      const compiled = compileComponentModule(source, { framework: VUE_FRAMEWORK, componentName: pascalCase(name) });
      if (fellBack(compiled.code) && !KNOWN_FALLBACKS.has(name)) {
        unexpected.push(name);
      }
    }
    expect(unexpected).toEqual([]);
  }, 30_000);

  it('no compiled Vue module keeps the neutral `className` attribute', () => {
    // The neutral dialect is authored in React's vocabulary. Vue normalises the
    // array/object class forms only under `class`; left as `className` the value
    // is assigned straight to the DOM property — `class="forge-navbar,[object
    // Object]"` — and the component renders completely unstyled. The native
    // `<template>` transformer translates the attribute as it prints, so this
    // gate really watches the render-closure path, where the JSX is kept
    // verbatim. Only the **attribute** spelling counts: a `className` prop
    // signature and a `const className = computed(…)` binding are both fine.
    const untranslated: string[] = [];
    for (const { name, source } of components) {
      const compiled = compileComponentModule(source, { framework: VUE_FRAMEWORK, componentName: pascalCase(name) });
      const modules = [compiled.code, ...(compiled.extraModules ?? []).map((module) => module.code)];
      if (modules.some((code) => /\bclassName=[{"']/.test(code))) {
        untranslated.push(name);
      }
    }
    expect(untranslated).toEqual([]);
  }, 30_000);

  it('every allowlisted component still falls back (so fixed ones shrink the allowlist)', () => {
    const noLongerFallingBack: string[] = [];
    for (const { name, source } of components) {
      if (!KNOWN_FALLBACKS.has(name)) {
        continue;
      }
      const compiled = compileComponentModule(source, { framework: VUE_FRAMEWORK, componentName: pascalCase(name) });
      if (!fellBack(compiled.code)) {
        noLongerFallingBack.push(name);
      }
    }
    expect(noLongerFallingBack).toEqual([]);
  }, 30_000);
});
