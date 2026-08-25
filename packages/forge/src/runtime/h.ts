import { type MpChild, type MpElement, type MpElementType, type MpPropertyBag } from './types';

export { Fragment } from './types';

/**
 * Flatten the variadic/nested children produced by the JSX transform, dropping
 * the non-renderable slots (`undefined`, `null`, and booleans) so the neutral
 * tree only ever carries strings, numbers, and {@link MpElement}s. Falsy-but-
 * renderable values (`0`, `''`) are preserved.
 */
function flattenChildren(children: readonly MpChild[]): MpChild[] {
  const flat: MpChild[] = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      flat.push(...flattenChildren(child as readonly MpChild[]));
    } else if (child !== undefined && child !== null && typeof child !== 'boolean') {
      flat.push(child);
    }
  }
  return flat;
}

/**
 * The classic JSX factory (`jsxFactory: 'h'`).
 *
 * Every JSX expression authored against this runtime compiles to a call to
 * `h`, which builds a framework-neutral {@link MpElement}. Children may arrive
 * either as trailing variadic arguments (the classic transform) or via
 * `properties.children`; both are normalised into a single flat array.
 */
export function h<P extends object>(
  type: MpElementType | ((properties: P) => MpElement),
  properties?: P | null,
  ...children: MpChild[]
): MpElement {
  const rawProperties: MpPropertyBag = { ...properties };
  const inlineChildren = rawProperties.children;
  delete rawProperties.children;

  // Drop `undefined`-valued attributes (most notably an omitted `style` override
  // bag) so every target adapter sees the same, key-absent shape. Leaving the
  // key present with an `undefined` value is invisible to React (which skips
  // `undefined` DOM props) but Vue's SSR renderer still serialises a present
  // `style` key as `style=""`, breaking cross-target parity when no override is
  // supplied.
  const normalizedProperties: MpPropertyBag = {};
  for (const [key, value] of Object.entries(rawProperties)) {
    if (value !== undefined) {
      normalizedProperties[key] = value;
    }
  }

  let rawChildren: MpChild[];
  if (children.length > 0) {
    rawChildren = children;
  } else if (inlineChildren === undefined) {
    rawChildren = [];
  } else if (Array.isArray(inlineChildren)) {
    rawChildren = [...(inlineChildren as readonly MpChild[])];
  } else {
    rawChildren = [inlineChildren as MpChild];
  }

  return {
    __mpElement: true,
    type: type as MpElementType,
    properties: normalizedProperties,
    children: flattenChildren(rawChildren),
  };
}
