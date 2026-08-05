/**
 * Framework-neutral **named slots** for the `@mission-platform/forge` dialect.
 *
 * A write-once component declares a slot in its returned tree with the neutral
 * {@link Slot} element:
 *
 * ```tsx
 * <div class="layout__header">
 *   <Slot name="navbar" />
 * </div>
 * <main>
 *   <Slot name="content">Nothing here yet</Slot>
 * </main>
 * ```
 *
 * `@mission-platform/vite-plugin-forge` rewrites each `<Slot name="x" />` straight
 * to the framework's own mechanism at build time — Vue's `slots.x?.()` and a
 * React render-prop lookup (`properties.x`) — so the compiled output has no
 * neutral runtime. The implementation **here** is the baseline used by the
 * runtime adapters (`@mission-platform/forge/react`, `.../vue`) and SSR: each
 * adapter pushes the props of the component it is expanding onto a small scope
 * stack, and a `<Slot name="x" />` resolves to that scope's `x` entry (the
 * nameless default slot resolves to `children`), exactly mirroring how the
 * compiled output reads its slots.
 */
import { isMpElement, type MpChild, type MpElement, type MpProperties, Slot as SlotMarker } from './types';

/**
 * Re-export the `Slot` marker used as the element `type` for a named slot
 * (`<Slot name="…" />`). Authored components import it from
 * `@mission-platform/forge`; both the runtime adapters and the build-time compiler
 * recognise it specially. It lives in `./types` so it can participate in
 * `MpElementType`.
 */
export { Slot } from './types';

/**
 * A **render-prop / scoped-slot** function: given the slot's scope it returns
 * the content to render. A write-once component renders a scoped slot by passing
 * the scope as attributes on `<Slot name="…" item={item} index={i} />`; the
 * consumer supplies the matching function (typically as `children`), which the
 * compiler maps to a Vue scoped slot (`slots.x?.(scope)`) and a React
 * render-prop call (`props.x?.(scope)`).
 */
export type MpRenderProperty<S = MpProperties> = (scope: S) => MpChild | readonly MpChild[];

/**
 * The content provided for a slot — either renderable children, or a function
 * of the slot's (scoped) props returning them (a scoped slot).
 */
export type MpSlotContent = MpChild | readonly MpChild[] | MpRenderProperty;

/** The properties accepted by the {@link Slot} element. */
export interface MpSlotProperties extends MpProperties {
  /** The slot name. Omitted (or `'default'`) targets the default slot. */
  name?: string;
}

/**
 * A stack of the props of the neutral components currently being expanded by an
 * adapter. The top frame is the enclosing component whose slots a `<Slot />`
 * encountered during the walk resolves against.
 */
const scopeStack: MpProperties[] = [];

/** Push the props of the component about to be expanded onto the slot scope. */
export function pushSlotScope(properties: MpProperties): void {
  scopeStack.push(properties);
}

/** Pop the current slot scope once a component's subtree has been expanded. */
export function popSlotScope(): void {
  scopeStack.pop();
}

/** The key a slot name maps to in a component's props (`'default'` → `children`). */
function slotKey(name: string | undefined): string {
  return name === undefined || name === 'default' ? 'children' : name;
}

/**
 * The result of {@link collectSlottedChildren}: the children destined for the
 * default slot, plus the named-slot content keyed by slot name.
 */
export interface SlottedChildren {
  /** Children with no (or `slot="default"`) marker — the default slot content. */
  defaultChildren: MpChild[];
  /** Named-slot content keyed by slot name (`slot="trigger"` → `slots.trigger`). */
  slots: Record<string, MpChild[]>;
}

/**
 * Partition a parent component's children by their `slot="…"` marker so a
 * write-once component can **pass** content into a child component's named slot
 * (`<ForgeDropdown><button slot="trigger" />…</ForgeDropdown>`). Children carrying
 * a `slot` property are grouped under that name (with the marker stripped, so
 * the resolved content never emits a stray `slot` attribute); everything else
 * stays in {@link SlottedChildren.defaultChildren}. The adapters fold the named
 * groups into the child's props, exactly mirroring how the compiler routes the
 * same `slot="…"` markers to Vue `<template #name>` / a React `name` prop.
 */
