/**
 * DOM attribute aliases for the React target.
 *
 * A handful of DOM attribute names differ between the neutral dialect and
 * React's vocabulary; these are aliased both in JSX attributes and in the
 * object literals passed to explicit `h(…)` calls.
 */

/** DOM attribute names that differ between the neutral dialect and React. */
export const REACT_ALIASES: Readonly<Record<string, string>> = {
  autocapitalize: "autoCapitalize",
  autocomplete: "autoComplete",
  class: "className",
  fetchpriority: "fetchPriority",
  for: "htmlFor",
  inputmode: "inputMode",
  readonly: "readOnly",
  srcset: "srcSet",
  tabindex: "tabIndex",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-width": "strokeWidth",
  onDblclick: "onDoubleClick",
  onFocusin: "onFocus",
  onFocusout: "onBlur",
  onKeydown: "onKeyDown",
  onKeyup: "onKeyUp",
  onKeypress: "onKeyPress",
  onMouseenter: "onMouseEnter",
  onMouseleave: "onMouseLeave",
  onMousedown: "onMouseDown",
  onMouseup: "onMouseUp",
  onMousemove: "onMouseMove",
  onPointerdown: "onPointerDown",
  onPointerup: "onPointerUp",
  onPointercancel: "onPointerCancel",
  onPointermove: "onPointerMove",
  onPointerover: "onPointerOver",
  onPointerout: "onPointerOut",
  onPointerenter: "onPointerEnter",
  onPointerleave: "onPointerLeave",
};

/** Apply the React DOM alias table to a single attribute / prop key. */
export function aliasAttributeName(name: string): string {
  return REACT_ALIASES[name] ?? name;
}

/**
 * React hooks (and hook-adjacent factories) whose presence makes a module
 * **interactive** — it cannot render as a server component, so the emitter
 * prepends the `'use client'` directive.
 */
export const CLIENT_HOOKS: ReadonlySet<string> = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useReducer",
  "useRef",
  "useState",
  "useImperativeHandle",
  "useContext",
  "createContext",
  "useSyncExternalStore",
  "useTransition",
  "useDeferredValue",
  "useActionState",
  "useOptimistic",
  "useFormStatus",
]);
