import { describe, expect, it } from 'vitest';

import { compileHookModule } from './compiler-test-helpers';

// A `useState` + `useEffect` hook (the `useObservable` shape).
const USE_OBSERVABLE = [
  "import { useEffect, useState } from '@mission-platform/forge-jsx';",
  "import type { Observable } from 'rxjs';",
  '',
  'export function useObservable<T>(source: Observable<T>, initialValue?: T): T | undefined {',
  '  const [value, setValue] = useState<T | undefined>(initialValue);',
  '  useEffect(() => {',
  '    const subscription = source.subscribe((next) => {',
  '      setValue(() => next);',
  '    });',
  '    return () => {',
  '      subscription.unsubscribe();',
  '    };',
  '  }, [source]);',
  '  return value;',
  '}',
].join('\n');

// A `useRef` + `useEffect` hook (the `useD3` shape).
const USE_D3 = [
  "import { useEffect, useRef, type MpDependencyList, type MpRef } from '@mission-platform/forge-jsx';",
  "import { select, type Selection } from 'd3-selection';",
  '',
  'export function useD3<E extends Element>(draw: (selection: unknown) => void, dependencies: MpDependencyList = []): MpRef<E | null> {',
  '  const reference = useRef<E | null>(null);',
  '  useEffect(() => {',
  '    const element = reference.current;',
  '    if (element === null) {',
  '      return;',
  '    }',
  '    return draw(select(element));',
  '  }, dependencies);',
  '  return reference;',
  '}',
].join('\n');

// A module that mixes plain helper functions (a non-`void` and a `void` one)
// with a composable — the `useLayer` shape. The helpers' explicit return types
// must be preserved so `tsc` never re-infers them (an inferred type that
// narrows a large union would overflow the declaration emitter — TS2589).
const USE_HELPERS = [
  "import { useEffect, useRef } from '@mission-platform/forge-jsx';",
  '',
  'export function sourceKey(spec: { source?: string }): string | undefined {',
  "  return 'source' in spec ? String(spec.source) : undefined;",
  '}',
  '',
  'export function useThing(): void {',
  '  const reference = useRef<number>(0);',
  '  useEffect(() => {',
  '    reference.current += 1;',
  '  }, []);',
  '}',
].join('\n');

// A hook that returns an *object literal* bundling several reactive values plus
// an imperative method — the `useDrawing` shape. Unlike a single-ref return,
// each reactive field must stay live on Vue (see the reactive-getter emitter).
const USE_BUNDLE = [
  "import { useState } from '@mission-platform/forge-jsx';",
  '',
  'export interface UseCounterReturn {',
  '  count: number;',
  '  label: string;',
  '  increment: () => void;',
  '}',
  '',
  'export function useCounter(): UseCounterReturn {',
  '  const [count, setCount] = useState<number>(0);',
  '  const [label, setLabel] = useState<string>("");',
  '  const increment = (): void => {',
  '    setCount((current) => current + 1);',
  '  };',
  '  return {',
  '    count,',
  '    label,',
  '    increment,',
  '  };',
  '}',
].join('\n');