export function collectSlottedChildren(children: readonly MpChild[]): SlottedChildren {
  const defaultChildren: MpChild[] = [];
  const slots: Record<string, MpChild[]> = {};
  for (const child of children) {
    const name = isMpElement(child) ? child.properties.slot : undefined;
    if (typeof name === 'string' && name !== 'default') {
      const { slot: _slot, ...rest } = (child as MpElement).properties;
      const stripped: MpElement = { ...(child as MpElement), properties: rest };
      (slots[name] ??= []).push(stripped);
    } else {
      defaultChildren.push(child);
    }
  }
  return { defaultChildren, slots };
}

/**
 * Whether the enclosing component was given content for a slot — the neutral
 * counterpart of Vue's `$slots.x` / a React `properties.x != null` check. An
 * omitted (or `'default'`) name targets the default slot (`children`):
 *
 * ```tsx
 * {hasSlot('footer') ? <footer><Slot name="footer" /></footer> : undefined}
 * ```
 *
 * `@mission-platform/vite-plugin-forge` rewrites the call straight to each
 * framework's native presence check — Vue's `!!slots.x` (`$slots.x` inside a
 * `v-if`) and React's `properties.x != null` — so a write-once component can
 * render an optional wrapper region only when the slot is filled, on both
 * frameworks. The implementation here is the runtime-adapter / SSR baseline,
 * reading the current component's slot scope.
 */
export function hasSlot(name?: string): boolean {
  const scope = scopeStack.at(-1);
  const provided = scope?.[slotKey(name)];
  return provided !== undefined && provided !== null;
}

/**
 * Deeply resolve every `<Slot name="…" />` **marker** within a parent-authored
 * child tree against the **current** (parent) scope, returning a tree of concrete
 * content. This is what lets a write-once component **forward** one of its own
 * named slots into a child component's slot —
 * `<ForgeDrawer><div slot="header"><Slot name="startHeader" /></div></ForgeDrawer>`
 * — and have it resolve lexically (against the forwarding component), exactly
 * like the compiled output (React captures `properties.startHeader` in the
 * parent's render; Vue forwards the slot through `<template #header>`).
 *
 * The adapters call this on a component element's children **before** pushing the
 * child's scope, so the markers see the parent scope that authored them; markers
 * the child itself returns are untouched (they are resolved later, under the
 * child's own scope). Non-slot elements are walked recursively so nested markers
 * (inside a `slot="…"` wrapper) resolve too.
 */
export function resolveSlotMarkers(children: readonly MpChild[]): MpChild[] {
  const out: MpChild[] = [];
  for (const child of children) {
    if (isMpElement(child) && child.type === SlotMarker) {
      const resolved = resolveSlot(child.properties as MpSlotProperties, child.children);
      out.push(...resolveSlotMarkers(Array.isArray(resolved) ? resolved : [resolved as MpChild]));
      continue;
    }
    if (isMpElement(child) && child.children.length > 0) {
      out.push({ ...child, children: resolveSlotMarkers(child.children) });
      continue;
    }
    out.push(child);
  }
  return out;
}

/**
 * Resolve the content of a `<Slot name="…" />` against the enclosing
 * component's props, falling back to the slot's own children when nothing was
 * provided. Scoped slots (function-valued slot props) are invoked with the
 * slot element's remaining (non-`name`) properties.
 */
export function resolveSlot(properties: MpSlotProperties, fallback: readonly MpChild[]): MpChild | readonly MpChild[] {
  const scope = scopeStack.at(-1);
  const provided = scope?.[slotKey(properties.name)];
  if (provided === undefined || provided === null) {
    return fallback;
  }
  if (typeof provided === 'function') {
    const { name: _name, children: _children, ...scoped } = properties;
    return (provided as (scope: MpProperties) => MpChild | readonly MpChild[])(scoped);
  }
  return provided as MpChild | readonly MpChild[];
}
