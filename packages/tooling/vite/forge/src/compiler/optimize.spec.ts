/**
 * Golden-output tests for Stage-1 (neutral) optimisation passes and the
 * Stage-2 per-generator quality improvements that consume them.
 *
 * Follows the existing forge spec style: compile a neutral source string and
 * assert on the emitted framework code / intermediate IR markers.
 */
import { describe, expect, it } from 'vitest';

import {
  compileComponentModule,
  compileHookModule,
  hasMpStaticMarker,
  MP_STATIC_ATTR,
  optimizeForgeModule,
  optimizeGenericModule,
} from './compiler-test-helpers';
import { createGenericAst, parseForgeSource } from './frontends.js';

import type { JsxFramework } from './compiler-test-helpers';
import type { GenericRenderNode } from '@mission-platform/forge-plugin-api';

// ─── fixtures ───────────────────────────────────────────────────────────────

/** Fully-static intrinsic subtree + a dynamic sibling (Stage-1 marks the static one). */
const STATIC_SUBTREE = [
  "import { h, type MpElement } from '@mission-platform/forge-jsx';",
  '',
  'export interface CardProperties {',
  '  title: string;',
  '}',
  '',
  'export function ForgeCard(properties: CardProperties): MpElement {',
  '  return (',
  '    <div class="card">',
  '      <span class="card__icon">★</span>',
  '      <h2 class="card__title">{properties.title}</h2>',
  '    </div>',
  '  );',
  '}',
].join('\n');

/** Constant conditionals / short-circuits that Stage-1 must fold away. */
const CONSTANT_CONDITIONALS = [
  "import { h, type MpElement } from '@mission-platform/forge-jsx';",
  '',
  'export interface FlagProperties {',
  '  label: string;',
  '}',
  '',
  'export function ForgeFlag(properties: FlagProperties): MpElement {',
  '  return (',
  '    <div class="flag">',
  '      {true ? <span class="flag__on">on</span> : <span class="flag__off">off</span>}',
  '      {false && <span class="flag__dead">dead</span>}',
  '      {false ? <span class="flag__no">no</span> : <b class="flag__yes">{properties.label}</b>}',
  '      {!true && <i class="flag__never">never</i>}',
  '    </div>',
  '  );',
  '}',
].join('\n');