describe('compileHookModule — React', () => {
  it('rewrites the neutral hook import to React and keeps the external type import', () => {
    const { code, lang } = compileHookModule(USE_OBSERVABLE, { framework: 'react' });
    expect(lang).toBe('tsx');
    expect(code).toMatch(/import\s*\{[^}]*\}\s*from\s*["']react["']/);
    expect(code).toContain('useEffect');
    expect(code).toContain('useState');
    // The neutral value import must be gone; the external type import stays.
    expect(code).not.toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*["']@mission-platform\/jsx["']/);
    expect(code).toContain("from 'rxjs'");
    // Signature is preserved verbatim (React hooks share the neutral signatures).
    expect(code).toContain('return value;');
  });

  it('uses the documented hook filename when reporting source diagnostics', () => {
    expect(() => compileHookModule('export const broken = <div>\n', { framework: 'react' })).toThrow(/hook\.tsx/);
  });

  it('rewrites the neutral hook types to their React equivalents (`MpRef`→`RefObject`, `MpDependencyList`→`DependencyList`)', () => {
    const { code } = compileHookModule(USE_D3, { framework: 'react' });
    // Both neutral hook types are imported from `react` under their React names…
    expect(code).toMatch(/import type \{[^}]*\bRefObject\b[^}]*\} from ["']react["']/);
    expect(code).toMatch(/import type \{[^}]*\bDependencyList\b[^}]*\} from ["']react["']/);
    // …and every reference is renamed, so no neutral name survives.
    expect(code).not.toContain('MpRef');
    expect(code).not.toContain('MpDependencyList');
    expect(code).toContain('dependencies: DependencyList');
    expect(code).toContain('): RefObject<E | null>');
    // The external d3 type import is untouched.
    expect(code).toContain("from 'd3-selection'");
  });
});

describe('compileHookModule — Vue', () => {
  it('translates useState/useEffect into a Vue composable that returns the ref', () => {
    const { code, lang } = compileHookModule(USE_OBSERVABLE, { framework: 'vue' });
    expect(lang).toBe('ts');
    expect(code).toMatch(/import\s*\{[^}]*\}\s*from\s*'vue'/);
    // The explicit `useState<T | undefined>` type argument is preserved as
    // `ref<T | undefined>(…)`, so the ref keeps its real element type.
    expect(code).toContain('const value = ref<T | undefined>(initialValue)');
    // The `useState` setter call becomes a reactive assignment.
    expect(code).toContain('value.value =');
    // Explicit dependencies use Vue's native `watch` source getter.
    expect(code).toContain('watch(() => [source]');
    expect(code).toContain('{ immediate: true });');
    expect(code).not.toContain('onMounted(');
    expect(code).not.toContain('onUnmounted(');
    // The external dependency import is preserved.
    expect(code).toContain("from 'rxjs'");
  });

  it('annotates the ref-returning composable with an explicit `Ref<…>` and asserts the return', () => {
    const { code } = compileHookModule(USE_OBSERVABLE, { framework: 'vue' });
    // The return type is annotated (so `tsc` never has to name Vue's internal
    // `IfAny`), imported type-only from `vue`.
    expect(code).toContain('): Ref<T | undefined>');
    expect(code).toMatch(/import\s*\{[^}]*type Ref[^}]*\}\s*from\s*'vue'/);
    // The returned ref is asserted to the annotation (Vue's `ref()` widens the
    // element type via `UnwrapRef`, which would not match for a generic `T`).
    expect(code).toContain('return value as Ref<T | undefined>;');
  });

  it('calls a zero-parameter state updater without forwarding the previous value', () => {
    const { code } = compileHookModule(USE_OBSERVABLE, { framework: 'vue' });
    // `setValue(() => next)` → `value.value = (() => next)()` — the updater
    // declares no parameter, so no argument is forwarded (stays type-correct).
    expect(code).toContain('value.value = (() => next)();');
  });

  it('translates useRef into a Vue shallowRef and returns it as `Ref<…>` (mapping `MpRef`)', () => {
    const { code } = compileHookModule(USE_D3, { framework: 'vue' });
    // `useRef` is a non-reactive mutable container, so it maps to `shallowRef`
    // (never a deep `ref`), keeping any stored instance un-proxied.
    expect(code).toContain('const reference = shallowRef');
    // `.current` reads collapse to `.value`.
    expect(code).toContain('reference.value');
    expect(code).not.toContain('reference.current');
    // The neutral `MpRef<E | null>` return type maps to `Ref<E | null>`, and the
    // returned ref is asserted to it.
    expect(code).toContain('): Ref<E | null>');
    expect(code).toContain('return reference as Ref<E | null>;');
    // The still-referenced neutral type is kept; the neutral ref type is gone.
    expect(code).toContain('MpDependencyList');
    expect(code).not.toContain('MpRef');
    expect(code).toContain("from 'd3-selection'");
  });

  it('returns a bundle of reactive values as getters so each field stays live', () => {
    const { code } = compileHookModule(USE_BUNDLE, { framework: 'vue' });
    // A composable's setup runs once, so `{ count: count.value }` would freeze
    // the field at mount. Each reactive `useState` field is therefore handed
    // back as a getter that re-reads the ref on every access. The getter asserts
    // its `.value` to the declared return type's matching property so the emitted
    // declaration stays nominal/portable (Vue's `ref<T>().value` is `UnwrapRef<T>`,
    // a deep structural expansion for class-instance `T`).
    expect(code).toContain('get count() {');
    expect(code).toContain("return count.value as UseCounterReturn['count'];");
    expect(code).toContain('get label() {');
    expect(code).toContain("return label.value as UseCounterReturn['label'];");
    // The frozen, non-reactive form must never be emitted.
    expect(code).not.toContain('count: count.value');
    expect(code).not.toContain('label: label.value');
    // The imperative method is not reactive state, so it stays a plain property.
    expect(code).not.toContain('get increment(');
    expect(code).toContain('increment');
  });

  it('preserves explicit return types on carried-over helper and void functions', () => {
    const { code } = compileHookModule(USE_HELPERS, { framework: 'vue' });
    // A plain helper's authored return type must survive: dropping it would let
    // `tsc` re-infer the return, and an inferred type that narrows a large union
    // can overflow the declaration emitter (TS2589).
    expect(code).toContain('export function sourceKey(');
    expect(code).toContain('}): string | undefined {');
    // A `void` composable keeps its `: void` annotation too.
    expect(code).toContain('function useThing(): void');
  });
});
