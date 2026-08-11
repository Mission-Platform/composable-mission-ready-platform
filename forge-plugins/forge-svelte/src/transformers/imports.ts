/**
 * Import lowering for the Svelte target.
 *
 * Both emitters rebuild their import lines from `GenericImport` facts — the
 * frontend already split every clause into value/type names, a default binding
 * and a namespace binding, so nothing has to be re-parsed:
 * - the neutral `@mission-platform/forge` import is owned by the **lowering
 *   plan** for a component (which resolves the runtime values it keeps, the
 *   `MpRenderProperty` redirect to the co-located per-framework JSX types
 *   module, and the Svelte lifecycles it needs) and by the pass below for a
 *   hook module, which carries no plan,
 * - a relative **sibling component** import flattens to `./<base>.svelte` and
 *   binds the PascalCase component name the template actually uses,
 * - every other import is carried over verbatim, with a relative specifier
 *   flattened into the generated tree's flat layout.
 */

import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_MODULE,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import {
  flattenSpecifier,
  importBase,
  toPascalCase,
} from "../runtime/names.js";

import type { GenericImport } from "@mission-platform/forge-plugin-api";

/** Swap the module specifier of an import statement's own source text. */
function withSpecifier(entry: GenericImport, specifier: string): string {
  if (specifier === entry.source) {
    return entry.text;
  }
  const quoted = [`'${entry.source}'`, `"${entry.source}"`];
  for (const needle of quoted) {
    const index = entry.text.lastIndexOf(needle);
    if (index !== -1) {
      return `${entry.text.slice(0, index)}'${specifier}'${entry.text.slice(index + needle.length)}`;
    }
  }
  return entry.text;
}

/**
 * The default-import binding a flattened `.svelte` sibling import uses — the
 * PascalCase component name actually referenced in the template. Neutral
 * components import their siblings by **name** (`import { ForgeTypography }
 * from '../forge-typography'`), not as a default import, so the binding is read
 * off that named import (falling back to a default import's own name, or
 * finally the PascalCase of the file base when neither shape is present).
 */
function siblingBinding(entry: GenericImport, base: string): string {
  return entry.defaultName ?? entry.valueNames[0] ?? toPascalCase(base);
}

/**
 * Whether a sibling import carries any runtime **value** binding at all —
 * `false` for a wholly `import type { … }` statement (e.g. `import type
 * { MenuNode } from '../forge-menu'`, which pulls in only a type, never the
 * component itself). Such a statement must not also emit a default `.svelte`
 * value import: there would be nothing to bind it to, and Svelte's script
 * parser does not erase `import type` early enough to tolerate the resulting
 * duplicate identifier.
 */
function hasValueBinding(entry: GenericImport): boolean {
  return !entry.typeOnly && entry.valueNames.length > 0;
}

/**
 * The `<script>` import lines a generated `.svelte` component carries over from
 * its neutral source. The neutral package's own import is skipped: the lowering
 * plan decides which of its values and types survive.
 */
export function componentImports(
  imports: readonly GenericImport[],
  componentFolders: ReadonlySet<string>,
): string[] {
  const lines: string[] = [];
  for (const entry of imports) {
    if (entry.source === NEUTRAL_MODULE) {
      continue;
    }
    if (!entry.source.startsWith(".")) {
      lines.push(entry.text);
      continue;
    }
    const base = importBase(entry.source);
    if (!componentFolders.has(base)) {
      lines.push(
        withSpecifier(entry, flattenSpecifier(entry.source, componentFolders)),
      );
      continue;
    }
    const specifier = `${flattenSpecifier(entry.source, componentFolders)}.svelte`;
    const binding = hasValueBinding(entry)
      ? siblingBinding(entry, base)
      : undefined;
    if (binding !== undefined) {
      lines.push(`import ${binding} from '${specifier}';`);
    }
    // A type carried alongside (or, for a wholly `import type { … }` statement,
    // in place of) the component's own value import — dropped when it shares the
    // value binding's identifier, which Svelte's script parser would reject as a
    // duplicate declaration.
    const typeNames = entry.typeNames.filter((name) => name !== binding);
    if (typeNames.length > 0) {
      lines.push(
        `import type { ${typeNames.join(", ")} } from '${specifier}';`,
      );
    }
  }
  return lines;
}

/** The import lines of a generated `.ts` hook/composable module. */
export function hookImports(imports: readonly GenericImport[]): string[] {
  const lines: string[] = [];
  for (const entry of imports) {
    if (entry.source === NEUTRAL_MODULE) {
      // A pure compile-time marker (`Slot`/`Dynamic`/`hasSlot`) is dropped: a
      // hook module carries no JSX, so one can never legitimately appear, and it
      // must never be forwarded to a target with no matching import either.
      const values = entry.valueNames.filter(
        (name) => !NEUTRAL_COMPILE_TIME_MARKERS.has(name),
      );
      if (values.length > 0) {
        lines.push(`import { ${values.join(", ")} } from '${NEUTRAL_MODULE}';`);
      }
      const localTypes = entry.typeNames.filter((name) =>
        LOCAL_JSX_TYPE_NAMES.has(name),
      );
      if (localTypes.length > 0) {
        lines.push(
          `import type { ${localTypes.join(", ")} } from '${LOCAL_JSX_TYPES_MODULE}';`,
        );
      }
      const neutralTypes = entry.typeNames.filter(
        (name) => !LOCAL_JSX_TYPE_NAMES.has(name),
      );
      if (neutralTypes.length > 0) {
        lines.push(
          `import type { ${neutralTypes.join(", ")} } from '${NEUTRAL_MODULE}';`,
        );
      }
      continue;
    }
    lines.push(
      entry.source.startsWith(".")
        ? withSpecifier(entry, `./${importBase(entry.source)}`)
        : entry.text,
    );
  }
  return lines;
}
