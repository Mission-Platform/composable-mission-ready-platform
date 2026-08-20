import { localJsxTypesModuleSource as sharedLocalJsxTypesModuleSource } from '@mission-platform/forge-plugin-api/compiler/ast.js';
import { describe, expect, it } from 'vitest';

import { localEffectModuleSource, localJsxTypesModuleSource } from './ast';
import {
  compileComponentModule,
  compileHookModule,
  moduleTargetsFramework,
  readFrameworkDirective,
} from './compiler-test-helpers';

const BADGE = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface BadgeProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '  variant?: string;',
  '}',
  '',
  'export function ForgeBadge(properties: BadgeProperties): MpElement {',
  "  const variant = properties.variant ?? 'default';",
  '  const className = `forge-badge forge-badge--${variant}`;',
  '  return <span class={className}>{properties.children}</span>;',
  '}',
].join('\n');

const CLASS_NAMES = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ChipProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '  active?: boolean;',
  '  tone?: string;',
  '}',
  '',
  'export function ForgeChip(properties: ChipProperties): MpElement {',
  "  const tone = properties.tone ?? 'neutral';",
  '  return (',
  "    <span className={['chip', `chip--${tone}`, { 'chip--active': properties.active ?? false }]}>",
  '      <i className={tone} />',
  '      {properties.children}',
  '    </span>',
  '  );',
  '}',
].join('\n');

// A component that calls the neutral `classNames(a, b, { c })` helper *inline*
// inside a JSX `class` attribute (as opposed to the literal-array form in
// `CLASS_NAMES`) — used to check the Svelte emitter unwraps it to a native
// clsx `class` array.
const INLINE_CLASS_NAMES = [
  "import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface TagProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '  active?: boolean;',
  '  tone?: string;',
  '}',
  '',
  'export function ForgeTag(properties: TagProperties): MpElement {',
  "  const tone = properties.tone ?? 'neutral';",
  "  return <span class={classNames('tag', `tag--${tone}`, { 'tag--active': properties.active ?? false })}>{properties.children}</span>;",
  '}',
].join('\n');

