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
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { StyleImport } from "@mission-platform/forge-plugin-api/compiler/ast.js";

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
    const css = readFileSync(stylePath, "utf8").replace(/\s+$/, "");
    blocks.push(`<style${attributes}>\n${css}\n</style>`);
  }
  return blocks.join("\n");
}
