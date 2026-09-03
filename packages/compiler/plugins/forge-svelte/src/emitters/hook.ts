/**
 * Svelte hook-module emitter.
 *
 * Svelte runes only run inside `.svelte`/`.svelte.ts` modules, so a neutral hook
 * library — a plain composable, or a context module such as a
 * `createContext`/`useContext` pair — is emitted as a plain, importable `.ts`
 * module rather than an SFC. The neutral React-style hooks (`useState`/
 * `useRef`/`useEffect`/…) and the context primitives are the framework-neutral
 * runtime baseline — deliberately render-once, side-effect-free implementations
 * — which stay valid, non-throwing glue for a plain `.ts` module (only a
 * *rendered* `<Ctx.Provider>` element, which never appears in a hook module,
 * would hit the neutral `Provider`'s throw-on-call guard). They are therefore
 * kept against the neutral package rather than remapped to a bespoke Svelte
 * mechanism, mirroring how the React target needs no bespoke hook emitter
 * either.
 *
 * Only the imports are rewritten (see `../transformers/imports.js`); every
 * other module-level statement is carried over as the exact source text the
 * frontend recorded for it.
 */

import { hookImports } from "../transformers/imports.js";

import type { SemanticModule } from "@mission-platform/forge-plugin-api";

/** Print a neutral hook/composable module as its Svelte-target `.ts` source. */
export function emitSvelteHookModule(module: SemanticModule): string {
  const lines = [
    ...hookImports(module.ast.imports),
    ...module.ast.declarations.map((statement) => statement.text.text),
  ];
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}