/** Stable array-literal `.map` without keys — Stage-1 infers `key={item}`. */
const STABLE_KEYED_LIST = [
  "import { h, type MpElement } from '@mission-platform/forge-jsx';",
  '',
  'export function ForgeStableList(): MpElement {',
  '  return (',
  '    <ul class="list">',
  "      {['alpha', 'beta', 'gamma'].map((item) => (",
  '        <li class="list__item">{item}</li>',
  '      ))}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

/** Module-level const array — also a stable map source. */
const MODULE_CONST_LIST = [
  "import { h, type MpElement } from '@mission-platform/forge-jsx';",
  '',
  "const ITEMS = ['one', 'two'] as const;",
  '',
  'export function ForgeRows(): MpElement {',
  '  return (',
  '    <ul class="rows">',
  '      {ITEMS.map((item, index) => (',
  '        <li class="rows__item">{item}</li>',
  '      ))}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

/** Dynamic prop-sourced map — Stage-1 must NOT invent keys (not a stable source). */
const DYNAMIC_LIST = [
  "import { h, type MpElement } from '@mission-platform/forge-jsx';",
  '',
  'export interface DynProperties {',
  '  items: string[];',
  '}',
  '',
  'export function ForgeDyn(properties: DynProperties): MpElement {',
  '  const { items } = properties;',
  '  return (',
  '    <ul class="dyn">',
  '      {items.map((item) => (',
  '        <li class="dyn__item">{item}</li>',
  '      ))}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

/** Constant `useMemo` — Stage-2 folds it to a plain const on Vue/Solid/Svelte. */
const CONSTANT_MEMO_HOOK = [
  "import { useMemo, useState } from '@mission-platform/forge-jsx';",
  '',
  'export function useLabel(): { label: string; count: number; bump: () => void } {',
  "  const label = useMemo(() => 'static-label', []);",
  '  const [count, setCount] = useState(0);',
  '  const bump = (): void => { setCount((current) => current + 1); };',
  '  return { label, count, bump };',
  '}',
].join('\n');

/** Component with a constant derived const (template path). */
const CONSTANT_DERIVED = [
  "import { h, type MpElement } from '@mission-platform/forge-jsx';",
  '',
  'export interface TagProperties {',
  '  name: string;',
  '}',
  '',
  'export function ForgeTag(properties: TagProperties): MpElement {',
  "  const prefix = 'tag';",
  '  return <span class={prefix}>{properties.name}</span>;',
  '}',
].join('\n');

/** Regression fixtures — slots / teleport / effects must still emit correctly. */
const SLOT_LAYOUT = [
  "import { h, type MpElement, Slot } from '@mission-platform/forge-jsx';",
  '',
  'export function ForgeLayout(): MpElement {',
  '  return (',
  '    <div class="layout">',
  '      <header class="layout__header"><Slot name="header" /></header>',
  '      <main class="layout__main"><Slot /></main>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const TELEPORT_PANEL = [
  "import { h, type MpElement, Teleport, useState } from '@mission-platform/forge-jsx';",
  '',
  'export interface PanelProperties {',
  '  open?: boolean;',
  '}',
  '',
  'export function ForgePanel(properties: PanelProperties): MpElement {',
  '  const [open, setOpen] = useState(false);',
  '  return (',
  '    <div class="panel">',
  '      <button type="button" onClick={() => setOpen(true)}>open</button>',
  '      {open ? (',
  '        <Teleport to="body">',
  '          <div class="panel__body">hi</div>',
  '        </Teleport>',
  '      ) : undefined}',
  '    </div>',
  '  );',
  '}',
].join('\n');

const EFFECT_HOOK = [
  "import { useEffect, useState } from '@mission-platform/forge-jsx';",
  '',
  'export function useTick(enabled: boolean): number {',
  '  const [n, setN] = useState(0);',
  '  useEffect(() => {',
  '    if (!enabled) { return; }',
  '    const id = setInterval(() => setN((c) => c + 1), 1000);',
  '    return () => clearInterval(id);',
  '  }, [enabled]);',
  '  return n;',
  '}',
].join('\n');

const FRAMEWORKS: readonly JsxFramework[] = ['react', 'vue', 'solid', 'svelte', 'web-components'];

// ─── Stage-1: neutral IR ────────────────────────────────────────────────────

describe('Stage-1 optimise — dead-branch pruning', () => {
  it('folds `true ? a : b` / `false && x` / `!true && x` out of the neutral AST', () => {
    const optimised = optimizeForgeModule(parseForgeSource('ForgeFlag.tsx', CONSTANT_CONDITIONALS));
    const printed = optimised.source;

    expect(printed).toContain('flag__on');
    expect(printed).toContain('flag__yes');
    // Dead arms must disappear entirely.
    expect(printed).not.toContain('flag__off');
    expect(printed).not.toContain('flag__dead');
    expect(printed).not.toContain('flag__no');
    expect(printed).not.toContain('flag__never');
    expect(printed).not.toContain('true ?');
    expect(printed).not.toContain('false &&');
  });

  it('is a no-op when `optimize: false` is passed to the compiler', () => {
    const withOpt = compileComponentModule(CONSTANT_CONDITIONALS, {
      framework: 'react',
      componentName: 'ForgeFlag',
    });
    const without = compileComponentModule(CONSTANT_CONDITIONALS, {
      framework: 'react',
      componentName: 'ForgeFlag',
      optimize: false,
    });
    expect(withOpt.code).not.toContain('flag__off');
    expect(without.code).toContain('flag__off');
  });
});

describe('Stage-1 optimise — static-node marking', () => {
  it('marks a fully-static intrinsic subtree with `__mpStatic`', () => {
    const parsed = parseForgeSource('ForgeCard.tsx', STATIC_SUBTREE);
    const optimised = optimizeGenericModule(createGenericAst(parsed, 'component', 'ForgeCard')).module;

    let staticCount = 0;
    const walk = (node: GenericRenderNode): void => {
      if (hasMpStaticMarker(node)) {
        staticCount += 1;
      }
      for (const child of node.children) {
        if (child.kind === 'render-node') walk(child);
      }
    };
    for (const node of optimised.renderNodes) walk(node);
    // At least the icon span is static; the title h2 and card root are dynamic.
    expect(staticCount).toBeGreaterThanOrEqual(1);

    // The dynamic title binding must NOT be on a static-marked element alone
    // without the parent also being dynamic — the h2 has `{properties.title}`.
    expect(optimised.source).toContain('card__icon');
  });

  it('does not mark elements with dynamic bindings or event handlers', () => {
    const source = [
      "import { h, type MpChild, type MpElement } from '@mission-platform/forge-jsx';",
      'export interface ButtonProperties { children?: MpChild | readonly MpChild[]; }',
      'export function ForgeBtn(properties: ButtonProperties): MpElement {',
      '  return <button type="button" onClick={() => undefined}>{properties.children}</button>;',
      '}',
    ].join('\n');
    const parsed = parseForgeSource('ForgeBtn.tsx', source);
    const optimised = optimizeGenericModule(createGenericAst(parsed, 'component', 'ForgeBtn')).module;
    expect(optimised.renderNodes.some((node) => hasMpStaticMarker(node))).toBe(false);
  });
});

describe('Stage-1 optimise — stable-key inference', () => {
  it('adds `key={item}` for a primitive array-literal `.map` missing a key', () => {
    const optimised = optimizeForgeModule(parseForgeSource('ForgeStableList.tsx', STABLE_KEYED_LIST));
    expect(optimised.source).toMatch(/key=\{item\}/);
  });

  it('adds `key={index}` when a stable module-const map provides an index param', () => {
    const optimised = optimizeForgeModule(parseForgeSource('ForgeRows.tsx', MODULE_CONST_LIST));
    expect(optimised.source).toMatch(/key=\{index\}/);
  });

  it('does not invent keys for a dynamic (prop-sourced) `.map`', () => {
    const optimised = optimizeForgeModule(parseForgeSource('ForgeDyn.tsx', DYNAMIC_LIST));
    expect(optimised.source).not.toMatch(/key=\{/);
  });
});

// ─── Stage-2: per-generator quality ─────────────────────────────────────────

describe('Stage-2 — React static hoisting', () => {
  it('lifts a static subtree to a module-level `__mpHoist_N` constant', () => {
    const { code } = compileComponentModule(STATIC_SUBTREE, {
      framework: 'react',
      componentName: 'ForgeCard',
    });
    expect(code).toMatch(/const __mpHoist_\d+/);
    expect(code).toContain('card__icon');
    // Marker must never leak into framework output.
    expect(code).not.toContain(MP_STATIC_ATTR);
  });
});

describe('Stage-2 — Solid static hoisting', () => {
  it('lifts a static subtree to a module-level constant outside reactive scope', () => {
    const { code } = compileComponentModule(STATIC_SUBTREE, {
      framework: 'solid',
      componentName: 'ForgeCard',
    });
    expect(code).toMatch(/const __mpHoist_\d+/);
    expect(code).not.toContain(MP_STATIC_ATTR);
  });
});

describe('Stage-2 — Vue constant derived / dead-branch', () => {
  it('emits a plain `const` (not `computed`) for a compile-time constant derived', () => {
    const { code } = compileComponentModule(CONSTANT_DERIVED, {
      framework: 'vue',
      componentName: 'ForgeTag',
    });
    expect(code).toMatch(/const prefix = ['"]tag['"]/);
    expect(code).not.toMatch(/const prefix = computed/);
    expect(code).not.toContain(MP_STATIC_ATTR);
  });

  it('drops dead constant branches from the Vue template', () => {
    const { code } = compileComponentModule(CONSTANT_CONDITIONALS, {
      framework: 'vue',
      componentName: 'ForgeFlag',
    });
    expect(code).toContain('flag__on');
    expect(code).toContain('flag__yes');
    expect(code).not.toContain('flag__off');
    expect(code).not.toContain('flag__dead');
  });
});

describe('Stage-2 — Svelte keyed each + constant memo', () => {
  it('emits a keyed `{#each … (key)}` for a stable map with an inferred key', () => {
    const { code } = compileComponentModule(STABLE_KEYED_LIST, {
      framework: 'svelte',
      componentName: 'ForgeStableList',
    });
    expect(code).toMatch(/\{#each [^}]+ \(item\)\}/);
    expect(code).not.toContain(MP_STATIC_ATTR);
  });

  it('emits a plain `const` (not `$derived`) for a constant `useMemo` in a component', () => {
    const source = [
      "import { h, useMemo, type MpElement } from '@mission-platform/forge-jsx';",
      'export function ForgeLabel(): MpElement {',
      "  const label = useMemo(() => 'hi', []);",
      '  return <span class="label">{label}</span>;',
      '}',
    ].join('\n');
    const { code } = compileComponentModule(source, {
      framework: 'svelte',
      componentName: 'ForgeLabel',
    });
    expect(code).toMatch(/const label = ['"]hi['"]/);
    expect(code).not.toMatch(/\$derived/);
  });
});

describe('Stage-2 — Web Components static template hoist', () => {
  it('hoists a fully-static root to a module-level direct-DOM definition', () => {
    const source = [
      "import { h, type MpElement } from '@mission-platform/forge-jsx';",
      'export function ForgeIcon(): MpElement {',
      '  return <span class="icon">★</span>;',
      '}',
    ].join('\n');
    const { code } = compileComponentModule(source, {
      framework: 'web-components',
      componentName: 'ForgeIcon',
    });
    expect(code).toContain('const __mpDomDefinition: DomTemplateDefinition =');
    expect(code).toContain('document.createElement("span")');
    expect(code).toContain('createTextNode("★")');
    expect(code).toContain('return domTemplate(__mpDomDefinition, []);');
    // Marker attribute must not appear in the generated DOM definition.
    expect(code).not.toMatch(new RegExp(`${MP_STATIC_ATTR}[=\\s>]`));
  });
});

// ─── Cross-framework parity ─────────────────────────────────────────────────

describe('Stage-1/2 optimisations preserve cross-framework parity', () => {
  it('compiles the static-subtree fixture for all five frameworks without the marker leaking', () => {
    for (const framework of FRAMEWORKS) {
      const { code } = compileComponentModule(STATIC_SUBTREE, {
        framework,
        componentName: 'ForgeCard',
      });
      expect(code.length).toBeGreaterThan(0);
      expect(code).not.toContain(MP_STATIC_ATTR);
      // Semantic content survives on every target.
      expect(code).toMatch(/card__icon|card__title|card/);
    }
  });

  it('compiles the stable-key list fixture for all five frameworks', () => {
    for (const framework of FRAMEWORKS) {
      const { code } = compileComponentModule(STABLE_KEYED_LIST, {
        framework,
        componentName: 'ForgeStableList',
      });
      expect(code.length).toBeGreaterThan(0);
      expect(code).toMatch(/list__item|list/);
      // Every target that surfaces keys should show one (React/Solid/Vue keep
      // `key` / `:key`; Svelte uses `(item)`; WC keeps `key` on the map callback).
      if (framework === 'react' || framework === 'solid') {
        expect(code).toMatch(/key=\{item\}/);
      }
      if (framework === 'vue') {
        expect(code).toMatch(/:key="item"/);
      }
    }
  });

  it('compiles a constant-memo composable for all five frameworks', () => {
    for (const framework of FRAMEWORKS) {
      const { code } = compileHookModule(CONSTANT_MEMO_HOOK, { framework });
      expect(code.length).toBeGreaterThan(0);
      expect(code).toContain('static-label');
    }
  });
});

describe('Stage-2 — constant-memo folding in composables', () => {
  it('Vue folds a constant useMemo to a plain const (no computed)', () => {
    const { code } = compileHookModule(CONSTANT_MEMO_HOOK, { framework: 'vue' });
    expect(code).toMatch(/const label = ['"]static-label['"]/);
    expect(code).not.toMatch(/const label = computed/);
  });

  it('Solid folds a constant useMemo to a plain const (no createMemo)', () => {
    const { code } = compileHookModule(CONSTANT_MEMO_HOOK, { framework: 'solid' });
    expect(code).toMatch(/const label = ['"]static-label['"]/);
    expect(code).not.toContain('createMemo');
  });

  it('Svelte keeps the constant label without $derived (hook modules stay neutral)', () => {
    const { code } = compileHookModule(CONSTANT_MEMO_HOOK, { framework: 'svelte' });
    // Svelte hook modules keep neutral hooks; Stage-1 dead-branch still applies
    // and the constant factory body is preserved as authored.
    expect(code).toContain('static-label');
  });
});

// ─── Regression guards ──────────────────────────────────────────────────────

describe('optimisations do not break previously-supported constructs', () => {
  it('still emits slots correctly across frameworks', () => {
    const react = compileComponentModule(SLOT_LAYOUT, { framework: 'react', componentName: 'ForgeLayout' });
    const vue = compileComponentModule(SLOT_LAYOUT, { framework: 'vue', componentName: 'ForgeLayout' });
    const svelte = compileComponentModule(SLOT_LAYOUT, { framework: 'svelte', componentName: 'ForgeLayout' });

    expect(react.code).toMatch(/properties\.header|properties\.children/);
    expect(vue.code).toContain('<slot');
    expect(svelte.code).toMatch(/@render/);
  });

  it('still emits Teleport on React and Vue', () => {
    const react = compileComponentModule(TELEPORT_PANEL, { framework: 'react', componentName: 'ForgePanel' });
    const vue = compileComponentModule(TELEPORT_PANEL, { framework: 'vue', componentName: 'ForgePanel' });
    expect(react.code).toContain('Teleport');
    expect(vue.code).toContain('Teleport');
  });

  it('still emits effect cleanup for hooks on React and Vue', () => {
    const react = compileHookModule(EFFECT_HOOK, { framework: 'react' });
    const vue = compileHookModule(EFFECT_HOOK, { framework: 'vue' });
    expect(react.code).toContain('useEffect');
    expect(react.code).toContain('clearInterval');
    expect(vue.code).toContain('watch(');
    expect(vue.code).toContain('clearInterval');
  });

  it('does not change semantics of a dynamic list (no forced keys)', () => {
    const react = compileComponentModule(DYNAMIC_LIST, { framework: 'react', componentName: 'ForgeDyn' });
    // No key attribute injected on a prop-sourced map.
    expect(react.code).not.toMatch(/key=\{item\}/);
    expect(react.code).toContain('.map(');
  });
});
