import { describe, expect, it } from 'vitest';

import { compileComponentModule } from './compile';

const BADGE = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface BadgeProperties extends MpProperties {',
  '  variant?: string;',
  '}',
  '',
  'export function BaseBadge(properties: BadgeProperties): MpElement {',
  "  const variant = properties.variant ?? 'default';",
  '  const className = `base-badge base-badge--${variant}`;',
  '  return <span class={className}>{properties.children}</span>;',
  '}',
].join('\n');

const CLASS_NAMES = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface ChipProperties extends MpProperties {',
  '  active?: boolean;',
  '  tone?: string;',
  '}',
  '',
  'export function BaseChip(properties: ChipProperties): MpElement {',
  "  const tone = properties.tone ?? 'neutral';",
  '  return (',
  "    <span classNames={['chip', `chip--${tone}`, { 'chip--active': properties.active ?? false }]}>",
  '      <i classNames={tone} />',
  '      {properties.children}',
  '    </span>',
  '  );',
  '}',
].join('\n');

const IN_VIEW = [
  "import { h, useEffect, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface InViewProperties extends MpProperties {',
  '  threshold?: number;',
  '  once?: boolean;',
  '  tag?: string;',
  '  onEnter?: () => void;',
  '}',
  '',
  'export function BaseInView(properties: InViewProperties): MpElement {',
  '  const { threshold = 0.15, once = true, tag = "div", onEnter } = properties;',
  '  const wrapperReference = useRef<HTMLElement | null>(null);',
  '  const [inView, setInView] = useState(false);',
  '  useEffect(() => {',
  '    const element = wrapperReference.current;',
  '    if (element === null) { return; }',
  '    const observer = new IntersectionObserver((entries) => {',
  '      if (entries[0].isIntersecting) { setInView(true); onEnter?.(); if (once) { observer.disconnect(); } }',
  '    }, { threshold });',
  '    observer.observe(element);',
  '    return () => observer.disconnect();',
  '  }, [threshold, once]);',
  '  const children = properties.children;',
  '  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];',
  "  return h(tag, { ref: wrapperReference, class: 'in-view', 'data-in-view': inView }, ...childList);",
  '}',
].join('\n');

const IMAGE = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface ImageProperties extends MpProperties {',
  '  src?: string;',
  '  alt?: string;',
  '  caption?: string;',
  '}',
  '',
  'export function BaseImage(properties: ImageProperties): MpElement {',
  "  const { src, alt = '', caption } = properties;",
  '  return (',
  '    <figure class="image">',
  '      <img class="image__img" src={src} alt={alt} />',
  '      <caption class="image__caption">{caption}</caption>',
  '    </figure>',
  '  );',
  '}',
].join('\n');

