/**
 * Ambient JSX typings for the classic (`jsxFactory: 'h'`) transform used to
 * author components against `@mission-platform/forge`. JSX expressions compile
 * into `h(...)` calls that return the framework-neutral `MpElement`, so the
 * global `JSX` namespace is wired up to that type rather than to any concrete
 * framework.
 *
 * This is **opt-in**: it is not pulled in automatically by importing
 * `@mission-platform/forge` (that would leak a global `JSX` namespace into apps
 * that author React/Vue JSX). A package that authors neutral components enables
 * it explicitly — e.g. via `compilerOptions.types` or a triple-slash reference:
 *
 * ```jsonc
 * // tsconfig.json
 * { "compilerOptions": { "types": ["@mission-platform/forge/jsx-globals"] } }
 * ```
 *
 * React 19's types no longer declare a global `JSX` namespace (they expose
 * `React.JSX` instead), so this declaration is free of conflicts even when
 * `@types/react` is installed.
 */
import type { MpChild, MpElement } from '@mission-platform/forge';

declare global {
  namespace JSX {
    type Element = MpElement;

    interface ElementChildrenAttribute {
      children: object;
    }

    interface IntrinsicElements {
      [tagName: string]: Record<string, unknown> & {
        // A child may be a single node, a list of nodes (e.g. `{items.map(…)}`),
        // or a mix of both alongside other children (e.g. a header element next
        // to a `{items.map(…)}` list). The `h` factory flattens nested arrays
        // recursively, so an array is valid in any child position — not just as
        // the sole child — hence the nested-array element type.
        children?: MpChild | readonly (MpChild | readonly MpChild[])[];
      };
    }
  }
}