const IN_VIEW = [
  "import { h, type MpChild, type MpElement, useEffect, useRef, useState } from '@mission-platform/forge';",
  '',
  'export interface InViewProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '  threshold?: number;',
  '  once?: boolean;',
  '  tag?: string;',
  '  onEnter?: () => void;',
  '}',
  '',
  'export function ForgeInView(properties: InViewProperties): MpElement {',
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
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ImageProperties {',
  '  src?: string;',
  '  alt?: string;',
  '  caption?: string;',
  '}',
  '',
  'export function ForgeImage(properties: ImageProperties): MpElement {',
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
  "import { h, type MpChild, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface LayoutProperties {',
  '  sticky?: boolean;',
  '  header?: MpChild;',
  '}',
  '',
  'export function ForgeLayout(properties: LayoutProperties): MpElement {',
  '  return (',
  '    <div class="layout">',
  '      <div class="layout__header"><Slot name="header" /></div>',
  '      <main class="layout__content"><Slot /></main>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const SCOPED_LIST = [
  "import { h, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface ListProperties {',
  '  items: string[];',
  '}',
  '',
  'export function ForgeList(properties: ListProperties): MpElement {',
  '  const { items } = properties;',
  '  return (',
  '    <ul class="list">',
  '      {items.map((item, index) => {',
  '        const badge = <b class="list__badge">{index}</b>;',
  '        return <li class="list__row">{badge}<Slot item={item} index={index} /></li>;',
  '      })}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

const TELEPORT_OVERLAY = [
  "import { h, type MpElement, Slot, Teleport, useState } from '@mission-platform/forge';",
  '',
  'export interface OverlayProperties {',
  '  open?: boolean;',
  '}',
  '',
  'export function ForgeOverlay(properties: OverlayProperties): MpElement {',
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
  const react = compileComponentModule(TELEPORT_OVERLAY, { framework: 'react', componentName: 'ForgeOverlay' });
  const vue = compileComponentModule(TELEPORT_OVERLAY, { framework: 'vue', componentName: 'ForgeOverlay' });

  it('imports the React `Teleport` from the `@mission-platform/forge/react` adapter (not React core or the marker)', () => {
    expect(react.code).toContain('import { Teleport } from "@mission-platform/forge/react"');
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

// A panel whose `<Slot name="content">` declares **fallback** content — a
// conditional expression (`image ? <img/> : label`). The React emitter wraps
// slot fallback in a `<>…</>` fragment (`properties.content?.(…) ?? <>…</>`),
// which the classic-`h` JSX transform lowers to `createElement(Fragment, …)`, so
// the `react` value import must include `Fragment`.
const SLOT_FALLBACK = [
  "import { h, type MpElement, type MpRenderProperty, Slot } from '@mission-platform/forge';",
  '',
  'export interface PanelScope {',
  '  index: number;',
  '}',
  '',
  'export interface PanelProperties {',
  '  label?: string;',
  '  image?: string;',
  '  content?: MpRenderProperty<PanelScope>;',
  '}',
  '',
  'export function ForgePanel(properties: PanelProperties): MpElement {',
  '  const { label = "", image } = properties;',
  '  return (',
  '    <div class="panel">',
  '      <Slot name="content" index={0}>',
  '        {image ? <img class="panel__img" src={image} alt={label} /> : label}',
  '      </Slot>',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the React emitter imports `Fragment` when slot fallback compiles to a `<>…</>` fragment', () => {
  const react = compileComponentModule(SLOT_FALLBACK, { framework: 'react', componentName: 'ForgePanel' });

  it('adds `Fragment` to the `react` value import so the emitted fragment resolves at runtime', () => {
    expect(react.code).toMatch(/import \{[^}]*\bFragment\b[^}]*\} from ["']react["']/);
  });

  it('emits the slot fallback as a `<>…</>` fragment reading the render prop', () => {
    expect(react.code).toContain('properties.content');
    expect(react.code).toContain('<>');
  });

  it('does not import a stray `Fragment` when no fragment is emitted', () => {
    const layout = compileComponentModule(LAYOUT, { framework: 'react', componentName: 'ForgeLayout' });
    expect(layout.code).not.toMatch(/import \{[^}]*\bFragment\b[^}]*\} from ["']react["']/);
  });
});

// A side-effect-only component that renders nothing, returning an empty neutral
// `<Fragment />` (the neutral render-nothing form). React's idiom for rendering
// nothing is `null`, so the React emitter collapses the empty fragment to it.
const EMPTY_FRAGMENT = [
  "import { Fragment, h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface MarkerProperties {',
  '  id: string;',
  '}',
  '',
  'export function ForgeMarker(properties: MarkerProperties): MpElement {',
  '  void properties.id;',
  '  return <Fragment />;',
  '}',
].join('\n');

// A grouping component that returns a neutral `<Fragment>` wrapping several
// children. The React emitter rewrites the named `<Fragment>` element to the
// `<>…</>` shorthand.
const FRAGMENT_GROUP = [
  "import { Fragment, h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface GroupProperties {',
  '  title: string;',
  '}',
  '',
  'export function ForgeGroup(properties: GroupProperties): MpElement {',
  '  return (',
  '    <Fragment>',
  '      <h2>{properties.title}</h2>',
  '      <p>body</p>',
  '    </Fragment>',
  '  );',
  '}',
].join('\n');

describe('the React emitter maps a neutral `<Fragment>` to React idioms', () => {
  const emptyReact = compileComponentModule(EMPTY_FRAGMENT, { framework: 'react', componentName: 'ForgeMarker' });
  const groupReact = compileComponentModule(FRAGMENT_GROUP, { framework: 'react', componentName: 'ForgeGroup' });

  it('collapses an empty `<Fragment />` to `null` (React renders nothing) rather than an empty `<></>`', () => {
    expect(emptyReact.code).toContain('return null');
    expect(emptyReact.code).not.toContain('<Fragment');
    expect(emptyReact.code).not.toContain('<>');
  });

  it('drops the now-unused `Fragment` import when the only fragment collapsed to `null`', () => {
    expect(emptyReact.code).not.toMatch(/import \{[^}]*\bFragment\b[^}]*\} from ["']react["']/);
    expect(emptyReact.code).not.toMatch(/import \{[^}]*\bFragment\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('rewrites a non-empty `<Fragment>…</Fragment>` to the `<>…</>` shorthand', () => {
    expect(groupReact.code).toContain('<>');
    expect(groupReact.code).toContain('</>');
    expect(groupReact.code).not.toContain('<Fragment');
    expect(groupReact.code).not.toContain('</Fragment>');
  });

  it('imports `Fragment` from `react` for the emitted `<>…</>` shorthand', () => {
    expect(groupReact.code).toMatch(/import \{[^}]*\bFragment\b[^}]*\} from ["']react["']/);
  });
});

// A grouping component authored with the neutral `<>…</>` fragment **shorthand**
// (the canonical multi-root form — `Fragment` is imported only as the classic
// transform's fragment factory). Both emitters must lower it: React keeps the
// `<>…</>` shorthand, Vue inlines the children with no wrapper element.
const FRAGMENT_SHORTHAND = [
  "import { Fragment, h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface StackProperties {',
  '  title: string;',
  '}',
  '',
  'export function ForgeStack(properties: StackProperties): MpElement {',
  '  return (',
  '    <>',
  '      <h2 class="stack__title">{properties.title}</h2>',
  '      <p class="stack__body">body</p>',
  '    </>',
  '  );',
  '}',
].join('\n');

// A side-effect-only component that renders nothing. The empty render is
// authored as `null` (not an empty fragment): React returns `null` verbatim and
// Vue's render returns `null`, so neither framework outputs any markup.
const EMPTY_RENDER_NULL = [
  "import { type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ProbeProperties {',
  '  id: string;',
  '}',
  '',
  'export function ForgeProbe(properties: ProbeProperties): MpElement | null {',
  '  void properties.id;',
  '  return null;',
  '}',
].join('\n');

describe('the emitters lower the neutral `<>` fragment shorthand', () => {
  const react = compileComponentModule(FRAGMENT_SHORTHAND, { framework: 'react', componentName: 'ForgeStack' });
  const vue = compileComponentModule(FRAGMENT_SHORTHAND, { framework: 'vue', componentName: 'ForgeStack' });

  it('keeps the `<>…</>` shorthand on React and imports `Fragment` from `react`', () => {
    expect(react.code).toContain('<>');
    expect(react.code).toContain('</>');
    expect(react.code).toMatch(/import \{[^}]*\bFragment\b[^}]*\} from ["']react["']/);
  });

  it('inlines the fragment children on Vue with no wrapper element', () => {
    expect(vue.code).toContain('<h2 class="stack__title">');
    expect(vue.code).toContain('<p class="stack__body">');
    expect(vue.code).not.toContain('<Fragment');
    expect(vue.code).not.toContain('</Fragment>');
  });
});

describe('the emitters lower a `null` (empty) render', () => {
  const react = compileComponentModule(EMPTY_RENDER_NULL, { framework: 'react', componentName: 'ForgeProbe' });
  const vue = compileComponentModule(EMPTY_RENDER_NULL, { framework: 'vue', componentName: 'ForgeProbe' });

  it('returns `null` on React (React renders nothing)', () => {
    expect(react.code).toContain('return null');
    expect(react.code).not.toContain('<>');
  });

  it('omits the `<template>` block entirely on Vue (no `{{ null }}`, no render closure)', () => {
    // A render-nothing component produces a clean SFC with no `<template>`: the
    // `void properties.id;` no-op is dropped and the `null` root yields empty
    // markup, so the assembler skips the block rather than emitting `{{ null }}`.
    expect(vue.code).not.toContain('<template>');
    expect(vue.code).not.toContain('{{ null }}');
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).not.toContain('<Fragment');
  });
});

// A pass-through wrapper (mirrors `@mission-platform/map`'s `ForgeMapSource`): a
// side-effect call (`registerThing(...)` — a per-render statement) forces the
// Vue **render-closure** fallback, and the body ends in a top-level
// `return <Slot />;`. The slot lowering must emit the **bare** expression in
// return position — `return slots.default?.();` (Vue) / `return properties.children;`
// (React) — never the JSX-child `{ … }` wrapper, which would print the invalid
// `return {slots.default?.()};` that broke the map Vue build.
const SLOT_RETURN_CLOSURE = [
  "import { type MpElement, Slot } from '@mission-platform/forge';",
  "import { registerThing } from '@acme/thing';",
  '',
  'export interface WrapProperties {',
  '  id: string;',
  '}',
  '',
  'export function ForgeWrap(properties: WrapProperties): MpElement {',
  '  registerThing(properties.id);',
  '  return <Slot />;',
  '}',
].join('\n');

describe('the emitters lower a top-level `<Slot>` return to a bare expression', () => {
  const react = compileComponentModule(SLOT_RETURN_CLOSURE, { framework: 'react', componentName: 'ForgeWrap' });
  const vue = compileComponentModule(SLOT_RETURN_CLOSURE, { framework: 'vue', componentName: 'ForgeWrap' });

  it('emits `return slots.default?.();` (bare) on Vue, never the invalid `return {slots.default?.()};`', () => {
    // The side-effect statement pushes this component onto the render-closure
    // fallback, where the top-level slot return is printed directly.
    expect(vue.code).toContain('const render = () =>');
    expect(vue.code).toContain('return slots.default?.();');
    expect(vue.code).not.toContain('return {slots.default?.()}');
  });

  it('emits the bare `return properties.children;` on React (no `{ … }` wrapper)', () => {
    expect(react.code).toContain('return properties.children');
    expect(react.code).not.toContain('return {properties.children}');
  });
});

// A drag-and-drop board rendered as a native `v-for`. The `.map()` callback
// declares a **node-valued** intermediate const (`heading`), which is now
// inlined structurally into the row element rather than forcing the render
// closure. It mixes multi-word DOM events on **native** elements
// (`onDragOver`/`onDrop`/`onDragEnter`) with a multi-word **component** event
// (`onValueChange`).
const DRAG_BOARD = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "import ForgeColumn from './forge-column';",
  '',
  'export interface BoardProperties {',
  '  columns: string[];',
  '}',
  '',
  'export function ForgeBoard(properties: BoardProperties): MpElement {',
  '  const { columns } = properties;',
  '  return (',
  '    <div class="board" onDragOver={(event) => event.preventDefault()}>',
  '      {columns.map((column, index) => {',
  '        const columnLabel = `${column}-${index}`;',
  '        const heading = <h3 class="board__heading">{columnLabel}</h3>;',
  '        return (',
  '          <section key={index} class="board__column" title={columnLabel} onDrop={() => undefined} onDragEnter={() => undefined} onClick={() => undefined}>',
  '            {heading}',
  '            <ForgeColumn onValueChange={() => undefined} />',
  '          </section>',
  '        );',
  '      })}',
  '    </div>',
  '  );',
  '}',
].join('\n');

// A template-able drag tile (a single element tree, so it takes the `<template>`
// path) carrying multi-word DOM events on a native element.
const DRAG_TILE = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface TileProperties {',
  '  label?: string;',
  '}',
  '',
  'export function ForgeTile(properties: TileProperties): MpElement {',
  '  return (',
  '    <div class="tile" draggable={true} onDragStart={() => undefined} onDrop={() => undefined}>',
  '      {properties.label}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter lowercases multi-word DOM event listeners on native elements', () => {
  const reactBoard = compileComponentModule(DRAG_BOARD, { framework: 'react', componentName: 'ForgeBoard' });
  const vueBoard = compileComponentModule(DRAG_BOARD, { framework: 'vue', componentName: 'ForgeBoard' });
  const vueTile = compileComponentModule(DRAG_TILE, { framework: 'vue', componentName: 'ForgeTile' });

  it('renders the `.map()`-built board as a native `v-for` (node const inlined)', () => {
    expect(vueBoard.code).toContain('v-for="(column, index) in columns"');
    expect(vueBoard.code).not.toContain('const render = () => {');
    // The node-valued `heading` const is inlined into the row markup.
    expect(vueBoard.code).toContain('<h3 class="board__heading">');
  });

  it('lowercases native multi-word events to `@<event>` so Vue binds the real DOM event', () => {
    // `@dragOver` would otherwise hyphenate to the dead `drag-over` event, so
    // drops never fire; `@dragover` hyphenates back to the real `dragover`.
    expect(vueBoard.code).toContain('@dragover=');
    expect(vueBoard.code).toContain('@dragenter=');
    expect(vueBoard.code).not.toContain('@dragOver');
    expect(vueBoard.code).not.toContain('@dragEnter');
  });

  it('leaves single-word native events untouched', () => {
    expect(vueBoard.code).toContain('@drop=');
    expect(vueBoard.code).toContain('@click=');
  });

  it('preserves a multi-word **component** event listener (it matches the child emit)', () => {
    expect(vueBoard.code).toContain('@valueChange=');
    expect(vueBoard.code).not.toContain('@valuechange');
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
  const react = compileComponentModule(SCOPED_LIST, { framework: 'react', componentName: 'ForgeList' });
  const vue = compileComponentModule(SCOPED_LIST, { framework: 'vue', componentName: 'ForgeList' });

  it('invokes the React default slot as a render-prop or forwards it directly when a React node', () => {
    expect(react.code).toContain(
      'typeof properties.children === "function" ? properties.children({ item: item, index: index }) : properties.children',
    );
  });

  it('invokes the Vue default slot as a native scoped `<slot>` with the scope object', () => {
    expect(vue.code).toContain('<slot :item="item" :index="index" />');
  });

  it('renders the `.map()`-built list as a native `v-for` (node const inlined)', () => {
    expect(vue.code).toContain('v-for="(item, index) in items"');
    expect(vue.code).not.toContain('const render = () => {');
    // The node-valued `badge` const is inlined into the row markup.
    expect(vue.code).toContain('<b class="list__badge">');
  });
});

describe('the emitters translate named `<Slot>` elements', () => {
  const react = compileComponentModule(LAYOUT, { framework: 'react', componentName: 'ForgeLayout' });
  const vue = compileComponentModule(LAYOUT, { framework: 'vue', componentName: 'ForgeLayout' });

  it('rewrites React slots to props reads and never imports the `Slot` marker', () => {
    expect(react.code).toContain('properties.header');
    expect(react.code).toContain('properties.children');
    expect(react.code).not.toMatch(/import \{[^}]*\bSlot\b[^}]*\} from ["']@mission-platform\/jsx["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bSlot\b[^}]*\} from ["']react["']/);
  });

  it('renders named/default `<Slot>` as native `<slot>` and keeps slot names out of runtime props', () => {
    expect(vue.code).toContain('<slot name="header" />');
    expect(vue.code).toContain('<slot />');
    // The (non-slot) `sticky` prop keeps its declared type via a type-based
    // macro; the slot-backed `header` stays out of the runtime props macro.
    expect(vue.code).toContain(
      "defineProps<{\n  sticky?: boolean;\n  className?: import('@mission-platform/forge').ClassValue;\n}>();",
    );
    expect(vue.code).not.toContain('header?: MpChild;\n}>');
  });

  it('rewrites the neutral `MpChild` type to React `ReactNode`, imported from `react`', () => {
    // The prop annotation reads idiomatically for React…
    expect(react.code).toContain('header?: ReactNode');
    expect(react.code).not.toContain('MpChild');
    // …and `ReactNode` is a type-only import from `react` (not the neutral package).
    expect(react.code).toMatch(/import type \{[^}]*\bReactNode\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import type \{[^}]*\bMpChild\b[^}]*\} from ["']@mission-platform\/jsx["']/);
    // The deleted neutral props base leaves no trace: the component declares
    // exactly the properties it accepts, so nothing is inherited and nothing is
    // imported for it from the co-located variants module.
    expect(react.code).not.toContain('MpProperties');
  });

  it('does not apply the React `ReactNode` rename on the Vue target', () => {
    expect(vue.code).not.toContain('ReactNode');
  });
});

// A component whose props parameter is wrapped in the `Readonly<…>` utility
// type. The wrapper must be unwrapped so the props interface is still resolved
// and a type-based `defineProps` is emitted.
const READONLY_PROPS = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface TagProperties {',
  '  label: string;',
  '  muted?: boolean;',
  '}',
  '',
  'export function ForgeTag(properties: Readonly<TagProperties>): MpElement {',
  '  return <span class="tag" data-muted={properties.muted ?? false}>{properties.label}</span>;',
  '}',
].join('\n');

describe('the Vue emitter resolves a `Readonly<…>`-wrapped props parameter', () => {
  const vue = compileComponentModule(READONLY_PROPS, { framework: 'vue', componentName: 'ForgeTag' });

  it('unwraps `Readonly<…>` and still emits a type-based `defineProps`', () => {
    expect(vue.code).toContain('defineProps<{');
    expect(vue.code).toContain('label: string;');
    expect(vue.code).toContain('muted?: boolean;');
  });
});

// A template-able card: a single element tree (no node-valued consts) whose
// optional header/footer regions are gated by the `hasSlot(…)` presence marker.
const HAS_SLOT_CARD = [
  "import { h, hasSlot, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface CardProperties {',
  '  bordered?: boolean;',
  '}',
  '',
  'export function ForgeCard(properties: CardProperties): MpElement {',
  '  return (',
  '    <div class="card">',
  '      {hasSlot("header") ? <div class="card__header"><Slot name="header" /></div> : undefined}',
  '      <div class="card__body"><Slot /></div>',
  '      {hasSlot("footer") ? <div class="card__footer"><Slot name="footer" /></div> : undefined}',
  '    </div>',
  '  );',
  '}',
].join('\n');

// A render-closure card: the `.map()` callback has an **imperative body** (an
// early-return `if` guard before the returned element), which has no native
// `v-for` form, so it forces the `<script setup>` render-closure fallback —
// exercising the `hasSlot(…)` → `!!slots.x` rewrite.
const HAS_SLOT_CLOSURE = [
  "import { h, hasSlot, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface FeedProperties {',
  '  items: string[];',
  '}',
  '',
  'export function ForgeFeed(properties: FeedProperties): MpElement {',
  '  const { items } = properties;',
  '  return (',
  '    <div class="feed">',
  '      {hasSlot("header") ? <header class="feed__header"><Slot name="header" /></header> : undefined}',
  '      <ul class="feed__list">',
  '        {items.map((item, index) => {',
  '          if (item === "") { return undefined; }',
  '          const row = <span class="feed__row-label">{item}</span>;',
  '          return <li key={index} class="feed__row">{row}</li>;',
  '        })}',
  '      </ul>',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the emitters translate the `hasSlot(…)` presence marker', () => {
  const react = compileComponentModule(HAS_SLOT_CARD, { framework: 'react', componentName: 'ForgeCard' });
  const vue = compileComponentModule(HAS_SLOT_CARD, { framework: 'vue', componentName: 'ForgeCard' });

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
    const closure = compileComponentModule(HAS_SLOT_CLOSURE, { framework: 'vue', componentName: 'ForgeFeed' });
    expect(closure.code).toContain('!!slots.header');
    expect(closure.code).toContain('const slots = useSlots();');
    expect(closure.code).not.toContain('hasSlot(');
  });
});

// A shell that declares its slots with the **call form** of the marker —
// `h(Slot, { name: 'x' })` rather than `<Slot name="x" />` — and uses a
// **kebab-case** slot name (`start-header`). The single element tree (with the
// node-valued `start` const inlined) takes the `<template>` path, so both slot
// forms render as native `<slot>` tags and the kebab presence check uses bracket
// access.
const SLOT_CALL_LAYOUT = [
  "import { h, hasSlot, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface ShellProperties {',
  '  startTitle?: string;',
  '}',
  '',
  'export function ForgeShell(properties: ShellProperties): MpElement {',
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
  const vue = compileComponentModule(SLOT_CALL_LAYOUT, { framework: 'vue', componentName: 'ForgeShell' });
  const react = compileComponentModule(SLOT_CALL_LAYOUT, { framework: 'react', componentName: 'ForgeShell' });

  it('renders `h(Slot, …)` as native `<slot>` tags (default, named, kebab) and never leaves the `Slot` marker', () => {
    expect(vue.code).toContain('<slot />');
    expect(vue.code).toContain('<slot name="start" />');
    expect(vue.code).toContain('<slot name="start-header" />');
    // The kebab presence check must use bracket access — dot access would
    // mis-parse as a subtraction (`$slots.start-header` → `$slots.start - header`).
    expect(vue.code).toContain('v-if="$slots[\'start-header\']"');
    expect(vue.code).not.toContain('h(Slot');
    expect(vue.code).not.toContain('<component :is="Slot"');
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
  "import { h, type MpElement, useState } from '@mission-platform/forge';",
  '',
  "import { getCount, subscribeCount } from '../counter-store';",
  '',
  'export interface CounterProperties {',
  '  label?: string;',
  '}',
  '',
  'export function ForgeCounter(properties: CounterProperties): MpElement {',
  '  const [count, setCount] = useState(getCount());',
  "  return <span class='counter'>{count}</span>;",
  '}',
].join('\n');

describe('the Vue emitter partitions relative imports into components and helper modules', () => {
  it('emits a non-component relative import as a named helper import when the component set is supplied', () => {
    const vue = compileComponentModule(HELPER_CONSUMER, {
      framework: 'vue',
      componentName: 'ForgeCounter',
      componentFolders: new Set(['forge-counter']),
    });
    expect(vue.code).toContain("import { getCount, subscribeCount } from './counter-store';");
    expect(vue.code).not.toContain("from './counter-store.vue'");
  });

  it('falls back to treating every relative import as a `.vue` child when no component set is supplied', () => {
    const vue = compileComponentModule(HELPER_CONSUMER, { framework: 'vue', componentName: 'ForgeCounter' });
    expect(vue.code).toContain("from './counter-store.vue';");
  });

  it('keeps the named helper import verbatim on the React target', () => {
    const react = compileComponentModule(HELPER_CONSUMER, {
      framework: 'react',
      componentName: 'ForgeCounter',
      componentFolders: new Set(['forge-counter']),
    });
    expect(react.code).toContain('import { getCount, subscribeCount } from "./counter-store"');
  });
});

// A component importing both a **value** and a **type** from a helper module in
// one mixed statement — the type is used in the props interface, so it must
// survive into the emitted source (and its declaration), not be dropped.
const HELPER_TYPE_CONSUMER = [
  "import { h, type MpElement, useState } from '@mission-platform/forge';",
  '',
  "import { getCount, type CountSnapshot } from '../counter-store';",
  '',
  'export interface CounterProperties {',
  '  snapshot?: CountSnapshot;',
  '}',
  '',
  'export function ForgeCounter(properties: CounterProperties): MpElement {',
  '  const [count, setCount] = useState(getCount());',
  "  return <span class='counter'>{count}</span>;",
  '}',
].join('\n');

describe('the emitters preserve the type-only members of a mixed relative helper import', () => {
  it('emits the value and the type-only member as separate imports on the Vue target', () => {
    const vue = compileComponentModule(HELPER_TYPE_CONSUMER, {
      framework: 'vue',
      componentName: 'ForgeCounter',
      componentFolders: new Set(['forge-counter']),
    });
    // The value keeps its runtime import…
    expect(vue.code).toContain("import { getCount } from './counter-store';");
    // …and the type-only member is preserved as an `import type` (regression: the
    // Vue emitter used to drop it, leaving `CountSnapshot` unresolved → TS2304).
    expect(vue.code).toContain("import type { CountSnapshot } from './counter-store';");
    expect(vue.code).toContain('snapshot?: CountSnapshot');
  });

  it('keeps the mixed helper import intact on the React target', () => {
    const react = compileComponentModule(HELPER_TYPE_CONSUMER, {
      framework: 'react',
      componentName: 'ForgeCounter',
      componentFolders: new Set(['forge-counter']),
    });
    expect(react.code).toMatch(
      /import \{[^}]*\bgetCount\b[^}]*\btype CountSnapshot\b[^}]*\} from ["']\.\/counter-store["']/,
    );
  });
});

// A component importing both a sibling **component** and one of that
// component's public **types** in one statement — the type is used in the props
// interface, so on Vue it must be preserved as an `import type` from the child's
// compiled `.vue` module (not dropped alongside the default component import).
const CHILD_TYPE_CONSUMER = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  "import { ForgeTypography, type TypographyVariant } from '../forge-typography';",
  '',
  'export interface QuoteProperties {',
  '  variant?: TypographyVariant;',
  '}',
  '',
  'export function ForgeQuote(properties: QuoteProperties): MpElement {',
  '  return <ForgeTypography>{properties.variant}</ForgeTypography>;',
  '}',
].join('\n');

describe('the Vue emitter preserves a type imported alongside a sibling component', () => {
  const folders = new Set(['forge-quote', 'forge-typography']);

  it('keeps the default component import and re-imports its type from the `.vue` module', () => {
    const vue = compileComponentModule(CHILD_TYPE_CONSUMER, {
      framework: 'vue',
      componentName: 'ForgeQuote',
      componentFolders: folders,
    });
    expect(vue.code).toContain("import ForgeTypography from './forge-typography.vue';");
    // Regression: the type member used to be dropped, leaving `TypographyVariant`
    // unresolved in the SFC and its declaration (TS2304).
    expect(vue.code).toContain("import type { TypographyVariant } from './forge-typography.vue';");
    expect(vue.code).toContain('variant?: TypographyVariant');
  });

  it('flattens a deeply nested atomic-design sibling import to `./<basename>.vue`', () => {
    // After nesting, a molecule reaches an atom via `../../atoms/forge-typography`
    // rather than a single `../forge-typography` hop. The emitter must still treat
    // it as a component import and rewrite it to the flat generated layout.
    const nestedConsumer = CHILD_TYPE_CONSUMER.replace(
      "from '../forge-typography'",
      "from '../../atoms/forge-typography'",
    );
    const vue = compileComponentModule(nestedConsumer, {
      framework: 'vue',
      componentName: 'ForgeQuote',
      componentFolders: folders,
    });
    expect(vue.code).toContain("import ForgeTypography from './forge-typography.vue';");
    expect(vue.code).toContain("import type { TypographyVariant } from './forge-typography.vue';");
    expect(vue.code).not.toContain('atoms/');
    expect(vue.code).not.toContain('../');
  });
});

const EXTERNAL_DEFAULT = [
  "import { DEFAULT_TYPES, type Descriptor } from '@scope/forms-core';",
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface PaletteProperties {',
  '  types?: Descriptor[];',
  '}',
  '',
  'export function ForgePalette(properties: PaletteProperties): MpElement {',
  '  const { types = DEFAULT_TYPES } = properties;',
  '  return <span class="palette">{types.length}</span>;',
  '}',
].join('\n');

describe('the emitters carry external (bare package) imports referenced by prop defaults', () => {
  const vue = compileComponentModule(EXTERNAL_DEFAULT, {
    framework: 'vue',
    componentName: 'ForgePalette',
    componentFolders: new Set(['forge-palette']),
  });
  const react = compileComponentModule(EXTERNAL_DEFAULT, {
    framework: 'react',
    componentName: 'ForgePalette',
    componentFolders: new Set(['forge-palette']),
  });

  it('keeps the external value import in the Vue SFC so the prop default resolves at runtime', () => {
    // Regression: the Vue emitter used to drop every non-relative, non-neutral
    // import, leaving `types: { default: DEFAULT_TYPES }` referencing an
    // undefined binding (`ReferenceError: DEFAULT_TYPES is not defined`).
    expect(vue.code).toMatch(/import \{[^}]*\bDEFAULT_TYPES\b[^}]*\} from ["']@scope\/forms-core["']/);
    // The default moved into `withDefaults`, still referencing the external binding.
    expect(vue.code).toContain('types: DEFAULT_TYPES');
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
  "import { h, type MpElement, useState } from '@mission-platform/forge';",
  '',
  "import { ForgeIconChevron } from '@mission-platform/icons';",
  '',
  'export interface DisclosureProperties {',
  '  label?: string;',
  '}',
  '',
  'export function ForgeDisclosure(properties: DisclosureProperties): MpElement {',
  '  const { label } = properties;',
  '  const [open, setOpen] = useState<boolean>(false);',
  '  return (',
  '    <button type="button" onClick={() => setOpen(!open)}>',
  '      {label}',
  "      <ForgeIconChevron direction={open ? 'up' : 'down'} size=\"sm\" />",
  '    </button>',
  '  );',
  '}',
].join('\n');

describe('the emitters carry the `@mission-platform/icons` import through as a bare specifier', () => {
  const vue = compileComponentModule(ICON_CONSUMER, {
    framework: 'vue',
    componentName: 'ForgeDisclosure',
    componentFolders: new Set(['forge-disclosure']),
  });
  const react = compileComponentModule(ICON_CONSUMER, {
    framework: 'react',
    componentName: 'ForgeDisclosure',
    componentFolders: new Set(['forge-disclosure']),
  });

  it('keeps the bare `@mission-platform/icons` root on the Vue target', () => {
    expect(vue.code).toMatch(/import \{[^}]*\bForgeIconChevron\b[^}]*\} from ["']@mission-platform\/icons["']/);
    // The framework is chosen by the consumer's `mp:vue` resolve condition, so
    // the generated source must never name a per-framework subpath.
    expect(vue.code).not.toMatch(/@mission-platform\/icons\/(vue|react|solid|svelte|web-components)/);
    // The `<ForgeIconChevron>` tag survives as a (native) component usage.
    expect(vue.code).toContain('ForgeIconChevron');
  });

  it('keeps the bare `@mission-platform/icons` root on the React target', () => {
    expect(react.code).toMatch(/import \{[^}]*\bForgeIconChevron\b[^}]*\} from ["']@mission-platform\/icons["']/);
    expect(react.code).not.toMatch(/@mission-platform\/icons\/(vue|react|solid|svelte|web-components)/);
    expect(react.code).toContain('ForgeIconChevron');
  });
});

// Named-slot **passing**: a parent composes a child component and routes content
// into the child's named slot with `slot="trigger"`. The template-able variant
// (no node-valued consts) exercises the `<template>` path.
const SLOT_PASS_TEMPLATE = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  "import { ForgeDropdown } from '../forge-dropdown';",
  '',
  'export function ForgePicker(): MpElement {',
  '  return (',
  '    <ForgeDropdown open={true}>',
  '      <button slot="trigger" type="button">Open</button>',
  '      <ul class="panel"><li>One</li></ul>',
  '    </ForgeDropdown>',
  '  );',
  '}',
].join('\n');

// The render-closure variant (the imperative `.map()` callback forces the
// fallback path).
const SLOT_PASS_CLOSURE = [
  "import { h, type MpElement, useState } from '@mission-platform/forge';",
  '',
  "import { ForgeDropdown } from '../forge-dropdown';",
  '',
  'export interface PickerProperties {',
  '  label?: string;',
  '  options?: string[];',
  '}',
  '',
  'export function ForgePicker(properties: PickerProperties): MpElement {',
  '  const { label, options = [] } = properties;',
  '  const [open, setOpen] = useState<boolean>(false);',
  '  const items = options.map((option) => {',
  '    if (option === "") { return undefined; }',
  '    return <li key={option}>{option}</li>;',
  '  });',
  '  return (',
  '    <ForgeDropdown open={open} onUpdateOpen={(next: boolean) => setOpen(next)}>',
  '      <button slot="trigger" type="button" onClick={() => setOpen(!open)}>{label}</button>',
  '      <ul class="panel">{items}</ul>',
  '    </ForgeDropdown>',
  '  );',
  '}',
].join('\n');

describe('the emitters route a child component\u2019s `slot="…"` children into its named slot', () => {
  const folders = new Set(['forge-dropdown', 'forge-picker']);

  it('emits a Vue `<template #name>` block on the template path (and drops the `slot` attribute)', () => {
    const vue = compileComponentModule(SLOT_PASS_TEMPLATE, {
      framework: 'vue',
      componentName: 'ForgePicker',
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
      componentName: 'ForgePicker',
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
      componentName: 'ForgePicker',
      componentFolders: folders,
    });
    // `<button slot="trigger"/>` becomes `<ForgeDropdown trigger={<button/>}>`.
    expect(react.code).toMatch(/trigger=\{<button/);
    expect(react.code).not.toContain('slot="trigger"');
  });
});

describe('the React emitter', () => {
  const react = compileComponentModule(BADGE, { framework: 'react', componentName: 'ForgeBadge' });

  it('emits a `.tsx` module', () => {
    expect(react.lang).toBe('tsx');
  });

  it('rewrites the neutral value import to React (h → createElement) and converts the render/props types', () => {
    expect(react.code).toContain('import { createElement as h } from "react"');
    // `MpElement` has a first-class React equivalent (`ReactElement`), so it is
    // imported from `react` and renamed.
    expect(react.code).toMatch(/import type \{[^}]*\bReactElement\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import type \{[^}]*\bMpElement\b[^}]*\} from ["']@mission-platform\/jsx["']/);
    // The compiled component reads as a genuine React component: `() => ReactElement`.
    expect(react.code).toContain('): ReactElement {');
    // The neutral package must no longer provide any *value* binding.
    expect(react.code).not.toMatch(/import \{[^}]*\bh\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('aliases `class` to `className` in JSX', () => {
    expect(react.code).toContain('className={className}');
  });

  it('aliases SVG attributes to React DOM property names', () => {
    const source = BADGE.replace(
      '<span class={className}>',
      '<svg stroke-linecap="round" stroke-linejoin="round" stroke-width={2}>',
    ).replace('</span>', '</svg>');
    const icon = compileComponentModule(source, { framework: 'react', componentName: 'ForgeBadge' });

    expect(icon.code).toContain('strokeLinecap="round"');
    expect(icon.code).toContain('strokeLinejoin="round"');
    expect(icon.code).toContain('strokeWidth={2}');
    expect(icon.code).not.toMatch(/stroke-(?:linecap|linejoin|width)=/);
  });

  it('aliases `tabindex` to `tabIndex` in JSX', () => {
    const source = BADGE.replace('<span class={className}>', '<span class={className} tabindex={0}>');
    const badge = compileComponentModule(source, { framework: 'react', componentName: 'ForgeBadge' });

    expect(badge.code).toContain('tabIndex={0}');
    expect(badge.code).not.toContain('tabindex=');
  });

  it('never emits a default `import React from "react"` — only the named bindings it needs', () => {
    // React 17+'s automatic JSX runtime makes the historical `import React from
    // 'react'` unnecessary; the emitter must only import what the module uses
    // (`createElement`, `Fragment`, hooks, …) as named bindings from `react`.
    expect(react.code).not.toMatch(/^\s*import\s+React\b/m);
    expect(react.code).not.toMatch(/import\s+React\s*,?\s*(\{[^}]*\})?\s*from\s+["']react["']/);
  });
});

describe('the React emitter imports hooks as named bindings from `react` (never a default `React`)', () => {
  const react = compileComponentModule(IN_VIEW, { framework: 'react', componentName: 'ForgeInView' });

  it('marks hook-based output as a client component', () => {
    expect(react.code.startsWith('"use client";')).toBe(true);
  });

  it('imports the used hooks by name from `react`', () => {
    // The neutral hooks (`useEffect`, `useRef`, `useState`) are React's own, so
    // they are imported by name from `react` alongside `createElement as h` —
    // exactly what the module needs, nothing more.
    expect(react.code).toContain('import { createElement as h, useEffect, useRef, useState } from "react"');
  });

  it('never emits a default `import React from "react"`', () => {
    expect(react.code).not.toMatch(/^\s*import\s+React\b/m);
    expect(react.code).not.toMatch(/import\s+React\s*,?\s*(\{[^}]*\})?\s*from\s+["']react["']/);
  });
});

describe('the React emitter creates RSC boundaries', () => {
  it('keeps presentational components server-compatible', () => {
    const react = compileComponentModule(BADGE, { framework: 'react', componentName: 'ForgeBadge' });

    expect(react.code).not.toContain('"use client";');
  });

  it('marks event-handler output as a client component', () => {
    const source = BADGE.replace('<span class={className}>', '<span class={className} onClick={() => undefined}>');
    const react = compileComponentModule(source, { framework: 'react', componentName: 'ForgeBadge' });

    expect(react.code.startsWith('"use client";')).toBe(true);
  });

  it('preserves a single author-supplied client directive', () => {
    const react = compileComponentModule(`'use client';\n${IN_VIEW}`, {
      framework: 'react',
      componentName: 'ForgeInView',
    });

    expect(react.code.match(/["']use client["'];/g)).toHaveLength(1);
  });

  it('preserves a use server directive without adding use client', () => {
    const react = compileComponentModule(`'use server';\n${BADGE}`, {
      framework: 'react',
      componentName: 'ForgeBadge',
    });

    expect(react.code).toMatch(/['"]use server['"];/);
    expect(react.code).not.toContain('"use client";');
  });

  it('detects interactive event handlers in JSX props and marks as client component', () => {
    const source = BADGE.replace('<span class={className}>', '<span class={className} onChange={() => undefined}>');
    const react = compileComponentModule(source, { framework: 'react', componentName: 'ForgeBadge' });

    expect(react.code.startsWith('"use client";')).toBe(true);
  });

  it('carries framework-split re-exports through as bare specifiers', () => {
    const source = `${BADGE}\nexport { ForgeDrawer } from '@mission-platform/components';`;
    const react = compileComponentModule(source, { framework: 'react', componentName: 'ForgeBadge' });

    expect(react.code).toMatch(/export \{ ForgeDrawer \} from ["']@mission-platform\/components["'];/);
    expect(react.code).not.toMatch(/@mission-platform\/components\/(vue|react|solid|svelte|web-components)/);
  });
});

// A component that declares exactly the properties it accepts, one of them a
// scoped-slot render-prop (`MpRenderProperty<Scope>`) — the one render primitive
// that has no single first-class framework equivalent and is instead redirected
// to each build's co-located `./mp-jsx-types` variants module.
const RENDER_PROPS_PANEL = [
  "import { h, type MpElement, type MpRenderProperty, Slot } from '@mission-platform/forge';",
  '',
  'export interface PanelScope {',
  '  index: number;',
  '}',
  '',
  'export interface PanelProperties {',
  '  items: string[];',
  '  item?: MpRenderProperty<PanelScope>;',
  '}',
  '',
  'export function ForgePanel(properties: PanelProperties): MpElement {',
  '  return (',
  '    <ul class="panel">',
  '      {properties.items.map((entry, index) => (',
  '        <li key={index}><Slot name="item" index={index}>{entry}</Slot></li>',
  '      ))}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

describe('the render primitive `MpRenderProperty` is converted to a framework variant', () => {
  const react = compileComponentModule(RENDER_PROPS_PANEL, { framework: 'react', componentName: 'ForgePanel' });
  const vue = compileComponentModule(RENDER_PROPS_PANEL, { framework: 'vue', componentName: 'ForgePanel' });

  it('imports the render-prop type from the co-located `./mp-jsx-types` on React, never the neutral package', () => {
    expect(react.code).toMatch(/import type \{[^}]*\bMpRenderProperty\b[^}]*\} from ["']\.\/mp-jsx-types["']/);
    // The prop annotation still reads with the same name…
    expect(react.code).toContain('MpRenderProperty<PanelScope>');
    // …but no render type import points at the neutral package.
    expect(react.code).not.toMatch(
      /import type \{[^}]*\bMpRenderProperty\b[^}]*\} from ["']@mission-platform\/jsx["']/,
    );
  });

  it('imports the render-prop type from the co-located `./mp-jsx-types` on Vue, never the neutral package', () => {
    expect(vue.code).toMatch(/import type \{[^}]*\bMpRenderProperty\b[^}]*\} from ["']\.\/mp-jsx-types["']/);
    expect(vue.code).not.toMatch(/import type \{[^}]*\bMpRenderProperty\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });
});

describe('the local JSX types module source (`localJsxTypesModuleSource`)', () => {
  it('defines the React variants over `ReactNode`, imported from `react`', () => {
    const source = localJsxTypesModuleSource('react');
    expect(source).toContain("import type { ReactNode } from 'react';");
    expect(source).toContain('export type MpRenderProperty<S = Record<string, unknown>> = (scope: S) => ReactNode;');
    // The variants are self-contained — no *import* from the neutral package.
    expect(source).not.toMatch(/from ['"]@mission-platform\/jsx['"]/);
  });

  it('defines the Vue variants over `VNodeChild`/`VNode`, imported from `vue`', () => {
    const source = localJsxTypesModuleSource('vue');
    expect(source).toContain("import type { VNode, VNodeChild } from 'vue';");
    expect(source).toContain('export type MpRenderProperty<S = Record<string, unknown>> = (scope: S) => VNodeChild;');
    // The neutral element primitives are re-declared over the Vue-native types so
    // the compiled bodies' `MpChild`/`MpElement` annotations accept Vue JSX.
    expect(source).toContain('export type MpChild = VNodeChild;');
    expect(source).toContain('export type MpElement = VNode;');
    // The variants are self-contained — no *import* from the neutral package.
    expect(source).not.toMatch(/from ['"]@mission-platform\/jsx['"]/);
    expect(source).not.toContain('ReactNode');
  });

  it('binds the Svelte variants to `unknown` rather than `any`', () => {
    const source = localJsxTypesModuleSource('svelte');
    expect(source).toContain('export type MpElement = unknown;');
    expect(source).toContain('export type MpChild = unknown;');
    // A Svelte render prop is a native `Snippet`, so a `{@render prop?.(scope)}`
    // invocation of the compiled render-prop call typechecks.
    expect(source).toContain("import type { Snippet } from 'svelte';");
    expect(source).toContain('export type MpRenderProperty<S = Record<string, unknown>> = Snippet<[S]>;');
  });

  it('binds the Web-Components variants to the native template result types', () => {
    const source = localJsxTypesModuleSource('web-components');
    expect(source).toContain(
      "import type { HtmlContentResult, TemplateResult } from '@mission-platform/forge/web-components';",
    );
    expect(source).toContain('export type MpElement = TemplateResult | HtmlContentResult;');
    expect(source).toContain('export type MpChild = MpElement | string | number | boolean | null | undefined;');
  });

  it.each(['react', 'vue', 'solid', 'svelte', 'web-components'] as const)(
    'never declares an `any`-typed primitive for %s',
    (framework) => {
      // The generated module is part of every consumer's typecheck surface, so
      // an `any` here would silently disable checking across all compiled
      // components (see the repository TypeScript guidelines).
      expect(localJsxTypesModuleSource(framework)).not.toMatch(/\bany\b/u);
    },
  );

  it.each(['react', 'vue', 'solid', 'svelte', 'web-components'] as const)(
    'matches the shared plugin-API generator for %s',
    (framework) => {
      // `vite-plugins/forge/src/compiler/ast.ts` is a superset copy of the
      // plugin-API compiler helpers. The copies drifted once already and the
      // pipeline uses this one, so pin them together.
      expect(localJsxTypesModuleSource(framework)).toBe(sharedLocalJsxTypesModuleSource(framework));
    },
  );
});

describe('the local effect helper module source (`localEffectModuleSource`)', () => {
  it('generates a Vue-only `mpEffect` built on native `watch`/lifecycle', () => {
    const source = localEffectModuleSource('vue');
    // Exports the generalised watcher with the `(effect, deps?)` signature.
    expect(source).toContain("import { onMounted, onUnmounted, onUpdated, watch } from 'vue';");
    expect(source).toContain('export function mpEffect(');
    expect(source).toContain('effect: () => void | (() => void),');
    expect(source).toContain('deps?: () => readonly unknown[],');
    // Mount → run once; deps → `watch`; no deps → `onUpdated`; cleanup on re-run
    // and unmount — the exact semantics the inlined block used to emit per effect.
    expect(source).toContain('onMounted(run);');
    expect(source).toContain('watch(deps, run);');
    expect(source).toContain('onUpdated(run);');
    expect(source).toContain('onUnmounted(() => cleanup?.());');
    // It is a generalised Vue-native watcher: nothing is imported from `react`
    // (the docblock may still reference React's `useEffect` as the conceptual mirror).
    expect(source).not.toMatch(/from ['"]react['"]/);
  });

  it('is Vue-only: React gets an empty source (the writer skips it)', () => {
    // React keeps emitting `useEffect(…)` verbatim, so no helper is generated.
    expect(localEffectModuleSource('react')).toBe('');
  });
});

describe('the `className` attribute', () => {
  const react = compileComponentModule(CLASS_NAMES, { framework: 'react', componentName: 'ForgeChip' });
  const vue = compileComponentModule(CLASS_NAMES, { framework: 'vue', componentName: 'ForgeChip' });

  it('collapses the React array form to a `className={classNames(…)}` string call', () => {
    expect(react.code).toContain(
      "className={classNames('chip', `chip--${tone}`, { 'chip--active': properties.active ?? false })}",
    );
    // The attribute value itself is never emitted as a literal array.
    expect(react.code).not.toMatch(/className=\{\[/);
  });

  it('re-injects the neutral `classNames` runtime import on React (the author never imports it)', () => {
    expect(react.code).toContain('import { classNames } from "@mission-platform/forge"');
  });

  it('passes a non-array React value straight through as `className`', () => {
    expect(react.code).toContain('className={tone}');
  });

  it('maps the attribute onto Vue’s native `class` binding (which understands arrays/objects)', () => {
    expect(vue.code).toContain(":class=\"['chip', `chip--${tone}`, { 'chip--active': properties.active ?? false }]\"");
    expect(vue.code).toContain(':class="tone"');
    // Vue needs no runtime helper for the attribute.
    expect(vue.code).not.toContain('classNames');
  });

  it('maps the literal-array attribute onto Svelte’s native `class` (clsx) binding', () => {
    const svelte = compileComponentModule(CLASS_NAMES, { framework: 'svelte', componentName: 'ForgeChip' });
    // Svelte 5's `class` attribute resolves through `clsx`, so the neutral
    // array/object form passes straight through (like Vue) — no runtime helper.
    expect(svelte.code).toContain("class={['chip', `chip--${tone}`, { 'chip--active': active ?? false }]}");
    expect(svelte.code).toContain('class={tone}');
  });

  it('unwraps an inline `classNames(…)` call into a native Svelte clsx `class` array', () => {
    const svelte = compileComponentModule(INLINE_CLASS_NAMES, { framework: 'svelte', componentName: 'ForgeTag' });
    // The `classNames(a, b, { c })` helper call becomes a Svelte class array so
    // the framework's built-in `clsx` resolves it, matching the Vue `:class`
    // idiom — the wrapping `classNames(` call must not survive in the markup.
    expect(svelte.code).toContain("class={['tag', `tag--${tone}`, { 'tag--active': active ?? false }]}");
    expect(svelte.code).not.toContain('class={classNames(');
  });
});

describe('the Vue emitter', () => {
  const vue = compileComponentModule(BADGE, { framework: 'vue', componentName: 'ForgeBadge' });

  it('emits a `.vue` SFC using `<script setup>` (no `defineComponent`)', () => {
    expect(vue.lang).toBe('vue');
    // A native-`<template>` component keeps no JSX in its `<script>` (only
    // reactive declarations), so the block is plain TypeScript (`lang="ts"`).
    expect(vue.code).toContain('<script setup lang="ts">');
    expect(vue.code).not.toContain('<script setup lang="tsx">');
    expect(vue.code).toContain("defineOptions({ name: 'ForgeBadge', inheritAttrs: false });");
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
  const vue = compileComponentModule(IMAGE, { framework: 'vue', componentName: 'ForgeImage' });

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
  const vue = compileComponentModule(IN_VIEW, { framework: 'vue', componentName: 'ForgeInView' });

  it('turns useState into a `ref` and reads through `.value`', () => {
    expect(vue.code).toContain('const inView = ref(false)');
    expect(vue.code).toContain('inView.value = true');
    expect(vue.code).toContain('wrapperReference.value');
  });

  it('declares the element-bound `useRef` as a `useTemplateRef<Element>(…)` template ref', () => {
    // `wrapperReference` is bound to the (dynamic) root element via `ref=`, so it
    // is a template ref: a string-keyed `useTemplateRef` (its `| null` stripped),
    // matched by the `ref="wrapperReference"` binding in the markup.
    expect(vue.code).toContain("const wrapperReference = useTemplateRef<HTMLElement>('wrapperReference');");
    expect(vue.code).toContain('ref="wrapperReference"');
    expect(vue.code).not.toContain('const wrapperReference = ref<HTMLElement | null>(null)');
  });

  it('routes useEffect through the generated `mpEffect` helper with a deps factory', () => {
    // The per-effect `onMounted`/`watch`/`onUnmounted` lifecycle block is now
    // centralised in the generated Vue-only `./mp-effect` helper; each effect
    // collapses to a single `mpEffect(callback, () => [deps])` call.
    expect(vue.code).toContain("import { mpEffect } from './mp-effect';");
    expect(vue.code).toContain('mpEffect(');
    expect(vue.code).toContain('}, () => [properties.threshold, properties.once]);');
    // The inlined lifecycle wiring no longer appears in the component.
    expect(vue.code).not.toContain('onMounted(__effect0)');
    expect(vue.code).not.toContain('__cleanup0');
  });

  it('moves destructured prop defaults into a `withDefaults` type-based props declaration', () => {
    // The macro is type-based (`defineProps<{ … }>()`), so each prop keeps its
    // declared type and the destructuring defaults move into `withDefaults`.
    expect(vue.code).toContain('withDefaults(defineProps<{');
    expect(vue.code).toContain('threshold?: number;');
    expect(vue.code).toContain('threshold: 0.15');
    expect(vue.code).toContain('tag: "div"');
    expect(vue.code).toContain('once: true');
    // A prop without a destructuring default gets no `withDefaults` entry.
    expect(vue.code).not.toContain('onEnter: {}');
  });

  it('rewrites prop reads to reactive `properties.<name>` (script) and bare names (template)', () => {
    expect(vue.code).toContain(':is="tag"');
    // A non-event prop stays a reactive `properties.<name>` read.
    expect(vue.code).toContain('properties.threshold');
  });

  it('declares the `on<Event>` prop as an emit and rewrites its call to `emit(...)`', () => {
    // `onEnter?: () => void` is a component **event**, not a prop: it is declared
    // with a typed `defineEmits` (empty payload tuple) and its call becomes
    // `emit('enter')`, so it is dropped from the runtime `defineProps`.
    expect(vue.code).toContain('const emit = defineEmits<{');
    expect(vue.code).toContain('enter: [];');
    expect(vue.code).toContain('emit("enter")');
    expect(vue.code).not.toContain('properties.onEnter');
    // The event is not a runtime prop (the `defineProps` type literal omits it).
    expect(vue.code).not.toMatch(/defineProps<\{[^}]*\bonEnter\b/s);
    // The carried-over props interface is pruned to match `defineProps`, so the
    // event no longer appears there either (`onEnter?: () => void;` is dropped).
    expect(vue.code).not.toContain('onEnter');
  });
});

// A component whose input props are marked `@model <onEvent>`: each fuses with
// its paired change event into a single `defineModel` two-way binding. It mixes
// the canonical `modelValue` (→ Vue's default, nameless model), a named scalar
// model (`geodesic`), and an **unpaired** event (`onSelect`, which stays a plain
// `defineEmits` emit). Model reads/writes live in the setup body (effects) so
// the reference rewriter — not the template printer — exercises the mapping.
const MODEL_EDITOR = [
  "import { h, type MpElement, useEffect } from '@mission-platform/forge';",
  '',
  'export interface EditorProperties {',
  '  /**',
  '   * Committed values.',
  '   * @model onValueChange',
  '   */',
  '  modelValue?: string[];',
  '  /**',
  '   * Whether transforms are geodesic.',
  '   * @model onGeodesicChange',
  '   */',
  '  geodesic?: boolean;',
  '  /** Fired when a row is selected. */',
  '  onSelect?: (id: string | null) => void;',
  '}',
  '',
  'export function ForgeEditor(properties: EditorProperties): MpElement {',
  '  const { modelValue = [], geodesic = true, onSelect } = properties;',
  '  useEffect(() => {',
  "    properties.onValueChange?.([...modelValue, 'next']);",
  '  }, [modelValue]);',
  '  useEffect(() => {',
  '    properties.onGeodesicChange?.(!geodesic);',
  '  }, [geodesic]);',
  '  useEffect(() => {',
  '    onSelect?.(null);',
  '  }, []);',
  "  return <div class='editor' />;",
  '}',
].join('\n');

describe('the Vue emitter fuses a `@model`-tagged prop and its change event into `defineModel`', () => {
  const vue = compileComponentModule(MODEL_EDITOR, { framework: 'vue', componentName: 'ForgeEditor' });

  it('declares the canonical `modelValue` as Vue’s default (nameless) `defineModel`, with its default as a factory', () => {
    // `modelValue` maps to the nameless default model; its array destructuring
    // default moves onto the `{ default }` option, wrapped as a factory.
    expect(vue.code).toContain('const modelValue = defineModel<string[]>({ default: () => ([]) });');
  });

  it("declares a named prop as `defineModel('<prop>', …)` carrying its primitive default", () => {
    expect(vue.code).toContain("const geodesic = defineModel<boolean>('geodesic', { default: true });");
  });

  it('rewrites a model change-event call to a `<local>.value = …` assignment (not an emit)', () => {
    // The paired event drives the two-way ref: its call becomes an assignment and
    // reads of the prop resolve through the ref's `.value`.
    expect(vue.code).toContain("modelValue.value = [...modelValue.value, 'next']");
    expect(vue.code).toContain('geodesic.value = !geodesic.value');
    expect(vue.code).not.toContain('properties.onValueChange');
    expect(vue.code).not.toContain('properties.onGeodesicChange');
  });

  it('keeps an unpaired event as a `defineEmits` emit and drops the model events from it', () => {
    expect(vue.code).toContain('const emit = defineEmits<{');
    expect(vue.code).toContain('select: [id: string | null];');
    expect(vue.code).toContain('emit("select", null)');
    // The paired change events are declared via `defineModel`, not `defineEmits`.
    expect(vue.code).not.toContain('valueChange');
    expect(vue.code).not.toContain('geodesicChange');
  });

  it('drops the model props from `defineProps` and the carried-over interface', () => {
    // `modelValue`/`geodesic` are declared with `defineModel`, so they are neither
    // runtime `defineProps` members nor left on the pruned props interface.
    expect(vue.code).not.toMatch(/defineProps<\{[^}]*\bmodelValue\b/s);
    expect(vue.code).not.toMatch(/defineProps<\{[^}]*\bgeodesic\b/s);
  });
});

// A parent that builds a node array imperatively (`const rows = []; for (…)
// rows.push(<Child/>)`) and forwards a controlled-value callback to a **child
// component**. The imperative build now folds to a native `v-for`, and the
// forwarded `@model` listener binds as `@update:<name>` — a child compiled from a
// `@model`-paired `onUpdate<Name>` prop declares `defineModel('<name>')` and emits
// `update:<name>`, so the camelCase `onUpdateOpen` (which Vue never wires to the
// model, and `vue-tsc` rejects) must not survive.
const MODEL_FORWARD_CLOSURE = [
  "import { h, type MpChild, type MpElement, useState } from '@mission-platform/forge';",
  '',
  'export interface ForwardProperties {',
  '  items: string[];',
  '}',
  '',
  'export function ForgeForward(properties: ForwardProperties): MpElement {',
  '  const [open, setOpen] = useState(false);',
  '  const rows: MpChild[] = [];',
  '  for (const item of properties.items.filter((entry) => entry !== "")) {',
  '    rows.push(<ForgeChild key={item} open={open} onUpdateOpen={(next: boolean) => setOpen(next)}>{item}</ForgeChild>);',
  '  }',
  '  return <div class="forward">{rows}</div>;',
  '}',
].join('\n');

describe('the Vue emitter folds an imperative node-array build to a native `v-for` and binds `@update:<name>`', () => {
  const vue = compileComponentModule(MODEL_FORWARD_CLOSURE, { framework: 'vue', componentName: 'ForgeForward' });

  it('templates the `const rows = []; for (…) rows.push(<Child/>)` build natively (no render closure)', () => {
    expect(vue.code).toContain('<template>');
    expect(vue.code).not.toContain('const render = () =>');
    // The for-of push build becomes a `v-for` of the child component.
    expect(vue.code).toMatch(/<ForgeChild v-for="item in /);
  });

  it('rewrites the child `onUpdateOpen` listener to the namespaced `@update:open`', () => {
    // Vue's `v-model` update event for a model named `open` is `update:open`, whose
    // listener is `@update:open` — the camelCase `onUpdateOpen` is unknown.
    expect(vue.code).toContain('@update:open=');
    expect(vue.code).not.toContain('onUpdateOpen');
  });
});

// A single-element parent (the `<template>` path) that forwards a controlled-value
// callback to a child component — exercising the template emitter's listener
// rewrite (`@update:<name>`) rather than the render-closure JSX path above.
const MODEL_FORWARD_TEMPLATE = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface WrapProperties {',
  '  value?: string;',
  '  onChange?: (value: string) => void;',
  '}',
  '',
  'export function ForgeWrap(properties: WrapProperties): MpElement {',
  '  const handleUpdate = (value: string): void => {',
  '    properties.onChange?.(value);',
  '  };',
  '  return <ForgeChild modelValue={properties.value} onUpdateModelValue={handleUpdate} />;',
  '}',
].join('\n');

describe('the Vue emitter binds a forwarded `@model` listener as `@update:<name>` (template path)', () => {
  const vue = compileComponentModule(MODEL_FORWARD_TEMPLATE, { framework: 'vue', componentName: 'ForgeWrap' });

  it('takes the `<template>` path', () => {
    expect(vue.code).toContain('<template>');
    expect(vue.code).not.toContain('const render = () =>');
  });

  it('rewrites the child `onUpdateModelValue` listener to `@update:modelValue`', () => {
    expect(vue.code).toContain('@update:modelValue="handleUpdate"');
    expect(vue.code).not.toContain('@updateModelValue');
  });
});

// A single-element component (the `<template>` path) whose `useRef` is bound to
// a DOM node via `ref={boxReference}` — a genuine **template ref**.
const TEMPLATE_REF = [
  "import { h, type MpElement, useEffect, useRef } from '@mission-platform/forge';",
  '',
  'export interface PanelProperties {',
  '  label?: string;',
  '}',
  '',
  'export function ForgePanel(properties: PanelProperties): MpElement {',
  '  const boxReference = useRef<HTMLDivElement | null>(null);',
  '  useEffect(() => {',
  '    boxReference.current?.focus();',
  '  }, []);',
  '  return <div ref={boxReference} class="panel">{properties.label}</div>;',
  '}',
].join('\n');

describe('the Vue emitter declares a `<template>`-bound ref with `useTemplateRef`', () => {
  const vue = compileComponentModule(TEMPLATE_REF, { framework: 'vue', componentName: 'ForgePanel' });

  it('takes the `<template>` path with a string `ref="…"` binding', () => {
    expect(vue.code).toContain('<template>');
    expect(vue.code).toContain('ref="boxReference"');
    expect(vue.code).not.toContain('const render = () =>');
  });

  it('declares the template ref with `useTemplateRef<Element>(…)` instead of `ref<Element | null>(null)`', () => {
    // The `useRef<HTMLDivElement | null>(null)` becomes a string-keyed template
    // ref; the `| null` is stripped from the element type (Vue's template ref is
    // always nullable until mounted).
    expect(vue.code).toContain("const boxReference = useTemplateRef<HTMLDivElement>('boxReference');");
    expect(vue.code).not.toContain('const boxReference = ref<HTMLDivElement | null>(null)');
    // `.current` reads still lower to `.value` (a template ref is a `Ref`).
    expect(vue.code).toContain('boxReference.value?.focus()');
  });

  it('imports `useTemplateRef` from `vue` and no longer imports the now-unused `ref`', () => {
    expect(vue.code).toMatch(/import \{[^}]*\buseTemplateRef\b[^}]*\} from 'vue';/);
    expect(vue.code).not.toMatch(/import \{[^}]*\bref\b[^}]*\} from 'vue';/);
  });
});

// A single-element component (the `<template>` path) whose click handler is a
// **conditional expression** selecting one of two methods (`cond ? a : b`) — the
// neutral form React uses directly as the listener. Vue would compile a bare
// `@click="cond ? a : b"` as an *inline statement* (evaluated, never invoked), so
// the emitter must wrap it so the resolved handler is actually called.
const CONDITIONAL_HANDLER = [
  "import { h, type MpElement, useState } from '@mission-platform/forge';",
  '',
  'export interface ToggleProperties {',
  '  onStart?: () => void;',
  '  onStop?: () => void;',
  '}',
  '',
  'export function ForgeToggle(properties: ToggleProperties): MpElement {',
  '  const { onStart, onStop } = properties;',
  '  const [active, setActive] = useState(false);',
  '  const start = (): void => { setActive(true); onStart?.(); };',
  '  const stop = (): void => { setActive(false); onStop?.(); };',
  '  return <button type="button" onClick={active ? stop : start}>{active ? "Stop" : "Start"}</button>;',
  '}',
].join('\n');

describe('the Vue emitter invokes a conditional (non-method-reference) event handler', () => {
  const vue = compileComponentModule(CONDITIONAL_HANDLER, { framework: 'vue', componentName: 'ForgeToggle' });

  it('takes the `<template>` path', () => {
    expect(vue.code).toContain('<template>');
    expect(vue.code).not.toContain('const render = () =>');
  });

  it('wraps the conditional handler so the resolved function is actually called', () => {
    // A bare `@click="active ? stop : start"` is a Vue *inline statement*: it
    // would only evaluate the ternary (yielding a function) and never call it.
    // The emitter wraps it so the selected handler is invoked with the event,
    // casting the callee so the arg forwarding type-checks for any arity.
    expect(vue.code).toContain(
      '@click="(...args: unknown[]) => ((active ? stop : start) as ((...a: unknown[]) => unknown) | undefined)?.(...args)"',
    );
    expect(vue.code).not.toContain('@click="active ? stop : start"');
  });
});

// A component forced onto the render-closure fallback (an imperative `.map()`
// callback) whose root element still carries a `ref={rootReference}` — an
// **object** ref binding inside the render closure's JSX, not a string template ref.
const RENDER_CLOSURE_REF = [
  "import { h, type MpElement, useRef } from '@mission-platform/forge';",
  '',
  'export interface GalleryProperties {',
  '  items: string[];',
  '}',
  '',
  'export function ForgeGallery(properties: GalleryProperties): MpElement {',
  '  const rootReference = useRef<HTMLElement | null>(null);',
  '  const { items } = properties;',
  '  return (',
  '    <div ref={rootReference} class="gallery">',
  '      {items.map((item, index) => {',
  '        if (item === "") { return undefined; }',
  '        const cell = <em class="gallery__cell">{item}</em>;',
  '        return <span key={index} class="gallery__row">{cell}</span>;',
  '      })}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter keeps a render-closure (object) ref as a plain `ref(null)`', () => {
  const vue = compileComponentModule(RENDER_CLOSURE_REF, { framework: 'vue', componentName: 'ForgeGallery' });

  it('takes the render-closure fallback', () => {
    expect(vue.code).toContain('const render = () => {');
  });

  it('keeps `<script setup lang="tsx">` because the render closure still contains JSX', () => {
    // The fallback `render` arrow returns JSX (`<em>`/`<span>`), so the script
    // needs the JSX-enabled language (`tsx`), unlike a native-`<template>`
    // component whose script is plain TypeScript (`ts`).
    expect(vue.code).toContain('<script setup lang="tsx">');
    expect(vue.code).not.toContain('<script setup lang="ts">');
  });

  it('leaves the object-bound ref as `shallowRef<Element | null>(null)` (never `useTemplateRef`)', () => {
    // Inside the render closure the ref is bound as an object (`ref={rootReference}`
    // in JSX), the idiomatic Vue object-ref form, so it stays a plain
    // `shallowRef(…)` (a `useRef` maps to `shallowRef`, never a deep `ref`).
    expect(vue.code).toContain('const rootReference = shallowRef<HTMLElement | null>(null)');
    expect(vue.code).not.toContain('useTemplateRef');
  });
});

// A `ForgeMapDraw`-shaped derivation: a `let x = <default>; if (…) x = …; else if
// (…) x = …` imperative build (a "non-const derived statement" that used to force
// the render-closure fallback) plus a scoped `<Slot>`. The new `liftConditionalConsts`
// pre-pass folds the build into a reactive `computed`, keeping the whole component
// on the native `<template>` path — where the scoped slot renders as a native
// `<slot name="toolbar" :mode="mode">` element (the form the original request asked for).
const CONDITIONAL_LET_SLOT = [
  "import { type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface DrawProperties {',
  '  mode?: string;',
  '}',
  '',
  'export function ForgeDraw(properties: DrawProperties): MpElement {',
  "  const mode = properties.mode ?? 'idle';",
  "  let label: string = 'Idle';",
  "  if (mode === 'draw') {",
  "    label = 'Drawing';",
  "  } else if (mode === 'edit') {",
  "    label = 'Editing';",
  '  }',
  '  return (',
  '    <div class="draw">',
  '      <span class="draw__label">{label}</span>',
  '      <Slot name="toolbar" mode={mode} />',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter widens native-`<template>` coverage for `let`+`if` derivations (Step 3)', () => {
  const vue = compileComponentModule(CONDITIONAL_LET_SLOT, { framework: 'vue', componentName: 'ForgeDraw' });

  it('folds the imperative `let`+`if` build into a reactive `computed` (no render closure)', () => {
    // The `let label = …; if (…) label = …` build is folded to a single
    // `const label = (() => { let __lifted = …; …; return __lifted; })()` and
    // lifted to a `computed`, so the component stays on the native `<template>`.
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).toContain('const label = computed(');
    expect(vue.code).toContain('let __lifted');
    // The imperative reassignment is folded onto the internal accumulator, never
    // left as a top-level `let label` reassignment.
    expect(vue.code).not.toMatch(/\blet label\b/);
  });

  it('renders the scoped slot as a native `<slot name="toolbar" :mode="mode">` element', () => {
    expect(vue.code).toContain('<slot name="toolbar" :mode="mode"');
    // The functional render-closure slot call form must not appear on this path.
    expect(vue.code).not.toContain('slots.toolbar');
    // The folded label renders as a plain interpolation in the native template.
    expect(vue.code).toContain('{{ label }}');
  });
});

// A component that genuinely cannot be expressed as native `<template>` markup:
// a JSX spread attribute (`{...properties.rest}`) has no `<template>` form, so
// `buildVueTemplate` throws `UnsupportedTemplate('JSX spread attribute')` and the
// emitter takes the render-closure fallback — now annotated with the reason.
const SPREAD_FALLBACK = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface SpreadProperties {',
  '  rest?: Record<string, unknown>;',
  '}',
  '',
  'export function ForgeSpread(properties: SpreadProperties): MpElement {',
  '  return <div class="spread" {...properties.rest} />;',
  '}',
].join('\n');

describe('the Vue emitter annotates a render-closure fallback with the reason it could not use a native `<template>` (Step 4)', () => {
  const vue = compileComponentModule(SPREAD_FALLBACK, { framework: 'vue', componentName: 'ForgeSpread' });
  const nativeBadge = compileComponentModule(BADGE, { framework: 'vue', componentName: 'ForgeBadge' });

  it('prepends a comment naming the specific `UnsupportedTemplate` reason', () => {
    expect(vue.code).toContain('const render = () => {');
    expect(vue.code).toContain(
      '<!-- @mission-platform/forge: native <template> unavailable — JSX spread attribute -->',
    );
    // The comment leads the SFC (it travels with the affected component).
    expect(vue.code.trimStart().startsWith('<!-- @mission-platform/forge:')).toBe(true);
  });

  it('emits no such comment for a component that compiles to a native `<template>`', () => {
    expect(nativeBadge.code).not.toContain('const render = () =>');
    expect(nativeBadge.code).not.toContain('native <template> unavailable');
  });
});

const EFFECT_DERIVED = [
  "import { h, type MpChild, type MpElement, useEffect, useState } from '@mission-platform/forge';",
  '',
  'export interface CarouselProperties {',
  '  slides: string[];',
  '  loop?: boolean;',
  '  interval?: number;',
  '}',
  '',
  'export function ForgeCarousel(properties: CarouselProperties): MpElement {',
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
  '  const items: MpChild[] = slides.map((slide, index) => {',
  '    if (slide === "") { return undefined; }',
  '    return <li key={index} class="carousel__item" aria-current={current === index}>{slide}</li>;',
  '  });',
  '  return <ul class="carousel" onClick={() => goTo(current + 1)}>{items}</ul>;',
  '}',
].join('\n');

describe('the Vue emitter hoists derived declarations an effect depends on into `setup`', () => {
  const vue = compileComponentModule(EFFECT_DERIVED, { framework: 'vue', componentName: 'ForgeCarousel' });

  it('takes the render-closure fallback (the `.map()` list)', () => {
    expect(vue.code).toContain('const render = () => {');
    expect(vue.code).toContain('<render v-bind="$attrs" />');
    expect(vue.code).not.toContain('<component :is="render"');
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

  it('rewrites the effect body and deps to the hoisted reactive reads (via the `mpEffect` deps factory)', () => {
    expect(vue.code).toContain('mpEffect(');
    expect(vue.code).toContain('}, () => [slideCount.value, current.value, properties.interval]);');
    expect(vue.code).not.toContain('slideCount <= 1)'); // never the bare (undefined) name
  });

  it('leaves a non-effect derived function (`goTo`) in the render closure', () => {
    expect(vue.code.indexOf('const goTo =')).toBeGreaterThan(vue.code.indexOf('const render = () => {'));
  });
});

const HOOK_INITIALISER_DERIVED = [
  "import { h, type MpElement, useState } from '@mission-platform/forge';",
  '',
  'export interface TimeProperties {',
  '  modelValue?: string;',
  '}',
  '',
  'function parseTime(value: string | undefined): { h: number; m: number } {',
  '  const [h = 0, m = 0] = (value ?? "0:0").split(":").map(Number);',
  '  return { h, m };',
  '}',
  '',
  'export function ForgeTime(properties: TimeProperties): MpElement {',
  '  const { modelValue } = properties;',
  '  const initial = parseTime(modelValue);',
  '  const [localH, setLocalH] = useState<number>(initial.h);',
  '  const [localM, setLocalM] = useState<number>(initial.m);',
  '  return <span class="time">{localH}:{localM}</span>;',
  '}',
].join('\n');

describe('the Vue emitter hoists derived declarations a hook initialiser depends on into `setup`', () => {
  const vue = compileComponentModule(HOOK_INITIALISER_DERIVED, { framework: 'vue', componentName: 'ForgeTime' });

  it('lifts a derived const read by a `useState` initialiser into a `setup` `computed`', () => {
    // `initial` is read by the `useState(initial.h)` initialisers, which are
    // emitted in `setup`; without hoisting it would stay in the render closure
    // and resolve to an undefined name in `setup` ("initial is not defined").
    expect(vue.code).toContain('const initial = computed(() => parseTime(properties.modelValue));');
  });

  it('reads the hoisted reactive value through `.value` in the `ref` initialisers', () => {
    // The explicit `useState<number>` type argument is preserved as `ref<number>(…)`.
    expect(vue.code).toContain('const localH = ref<number>(initial.value.h)');
    expect(vue.code).toContain('const localM = ref<number>(initial.value.m)');
  });

  it('emits the hoisted `initial` before the `ref`s that consume it', () => {
    expect(vue.code.indexOf('const initial =')).toBeLessThan(vue.code.indexOf('const localH = ref<number>('));
  });
});

const TRANSITION_FADE = [
  "import { h, type MpElement, Transition } from '@mission-platform/forge';",
  '',
  'export interface FadeProperties {',
  '  open?: boolean;',
  '}',
  '',
  'export function ForgeFade(properties: FadeProperties): MpElement {',
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
  const react = compileComponentModule(TRANSITION_FADE, { framework: 'react', componentName: 'ForgeFade' });
  const vue = compileComponentModule(TRANSITION_FADE, { framework: 'vue', componentName: 'ForgeFade' });

  it('imports the React `Transition` from the `@mission-platform/forge/react` adapter (not React core or the marker)', () => {
    expect(react.code).toContain('import { Transition } from "@mission-platform/forge/react"');
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
  "import { h, type MpElement, TransitionGroup } from '@mission-platform/forge';",
  '',
  'export interface ListProperties {',
  '  items?: { id: number; label: string }[];',
  '}',
  '',
  'export function ForgeList(properties: ListProperties): MpElement {',
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
  const react = compileComponentModule(TRANSITION_GROUP_LIST, { framework: 'react', componentName: 'ForgeList' });
  const vue = compileComponentModule(TRANSITION_GROUP_LIST, { framework: 'vue', componentName: 'ForgeList' });

  it('imports the React `TransitionGroup` from the `@mission-platform/forge/react` adapter (not React core or the marker)', () => {
    expect(react.code).toContain('import { TransitionGroup } from "@mission-platform/forge/react"');
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
  "import { Dynamic, h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface LinkProperties {',
  '  href?: string;',
  '}',
  '',
  'export function ForgeLink(properties: LinkProperties): MpElement {',
  '  const { href } = properties;',
  "  const tag = href === undefined ? 'button' : 'a';",
  '  return <Dynamic is={tag} class="link" href={href}>go</Dynamic>;',
  '}',
].join('\n');

describe('the emitters translate the `<Dynamic is>` marker to each framework dynamic component', () => {
  const react = compileComponentModule(DYNAMIC_LINK, { framework: 'react', componentName: 'ForgeLink' });
  const vue = compileComponentModule(DYNAMIC_LINK, { framework: 'vue', componentName: 'ForgeLink' });
  const svelte = compileComponentModule(DYNAMIC_LINK, { framework: 'svelte', componentName: 'ForgeLink' });

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

  it('renders `<Dynamic is={tag}>` as `<svelte:element this={tag}>` on Svelte (never a bare `<Dynamic>` component)', () => {
    expect(svelte.lang).toBe('svelte');
    // The dynamic-tag marker becomes Svelte's dynamic element, with the neutral
    // `class` attribute and the `href` binding carried over.
    expect(svelte.code).toContain('<svelte:element this={tag}');
    expect(svelte.code).toContain('class="link"');
    expect(svelte.code).toContain('href={href}');
    // The marker must never leak as an (undefined) `<Dynamic>` component tag.
    expect(svelte.code).not.toContain('<Dynamic');
  });
});

const DYNAMIC_ARIA_SLOT = [
  "import { Dynamic, h, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface ItemProperties {',
  '  href?: string;',
  '  active?: boolean;',
  '}',
  '',
  'export function ForgeItem(properties: ItemProperties): MpElement {',
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
  const react = compileComponentModule(DYNAMIC_ARIA_SLOT, { framework: 'react', componentName: 'ForgeItem' });
  const vue = compileComponentModule(DYNAMIC_ARIA_SLOT, { framework: 'vue', componentName: 'ForgeItem' });

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
  "import { createContext, h, type MpElement, useContext } from '@mission-platform/forge';",
  '',
  "const ThemeContext = createContext('light');",
  '',
  'export interface ThemedProperties {',
  '  label?: string;',
  '}',
  '',
  'export function ForgeThemed(properties: ThemedProperties): MpElement {',
  '  const theme = useContext(ThemeContext);',
  '  return <button class={`btn btn--${theme}`}>{theme}</button>;',
  '}',
].join('\n');

describe('the emitters map the context primitives to each framework provide/inject', () => {
  const react = compileComponentModule(CONTEXT_THEMED, { framework: 'react', componentName: 'ForgeThemed' });
  const vue = compileComponentModule(CONTEXT_THEMED, { framework: 'vue', componentName: 'ForgeThemed' });

  it('imports `createContext`/`useContext` straight from `react` (they are React’s own)', () => {
    expect(react.code).toMatch(/import \{[^}]*\bcreateContext\b[^}]*\} from ["']react["']/);
    expect(react.code).toMatch(/import \{[^}]*\buseContext\b[^}]*\} from ["']react["']/);
    expect(react.code).not.toMatch(/import \{[^}]*\bcreateContext\b[^}]*\} from ["']@mission-platform\/jsx["']/);
  });

  it('imports `createContext`/`useContext` from the `@mission-platform/forge/vue` adapter', () => {
    expect(vue.code).toContain("import { createContext, useContext } from '@mission-platform/forge/vue';");
    expect(vue.code).toContain("const ThemeContext = createContext('light');");
  });

  it('keeps `useContext(...)` a synchronous setup const on Vue (never lifted into a `computed`)', () => {
    expect(vue.code).toContain('const theme = useContext(ThemeContext);');
    expect(vue.code).not.toContain('const theme = computed(');
  });
});

const CUSTOM_HOOK_NULL = [
  "import { type MpElement } from '@mission-platform/forge';",
  '',
  "import { useThing } from './use-thing';",
  "import { useRegister } from './use-register';",
  '',
  'export interface WidgetProperties {',
  '  value: number;',
  '}',
  '',
  'export function ForgeWidget(properties: Readonly<WidgetProperties>): MpElement | null {',
  '  const thing = useThing();',
  '  useRegister(thing, { value: properties.value });',
  '  return null;',
  '}',
].join('\n');

describe('the Vue emitter runs custom composable hooks in `setup` (not the render closure)', () => {
  // A `Base*` component that mirrors the map primitives (`ForgeMapMarker`): it
  // reads a custom composable (`useThing`), calls a bare side-effecting hook
  // (`useRegister`) whose internal `onMounted`/`watch` must register during
  // `setup`, and renders no DOM of its own (`return null`). Left inside the Vue
  // per-render closure those hooks would never run.
  const vue = compileComponentModule(CUSTOM_HOOK_NULL, { framework: 'vue', componentName: 'ForgeWidget' });

  it('emits the `useThing()` declaration as a synchronous `setup` const (never a `computed`)', () => {
    expect(vue.code).toContain('const thing = useThing();');
    expect(vue.code).not.toContain('const thing = computed(');
  });

  it('emits the bare `useRegister(...)` call as a top-level `setup` statement', () => {
    // A top-level statement line (`<script setup>` body === setup) runs once on
    // mount; before the fix the whole body was deferred into a render arrow.
    expect(vue.code).toContain('useRegister(thing, {');
    const registerIndex = vue.code.indexOf('useRegister(thing');
    const renderIndex = vue.code.indexOf('const render = () =>');
    expect(renderIndex === -1 || registerIndex < renderIndex).toBe(true);
  });

  it('rewrites the composable’s object-argument props into getters so they stay reactive', () => {
    // Vue `setup` runs once, so an inline `{ value: properties.value }` would
    // snapshot the prop at construction time and the composable’s internal
    // `watch(() => [.., options.value])` would never re-fire. Emitting a getter
    // re-reads the (reactive) prop on every access — matching React’s
    // re-run-on-render semantics.
    expect(vue.code).toMatch(/useRegister\(thing, \{\s*get value\(\) \{\s*return properties\.value;\s*\},?\s*\}\);/);
    expect(vue.code).not.toContain('useRegister(thing, { value: properties.value });');
  });

  it('does not defer the hooks into a per-render closure', () => {
    const registerIndex = vue.code.indexOf('useRegister(thing');
    const renderIndex = vue.code.indexOf('const render = () =>');
    expect(registerIndex).toBeGreaterThan(-1);
    // Either there is no render closure at all, or the hook precedes it.
    expect(renderIndex === -1 || registerIndex < renderIndex).toBe(true);
  });
});

const TREE = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface TreeNode {',
  '  label: string;',
  '  children?: TreeNode[];',
  '}',
  '',
  'export interface TreeProperties {',
  '  nodes: TreeNode[];',
  '}',
  '',
  'export function ForgeTree(properties: TreeProperties): MpElement {',
  '  const { nodes } = properties;',
  '  return (',
  '    <ul class="tree">',
  '      {nodes.map((node) => {',
  '        const subtree = node.children ? <ForgeTree nodes={node.children} /> : undefined;',
  '        return (',
  '          <li class="tree__node">',
  '            {node.label}',
  '            {subtree}',
  '          </li>',
  '        );',
  '      })}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

describe('the emitters support a recursive (self-referencing) component', () => {
  const react = compileComponentModule(TREE, { framework: 'react', componentName: 'ForgeTree' });
  const vue = compileComponentModule(TREE, { framework: 'vue', componentName: 'ForgeTree' });

  it('keeps the self-reference as a native JSX tag on React', () => {
    expect(react.code).toContain('<ForgeTree nodes={node.children}/>');
  });

  it('renders the self-reference as a native recursive tag (backed by `defineOptions({ name })`)', () => {
    // The `.map()` templatizes to a `v-for`; Vue resolves the `<ForgeTree>` tag to
    // the component itself by its `name`, so no `resolveComponent` shim is needed.
    expect(vue.code).toContain("defineOptions({ name: 'ForgeTree', inheritAttrs: false });");
    expect(vue.code).toContain('<ForgeTree v-if="node.children" :nodes="node.children" />');
    expect(vue.code).not.toContain("resolveComponent('ForgeTree')");
  });
});

// Node-valued derived consts — a single element (`heading`) and a `.map()`
// projection (`list`) — declared before the return. Neither has a Vue
// `<template>` binding form, so both are inlined **structurally** into the
// return tree at their use sites (the projection becoming a native `v-for`),
// keeping the whole component on the `<template>` path (no render closure).
const NODE_CONST_INLINE = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface PanelProperties {',
  '  title: string;',
  '  rows: string[];',
  '}',
  '',
  'export function ForgePanel(properties: PanelProperties): MpElement {',
  '  const { title, rows } = properties;',
  '  const heading = <h2 class="panel__title">{title}</h2>;',
  '  const list = rows.map((row, index) => <li key={index} class="panel__row">{row}</li>);',
  '  return (',
  '    <section class="panel">',
  '      {heading}',
  '      <ul class="panel__list">{list}</ul>',
  '    </section>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter inlines node-valued derived consts into the template', () => {
  const vue = compileComponentModule(NODE_CONST_INLINE, { framework: 'vue', componentName: 'ForgePanel' });

  it('stays on the `<template>` path (no render closure)', () => {
    expect(vue.code).not.toContain('const render = () => {');
    expect(vue.code).toContain('<template>');
  });

  it('inlines a single-element const into the markup at its use site', () => {
    expect(vue.code).toContain('<h2 class="panel__title">');
    expect(vue.code).toContain('{{ title }}');
    // The const is inlined, not lifted to a declaration.
    expect(vue.code).not.toContain('const heading =');
  });

  it('inlines a `.map()`-valued const as a native `v-for`', () => {
    expect(vue.code).toContain('v-for="(row, index) in rows"');
    expect(vue.code).toContain('class="panel__row"');
    expect(vue.code).not.toContain('const list =');
  });
});

const TOGGLE = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ToggleProperties {',
  '  on?: boolean;',
  '}',
  '',
  'export function ForgeToggle(properties: ToggleProperties): MpElement {',
  '  const { on } = properties;',
  '  return (',
  '    <div class="toggle">',
  '      {on ? <span class="toggle__on">On</span> : <span class="toggle__off">Off</span>}',
  '      {on ? <strong class="toggle__badge">!</strong> : undefined}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter lowers JSX ternaries to `v-if` / `v-else`', () => {
  const vue = compileComponentModule(TOGGLE, { framework: 'vue', componentName: 'ForgeToggle' });

  it('renders a `cond ? <a/> : <b/>` ternary as a `v-if` / `v-else` element pair', () => {
    expect(vue.code).toMatch(/<span v-if="on" class="toggle__on">/);
    expect(vue.code).toMatch(/<span v-else class="toggle__off">/);
  });

  it('renders a `cond ? <a/> : undefined` ternary as a lone `v-if` (no `v-else`)', () => {
    // The badge is guarded by `v-if` and has no matching `v-else` sibling: there
    // is exactly one `v-else` in the whole template (from the first ternary).
    expect(vue.code).toMatch(/<strong v-if="on" class="toggle__badge">/);
    expect((vue.code.match(/v-else/g) ?? []).length).toBe(1);
  });

  it('keeps the React target as native JSX ternaries (no `v-if`)', () => {
    const react = compileComponentModule(TOGGLE, { framework: 'react', componentName: 'ForgeToggle' });
    expect(react.code).not.toContain('v-if');
    // Static ternary arms may be Stage-2-hoisted to module-level constants
    // (`on ? __mpHoist_0 : __mpHoist_1`); the conditional itself stays a native
    // JSX ternary either way.
    expect(react.code).toMatch(/\? (?:<span|__mpHoist_\d+)/);
  });
});

// A `.map()`-built list whose callback has a **statement body**: a leading scalar
// `const` (`selected`) before the single returned element. Vue `<template>` has
// no per-item statement scope, so the emitter inlines that const into the printed
// template expressions and still renders the projection as a native `v-for`
// (rather than the render-closure fallback).
const V_FOR_LIST = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface RowsProperties {',
  '  rows: string[];',
  '  active?: string;',
  '}',
  '',
  'export function ForgeRows(properties: RowsProperties): MpElement {',
  '  const { rows, active } = properties;',
  '  return (',
  '    <ul class="rows">',
  '      {rows.map((row, index) => {',
  '        const selected = row === active;',
  '        return <li key={index} class={selected ? "rows__row rows__row--active" : "rows__row"}>{row}</li>;',
  '      })}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

describe("the Vue emitter inlines a `.map()` callback's leading scalar consts into a native `v-for`", () => {
  const vue = compileComponentModule(V_FOR_LIST, { framework: 'vue', componentName: 'ForgeRows' });

  it('renders the projection as a `v-for` element (never the `.map()` render closure)', () => {
    expect(vue.code).toContain('v-for="(row, index) in rows"');
    expect(vue.code).toContain(':key="index"');
    expect(vue.code).not.toContain('const render = () => {');
    expect(vue.code).not.toContain('.map(');
  });

  it("inlines the callback's leading scalar const into the bound template expression", () => {
    // `const selected = row === active;` has no per-item statement scope in a Vue
    // `<template>`, so its reads are inlined as `(row === active)` in the bind.
    expect(vue.code).toContain('(row === active)');
    expect(vue.code).not.toMatch(/\bconst selected\b/);
  });
});

const USE_VUE_WIDGET = [
  '"use vue";',
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface WidgetProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '}',
  '',
  'export function ForgeWidget(properties: WidgetProperties): MpElement {',
  '  return <span class="widget">{properties.children}</span>;',
  '}',
].join('\n');

describe('the compiler reads and applies `"use <framework>";` module directives', () => {
  it('detects the framework a module is pinned to from its directive prologue', () => {
    expect(readFrameworkDirective('a.tsx', '"use vue";\nexport const a = 1;')).toBe('vue');
    expect(readFrameworkDirective('a.tsx', '"use react";\nexport const a = 1;')).toBe('react');
  });

  it('returns undefined for a neutral module or an unrelated prologue directive', () => {
    expect(readFrameworkDirective('a.tsx', 'export const a = 1;')).toBeUndefined();
    expect(readFrameworkDirective('a.tsx', '"use strict";\nexport const a = 1;')).toBeUndefined();
  });

  it('ignores a `"use vue"` string that is not part of the directive prologue', () => {
    expect(readFrameworkDirective('a.tsx', 'const x = 1;\n"use vue";')).toBeUndefined();
  });

  it('gates a module to its framework, while neutral modules target every framework', () => {
    const gated = '"use vue";\nexport const a = 1;';
    expect(moduleTargetsFramework('a.tsx', gated, 'vue')).toBe(true);
    expect(moduleTargetsFramework('a.tsx', gated, 'react')).toBe(false);

    const neutral = 'export const a = 1;';
    expect(moduleTargetsFramework('a.tsx', neutral, 'vue')).toBe(true);
    expect(moduleTargetsFramework('a.tsx', neutral, 'react')).toBe(true);
  });

  it('strips the directive from the compiled output so the marker never leaks', () => {
    const vue = compileComponentModule(USE_VUE_WIDGET, { framework: 'vue', componentName: 'ForgeWidget' });
    expect(vue.code).not.toContain('use vue');
    expect(vue.code).toContain('class="widget"');
  });
});

// Regression fixtures for constructs that surface once node-valued consts are
// inlined. Each must render as native `<template>` markup (or, where it has no
// faithful flat form, take the `<script setup>` render-closure fallback) rather
// than splice JSX/`h()` into a `{{ … }}` interpolation — the malformed output
// that previously broke the components-library build.

// A single-call **render helper**: a callee-only, non-recursive function-valued
// const (`renderItems`) whose body is one expression (`entries.map(…)`), invoked
// exactly once (`renderItems(items, '', false)`). It has no `<template>` binding
// form, but its argument-bound body can be spliced into the call site, so the
// surrounding tree templates natively (the `.map()` becomes a `v-for`).
const RENDER_HELPER = [
  "import { h, type MpElement, Slot } from '@mission-platform/forge';",
  '',
  'export interface MenuNode { label: string; children?: MenuNode[]; }',
  'export interface MenubarProperties { items?: MenuNode[]; }',
  '',
  'export function ForgeMenubar(properties: MenubarProperties): MpElement {',
  '  const { items } = properties;',
  '  const renderItems = (entries: MenuNode[], parentPath: string, nested: boolean): MpElement[] =>',
  '    entries.map((item, index) => {',
  '      const path = parentPath.length === 0 ? `${index}` : `${parentPath}.${index}`;',
  '      return <li key={path} class="menubar__item" data-nested={nested}>{item.label}</li>;',
  '    });',
  '  return (',
  '    <menu class="menubar">',
  "      {items ? renderItems(items, '', false) : undefined}",
  '      <Slot />',
  '    </menu>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter inlines a single-call function-valued node helper', () => {
  const vue = compileComponentModule(RENDER_HELPER, { framework: 'vue', componentName: 'ForgeMenubar' });

  it('splices the helper body into the call site as native `<template>` markup', () => {
    expect(vue.code).not.toContain('const render = () =>');
    // The `renderItems(items, …)` call becomes a guarded `v-for` (the `.map()`),
    // with the helper declaration itself dropped from the script.
    expect(vue.code).toContain('v-for="(item, index) in (items)"');
    expect(vue.code).toContain('<slot />');
    expect(vue.code).not.toContain('const renderItems');
    // The helper call is never spliced into a `{{ … }}` interpolation.
    expect(vue.code).not.toMatch(/\{\{[^}]*renderItems/);
    expect(vue.code).not.toContain('renderItems(');
  });
});

// A function-valued node helper that is **not** callee-only — it is also passed
// as a value (`const alias = renderItems;`) — cannot be inlined at its call sites
// (the surviving value reference would dangle), so it keeps the safe render-closure
// fallback rather than splice a JSX body into an interpolation.
const VALUE_REFERENCED_HELPER = [
  "import { type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ListProperties { items?: string[]; }',
  '',
  'export function ForgeList(properties: ListProperties): MpElement {',
  '  const { items = [] } = properties;',
  '  const renderItems = (entries: string[]): MpElement[] =>',
  '    entries.map((item, index) => <li key={index}>{item}</li>);',
  '  const alias = renderItems;',
  '  return (',
  '    <ul>',
  '      {renderItems(items)}',
  '      {alias(items)}',
  '    </ul>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter keeps the fallback for a helper referenced as a value', () => {
  const vue = compileComponentModule(VALUE_REFERENCED_HELPER, { framework: 'vue', componentName: 'ForgeList' });

  it('emits the render closure rather than inlining a non-callee-only helper', () => {
    expect(vue.code).toContain('const render = () => {');
    expect(vue.code).toContain('<render v-bind="$attrs" />');
    // The helper is never spliced into a `{{ … }}` interpolation.
    expect(vue.code).not.toMatch(/\{\{[^}]*renderItems/);
  });
});

// A conditional whose branches both **build nodes** but are neither elements nor
// the `map`/`nothing` pair the two-arm template path handles: an array literal of
// elements opposite a `.map()` projection. Each arm has no single host for the
// guard, so it is wrapped in a `<template v-if>` / `<template v-else>` block —
// never stringified into an interpolation of the raw JSX.
const ARRAY_OR_MAP_CONDITIONAL = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface TableProperties { rows: string[]; empty?: string; }',
  '',
  'export function ForgeTable(properties: TableProperties): MpElement {',
  '  const { rows, empty = "No rows" } = properties;',
  '  return (',
  '    <tbody>',
  '      {rows.length === 0',
  '        ? [<tr class="row row--empty"><td>{empty}</td></tr>]',
  '        : rows.map((row, index) => <tr key={index} class="row"><td>{row}</td></tr>)}',
  '    </tbody>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter templates a conditional between an element array and a `.map()`', () => {
  const vue = compileComponentModule(ARRAY_OR_MAP_CONDITIONAL, { framework: 'vue', componentName: 'ForgeTable' });

  it('emits a native `v-if` / `v-else` chain rather than a render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    // The array-literal arm is wrapped in a guarded `<template>`; the `.map()`
    // arm becomes a `v-else` `v-for` element.
    expect(vue.code).toContain('<template v-if="rows.length === 0">');
    expect(vue.code).toContain('v-else');
    expect(vue.code).toContain('v-for="(row, index) in rows"');
    // Neither the array branch nor the `.map()` branch leaks into a `{{ … }}`.
    expect(vue.code).not.toMatch(/\{\{[^}]*\.map\(/);
    expect(vue.code).not.toMatch(/\{\{[^}]*<tr/);
  });
});

// A fixed-length list built with `Array.from({ length: n }, (_, index) => <el/>)`
// — a `.map()` equivalent that isn't a `.map()` — becomes a `v-for` over the
// materialised `Array.from({ length: n })`, rather than a raw interpolation.
const ARRAY_FROM_LIST = [
  "import { type MpElement } from '@mission-platform/forge';",
  '',
  'export interface RulerProperties { count?: number; }',
  '',
  'export function ForgeRuler(properties: RulerProperties): MpElement {',
  '  const { count = 0 } = properties;',
  '  return (',
  '    <div class="ruler">',
  '      {Array.from({ length: count }, (_, index) => (',
  '        <span key={index} class="ruler__tick">{index + 1}</span>',
  '      ))}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter templates an `Array.from(length, mapper)` list as a `v-for`', () => {
  const vue = compileComponentModule(ARRAY_FROM_LIST, { framework: 'vue', componentName: 'ForgeRuler' });

  it('loops the materialised array rather than emitting a render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).toContain('v-for="(_, index) in Array.from({ length: count })"');
    expect(vue.code).toContain(':key="index"');
    expect(vue.code).toContain('{{ index + 1 }}');
  });
});

// A chained ternary in child position (`error ? <p/> : hint ? <p/> : null`) —
// the shape shared by every form input — flattens into a sibling
// `v-if` / `v-else-if` chain (with no trailing `v-else` for the `null` arm),
// rather than falling back to a render closure.
const NESTED_CONDITIONAL_CHAIN = [
  "import { type MpElement } from '@mission-platform/forge';",
  '',
  'export interface FieldProperties { error?: string; hint?: string; }',
  '',
  'export function ForgeField(properties: FieldProperties): MpElement {',
  '  const { error, hint } = properties;',
  '  return (',
  '    <div class="field">',
  '      {error ? (',
  '        <p class="field__error">{error}</p>',
  '      ) : hint ? (',
  '        <p class="field__hint">{hint}</p>',
  '      ) : null}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter flattens a chained conditional into `v-if` / `v-else-if`', () => {
  const vue = compileComponentModule(NESTED_CONDITIONAL_CHAIN, { framework: 'vue', componentName: 'ForgeField' });

  it('emits sibling guarded elements with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).toContain('<p v-if="error" class="field__error">');
    expect(vue.code).toContain('<p v-else-if="hint" class="field__hint">');
    // The trailing `null` arm contributes no `v-else`.
    expect(vue.code).not.toContain('v-else>');
    expect(vue.code).not.toMatch(/\{\{[^}]*<p/);
  });
});

// A destructuring const (`const [lo, hi] = …`) is expanded into a synthetic
// source computed plus a per-name computed reading each element off it, so the
// bound names stay usable in the template rather than forcing a fallback.
const DESTRUCTURING_CONST = [
  "import { type MpElement } from '@mission-platform/forge';",
  '',
  'export interface RangeProperties { from: number; to: number; }',
  '',
  'export function ForgeRange(properties: RangeProperties): MpElement {',
  '  const { from, to } = properties;',
  '  const [lo, hi] = from <= to ? [from, to] : [to, from];',
  '  return (',
  '    <p class="range">{lo} to {hi}</p>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter expands a destructuring const into computeds', () => {
  const vue = compileComponentModule(DESTRUCTURING_CONST, { framework: 'vue', componentName: 'ForgeRange' });

  it('lifts a synthetic source plus per-name computeds rather than falling back', () => {
    expect(vue.code).not.toContain('const render = () =>');
    // A synthetic source computed holds the whole expression.
    expect(vue.code).toMatch(/const mpDestructured0 = computed\(\(\) => \(properties\.from <= properties\.to/);
    // Each bound name reads its element off the source.
    expect(vue.code).toContain('const lo = computed(() => (mpDestructured0.value[0]));');
    expect(vue.code).toContain('const hi = computed(() => (mpDestructured0.value[1]));');
    expect(vue.code).toContain('{{ lo }}');
    expect(vue.code).toContain('{{ hi }}');
  });
});

// --- Step 1a: template-path expansions --------------------------------------
// Node-valued consts spread/placed as children of an element / `h()` parent, and
// a `.flatMap()` returning a fixed element array, now render as native
// `<template>` markup rather than falling back to a render closure.

// A `forge-hero`-shaped component: a node-valued `content` const containing a
// nested `...childList` spread of the normalised `properties.children`, plus a
// conditional node const (`eyebrow ? <div/> : undefined`) placed as a child.
// Inlining `content` structurally must emit the nested `...childList` as the
// default `<slot>` and the conditional node const as a `v-if` element.
const HERO_VARIADIC_NODE_CONSTS = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface HeroProperties { children?: MpChild | readonly MpChild[]; title?: string; eyebrow?: string; }',
  '',
  'export function ForgeHero(properties: HeroProperties): MpElement {',
  '  const { title, eyebrow } = properties;',
  '  const children = properties.children;',
  '  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];',
  '  const eyebrowNode = eyebrow ? <p class="hero__eyebrow">{eyebrow}</p> : undefined;',
  "  const content = h('div', { class: 'hero__content' }, eyebrowNode, <h1 class=\"hero__title\">{title}</h1>, ...childList);",
  "  return h('section', { class: 'hero' }, content);",
  '}',
].join('\n');

describe('the Vue emitter renders variadic node-const children as native markup (Step 1a)', () => {
  const vue = compileComponentModule(HERO_VARIADIC_NODE_CONSTS, { framework: 'vue', componentName: 'ForgeHero' });

  it('emits native `<template>` markup with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).toContain('<section class="hero" v-bind="$attrs">');
    expect(vue.code).toContain('<div class="hero__content">');
  });

  it('maps a conditional node const to `v-if` and the nested `...childList` to the default slot', () => {
    expect(vue.code).toContain('v-if="eyebrow"');
    expect(vue.code).toContain('<slot />');
    // No JSX / spread ever leaks into a `{{ … }}` interpolation.
    expect(vue.code).not.toMatch(/\{\{[^}]*<\w/);
    expect(vue.code).not.toContain('...childList');
  });
});

// A `forge-list`-shaped component: a dynamic local `tag` const, a conditional
// node const (`itemNodes`) whose branches are a `.flatMap()` returning a fixed
// element array and a `.map()`, spread as `...itemNodes`, plus the normalised
// children spread `...extraChildren`.
const LIST_FLATMAP_ELEMENT_ARRAY = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ListItem { label?: string; term?: string; content?: string; }',
  'export interface ListProperties { children?: MpChild | readonly MpChild[]; items?: ListItem[]; variant?: string; }',
  '',
  'export function ForgeList(properties: ListProperties): MpElement {',
  "  const { items = [], variant = 'unordered' } = properties;",
  "  const tag = variant === 'description' ? 'dl' : 'ul';",
  '  const itemNodes =',
  "    variant === 'description'",
  '      ? items.flatMap((item) => [',
  '          <dt class="list__term">{item.term}</dt>,',
  '          <dd class="list__detail">{item.content}</dd>,',
  '        ])',
  '      : items.map((item) => <li class="list__item">{item.label}</li>);',
  '  const children = properties.children;',
  '  const extraChildren = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];',
  '  return h(tag, { class: "list" }, ...itemNodes, ...extraChildren);',
  '}',
].join('\n');

describe('the Vue emitter renders a flatMap element array + map conditional as `v-for` (Step 1a)', () => {
  const vue = compileComponentModule(LIST_FLATMAP_ELEMENT_ARRAY, { framework: 'vue', componentName: 'ForgeList' });

  it('emits native `<template>` markup with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    // The dynamic local tag const becomes `<component :is="tag">`.
    expect(vue.code).toContain(':is="tag"');
  });

  it('renders the flatMap element array under a shared `<template v-for>` and the map as `v-for`', () => {
    // The flatMap's two-element rows loop under a `<template v-for>` whose `:key`
    // sits on the `<template>` itself (Vue rejects a key on a looped child); the
    // callback declares only `item`, so an index alias is synthesised for the key.
    expect(vue.code).toContain('<template v-for="(item, __index) in items" :key="__index">');
    expect(vue.code).toContain('<dt class="list__term">');
    expect(vue.code).toContain('<dd class="list__detail">');
    expect(vue.code).toContain('<li v-for="item in items" class="list__item">');
    // The conditional between the two node arrays is split into `v-if`/`v-else`.
    expect(vue.code).toContain(`v-if="variant === 'description'"`);
    expect(vue.code).toContain('v-else');
    // The normalised children spread becomes the default slot; nothing leaks.
    expect(vue.code).toContain('<slot />');
    expect(vue.code).not.toContain('...itemNodes');
    expect(vue.code).not.toMatch(/\{\{[^}]*\.map\(/);
  });
});

// --- Step 1b: dynamic-tag children & imperative style-object computeds -------

// A dynamic-tag component with children: `h(properties.as, props, …children)`
// (dynamic first argument) renders via `<component :is="as">` wrapping the
// converted child markup.
const DYNAMIC_TAG_WITH_CHILDREN = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface BoxProperties { as?: string; label?: string; }',
  '',
  'export function ForgeBox(properties: BoxProperties): MpElement {',
  "  const { as = 'div', label } = properties;",
  '  return h(as, { class: \'box\' }, <span class="box__label">{label}</span>);',
  '}',
].join('\n');

describe('the Vue emitter renders a dynamic-tag component with children via `<component :is>` (Step 1b)', () => {
  const vue = compileComponentModule(DYNAMIC_TAG_WITH_CHILDREN, { framework: 'vue', componentName: 'ForgeBox' });

  it('emits `<component :is="as">` wrapping the child markup with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).toContain(':is="as"');
    expect(vue.code).toContain('<span class="box__label">');
    expect(vue.code).toContain('{{ label }}');
  });
});

// A `forge-skeleton`-shaped component: an imperative style-object build
// (`const style = {}; if (width !== undefined) style.width = width; …`) lifted to
// a reactive `computed` bound via `:style`.
const IMPERATIVE_STYLE_OBJECT = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface SkeletonProperties { width?: string; height?: string; }',
  '',
  'export function ForgeSkeleton(properties: SkeletonProperties): MpElement {',
  '  const { width, height } = properties;',
  '  const style: Record<string, string> = {};',
  '  if (width !== undefined) {',
  '    style.width = width;',
  '  }',
  '  if (height !== undefined) {',
  '    style.height = height;',
  '  }',
  '  return <span class="skeleton" style={style} aria-hidden="true" />;',
  '}',
].join('\n');

describe('the Vue emitter lifts an imperative style-object build to a reactive `:style` computed (Step 1b)', () => {
  const vue = compileComponentModule(IMPERATIVE_STYLE_OBJECT, { framework: 'vue', componentName: 'ForgeSkeleton' });

  it('emits a `computed` style object bound as `:style` with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    expect(vue.code).toContain('const style = computed(() => (');
    // Each mutation becomes a conditional spread into the object.
    expect(vue.code).toContain('properties.width !== undefined ? { width: properties.width } : {}');
    expect(vue.code).toContain('properties.height !== undefined ? { height: properties.height } : {}');
    expect(vue.code).toContain(':style="style"');
    // The mutation `if` statements never survive as raw statements.
    expect(vue.code).not.toContain('style.width = width');
  });
});

// --- Step 2: recursive helper components with lifted state (multi-SFC) -------

// A `forge-menubar`-shaped component: a self-recursive, state-capturing render
// helper (`renderItems`) invoked from the return tree. It has no flat-`<template>`
// form, so the emitter extracts an auxiliary self-recursive component
// (`ForgeMenusItem`) — the captured node helper (`renderIcon`) inlined, the
// captured handlers (`isPathOpen`/`handleItemClick`) lifted to props — and
// rewrites the parent to render it via `v-for`.
const RECURSIVE_MENU = [
  "import { h, type MpElement, Slot, useState } from '@mission-platform/forge';",
  '',
  'export interface MenusNode { label: string; icon?: string; href?: string; children?: MenusNode[]; }',
  'export interface MenusProperties { items?: MenusNode[]; }',
  '',
  'export function ForgeMenus(properties: MenusProperties): MpElement {',
  '  const { items } = properties;',
  "  const [openPath, setOpenPath] = useState('');",
  '  const isPathOpen = (path: string): boolean => openPath === path || openPath.startsWith(`${path}.`);',
  '  const handleItemClick = (item: MenusNode, path: string): void => {',
  '    if (item.children && item.children.length > 0) {',
  '      setOpenPath(isPathOpen(path) ? "" : path);',
  '    }',
  '  };',
  '  const renderIcon = (item: MenusNode): MpElement | undefined =>',
  '    item.icon ? <span class="menus__icon">{item.icon}</span> : undefined;',
  '  const renderItems = (entries: MenusNode[], parentPath: string, nested: boolean): MpElement[] =>',
  '    entries.map((item, index) => {',
  '      const path = parentPath === "" ? `${index}` : `${parentPath}.${index}`;',
  '      const hasChildren = Boolean(item.children && item.children.length > 0);',
  '      const open = hasChildren && isPathOpen(path);',
  '      return (',
  '        <li key={path} class="menus__item" data-nested={nested}>',
  '          <button type="button" onClick={() => handleItemClick(item, path)}>',
  '            {renderIcon(item)}',
  '            <span class="menus__label">{item.label}</span>',
  '          </button>',
  '          {open ? <menu class="menus__submenu">{renderItems(item.children as MenusNode[], path, true)}</menu> : undefined}',
  '        </li>',
  '      );',
  '    });',
  '  return (',
  '    <menu class="menus">',
  "      {items ? renderItems(items, '', false) : undefined}",
  '      <Slot />',
  '    </menu>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter extracts a recursive helper into an auxiliary component (Step 2)', () => {
  const vue = compileComponentModule(RECURSIVE_MENU, { framework: 'vue', componentName: 'ForgeMenus' });
  const aux = (vue.extraModules ?? []).find((module) => module.name === 'forge-menus-item');

  it('emits the parent as native markup with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    // The parent renders the auxiliary component via `v-for`, importing it.
    expect(vue.code).toContain("import ForgeMenusItem from './forge-menus-item.vue';");
    expect(vue.code).toContain('<ForgeMenusItem');
    expect(vue.code).toContain('v-for="(item, index) in (items)"');
    // The captured handlers are forwarded onto the child.
    expect(vue.code).toContain(':isPathOpen="isPathOpen"');
    expect(vue.code).toContain(':handleItemClick="handleItemClick"');
  });

  it('emits an auxiliary module that recurses into itself and lifts captured state to props', () => {
    expect(aux).toBeDefined();
    const code = aux?.code ?? '';
    expect(code).not.toContain('const render = () =>');
    expect(code).toContain("defineOptions({ name: 'ForgeMenusItem'");
    // Per-node data + captured handlers become props.
    expect(code).toContain('item: MenusNode;');
    expect(code).toContain('isPathOpen: (path: string) => boolean;');
    expect(code).toContain('handleItemClick: (item: MenusNode, path: string) => void;');
    // The recursion is a native `v-for` of the component referencing itself.
    expect(code).toContain('<ForgeMenusItem v-for="(child, index) in (item.children as MenusNode[])"');
    // The captured node helper (`renderIcon`) is inlined as a `v-if`, not called.
    expect(code).not.toContain('renderIcon(');
    expect(code).toContain('<span v-if="item.icon"');
    // No JSX leaks into an interpolation.
    expect(code).not.toMatch(/\{\{[^}]*<\w/);
  });
});

// --- Step 3: imperative bodies — early-return split -------------------------

// A `forge-typography`-shaped component: an early-return guard (`if (!truncatePopup)
// return h(tag, …)`) produces two whole render paths. It is split into top-level
// `v-if`/`v-else` roots, and the normalised children rendered a second time in the
// popup (`{childList}`) becomes a second default `<slot />`.
const EARLY_RETURN_BRANCHES = [
  "import { h, type MpChild, type MpElement, useRef, useState } from '@mission-platform/forge';",
  '',
  'export interface TextProperties { children?: MpChild | readonly MpChild[]; as?: string; truncatePopup?: boolean; }',
  '',
  'export function ForgeText(properties: TextProperties): MpElement {',
  "  const { as = 'span', truncatePopup = false } = properties;",
  '  const tag = as;',
  '  const textReference = useRef<HTMLElement | null>(null);',
  '  const [popupVisible, setPopupVisible] = useState(false);',
  '  const children = properties.children;',
  '  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];',
  "  const className = 'text';",
  '  if (!truncatePopup) {',
  '    return h(tag, { class: className }, ...childList);',
  '  }',
  '  const showPopup = (): void => setPopupVisible(true);',
  '  const hidePopup = (): void => setPopupVisible(false);',
  '  return (',
  '    <span class="text-wrapper">',
  '      {h(tag, { ref: textReference, class: className, onMouseenter: showPopup, onMouseleave: hidePopup }, ...childList)}',
  '      {popupVisible ? <span class="text-popup" role="tooltip">{childList}</span> : undefined}',
  '    </span>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter splits an early-return guard into `v-if`/`v-else` roots (Step 3)', () => {
  const vue = compileComponentModule(EARLY_RETURN_BRANCHES, { framework: 'vue', componentName: 'ForgeText' });

  it('emits two top-level branches with no render closure', () => {
    expect(vue.code).not.toContain('const render = () =>');
    // Branch A: the guard's returned element under `v-if`.
    expect(vue.code).toContain('<component v-if="!truncatePopup" :is="tag"');
    // Branch B: the final return under `v-else`.
    expect(vue.code).toContain('<span v-else class="text-wrapper"');
  });

  it('renders the normalised children as `<slot />` in both the anchor and the popup', () => {
    // Two default slots (anchor + popup) — the `{childList}` array child becomes a slot.
    expect((vue.code.match(/<slot \/>/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(vue.code).toContain('@mouseenter="showPopup"');
    expect(vue.code).toContain('<span v-if="popupVisible"');
    // No JSX / children array leaks into an interpolation.
    expect(vue.code).not.toMatch(/\{\{[^}]*childList/);
  });
});

// --- Vue hook module: source-order preservation -----------------------------

// A `usePopup`-shaped composable: it destructures its `options` parameter at the
// top, then registers effects that read the destructured locals. The Vue
// composable must run once top-to-bottom, so the destructuring has to be emitted
// **before** the effects — the component setup-vs-render split would move it
// below them and the `watch(() => [lngLat], …)` getter (evaluated eagerly on
// setup) would hit `lngLat` in the temporal dead zone at runtime.
const POPUP_HOOK = [
  "import { useEffect, useRef, useState } from '@mission-platform/forge';",
  '',
  'export interface UsePopupOptions {',
  '  lngLat: [number, number];',
  '  content: string;',
  '}',
  '',
  'export function usePopup(options: UsePopupOptions) {',
  '  const { lngLat, content } = options;',
  '  const [popup, setPopup] = useState<string | undefined>(undefined);',
  '  const popupReference = useRef<string | undefined>(undefined);',
  '  useEffect(() => {',
  '    popupReference.current = content;',
  '    setPopup(content);',
  '  }, [content]);',
  '  useEffect(() => {',
  '    popupReference.current = String(lngLat);',
  '  }, [lngLat]);',
  '  return { popup };',
  '}',
].join('\n');

describe('the Vue hook emitter preserves the authored statement order of a composable', () => {
  const vue = compileHookModule(POPUP_HOOK, { framework: 'vue', fileName: 'use-popup.ts' });

  it('emits the options destructuring before any effect setup (no temporal-dead-zone)', () => {
    const destructureIndex = vue.code.indexOf('const { lngLat, content } = options;');
    const firstEffectIndex = vue.code.indexOf('mpEffect(');
    expect(destructureIndex).toBeGreaterThanOrEqual(0);
    expect(firstEffectIndex).toBeGreaterThan(destructureIndex);
  });

  it('routes the effects through the generated `mpEffect` helper within the composable body', () => {
    // The composable pulls `mpEffect` from the generated Vue-only `./mp-effect`
    // helper and each effect collapses to a single `mpEffect(callback, () => [deps])`.
    expect(vue.code).toContain("import { mpEffect } from './mp-effect';");
    expect(vue.code).toContain('}, () => [content]);');
    expect(vue.code).toContain('}, () => [lngLat]);');
    expect(vue.code).not.toContain('onMounted(');
  });
});

// --- Neutral `useId` → each framework's native hook -------------------------

// A field-shaped component using the neutral `useId` hook for a stable
// label/`aria-describedby` id. Both frameworks ship an identically-named
// `useId`, so — unlike `useState`/`useEffect` — it is neither translated nor
// kept as a neutral import: React imports it from `react`, Vue from `vue`, and
// the `const generatedId = useId()` call is preserved verbatim in both.
const USE_ID_FIELD = [
  "import { h, type MpElement, useId } from '@mission-platform/forge';",
  '',
  'export interface FieldProperties {',
  '  id?: string;',
  '  label?: string;',
  '}',
  '',
  'export function ForgeField(properties: FieldProperties): MpElement {',
  '  const generatedId = useId();',
  '  const resolvedId = properties.id ?? generatedId;',
  '  return (',
  '    <div>',
  '      <label for={resolvedId}>{properties.label}</label>',
  '      <input id={resolvedId} />',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the compiler maps the neutral `useId` hook to each framework native `useId`', () => {
  const react = compileComponentModule(USE_ID_FIELD, { framework: 'react', componentName: 'ForgeField' });
  const vue = compileComponentModule(USE_ID_FIELD, { framework: 'vue', componentName: 'ForgeField' });

  it('imports `useId` from `react` and keeps the call (React)', () => {
    expect(react.code).toMatch(/import\s*\{[^}]*\buseId\b[^}]*\}\s*from\s*"react"/);
    expect(react.code).toContain('const generatedId = useId();');
    expect(react.code).toContain('const resolvedId = properties.id ?? generatedId;');
    // The id hook must never fall back to the neutral package or a helper.
    expect(react.code).not.toContain("from '@mission-platform/forge'");
    expect(react.code).not.toContain('nextFieldId');
  });

  it('imports `useId` from `vue` and keeps the call in `setup` (Vue)', () => {
    expect(vue.code).toMatch(/import\s*\{[^}]*\buseId\b[^}]*\}\s*from\s*'vue'/);
    expect(vue.code).toContain('const generatedId = useId();');
    expect(vue.code).not.toContain('nextFieldId');
  });
});

const I18N_CHECKBOX = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "import i18next from 'i18next';",
  '',
  'export interface CheckboxProperties {',
  '  required?: boolean;',
  '}',
  '',
  'export function ForgeCheckbox(properties: CheckboxProperties): MpElement {',
  "  const label = i18next.t('required_label', { defaultValue: 'Required' });",
  '  return <span>{label}</span>;',
  '}',
].join('\n');

describe('the compiler rewrites `i18next.t(...)` to `useI18n()` and `t(...)`', () => {
  const react = compileComponentModule(I18N_CHECKBOX, { framework: 'react', componentName: 'ForgeCheckbox' });
  const vue = compileComponentModule(I18N_CHECKBOX, { framework: 'vue', componentName: 'ForgeCheckbox' });

  it('imports `useI18n` from `@mission-platform/i18n` and injects hook call (React)', () => {
    expect(react.code).toMatch(/import\s*\{\s*useI18n\s*\}\s*from\s*["']@mission-platform\/i18n["']/);
    expect(react.code).toContain('const { t } = useI18n();');
    expect(react.code).toContain("const label = t('required_label', { defaultValue: 'Required' });");
  });

  it('imports `useI18n` from `@mission-platform/i18n` and injects hook call (Vue)', () => {
    expect(vue.code).toContain("import { useI18n } from '@mission-platform/i18n';");
    expect(vue.code).toContain('const { t } = useI18n();');
    expect(vue.code).toContain("t('required_label', { defaultValue: 'Required' })");
  });
});

// A JSX-returning component (unlike `IN_VIEW`, whose return is a raw `h(…)`
// call and so never reaches the JSX → Svelte markup conversion at all) that
// exercises `useState`/`useMemo`, a ternary, a `.map()`, and a click handler —
// every construct the emitted `<template>`-equivalent markup must convert.
const TOGGLE_PANEL = [
  "import { h, type MpElement, useMemo, useState } from '@mission-platform/forge';",
  '',
  'export interface TogglePanelProperties {',
  '  items: string[];',
  '}',
  '',
  'export function ForgeTogglePanel(properties: TogglePanelProperties): MpElement {',
  '  const { items } = properties;',
  '  const [expanded, setExpanded] = useState(false);',
  "  const label = useMemo(() => (expanded ? 'Hide' : 'Show'), [expanded]);",
  '  return (',
  '    <div className="toggle-panel">',
  '      <button type="button" onClick={() => setExpanded(!expanded)}>{label}</button>',
  '      {expanded ? (',
  '        <ul className="toggle-panel__list">',
  '          {items.map((item) => <li className="toggle-panel__item">{item}</li>)}',
  '        </ul>',
  '      ) : (',
  '        <p className="toggle-panel__hint">Collapsed</p>',
  '      )}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the compiler emits Svelte 5 components with runes', () => {
  const svelte = compileComponentModule(IN_VIEW, { framework: 'svelte', componentName: 'ForgeInView' });
  const panel = compileComponentModule(TOGGLE_PANEL, { framework: 'svelte', componentName: 'ForgeTogglePanel' });

  it('emits Svelte 5 SFC with script setup and $props / $state / $effect runes', () => {
    expect(svelte.lang).toBe('svelte');
    expect(svelte.code).not.toContain('@mission-platform/forge');
    expect(svelte.code).not.toContain('from "react"');
    expect(svelte.code).toContain('<script');
    expect(svelte.code).toContain('$props');
    expect(svelte.code).toContain('$state');
    expect(svelte.code).toContain('$effect');
  });

  it('converts the returned JSX to real Svelte markup: `{#if}`, `{#each}`, `{expr}`, and lowercase `onclick`', () => {
    expect(panel.lang).toBe('svelte');
    expect(panel.code).not.toContain('@mission-platform/forge');
    // Runes: the destructured prop, the `useState` pair, and the `useMemo` derivation.
    expect(panel.code).toContain('$props()');
    expect(panel.code).toContain('$state(false)');
    expect(panel.code).toContain('$derived.by(');
    // The ternary around a `<ul>` becomes a real `{#if}/{:else}` block, not a
    // printed (JSX-laden) expression.
    expect(panel.code).toMatch(/\{#if expanded\}[\s\S]*\{:else\}[\s\S]*\{\/if\}/);
    // The (real) else branch renders its element; an `undefined`/empty branch
    // would instead be dropped entirely (never emitted as a `{undefined}` text
    // node, which Svelte rejects inside structural elements like `<table>`).
    expect(panel.code).toContain('Collapsed');
    expect(panel.code).not.toContain('{undefined}');
    // `items.map(…)` becomes a real `{#each}` block.
    expect(panel.code).toMatch(/\{#each items as item\}[\s\S]*\{\/each\}/);
    // A plain expression hole and the lowercase Svelte 5 event-attribute form.
    expect(panel.code).toContain('{label}');
    expect(panel.code).toContain('onclick={');
    // No raw JSX (the neutral `className=` spelling) survives anywhere — it is
    // always aliased to the native Svelte/DOM `class=`.
    expect(panel.code).not.toContain('className');
    // The script block itself holds no JSX literal (a leaked ternary/`.map()`
    // would otherwise print its `<tag>` markup right inside a script `{expr}`).
    const scriptBodyStart = panel.code.indexOf('>', panel.code.indexOf('<script')) + 1;
    const scriptOnly = panel.code.slice(scriptBodyStart, panel.code.indexOf('</script>'));
    expect(scriptOnly).not.toMatch(/<[a-z][\s\S]*?\/?>/iu);
  });
});

// A component whose render is a hyperscript `h(tag, props, ...children)` call
// with a *dynamic* tag, plus an early `return` guard and a variadic `children`
// normalisation — every construct the Svelte emitter must fold into markup
// (rather than leak a bare `return`/`h(…)` into the `<script>`), modelled on
// `forge-typography`.
const HYPERSCRIPT_TEXT = [
  "import { classNames, h, type MpChild, type MpElement, useState } from '@mission-platform/forge';",
  '',
  'export interface TextProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '  as?: string;',
  '  popup?: boolean;',
  '}',
  '',
  'export function ForgeText(properties: Readonly<TextProperties>): MpElement {',
  "  const { as = 'span', popup = false } = properties;",
  '  const [open, setOpen] = useState(false);',
  '  const children = properties.children;',
  '  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];',
  "  const className = classNames('text');",
  '  if (!popup) {',
  '    return h(as, { class: className }, ...childList);',
  '  }',
  '  return (',
  '    <span className="wrapper">',
  '      {h(as, { class: className, onMouseenter: () => setOpen(true) }, ...childList)}',
  '      {open ? <span role="tooltip">{childList}</span> : undefined}',
  '    </span>',
  '  );',
  '}',
].join('\n');

describe('the compiler emits Svelte markup for hyperscript `h(…)` renders and early returns', () => {
  const text = compileComponentModule(HYPERSCRIPT_TEXT, { framework: 'svelte', componentName: 'ForgeText' });

  it('folds `h(tag, …)`, the early return, and the `children` normalisation into valid markup', () => {
    expect(text.lang).toBe('svelte');
    // A dynamic-tag `h(tag, …)` render becomes `<svelte:element this={tag} …>`.
    expect(text.code).toContain('<svelte:element this={as}');
    // The variadic `childList` normalisation renders the `children` snippet
    // (normalized so a primitive `MpChild` slot value renders as text instead).
    expect(text.code).toContain('{@render __mpSlotValueSnippet(children)}');
    // The early `if (!popup) return h(…)` folds into an `{#if}/{:else}` chain.
    expect(text.code).toMatch(/\{#if !popup\}[\s\S]*\{:else\}[\s\S]*\{\/if\}/);
    // `h(…)` props map like JSX: `class` and the lowercase Svelte event form.
    expect(text.code).toContain('class={className}');
    expect(text.code).toContain('onmouseenter={');
    // No source-level JSX/hyperscript return leaks into the `<script>` block.
    const scriptStart = text.code.indexOf('>', text.code.indexOf('<script')) + 1;
    const scriptOnly = text.code.slice(scriptStart, text.code.indexOf('</script>'));
    expect(scriptOnly).not.toMatch(/\breturn\s+(?:<|h\()/);
    expect(scriptOnly).not.toMatch(/\bh\(/);
  });
});

describe('the compiler emits SolidJS components with signals', () => {
  const solid = compileComponentModule(IN_VIEW, { framework: 'solid', componentName: 'ForgeInView' });

  it('emits SolidJS TSX module mapping hooks to Solid primitives', () => {
    expect(solid.lang).toBe('tsx');
    expect(solid.code).not.toContain('@mission-platform/forge');
    expect(solid.code).not.toContain('from "react"');
    expect(solid.code).toContain('from "solid-js"');
    expect(solid.code).toContain('createSignal');
    expect(solid.code).toContain('createEffect');
  });
});

describe('the compiler emits Web Components custom elements', () => {
  const wc = compileComponentModule(IN_VIEW, { framework: 'web-components', componentName: 'ForgeInView' });

  it('emits a native ForgeElement subclass with an html`…` render() registered via customElements.define', () => {
    // The tagged-template output is plain TypeScript, so the module is `.ts`.
    expect(wc.lang).toBe('ts');
    // The only forge import is the native web-components runtime — never `lit`.
    expect(wc.code).not.toContain("from 'lit'");
    expect(wc.code).not.toContain('LitElement');
    expect(wc.code).not.toContain('from "react"');
    expect(wc.code).toContain('ForgeElement, html, nothing');
    expect(wc.code).toContain('class ForgeInViewElement extends ForgeElement');
    expect(wc.code).toContain('render()');
    expect(wc.code).toContain('return html`');
    expect(wc.code).toContain("customElements.define('forge-in-view', ForgeInViewElement);");
  });
});

const SLOT_PROJECTION_FIXTURE = [
  "import { Slot, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ProjectionProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '}',
  '',
  'export function ForgeProjection(properties: Readonly<ProjectionProperties>): MpElement {',
  '  const children = properties.children;',
  '  return (',
  '    <section>',
  '      <Slot />',
  '      <Slot name="end" />',
  '      <Slot />',
  '      <ForgeDrawer>',
  '        <nav><Slot /></nav>',
  '        {children}',
  '        {[children]}',
  '        {properties.children?.length ? properties.children : undefined}',
  '      </ForgeDrawer>',
  '    </section>',
  '  );',
  '}',
].join('\n');

describe('the Web Components compiler preserves slot ownership', () => {
  const projection = compileComponentModule(SLOT_PROJECTION_FIXTURE, {
    framework: 'web-components',
    componentName: 'ForgeProjection',
  });

  it('emits repeated default/named outlets and exact children aliases natively', () => {
    expect(projection.code.match(/<slot><\/slot>/g)?.length).toBe(2);
    expect(projection.code).toContain('<slot name="end"></slot>');
    expect(projection.code).toContain(
      '<forge-slot data-mp-forge-slot="true" data-mp-forge-nested="true" .content=${this.children}></forge-slot>',
    );
  });

  it('marks nested forwarding and conditional/array slot expressions for runtime resolution', () => {
    expect(projection.code).toContain(
      '<nav><forge-slot data-mp-forge-slot="true" data-mp-forge-nested="true" .content=${this.children}></forge-slot></nav>',
    );
    expect(projection.code).toContain('<forge-slot data-mp-forge-slot="true" .content=${children}></forge-slot>');
    expect(projection.code).toContain('<forge-slot data-mp-forge-slot="default" .content=${[children]}></forge-slot>');
    expect(projection.code).toContain(
      '<forge-slot data-mp-forge-slot="default" .content=${this.children?.length ? this.children : undefined}></forge-slot>',
    );
  });
});

// A self-recursive component with a scoped `label` render-prop (`MpRenderProperty`),
// modelled on `forge-tree-view-item`. It exercises two subtle Vue-builder concerns:
//   1. `{node.label}` is a plain string field read whose trailing name coincides
//      with the node-typed `label` render-prop — it must render as a normal
//      `{{ node.label }}` interpolation, not be misread as slot content that
//      forces the render-closure fallback.
//   2. `label={properties.label}` forwards the scoped slot to the recursive child;
//      it must become a `<template #label>` forwarding block, not a `:label` prop.
const RECURSIVE_TREE_ITEM = [
  "import { h, type MpElement, type MpRenderProperty, Slot } from '@mission-platform/forge';",
  '',
  'export interface TreeNode {',
  '  id: string;',
  '  label: string;',
  '  children?: TreeNode[];',
  '}',
  '',
  'export interface LabelScope {',
  '  node: TreeNode;',
  '  depth: number;',
  '}',
  '',
  'export interface TreeItemProperties {',
  '  node: TreeNode;',
  '  depth: number;',
  '  label?: MpRenderProperty<LabelScope>;',
  '}',
  '',
  'export function TreeItem(properties: Readonly<TreeItemProperties>): MpElement {',
  '  const { node, depth } = properties;',
  '  return (',
  '    <li role="none">',
  '      <Slot name="label" node={node} depth={depth}>',
  '        <span>{node.label}</span>',
  '      </Slot>',
  '      {node.children !== undefined ? (',
  '        <ul role="group">',
  '          {node.children.map((child) => (',
  '            <TreeItem key={child.id} node={child} depth={depth + 1} label={properties.label} />',
  '          ))}',
  '        </ul>',
  '      ) : undefined}',
  '    </li>',
  '  );',
  '}',
].join('\n');

describe('the compiler flattens a recursive render-prop component to native Vue `<template>`', () => {
  const item = compileComponentModule(RECURSIVE_TREE_ITEM, { framework: 'vue', componentName: 'TreeItem' });

  it('emits native `<template>` — no render closure — despite a `{node.label}` field colliding with the `label` render-prop', () => {
    expect(item.lang).toBe('vue');
    // The receiver-aware node-typed-prop guard no longer misreads `node.label`.
    expect(item.code).not.toContain('const render = () =>');
    expect(item.code).not.toContain('<render v-bind="$attrs" />');
    expect(item.code).not.toContain('native <template> unavailable');
    // The plain field read renders as an ordinary interpolation …
    expect(item.code).toMatch(/\{\{\s*node\.label\s*\}\}/);
    // … while the `<Slot name="label" node depth>` outlet stays a native scoped slot.
    expect(item.code).toContain('<slot name="label" :node="node" :depth="depth">');
    // The recursion is a native `v-for` of the child component tag.
    expect(item.code).toMatch(/<TreeItem v-for="child in [\s\S]*?:node="child"/);
  });

  it('forwards the scoped `label` render-prop to the recursive child as a `<template #label>` block, not a `:label` bind', () => {
    // The render-prop passed down (`label={properties.label}`) is a slot, not a
    // data prop — a `:label` binding would leak into `$attrs` and never populate
    // the child's `label` slot.
    expect(item.code).not.toContain(':label="properties.label"');
    // Instead, the child forwards the current component's `label` slot through.
    expect(item.code).toContain('<template #label="scope">');
    expect(item.code).toContain('<slot name="label" v-bind="scope" />');
  });
});

// A toolbar whose per-item `.map()` renders a **node-typed field** of the loop
// item as a child (`{item.icon}`, where `ToolbarItem.icon: MpElement`), with the
// loop source itself an *inlined* node-valued const (`groups`) whose initializer
// is a `props ? [props.items] : buildGroups()` ternary — exactly the
// `forge-wysiwyg-toolbar` shape. `{item.icon}` holds an already-created VNode, so
// a `{{ … }}` interpolation would `toDisplayString` (JSON-stringify) the circular
// VNode and throw at render, dropping the whole toolbar; it must instead bind via
// `<component :is>`. The classification is receiver **type-aware** — resolved
// through the inlined ternary/`buildGroups()` return type down to the item type —
// so a same-named plain field (`{crumb.icon}` where a *different* item type
// declares `icon: string`) still renders as a normal interpolation.
const NODE_TYPED_MAP_ITEM = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ToolbarItem {',
  '  label: string;',
  '  icon?: MpElement;',
  '}',
  '',
  'export interface Crumb {',
  '  label: string;',
  '  icon?: string;',
  '}',
  '',
  'export interface ToolbarProperties {',
  '  items?: ToolbarItem[];',
  '  crumbs?: Crumb[];',
  '}',
  '',
  'function buildGroups(): ToolbarItem[][] {',
  '  return [[{ label: \'Bold\', icon: <i class="i" /> }]];',
  '}',
  '',
  'export function Toolbar(properties: Readonly<ToolbarProperties>): MpElement {',
  '  const groups: ToolbarItem[][] = properties.items ? [properties.items] : buildGroups();',
  '  const crumbs: Crumb[] = properties.crumbs ?? [];',
  '  return (',
  '    <div role="toolbar">',
  '      {groups.map((group) => (',
  '        <div class="group">',
  '          {group.map((item) => (',
  '            <button key={item.label} aria-label={item.label}>{item.icon}</button>',
  '          ))}',
  '        </div>',
  '      ))}',
  '      {crumbs.map((crumb) => (',
  '        <span key={crumb.label}>{crumb.icon}</span>',
  '      ))}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the compiler renders a node-typed `.map()` item field as `<component :is>` (receiver type-aware)', () => {
  const out = compileComponentModule(NODE_TYPED_MAP_ITEM, { framework: 'vue', componentName: 'Toolbar' });

  it('emits native `<template>` with no render-closure fallback', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('binds the node-typed `item.icon` field via `<component :is>` (not a stringifying interpolation)', () => {
    // The VNode-valued field is mounted as an element …
    expect(out.code).toContain('<component :is="item.icon" />');
    // … never stringified into a mustache that would crash `toDisplayString`.
    expect(out.code).not.toMatch(/\{\{\s*item\.icon\s*\}\}/);
  });

  it('leaves a same-named plain-typed field (`crumb.icon: string`) as an ordinary interpolation', () => {
    // `icon` is node-typed on `ToolbarItem` but a plain string on `Crumb`; the
    // check keys off the receiver's own resolved type, so this one stays text.
    expect(out.code).toMatch(/\{\{\s*crumb\.icon\s*\}\}/);
  });
});

// (Category A) A range picker whose slot props are named `start`/`end` — the same
// identifiers used as **object-literal keys** in an event handler
// (`emit({ start: value, end: nextEnd })`) and read as fields of a plain data
// object (`modelValue.end`) — plus a data `.map()` inside a `void` handler, a
// block-body render helper (`group`) and an `if`-guard dispatch helper
// (`renderBody`). None of these should be misread as node-producing, and the two
// render helpers must inline so the whole component templates natively.
const RANGE_SLOTS = [
  "import { h, hasSlot, type MpChild, type MpElement, Slot, useState } from '@mission-platform/forge';",
  '',
  'export interface RangeValue { start: string; end: string; }',
  '',
  'export interface RangeProperties {',
  '  modelValue?: RangeValue;',
  '  start?: MpChild;',
  '  end?: MpChild;',
  '  view?: string;',
  '  onUpdateModelValue?: (value: RangeValue) => void;',
  '}',
  '',
  'export function RangePicker(properties: Readonly<RangeProperties>): MpElement {',
  "  const { modelValue = { start: '', end: '' }, view = 'a' } = properties;",
  '  const [items, setItems] = useState<string[]>([]);',
  '  const emit = (next: RangeValue): void => {',
  '    properties.onUpdateModelValue?.(next);',
  '  };',
  '  const handleStart = (value: string): void => {',
  '    const nextEnd = modelValue.end && modelValue.end < value ? value : modelValue.end;',
  '    setItems(items.map((entry) => (entry === value ? value : entry)));',
  '    emit({ start: value, end: nextEnd });',
  '  };',
  '  const column = (header: string, values: readonly string[]): MpChild => (',
  '    <div class="col">',
  '      <span>{header}</span>',
  '      {values.map((v) => (',
  '        <button key={v} type="button" onClick={() => handleStart(v)}>{v}</button>',
  '      ))}',
  '    </div>',
  '  );',
  '  const group = (title: string): MpChild => {',
  '    const heading = title.toUpperCase();',
  '    return (',
  '      <div class="group">',
  '        <span>{heading}</span>',
  "        {column('H', ['1', '2'])}",
  '      </div>',
  '    );',
  '  };',
  '  const renderBody = (): MpElement => {',
  "    if (view === 'a') return <div class=\"a\">{group('start')}</div>;",
  '    return <div class="b">{group(\'end\')}</div>;',
  '  };',
  '  return (',
  '    <div class="range">',
  '      {hasSlot(\'start\') ? <span class="ext"><Slot name="start" /></span> : undefined}',
  '      {renderBody()}',
  '      {hasSlot(\'end\') ? <span class="ext"><Slot name="end" /></span> : undefined}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the compiler flattens object-key / data-map / helper false positives to native Vue `<template>` (Category A)', () => {
  const out = compileComponentModule(RANGE_SLOTS, { framework: 'vue', componentName: 'RangePicker' });

  it('emits native `<template>` with no render-closure fallback', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('still emits the `start`/`end` named slots natively (they are slots, not misread node reads)', () => {
    expect(out.code).toContain('<slot name="start" />');
    expect(out.code).toContain('<slot name="end" />');
  });

  it('inlines the block-body / guard-chain render helpers as a native `v-if`/`v-else` view dispatch', () => {
    expect(out.code).toMatch(/v-if="view === 'a'"/);
    expect(out.code).toContain('v-else');
  });
});

// (Category B) An array-literal child `{[header, ...rows, ...childList]}` mixing a
// fixed node const, a spread of a `.map()` projection, and the normalised
// default-slot spread — modelled on `forge-calendar`/`forge-list`. It has no
// `emitExpressionChild` interpolation form and must emit as native child markup.
const ARRAY_CHILDREN = [
  "import { Dynamic, h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface GridProperties {',
  '  children?: MpChild | readonly MpChild[];',
  '  items?: string[];',
  '}',
  '',
  'export function ForgeGrid(properties: Readonly<GridProperties>): MpElement {',
  '  const { items = [] } = properties;',
  '  const header = <div class="head">Header</div>;',
  '  const rows = items.map((item, index) => (',
  '    <div key={index} class="row">{item}</div>',
  '  ));',
  '  const children = properties.children;',
  '  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];',
  '  return (',
  '    <Dynamic is="section" class="grid">',
  '      {[header, ...rows, ...childList]}',
  '    </Dynamic>',
  '  );',
  '}',
].join('\n');

describe('the compiler renders an array-literal child natively (Category B)', () => {
  const out = compileComponentModule(ARRAY_CHILDREN, { framework: 'vue', componentName: 'ForgeGrid' });

  it('emits native `<template>` with no render closure', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('emits the fixed node, the `.map()` as a `v-for`, and the default slot spread', () => {
    expect(out.code).toContain('class="head"');
    expect(out.code).toMatch(/<div v-for="\(item, index\) in items"/);
    expect(out.code).toContain('<slot />');
  });
});

// (Category E) A component whose scalar derived const `display` becomes a reactive
// `computed` (a render-scope memo), while a kept handler declares a **local**
// `const display` shadowing that memo. The memo `.value` reference rewriter must
// be scope-aware: it appends `.value` to genuine memo reads but leaves the
// handler-local binding (and its uses) untouched, so neither is corrupted.
const MEMO_SHADOW = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface ClockProperties {',
  '  hour?: number;',
  '  minute?: number;',
  '  onChange?: (value: string) => void;',
  '}',
  '',
  'export function ForgeClock(properties: Readonly<ClockProperties>): MpElement {',
  '  const { hour = 0, minute = 0 } = properties;',
  '  const display = `${hour}:${minute}`;',
  '  const commit = (): void => {',
  '    const display = `${hour}-${minute}`;',
  '    properties.onChange?.(display);',
  '  };',
  '  return (',
  '    <button type="button" onClick={commit}>{display}</button>',
  '  );',
  '}',
].join('\n');

describe('the Vue memo rewriter is scope-aware for a shadowing handler-local (Category E)', () => {
  const out = compileComponentModule(MEMO_SHADOW, { framework: 'vue', componentName: 'ForgeClock' });

  it('emits native `<template>` (no memo-shadowing fallback)', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('lifts the scalar derived const to a `computed` memo', () => {
    expect(out.code).toContain('const display = computed(');
  });

  it('leaves the shadowing handler-local intact (never rewritten to `display.value`)', () => {
    // The handler re-declares `const display` and emits it bare (the `onChange`
    // event prop becomes `emit('change', …)`); the scope-aware rewriter must not
    // append `.value` to that shadowing local or its use.
    expect(out.code).toContain('emit("change", display)');
    expect(out.code).not.toContain('emit("change", display.value)');
    expect(out.code).not.toContain('const display.value');
  });
});

// (Category C) A `useRef` kept in step with a derived value via a top-level
// render-scope side effect (`latestValueReference.current = clampedValue;`) —
// modelled on `forge-slider`/`forge-range-input`. It is neither a `const` nor a
// node, so it must be lifted to a reactive `watchEffect`, not rejected as a
// "non-const derived statement".
const REF_SYNC = [
  "import { h, type MpElement, useRef } from '@mission-platform/forge';",
  '',
  'export interface SliderProperties {',
  '  modelValue?: number;',
  '  onUpdateModelValue?: (value: number) => void;',
  '}',
  '',
  'export function ForgeSlider(properties: Readonly<SliderProperties>): MpElement {',
  '  const { modelValue = 0 } = properties;',
  '  const latestValueReference = useRef<number>(0);',
  '  const clampedValue = Math.max(0, Math.min(100, modelValue));',
  '  latestValueReference.current = clampedValue;',
  '  const commit = (): void => {',
  '    properties.onUpdateModelValue?.(latestValueReference.current);',
  '  };',
  '  return (',
  '    <input type="range" value={clampedValue} onChange={commit} />',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter lifts a render-scope ref-sync to a reactive `watchEffect` (Category C)', () => {
  const out = compileComponentModule(REF_SYNC, { framework: 'vue', componentName: 'ForgeSlider' });

  it('emits native `<template>` with no render closure', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('lifts the `<ref>.current = <expr>` side effect into a `watchEffect` (rewriting `.current` → `.value` and the memo read)', () => {
    expect(out.code).toContain('watchEffect(() => {');
    expect(out.code).toContain('latestValueReference.value = clampedValue.value');
    // The `watchEffect` runtime is imported from `vue`.
    expect(out.code).toMatch(/import \{[^}]*watchEffect[^}]*\} from 'vue'/);
  });
});

// (Category D2) A module-level, single-parameter element-returning `switch`
// helper (`variantIcon(variant)`) invoked in child position — modelled on
// `forge-toast`/`forge-alert-banner`. It inlines as a native `v-if`/`v-else-if`/
// `v-else` chain rather than being stringified.
const SWITCH_HELPER = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  '',
  "export type Variant = 'success' | 'error' | 'info';",
  '',
  'function variantIcon(variant: Variant): MpElement {',
  '  switch (variant) {',
  '    case \'success\': { return <span class="ok" />; }',
  '    case \'error\': { return <span class="err" />; }',
  '    default: { return <span class="info" />; }',
  '  }',
  '}',
  '',
  'export interface BannerProperties {',
  '  variant?: Variant;',
  '}',
  '',
  'export function ForgeBanner(properties: Readonly<BannerProperties>): MpElement {',
  "  const { variant = 'info' } = properties;",
  '  return (',
  '    <div class="banner">',
  '      {variantIcon(variant)}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter inlines an element-returning `switch` helper as a `v-if` chain (Category D)', () => {
  const out = compileComponentModule(SWITCH_HELPER, { framework: 'vue', componentName: 'ForgeBanner' });

  it('emits native `<template>` with no render closure', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('renders each `switch` arm as a native conditional chain, never a `{{ variantIcon(...) }}` interpolation', () => {
    // The call is inlined into the template as a conditional chain — the `<template>`
    // never stringifies the helper call in a `{{ … }}` interpolation.
    const template = out.code.slice(out.code.indexOf('<template>'));
    expect(template).not.toContain('variantIcon');
    expect(out.code).toContain('class="ok"');
    expect(out.code).toContain('class="err"');
    expect(out.code).toContain('class="info"');
    expect(out.code).toMatch(/v-if="\(?variant\)? === 'success'"/);
    expect(out.code).toMatch(/v-else-if="\(?variant\)? === 'error'"/);
    expect(out.code).toContain('v-else');
  });
});

// (Category D1) A scoped render-prop invoked as a child (`properties.panel?.({
// tab })`) — modelled on `forge-tabs`/`forge-virtual-tabs`. The returned VNodes
// render natively via `<component :is>`, and the render-prop must stay a real
// prop (never a Vue named slot) so a compiled neutral parent can pass it plainly.
const RENDER_PROP_CALL = [
  "import { h, type MpElement, type MpRenderProperty } from '@mission-platform/forge';",
  '',
  'export interface TabItem { id: string; label: string; }',
  'export interface PanelScope { tab: TabItem; }',
  '',
  'export interface TabsProperties {',
  '  tabs: TabItem[];',
  '  panel?: MpRenderProperty<PanelScope>;',
  '}',
  '',
  'export function ForgeTabs(properties: Readonly<TabsProperties>): MpElement {',
  '  const { tabs } = properties;',
  '  return (',
  '    <div class="tabs">',
  '      {tabs.map((tab) => (',
  '        <div key={tab.id} role="tabpanel">',
  '          {properties.panel?.({ tab })}',
  '        </div>',
  '      ))}',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('the Vue emitter renders a render-prop call natively via `<component :is>` (Category D)', () => {
  const out = compileComponentModule(RENDER_PROP_CALL, { framework: 'vue', componentName: 'ForgeTabs' });

  it('emits native `<template>` with no render closure', () => {
    expect(out.lang).toBe('vue');
    expect(out.code).not.toContain('const render = () =>');
    expect(out.code).not.toContain('<render v-bind="$attrs" />');
    expect(out.code).not.toContain('native <template> unavailable');
  });

  it('binds the render-prop call result to `<component :is>` inside the panel `v-for`', () => {
    expect(out.code).toMatch(/<div v-for="tab in tabs"/);
    expect(out.code).toContain('<component :is="properties.panel?.({ tab })" />');
  });

  it('keeps `panel` a real prop — never a Vue named slot', () => {
    expect(out.code).not.toContain('name="panel"');
    expect(out.code).toContain('panel?:');
  });
});

const MEMBER_RENDER_PROP_CALL = [
  "import { h, type MpElement, type MpRenderProperty } from '@mission-platform/forge';",
  '',
  'export interface WizardStep {',
  '  when?: boolean;',
  '  content?: MpRenderProperty<Record<string, unknown>>;',
  '  label?: () => string;',
  '}',
  '',
  'export interface WizardProperties {',
  '  steps: WizardStep[];',
  '  current: number;',
  '}',
  '',
  'export function ForgeWizard(properties: Readonly<WizardProperties>): MpElement {',
  '  const { steps, current } = properties;',
  '  const visibleSteps = steps.filter((step) => step.when !== false);',
  '  const activeStep = visibleSteps[current];',
  '  return <div>{activeStep?.content?.({})}{activeStep?.label?.()}</div>;',
  '}',
].join('\n');

describe('the Vue emitter renders a render-property member call as a node', () => {
  const out = compileComponentModule(MEMBER_RENDER_PROP_CALL, {
    framework: 'vue',
    componentName: 'ForgeWizard',
  });

  it('propagates the receiver type through array filtering and indexing', () => {
    expect(out.code).toContain('<component :is="activeStep?.content?.({})" />');
    expect(out.code).not.toMatch(/\{\{\s*activeStep\?\.content\?\.\(\{\}\)\s*\}\}/);
    expect(out.code).toContain('{{ activeStep?.label?.() }}');
  });
});

const DESTRUCTURED_CHILDREN = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  '',
  'export interface TextProperties {',
  '  children?: MpChild | readonly MpChild[];',
  "  tone?: 'primary' | 'secondary';",
  '}',
  '',
  'export function ForgeText(properties: Readonly<TextProperties>): MpElement {',
  "  const { children, tone = 'primary', ...rest } = properties;",
  '  return <p {...rest} data-tone={tone}>{children}</p>;',
  '}',
].join('\n');

describe('the Vue emitter maps destructured children to the default slot', () => {
  const out = compileComponentModule(DESTRUCTURED_CHILDREN, { framework: 'vue', componentName: 'ForgeText' });

  it('renders the default slot instead of reading a missing children prop', () => {
    // `children` is destructured off the props object but is not a declared
    // prop, so reading `properties.children` would yield `undefined`. Either
    // default-slot spelling satisfies that contract: the native `<template>`
    // path emits `<slot />`, the render-closure fallback emits
    // `slots.default?.()`. Since the AST-first migration this component lowers
    // natively, so assert the intent rather than one lowering path.
    expect(out.code).toMatch(/<slot\s*\/>|slots\.default\?\.\(\)/);
    expect(out.code).not.toContain('properties.children');
  });

  it('binds the rest-spread through `$attrs` rather than an undeclared binding', () => {
    expect(out.code).toContain('v-bind="$attrs"');
    expect(out.code).not.toContain('v-bind="rest"');
  });

  it('keeps the `Readonly<…>` props contract intact', () => {
    expect(out.code).toContain('tone?:');
  });
});