const LAYOUT = [
  "import { h, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface LayoutProperties extends MpProperties {',
  '  sticky?: boolean;',
  '  header?: MpChild;',
  '}',
  '',
  'export function BaseLayout(properties: LayoutProperties): MpElement {',
  '  return (',
  '    <div class="layout">',
  '      <div class="layout__header"><Slot name="header" /></div>',
  '      <main class="layout__content"><Slot /></main>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const SCOPED_LIST = [
  "import { h, Slot, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface ListProperties extends MpProperties {',
  '  items: string[];',
  '}',
  '',
  'export function BaseList(properties: ListProperties): MpElement {',
  '  const { items } = properties;',
  '  return (',
  '    <ul class="list">',
  '      {items.map((item, index) => (',
  '        <li class="list__row"><Slot item={item} index={index} /></li>',
  '      ))}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

const TELEPORT_OVERLAY = [
  "import { h, Slot, Teleport, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface OverlayProperties extends MpProperties {',
  '  open?: boolean;',
  '}',
  '',
  'export function BaseOverlay(properties: OverlayProperties): MpElement {',
  '  const [open, setOpen] = useState(false);',
  '  return (',
  '    <div class="overlay">',
  '      <button type="button" onClick={() => setOpen(true)}><Slot name="trigger" /></button>',
  '      {open ? (',
  '        <Teleport to="body">',
  '          <div class="overlay__panel"><Slot /></div>',
  '        </Teleport>',
  '      ) : undefined}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the emitters remap the neutral `Teleport` import to each framework portal', () => {
  const react = compileComponentModule(TELEPORT_OVERLAY, { framework: 'react', componentName: 'BaseOverlay' });
  const vue = compileComponentModule(TELEPORT_OVERLAY, { framework: 'vue', componentName: 'BaseOverlay' });

  it('imports the React `Teleport` from the `@mission-platform/jsx/react` adapter (not React core or the marker)', () => {
    expect(react.code).toContain('import { Teleport } from "@mission-platform/jsx/react"');
    // `Teleport` must not be imported from React core, nor kept as a value import
    // from the neutral package.
    expect(react.code).not.toMatch(/import \{[^}]*\bTeleport\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bTeleport\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('leaves the `<Teleport>` element usage intact on the React target', () => {
    expect(react.code).toContain('Teleport');
    expect(react.code).toContain('to="body"');
  });

  it('imports the Vue built-in `Teleport` from `vue` and renders it as a native tag', () => {
    expect(vue.code).toMatch(/import \{[^}]*\bTeleport\b[^}]*\} from ['"]vue['"]/);
    expect(vue.code).toContain('Teleport');
    expect(vue.code).not.toMatch(/import \{[^}]*\bTeleport\b[^}]*\} from ['"]@mission-platform\/jsx['"]/);
  });
});

// A render-closure drag-and-drop board (the `.map()`-built columns force the
// `<script setup>` render-closure fallback, the shape the form builder uses). It
// mixes multi-word DOM events on **native** elements (`onDragOver`/`onDrop`/
// `onDragEnter`) with a multi-word **component** event (`onValueChange`).
const DRAG_BOARD = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  "import BaseColumn from './base-column';",
  '',
  'export interface BoardProperties extends MpProperties {',
  '  columns: string[];',
  '}',
  '',
  'export function BaseBoard(properties: BoardProperties): MpElement {',
  '  const { columns } = properties;',
  '  return (',
  '    <div class="board" onDragOver={(event) => event.preventDefault()}>',
  '      {columns.map((column, index) => (',
  '        <section key={index} class="board__column" onDrop={() => undefined} onDragEnter={() => undefined} onClick={() => undefined}>',
  '          <BaseColumn onValueChange={() => undefined} />',
  '        </section>',
  '      ))}',
  '    </div>',
  '  );',
  '}',
].join('\n');

// A template-able drag tile (a single element tree, so it takes the `<template>`
// path) carrying multi-word DOM events on a native element.
const DRAG_TILE = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface TileProperties extends MpProperties {',
  '  label?: string;',
  '}',
  '',
  'export function BaseTile(properties: TileProperties): MpElement {',
  '  return (',
  '    <div class="tile" draggable={true} onDragStart={() => undefined} onDrop={() => undefined}>',
  '      {properties.label}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter lowercases multi-word DOM event listeners on native elements', () => {
  const reactBoard = compileComponentModule(DRAG_BOARD, { framework: 'react', componentName: 'BaseBoard' });
  const vueBoard = compileComponentModule(DRAG_BOARD, { framework: 'vue', componentName: 'BaseBoard' });
  const vueTile = compileComponentModule(DRAG_TILE, { framework: 'vue', componentName: 'BaseTile' });

  it('falls back to the render closure for the `.map()`-built board', () => {
    expect(vueBoard.code).toContain('const render = () => {');
  });

  it('lowercases native multi-word events so Vue binds the real DOM event (render-closure path)', () => {
    // `onDragOver` would otherwise hyphenate to the dead `drag-over` event, so
    // drops never fire; `onDragover` hyphenates back to the real `dragover`.
    expect(vueBoard.code).toContain('onDragover=');
    expect(vueBoard.code).toContain('onDragenter=');
    expect(vueBoard.code).not.toContain('onDragOver');
    expect(vueBoard.code).not.toContain('onDragEnter');
  });

  it('leaves single-word native events untouched (render-closure path)', () => {
    expect(vueBoard.code).toContain('onDrop=');
    expect(vueBoard.code).toContain('onClick=');
  });

  it('preserves a multi-word **component** event listener (it matches the child emit)', () => {
    expect(vueBoard.code).toContain('onValueChange=');
    expect(vueBoard.code).not.toContain('onValuechange');
  });

  it('keeps the React event casing untouched on the React target', () => {
    expect(reactBoard.code).toContain('onDragOver');
    expect(reactBoard.code).toContain('onDragEnter');
    expect(reactBoard.code).toContain('onValueChange');
  });

  it('lowercases native multi-word events to `@<event>` on the `<template>` path', () => {
    expect(vueTile.code).toContain('@dragstart=');
    expect(vueTile.code).toContain('@drop=');
    expect(vueTile.code).not.toContain('@dragStart');
  });
});

describe('the emitters translate **scoped** `<Slot>` elements', () => {
  const react = compileComponentModule(SCOPED_LIST, { framework: 'react', componentName: 'BaseList' });
  const vue = compileComponentModule(SCOPED_LIST, { framework: 'vue', componentName: 'BaseList' });

  it('invokes the React default slot as a render-prop with the scope object', () => {
    expect(react.code).toContain('properties.children?.({ item: item, index: index })');
  });

  it('invokes the Vue default slot as a scoped slot with the scope object', () => {
    expect(vue.code).toContain('slots.default?.({ item: item, index: index })');
  });

  it('falls back to the `<script setup>` render closure for a `.map()`-built list', () => {
    expect(vue.code).toContain('const render = () => {');
    expect(vue.code).toContain('<component :is="render" v-bind="$attrs" />');
  });
});

describe('the emitters translate named `<Slot>` elements', () => {
  const react = compileComponentModule(LAYOUT, { framework: 'react', componentName: 'BaseLayout' });
  const vue = compileComponentModule(LAYOUT, { framework: 'vue', componentName: 'BaseLayout' });

  it('rewrites React slots to props reads and never imports the `Slot` marker', () => {
    expect(react.code).toContain('properties.header');
    expect(react.code).toContain('properties.children');
    expect(react.code).not.toMatch(/import \{[^}]*\bSlot\b[^}]*\} from ["']@mission-platform\/jsx["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bSlot\b[^}]*\} from ["']react["']/);
  });

  it('renders named/default `<Slot>` as native `<slot>` and keeps slot names out of runtime props', () => {
    expect(vue.code).toContain('<slot name="header" />');
    expect(vue.code).toContain('<slot />');
    expect(vue.code).toContain("defineProps(['sticky'])");
  });
});

// A template-able card: a single element tree (no node-valued consts) whose
// optional header/footer regions are gated by the `hasSlot(…)` presence marker.
const HAS_SLOT_CARD = [
  "import { h, hasSlot, Slot, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface CardProperties extends MpProperties {',
  '  bordered?: boolean;',
  '}',
  '',
  'export function BaseCard(properties: CardProperties): MpElement {',
  '  return (',
  '    <div class="card">',
  '      {hasSlot("header") ? <div class="card__header"><Slot name="header" /></div> : undefined}',
  '      <div class="card__body"><Slot /></div>',
  '      {hasSlot("footer") ? <div class="card__footer"><Slot name="footer" /></div> : undefined}',
  '    </div>',
  '  );',
  '}',
].join('\n');

// A render-closure card: the `.map()`-built list forces the `<script setup>`
// render-closure fallback, exercising the `hasSlot(…)` → `!!slots.x` rewrite.
const HAS_SLOT_CLOSURE = [
  "import { h, hasSlot, Slot, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface FeedProperties extends MpProperties {',
  '  items: string[];',
  '}',
  '',
  'export function BaseFeed(properties: FeedProperties): MpElement {',
  '  const { items } = properties;',
  '  return (',
  '    <div class="feed">',
  '      {hasSlot("header") ? <header class="feed__header"><Slot name="header" /></header> : undefined}',
  '      <ul class="feed__list">',
  '        {items.map((item, index) => (',
  '          <li key={index} class="feed__row">{item}</li>',
  '        ))}',
  '      </ul>',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the emitters translate the `hasSlot(…)` presence marker', () => {
  const react = compileComponentModule(HAS_SLOT_CARD, { framework: 'react', componentName: 'BaseCard' });
  const vue = compileComponentModule(HAS_SLOT_CARD, { framework: 'vue', componentName: 'BaseCard' });

  it('rewrites `hasSlot("x")` to a React `properties.x != null` check and drops the marker import', () => {
    expect(react.code).toContain('properties.header != null');
    expect(react.code).toContain('properties.footer != null');
    expect(react.code).not.toMatch(/import \{[^}]*\bhasSlot\b[^}]*\} from ["']@mission-platform\/jsx["']/);
    expect(react.code).not.toContain('hasSlot(');
  });

  it('rewrites a `hasSlot("x")` template condition to a native `v-if="$slots.x"`', () => {
    expect(vue.code).toContain('v-if="$slots.header"');
    expect(vue.code).toContain('v-if="$slots.footer"');
    expect(vue.code).toContain('<slot name="header" />');
    expect(vue.code).not.toContain('hasSlot(');
  });

  it('rewrites a render-closure `hasSlot("x")` to `!!slots.x` and wires `useSlots()`', () => {
    const closure = compileComponentModule(HAS_SLOT_CLOSURE, { framework: 'vue', componentName: 'BaseFeed' });
    expect(closure.code).toContain('!!slots.header');
    expect(closure.code).toContain('const slots = useSlots();');
    expect(closure.code).not.toContain('hasSlot(');
  });
});

// A render-closure shell that declares its slots with the **call form** of the
// marker — `h(Slot, { name: 'x' })` rather than `<Slot name="x" />` — and uses a
// **kebab-case** slot name (`start-header`). The node-valued `const start` forces
// the `<script setup>` render-closure fallback (so this exercises the
// `createReferenceRewriter`, not the `<template>` path).
const SLOT_CALL_LAYOUT = [
  "import { h, hasSlot, Slot, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface ShellProperties extends MpProperties {',
  '  startTitle?: string;',
  '}',
  '',
  'export function BaseShell(properties: ShellProperties): MpElement {',
  '  const { startTitle } = properties;',
  "  const start = hasSlot('start')",
  "    ? h('aside', { title: startTitle },",
  "        hasSlot('start-header') ? h('div', { slot: 'header' }, h(Slot, { name: 'start-header' })) : undefined,",
  "        h(Slot, { name: 'start' }),",
  '      )',
  '    : undefined;',
  "  return h('div', { class: 'shell' }, start, h('main', {}, h(Slot, {})));",
  '}',
].join('\n');

describe('the emitters translate the `h(Slot, …)` call form of the named-slot marker', () => {
  const vue = compileComponentModule(SLOT_CALL_LAYOUT, { framework: 'vue', componentName: 'BaseShell' });
  const react = compileComponentModule(SLOT_CALL_LAYOUT, { framework: 'react', componentName: 'BaseShell' });

  it('rewrites `h(Slot, …)` to Vue slot calls (default, named, kebab) and never leaves the `Slot` marker', () => {
    expect(vue.code).toContain('slots.default?.()');
    expect(vue.code).toContain('slots.start?.()');
    // The kebab slot name must use bracket access — dot access would mis-parse
    // as a subtraction (`slots.start-header` → `slots.start - header`).
    expect(vue.code).toContain('slots["start-header"]?.()');
    expect(vue.code).not.toContain('slots.start-header');
    expect(vue.code).not.toContain('h(Slot');
    expect(vue.code).toContain('const slots = useSlots();');
  });

  it('rewrites `h(Slot, …)` to React props reads (default, named, kebab) and never leaves the `Slot` marker', () => {
    expect(react.code).toContain('properties.children');
    expect(react.code).toContain('properties.start');
    expect(react.code).toContain('properties["start-header"]');
    expect(react.code).not.toContain('properties.start-header');
    expect(react.code).not.toContain('h(Slot');
    expect(react.code).not.toMatch(/import \{[^}]*\bSlot\b[^}]*\} from ["']react["']/);
  });
});

const HELPER_CONSUMER = [
  "import { h, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "import { getCount, subscribeCount } from '../counter-store';",
  '',
  'export interface CounterProperties extends MpProperties {',
  '  label?: string;',
  '}',
  '',
  'export function BaseCounter(properties: CounterProperties): MpElement {',
  '  const [count, setCount] = useState(getCount());',
  "  return <span class='counter'>{count}</span>;",
  '}',
].join('\n');

describe('the Vue emitter partitions relative imports into components and helper modules', () => {
  it('emits a non-component relative import as a named helper import when the component set is supplied', () => {
    const vue = compileComponentModule(HELPER_CONSUMER, {
      framework: 'vue',
      componentName: 'BaseCounter',
      componentFolders: new Set(['base-counter']),
    });
    expect(vue.code).toContain("import { getCount, subscribeCount } from './counter-store';");
    expect(vue.code).not.toContain("from './counter-store.vue'");
  });

  it('falls back to treating every relative import as a `.vue` child when no component set is supplied', () => {
    const vue = compileComponentModule(HELPER_CONSUMER, { framework: 'vue', componentName: 'BaseCounter' });
    expect(vue.code).toContain("from './counter-store.vue';");
  });

  it('keeps the named helper import verbatim on the React target', () => {
    const react = compileComponentModule(HELPER_CONSUMER, {
      framework: 'react',
      componentName: 'BaseCounter',
      componentFolders: new Set(['base-counter']),
    });
    expect(react.code).toContain('import { getCount, subscribeCount } from "./counter-store"');
  });
});

const EXTERNAL_DEFAULT = [
  "import { DEFAULT_TYPES, type Descriptor } from '@scope/forms-core';",
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface PaletteProperties extends MpProperties {',
  '  types?: Descriptor[];',
  '}',
  '',
  'export function BasePalette(properties: PaletteProperties): MpElement {',
  '  const { types = DEFAULT_TYPES } = properties;',
  '  return <span class="palette">{types.length}</span>;',
  '}',
].join('\n');

describe('the emitters carry external (bare package) imports referenced by prop defaults', () => {
  const vue = compileComponentModule(EXTERNAL_DEFAULT, {
    framework: 'vue',
    componentName: 'BasePalette',
    componentFolders: new Set(['base-palette']),
  });
  const react = compileComponentModule(EXTERNAL_DEFAULT, {
    framework: 'react',
    componentName: 'BasePalette',
    componentFolders: new Set(['base-palette']),
  });

  it('keeps the external value import in the Vue SFC so the prop default resolves at runtime', () => {
    // Regression: the Vue emitter used to drop every non-relative, non-neutral
    // import, leaving `types: { default: DEFAULT_TYPES }` referencing an
    // undefined binding (`ReferenceError: DEFAULT_TYPES is not defined`).
    expect(vue.code).toMatch(/import \{[^}]*\bDEFAULT_TYPES\b[^}]*\} from ["']@scope\/forms-core["']/);
    expect(vue.code).toContain('types: { default: DEFAULT_TYPES }');
  });

  it('keeps the external value import on the React target too', () => {
    expect(react.code).toMatch(/import \{[^}]*\bDEFAULT_TYPES\b[^}]*\} from ["']@scope\/forms-core["']/);
  });
});

// A neutral component consuming the write-once icon library. Authors import the
// icons from the package root (`@mission-platform/icons`), which type-checks
// against the neutral icon source and renders through the runtime adapters in
// unit tests, but the package publishes only the per-framework builds.
const ICON_CONSUMER = [
  "import { h, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "import { IconChevron } from '@mission-platform/icons';",
  '',
  'export interface DisclosureProperties extends MpProperties {',
  '  label?: string;',
  '}',
  '',
  'export function BaseDisclosure(properties: DisclosureProperties): MpElement {',
  '  const { label } = properties;',
  '  const [open, setOpen] = useState<boolean>(false);',
  '  return (',
  '    <button type="button" onClick={() => setOpen(!open)}>',
  '      {label}',
  "      <IconChevron direction={open ? 'up' : 'down'} size=\"sm\" />",
  '    </button>',
  '  );',
  '}',
].join('\n');

describe('the emitters remap the `@mission-platform/icons` import to each framework build', () => {
  const vue = compileComponentModule(ICON_CONSUMER, {
    framework: 'vue',
    componentName: 'BaseDisclosure',
    componentFolders: new Set(['base-disclosure']),
  });
  const react = compileComponentModule(ICON_CONSUMER, {
    framework: 'react',
    componentName: 'BaseDisclosure',
    componentFolders: new Set(['base-disclosure']),
  });

  it('imports the icon from the `./vue` subpath (not the bare root) on the Vue target', () => {
    expect(vue.code).toMatch(/import \{[^}]*\bIconChevron\b[^}]*\} from ["']@mission-platform\/icons\/vue["']/);
    expect(vue.code).not.toMatch(/from ["']@mission-platform\/icons["']/);
    // The `<IconChevron>` tag survives as a (native) component usage.
    expect(vue.code).toContain('IconChevron');
  });

  it('imports the icon from the `./react` subpath (not the bare root) on the React target', () => {
    expect(react.code).toMatch(/import \{[^}]*\bIconChevron\b[^}]*\} from ["']@mission-platform\/icons\/react["']/);
    expect(react.code).not.toMatch(/from ["']@mission-platform\/icons["']/);
    expect(react.code).toContain('IconChevron');
  });
});

// Named-slot **passing**: a parent composes a child component and routes content
// into the child's named slot with `slot="trigger"`. The template-able variant
// (no node-valued consts) exercises the `<template>` path.
const SLOT_PASS_TEMPLATE = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "import { BaseDropdown } from '../base-dropdown';",
  '',
  'export function BasePicker(_properties: MpProperties): MpElement {',
  '  return (',
  '    <BaseDropdown open={true}>',
  '      <button slot="trigger" type="button">Open</button>',
  '      <ul class="panel"><li>One</li></ul>',
  '    </BaseDropdown>',
  '  );',
  '}',
].join('\n');

// The render-closure variant (the `.map()` forces the fallback path).
const SLOT_PASS_CLOSURE = [
  "import { h, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "import { BaseDropdown } from '../base-dropdown';",
  '',
  'export interface PickerProperties extends MpProperties {',
  '  label?: string;',
  '  options?: string[];',
  '}',
  '',
  'export function BasePicker(properties: PickerProperties): MpElement {',
  '  const { label, options = [] } = properties;',
  '  const [open, setOpen] = useState<boolean>(false);',
  '  const items = options.map((option) => <li key={option}>{option}</li>);',
  '  return (',
  '    <BaseDropdown open={open} onUpdateOpen={(next: boolean) => setOpen(next)}>',
  '      <button slot="trigger" type="button" onClick={() => setOpen(!open)}>{label}</button>',
  '      <ul class="panel">{items}</ul>',
  '    </BaseDropdown>',
  '  );',
  '}',
].join('\n');

describe('the emitters route a child component\u2019s `slot="…"` children into its named slot', () => {
  const folders = new Set(['base-dropdown', 'base-picker']);

  it('emits a Vue `<template #name>` block on the template path (and drops the `slot` attribute)', () => {
    const vue = compileComponentModule(SLOT_PASS_TEMPLATE, {
      framework: 'vue',
      componentName: 'BasePicker',
      componentFolders: folders,
    });
    expect(vue.code).toContain('<template #trigger>');
    expect(vue.code).toContain('<template #default>');
    // The `slot="trigger"` marker must not survive as a real attribute.
    expect(vue.code).not.toContain('slot="trigger"');
  });

  it('emits the `@vitejs/plugin-vue-jsx` slots object on the render-closure path', () => {
    const vue = compileComponentModule(SLOT_PASS_CLOSURE, {
      framework: 'vue',
      componentName: 'BasePicker',
      componentFolders: folders,
    });
    // The child is rendered with `{{ trigger: () => …, default: () => … }}`.
    expect(vue.code).toMatch(/trigger:\s*\(\)\s*=>/);
    expect(vue.code).toMatch(/default:\s*\(\)\s*=>/);
    expect(vue.code).not.toContain('slot="trigger"');
    // The setter passed as a callback prop is still translated to Vue reactivity.
    expect(vue.code).toContain('open.value = next');
  });

  it('passes the slot content as a `name={…}` prop on the React target', () => {
    const react = compileComponentModule(SLOT_PASS_CLOSURE, {
      framework: 'react',
      componentName: 'BasePicker',
      componentFolders: folders,
    });
    // `<button slot="trigger"/>` becomes `<BaseDropdown trigger={<button/>}>`.
    expect(react.code).toMatch(/trigger=\{<button/);
    expect(react.code).not.toContain('slot="trigger"');
  });
});

describe('the React emitter', () => {
  const react = compileComponentModule(BADGE, { framework: 'react', componentName: 'BaseBadge' });

  it('emits a `.tsx` module', () => {
    expect(react.lang).toBe('tsx');
  });

  it('rewrites the neutral value import to React (h → createElement) and keeps the types', () => {
    expect(react.code).toContain('import { createElement as h } from "react"');
    expect(react.code).toContain('import type { MpElement, MpProperties } from "@mission-platform/jsx"');
    // The neutral package must no longer provide any *value* binding.
    expect(react.code).not.toMatch(/import \{[^}]*\bh\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('aliases `class` to `className` in JSX', () => {
    expect(react.code).toContain('className={className}');
  });
});

describe('the `classNames` attribute', () => {
  const react = compileComponentModule(CLASS_NAMES, { framework: 'react', componentName: 'BaseChip' });
  const vue = compileComponentModule(CLASS_NAMES, { framework: 'vue', componentName: 'BaseChip' });

  it('collapses the React array form to a `className={classNames(…)}` string call', () => {
    expect(react.code).toContain(
      "className={classNames('chip', `chip--${tone}`, { 'chip--active': properties.active ?? false })}",
    );
    // The attribute itself is never emitted as a literal `classNames` prop.
    expect(react.code).not.toMatch(/classNames=\{\[/);
  });

  it('re-injects the neutral `classNames` runtime import on React (the author never imports it)', () => {
    expect(react.code).toContain('import { classNames } from "@mission-platform/jsx"');
  });

  it('passes a non-array React value straight through as `className`', () => {
    expect(react.code).toContain('className={tone}');
  });

  it('maps the attribute onto Vue’s native `class` binding (which understands arrays/objects)', () => {
    expect(vue.code).toContain(
      ":class=\"['chip', `chip--${tone}`, { 'chip--active': properties.active ?? false }]\"",
    );
    expect(vue.code).toContain(':class="tone"');
    // Vue needs no runtime helper for the attribute.
    expect(vue.code).not.toContain('classNames');
  });
});

describe('the Vue emitter', () => {
  const vue = compileComponentModule(BADGE, { framework: 'vue', componentName: 'BaseBadge' });

  it('emits a `.vue` SFC using `<script setup>` (no `defineComponent`)', () => {
    expect(vue.lang).toBe('vue');
    expect(vue.code).toContain('<script setup lang="tsx">');
    expect(vue.code).toContain("defineOptions({ name: 'BaseBadge', inheritAttrs: false });");
    expect(vue.code).not.toContain('export default defineComponent(');
  });

  it('lifts derived consts to `computed` and renders native `<template>` markup', () => {
    expect(vue.code).toContain('const variant = computed(');
    expect(vue.code).toContain('const className = computed(');
    expect(vue.code).toContain('<template>');
    expect(vue.code).toContain('<span :class="className" v-bind="$attrs">');
    expect(vue.code).toContain('<slot />');
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).not.toContain('<component :is="render" v-bind="$attrs" />');
  });
});

describe('the Vue emitter rewrites JSX attribute values without touching the attribute name', () => {
  const vue = compileComponentModule(IMAGE, { framework: 'vue', componentName: 'BaseImage' });

  it('binds a colliding attribute by its bare prop name and never rewrites the attribute name', () => {
    // `src`/`alt` are props; the template binds them by their bare prop names
    // (`:src="src"`), and the attribute *name* must stay `src`, never the invalid
    // `:properties.src`.
    expect(vue.code).toContain(':src="src"');
    expect(vue.code).toContain(':alt="alt"');
    expect(vue.code).not.toContain(':properties.src');
  });

  it('keeps an element tag name that collides with a prop and renders its value as text', () => {
    // `caption` is a prop *and* an intrinsic element name. The `<caption>` tag must
    // stay `<caption>` (never the invalid dynamic `<properties.caption>`), while the
    // `{caption}` child becomes a `{{ caption }}` interpolation.
    expect(vue.code).toContain('<caption');
    expect(vue.code).toContain('{{ caption }}');
    expect(vue.code).not.toContain('<properties.caption');
  });
});

describe('the Vue emitter translates hooks to Vue reactivity', () => {
  const vue = compileComponentModule(IN_VIEW, { framework: 'vue', componentName: 'BaseInView' });

  it('turns useRef/useState into refs and reads through `.value`', () => {
    expect(vue.code).toContain('const wrapperReference = ref<HTMLElement | null>(null)');
    expect(vue.code).toContain('const inView = ref(false)');
    expect(vue.code).toContain('inView.value = true');
    expect(vue.code).toContain('wrapperReference.value');
  });

  it('turns useEffect into onMounted + watch(deps) + onUnmounted', () => {
    expect(vue.code).toContain('onMounted(__effect0)');
    expect(vue.code).toContain('watch(() => [properties.threshold, properties.once], __effect0)');
    expect(vue.code).toContain('onUnmounted(');
  });

  it('moves destructured prop defaults into the runtime props declaration', () => {
    expect(vue.code).toContain('threshold: { default: 0.15 }');
    expect(vue.code).toContain('tag: { default: "div" }');
    expect(vue.code).toContain('onEnter: {}');
  });

  it('rewrites prop reads to reactive `properties.<name>` (script) and bare names (template)', () => {
    expect(vue.code).toContain('properties.onEnter?.()');
    expect(vue.code).toContain(':is="tag"');
  });
});

const EFFECT_DERIVED = [
  "import { h, useEffect, useState, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface CarouselProperties extends MpProperties {',
  '  slides: string[];',
  '  loop?: boolean;',
  '  interval?: number;',
  '}',
  '',
  'export function BaseCarousel(properties: CarouselProperties): MpElement {',
  '  const { slides, loop = true, interval = 5000 } = properties;',
  '  const slideCount = slides.length;',
  '  const [current, setCurrent] = useState(0);',
  '  const commit = (index: number): void => { setCurrent(index); };',
  '  const goTo = (index: number): void => {',
  '    commit(loop ? ((index % slideCount) + slideCount) % slideCount : Math.min(slideCount - 1, index));',
  '  };',
  '  useEffect(() => {',
  '    if (slideCount <= 1) { return; }',
  '    const timer = setInterval(() => { commit((current + 1) % slideCount); }, interval);',
  '    return () => clearInterval(timer);',
  '  }, [slideCount, current, interval]);',
  '  const items: MpChild[] = slides.map((slide, index) => (',
  '    <li key={index} class="carousel__item" aria-current={current === index}>{slide}</li>',
  '  ));',
  '  return <ul class="carousel" onClick={() => goTo(current + 1)}>{items}</ul>;',
  '}',
].join('\n');

describe('the Vue emitter hoists derived declarations an effect depends on into `setup`', () => {
  const vue = compileComponentModule(EFFECT_DERIVED, { framework: 'vue', componentName: 'BaseCarousel' });

  it('takes the render-closure fallback (the `.map()` list)', () => {
    expect(vue.code).toContain('const render = () => {');
    expect(vue.code).toContain('<component :is="render" v-bind="$attrs" />');
  });

  it('lifts an effect-referenced derived **value** const into a `setup` `computed`', () => {
    // `slideCount` is read by the effect, so it must exist at `setup` scope (not
    // only inside the render closure). It is a value, so it becomes a reactive
    // `computed` and every read is rewritten to `.value`.
    expect(vue.code).toContain('const slideCount = computed(() => properties.slides.length);');
    expect(vue.code).toContain('slideCount.value');
  });

  it('lifts an effect-referenced derived **function** into a plain `setup` const', () => {
    expect(vue.code).toContain('const commit = (index');
    // ...emitted before the render closure so the effect can call it.
    expect(vue.code.indexOf('const commit =')).toBeLessThan(vue.code.indexOf('const render = () => {'));
  });

  it('rewrites the effect body and deps to the hoisted reactive reads', () => {
    expect(vue.code).toContain('watch(() => [slideCount.value, current.value, properties.interval], __effect0)');
    expect(vue.code).not.toContain('slideCount <= 1)'); // never the bare (undefined) name
  });

  it('leaves a non-effect derived function (`goTo`) in the render closure', () => {
    expect(vue.code.indexOf('const goTo =')).toBeGreaterThan(vue.code.indexOf('const render = () => {'));
  });
});

const HOOK_INITIALISER_DERIVED = [
  "import { h, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface TimeProperties extends MpProperties {',
  '  modelValue?: string;',
  '}',
  '',
  'function parseTime(value: string | undefined): { h: number; m: number } {',
  '  const [h = 0, m = 0] = (value ?? "0:0").split(":").map(Number);',
  '  return { h, m };',
  '}',
  '',
  'export function BaseTime(properties: TimeProperties): MpElement {',
  '  const { modelValue } = properties;',
  '  const initial = parseTime(modelValue);',
  '  const [localH, setLocalH] = useState<number>(initial.h);',
  '  const [localM, setLocalM] = useState<number>(initial.m);',
  '  return <span class="time">{localH}:{localM}</span>;',
  '}',
].join('\n');

describe('the Vue emitter hoists derived declarations a hook initialiser depends on into `setup`', () => {
  const vue = compileComponentModule(HOOK_INITIALISER_DERIVED, { framework: 'vue', componentName: 'BaseTime' });

  it('lifts a derived const read by a `useState` initialiser into a `setup` `computed`', () => {
    // `initial` is read by the `useState(initial.h)` initialisers, which are
    // emitted in `setup`; without hoisting it would stay in the render closure
    // and resolve to an undefined name in `setup` ("initial is not defined").
    expect(vue.code).toContain('const initial = computed(() => parseTime(properties.modelValue));');
  });

  it('reads the hoisted reactive value through `.value` in the `ref` initialisers', () => {
    expect(vue.code).toContain('const localH = ref(initial.value.h)');
    expect(vue.code).toContain('const localM = ref(initial.value.m)');
  });

  it('emits the hoisted `initial` before the `ref`s that consume it', () => {
    expect(vue.code.indexOf('const initial =')).toBeLessThan(vue.code.indexOf('const localH = ref('));
  });
});

const TRANSITION_FADE = [
  "import { h, Transition, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface FadeProperties extends MpProperties {',
  '  open?: boolean;',
  '}',
  '',
  'export function BaseFade(properties: FadeProperties): MpElement {',
  '  const { open = false } = properties;',
  '  return (',
  '    <div class="fade">',
  '      <Transition name="fade">',
  '        {open ? <div class="fade__panel">content</div> : undefined}',
  '      </Transition>',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the emitters remap the neutral `Transition` import to each framework transition', () => {
  const react = compileComponentModule(TRANSITION_FADE, { framework: 'react', componentName: 'BaseFade' });
  const vue = compileComponentModule(TRANSITION_FADE, { framework: 'vue', componentName: 'BaseFade' });

  it('imports the React `Transition` from the `@mission-platform/jsx/react` adapter (not React core or the marker)', () => {
    expect(react.code).toContain('import { Transition } from "@mission-platform/jsx/react"');
    expect(react.code).not.toMatch(/import \{[^}]*\bTransition\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bTransition\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('imports the Vue built-in `Transition` from `vue` and renders it as a native tag', () => {
    expect(vue.code).toMatch(/import \{[^}]*\bTransition\b[^}]*\} from ['"]vue['"]/);
    expect(vue.code).toContain('<Transition name="fade">');
    expect(vue.code).not.toMatch(/import \{[^}]*\bTransition\b[^}]*\} from ['"]@mission-platform\/jsx['"]/);
  });
});

const TRANSITION_GROUP_LIST = [
  "import { h, TransitionGroup, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface ListProperties extends MpProperties {',
  '  items?: { id: number; label: string }[];',
  '}',
  '',
  'export function BaseList(properties: ListProperties): MpElement {',
  '  const { items = [] } = properties;',
  '  return (',
  '    <ul class="list">',
  '      <TransitionGroup name="fade">',
  '        {items.map((item) => (',
  '          <li key={item.id} class="list__item">{item.label}</li>',
  '        ))}',
  '      </TransitionGroup>',
  '    </ul>',
  '  );',
  '}',
].join('\n');

describe('the emitters remap the neutral `TransitionGroup` import to each framework group transition', () => {
  const react = compileComponentModule(TRANSITION_GROUP_LIST, { framework: 'react', componentName: 'BaseList' });
  const vue = compileComponentModule(TRANSITION_GROUP_LIST, { framework: 'vue', componentName: 'BaseList' });

  it('imports the React `TransitionGroup` from the `@mission-platform/jsx/react` adapter (not React core or the marker)', () => {
    expect(react.code).toContain('import { TransitionGroup } from "@mission-platform/jsx/react"');
    expect(react.code).not.toMatch(/import \{[^}]*\bTransitionGroup\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bTransitionGroup\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('imports the Vue built-in `TransitionGroup` from `vue` and renders it as a native tag', () => {
    expect(vue.code).toMatch(/import \{[^}]*\bTransitionGroup\b[^}]*\} from ['"]vue['"]/);
    expect(vue.code).toContain('TransitionGroup');
    expect(vue.code).not.toMatch(/import \{[^}]*\bTransitionGroup\b[^}]*\} from ['"]@mission-platform\/jsx['"]/);
  });
});

const DYNAMIC_LINK = [
  "import { h, Dynamic, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface LinkProperties extends MpProperties {',
  '  href?: string;',
  '}',
  '',
  'export function BaseLink(properties: LinkProperties): MpElement {',
  '  const { href } = properties;',
  "  const tag = href === undefined ? 'button' : 'a';",
  '  return <Dynamic is={tag} class="link" href={href}>go</Dynamic>;',
  '}',
].join('\n');

describe('the emitters translate the `<Dynamic is>` marker to each framework dynamic component', () => {
  const react = compileComponentModule(DYNAMIC_LINK, { framework: 'react', componentName: 'BaseLink' });
  const vue = compileComponentModule(DYNAMIC_LINK, { framework: 'vue', componentName: 'BaseLink' });

  it('rewrites `<Dynamic is={tag}>` to an `h(tag, …)` call on React (with `class`→`className`) and drops the marker import', () => {
    expect(react.code).toContain('h(tag, { className: "link", href: href }, "go")');
    expect(react.code).not.toMatch(/import \{[^}]*\bDynamic\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('renders `<component :is="tag">` on Vue and drops the marker import', () => {
    expect(vue.code).toContain('<component :is="tag"');
    expect(vue.code).toContain('class="link"');
    expect(vue.code).toContain(':href="href"');
    expect(vue.code).not.toMatch(/\bDynamic\b/);
  });
});

const DYNAMIC_ARIA_SLOT = [
  "import { h, Dynamic, Slot, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface ItemProperties extends MpProperties {',
  '  href?: string;',
  '  active?: boolean;',
  '}',
  '',
  'export function BaseItem(properties: ItemProperties): MpElement {',
  '  const { href, active } = properties;',
  "  const tag = href === undefined ? 'button' : 'a';",
  '  return (',
  '    <Dynamic is={tag} aria-current={active ? "page" : undefined} href={href}>',
  '      <Slot name="icon" />',
  '      <Slot>{href}</Slot>',
  '    </Dynamic>',
  '  );',
  '}',
].join('\n');

describe('the `<Dynamic is>` marker supports hyphenated attributes and slotted children', () => {
  const react = compileComponentModule(DYNAMIC_ARIA_SLOT, { framework: 'react', componentName: 'BaseItem' });
  const vue = compileComponentModule(DYNAMIC_ARIA_SLOT, { framework: 'vue', componentName: 'BaseItem' });

  it('quotes the hyphenated `aria-current` prop key so the emitted object literal is valid JS', () => {
    expect(react.code).toContain('"aria-current":');
    // A bare `aria-current:` (unquoted) would be a syntax error.
    expect(react.code).not.toMatch(/[^"']aria-current:/);
  });

  it('unwraps the slotted children into bare `h(tag, …)` arguments on React (no `{ … }` wrapper)', () => {
    // The `<Slot>` markers become the props-driven slot expressions passed as
    // trailing call arguments, not JSX-expression wrappers.
    expect(react.code).toMatch(/h\(tag,[^)]*properties\.icon/);
    expect(react.code).not.toMatch(/h\(tag,[^)]*<Slot/);
  });

  it('renders a `<component :is="tag">` with the hyphenated binding and slots on Vue', () => {
    expect(vue.code).toContain('<component :is="tag"');
    expect(vue.code).not.toMatch(/\bDynamic\b/);
  });
});

const CONTEXT_THEMED = [
  "import { h, createContext, useContext, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "const ThemeContext = createContext('light');",
  '',
  'export interface ThemedProperties extends MpProperties {',
  '  label?: string;',
  '}',
  '',
  'export function BaseThemed(properties: ThemedProperties): MpElement {',
  '  const theme = useContext(ThemeContext);',
  '  return <button class={`btn btn--${theme}`}>{theme}</button>;',
  '}',
].join('\n');

describe('the emitters map the context primitives to each framework provide/inject', () => {
  const react = compileComponentModule(CONTEXT_THEMED, { framework: 'react', componentName: 'BaseThemed' });
  const vue = compileComponentModule(CONTEXT_THEMED, { framework: 'vue', componentName: 'BaseThemed' });

  it('imports `createContext`/`useContext` straight from `react` (they are React’s own)', () => {
    expect(react.code).toMatch(/import \{[^}]*\bcreateContext\b[^}]*\} from ["']react["']/);
    expect(react.code).toMatch(/import \{[^}]*\buseContext\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bcreateContext\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('imports `createContext`/`useContext` from the `@mission-platform/jsx/vue` adapter', () => {
    expect(vue.code).toContain("import { createContext, useContext } from '@mission-platform/jsx/vue';");
    expect(vue.code).toContain("const ThemeContext = createContext('light');");
  });

  it('keeps `useContext(...)` a synchronous setup const on Vue (never lifted into a `computed`)', () => {
    expect(vue.code).toContain('const theme = useContext(ThemeContext);');
    expect(vue.code).not.toContain('const theme = computed(');
  });
});

const TREE = [
  "import { h, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface TreeNode {',
  '  label: string;',
  '  children?: TreeNode[];',
  '}',
  '',
  'export interface TreeProperties extends MpProperties {',
  '  nodes: TreeNode[];',
  '}',
  '',
  'export function BaseTree(properties: TreeProperties): MpElement {',
  '  const { nodes } = properties;',
  '  return (',
  '    <ul class="tree">',
  '      {nodes.map((node) => (',
  '        <li class="tree__node">',
  '          {node.label}',
  '          {node.children ? <BaseTree nodes={node.children} /> : undefined}',
  '        </li>',
  '      ))}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

describe('the emitters support a recursive (self-referencing) component', () => {
  const react = compileComponentModule(TREE, { framework: 'react', componentName: 'BaseTree' });
  const vue = compileComponentModule(TREE, { framework: 'vue', componentName: 'BaseTree' });

  it('keeps the self-reference as a native JSX tag on React', () => {
    expect(react.code).toContain('<BaseTree nodes={node.children}/>');
  });

  it('resolves the self-reference by name in the Vue render closure (backed by `defineOptions({ name })`)', () => {
    expect(vue.code).toContain("defineOptions({ name: 'BaseTree', inheritAttrs: false });");
    expect(vue.code).toContain("const BaseTree = resolveComponent('BaseTree');");
    expect(vue.code).toMatch(/import \{[^}]*\bresolveComponent\b[^}]*\} from ['"]vue['"]/);
  });
});
