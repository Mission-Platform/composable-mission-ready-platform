/**
 * SolidJS composable (hook-module) emitter.
 *
 * A neutral hook library — a composable, not a component, including a plain
 * context module such as a `createContext`/`useContext` pair — carries no JSX,
 * so the emit is the reactive-primitive rewrite (`useState` → `createSignal`
 * with getter call-site rewriting, `useEffect` → `createEffect`/`onMount`,
 * `useMemo` → `createMemo`, `useId` → `createUniqueId`) plus the neutral →
 * `solid-js` import swap. Both come from `../transformers`, so a composable and
 * a component agree on every rule.
 *
 * A hook module may additionally import a **sibling** composable/context module
 * or a write-once, framework-split workspace package; both are rewritten exactly
 * as the component emitter does — the relative specifier flattened to the
 * generated tree's flat layout, the workspace package carried through so its
 * `mp:solid` export condition resolves.
 */
import { createSolidLoweringContext } from "../transformers/context.js";
import { printSolidImports } from "../transformers/imports.js";
import { lowerStatement } from "../transformers/statements.js";

import type { SemanticModule } from "@mission-platform/forge-plugin-api";

/** Transform a neutral hook module into its SolidJS source. */
export function emitSolidHookModule(module: SemanticModule): string {
  const context = createSolidLoweringContext(module);
  // The declarations are lowered first: the import block is built from the
  // primitives the rewritten statements turned out to need.
  const declarations = module.ast.declarations.map((statement) =>
    lowerStatement(statement, context, 0),
  );
  const imports = printSolidImports(module, context);
  const sections = [imports.join("\n"), declarations.join("\n\n")].filter(
    (section) => section.trim().length > 0,
  );
  return `${sections.join("\n\n")}\n`;
}
