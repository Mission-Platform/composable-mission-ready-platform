/**
 * SFC `<style>` block construction for the Vue emitter.
 *
 * {@link buildStyles} reads each component's CSS-Module stylesheet from disk
 * (relative to the neutral source file recorded on the IR) and inlines it into
 * the generated SFC, so the component ships its own CSS.
 *
 * The block is emitted as `<style lang="scss" scoped>` whenever the SFC renders
 * through a native `<template>`, so Vue's `data-v-…` attribute reaches every
 * element and the component's styles stay isolated. The render-closure-fallback
 * SFCs render via a `render` closure delegated from the `<template>`, and Vue
 * only auto-applies a `<style scoped>` `data-v-…` attribute to that render
 * output's **root** vnode — nested elements never receive it, so scoped rules
 * silently fail to apply there. Those fall back to an **unscoped** block, whose
 * rules stay in the shared `@layer mp.components` cascade layer (preserved from
 * the source) and rely on the components' unique BEM class names.
 *
 * Relative Sass `@use` / `@forward` / `@import` partials (for example
 * `@use './forge-typography-properties'`) are expanded inline so the generated
 * SFC remains self-contained without a co-located partial on disk.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { StyleImport } from "@mission-platform/forge-plugin-api/compiler/ast.js";

/** A component-owned custom property backed by a reactive Vue expression. */
export interface VueStyleBinding {
  /** The stable custom property consumed by the component stylesheet. */
  readonly customProperty: string;
  /** The `<script setup>` expression exposed to Vue's CSS `v-bind()`. */
  readonly expression: string;
}

/**
 * Resolve a relative Sass partial specifier, including the underscore
 * convention (`./name` → `_name.scss`).
 */
function resolveScssPartial(
  fromDirectory: string,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  const resolved = path.resolve(fromDirectory, specifier);
  const directory = path.dirname(resolved);
  const base = path.basename(resolved);
  const candidates = [
    resolved,
    `${resolved}.scss`,
    `${resolved}.sass`,
    path.join(directory, `_${base}.scss`),
    path.join(directory, `_${base}.sass`),
    path.join(directory, `_${base}`),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * Inline relative Sass partials so Vue SFC style blocks do not depend on
 * sibling files that are not emitted next to the generated `.vue` source.
 */
function readStylesheetWithPartials(
  stylePath: string,
  seen: Set<string> = new Set(),
): string {
  if (seen.has(stylePath)) {
    return "";
  }
  seen.add(stylePath);
  const directory = path.dirname(stylePath);
  const source = readFileSync(stylePath, "utf8");
  return source
    .replace(
      /@(?:use|forward|import)\s+['"](\.[^'"]+)['"]\s*;?/g,
      (_full, specifier: string) => {
        const partial = resolveScssPartial(directory, specifier);
        if (partial === undefined) {
          return _full;
        }
        const inlined = readStylesheetWithPartials(partial, seen).replace(
          /\s+$/,
          "",
        );
        return inlined.length > 0 ? `${inlined}\n` : "";
      },
    )
    .replace(/\s+$/, "");
}

/** The BEM root corresponding to a co-located `forge-*.module.scss` file. */
function rootClass(styleImport: StyleImport): string {
  const base = styleImport.base.replace(/\.module\.(?:scss|sass|css)$/, "");
  return `.${base}`;
}

/** Keep Sass `@use` directives before the Vue-generated component rule. */
function insertAfterUses(css: string, rule: string): string {
  const firstRule = css.search(
    /^[ \t]*(?:@(?:layer|property|mixin|include)|[.#][\w-])/m,
  );
  const useMatches = [
    ...css.matchAll(/^[ \t]*@use\b[^;]*;[ \t]*(?:\r?\n|$)/gm),
  ].filter(
    ({ index }) =>
      firstRule === -1 || (index ?? Number.MAX_SAFE_INTEGER) < firstRule,
  );
  const lastUse = useMatches.at(-1);
  if (lastUse?.index === undefined) {
    return `${rule}\n\n${css}`;
  }
  const end = lastUse.index + lastUse[0].length;
  return `${css.slice(0, end)}${rule}\n\n${css.slice(end)}`;
}

/** The token fallback corresponding to a component-owned override property. */
function defaultToken(customProperty: string): string {
  return customProperty.replace(/^--forge-/, "--mp-");
}

/**
 * Add Vue's reactive CSS-variable declarations to the owning component root.
 *
 * The neutral render path still emits its regular `style` map. This declaration
 * is deliberately an additional Vue-only layer: it gives scoped native SFCs a
 * reactive source for the same inherited custom properties, while the
 * render-closure path remains ordinary unscoped Sass and never sees `v-bind()`.
 */
function withVueStyleBindings(
  css: string,
  styleImport: StyleImport,
  bindings: readonly VueStyleBinding[],
): string {
  const applicable = bindings.filter(({ customProperty }) =>
    css.includes(customProperty),
  );
  if (applicable.length === 0) {
    return css;
  }
  const declarations = applicable
    .map(
      ({ customProperty, expression }) =>
        `  ${customProperty}: v-bind('${expression} ?? "var(${defaultToken(customProperty)})"');`,
    )
    .join("\n");
  const rule = `${rootClass(styleImport)} {\n${declarations}\n}`;
  const layer = /@layer\s+([\w.-]+)\s*\{/.exec(css)?.[1];
  const layeredRule =
    layer === undefined ? rule : `@layer ${layer} {\n${rule}\n}`;
  return insertAfterUses(css, layeredRule);
}

/**
 * Build the SFC `<style lang="scss">` block(s) for the component's CSS-Module
 * imports, resolved relative to `fileName` (the neutral source module). When
 * `scoped` is `true` the block is emitted as `<style … scoped>`; callers pass
 * `true` for native-`<template>` SFCs (where scoping works) and `false` for the
 * render-closure fallback (where it silently fails).
 */
export function buildStyles(
  styleModuleImports: readonly StyleImport[],
  fileName: string,
  scoped: boolean,
  bindings: readonly VueStyleBinding[] = [],
): string {
  const blocks: string[] = [];
  const sourceDirectory = path.dirname(fileName);
  for (const styleImport of styleModuleImports) {
    const stylePath = path.resolve(sourceDirectory, styleImport.specifier);
    if (!existsSync(stylePath)) {
      continue;
    }
    const lang = /\.(scss|sass)$/.test(styleImport.specifier)
      ? ' lang="scss"'
      : "";
    const attributes = `${lang}${scoped ? " scoped" : ""}`;
    const source = readStylesheetWithPartials(stylePath);
    const css = scoped
      ? withVueStyleBindings(source, styleImport, bindings)
      : source;
    blocks.push(`<style${attributes}>\n${css}\n</style>`);
  }
  return blocks.join("\n");
}
