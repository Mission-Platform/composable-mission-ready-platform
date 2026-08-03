/**
 * SFC `<style>` block construction for the Vue emitter.
 *
 * {@link buildStyles} reads each component's CSS-Module stylesheet from disk
 * (relative to the neutral source) and inlines it into the generated SFC, so the
 * component ships its own CSS.
 *
 * The block is emitted as `<style lang="scss" scoped>` whenever the SFC renders
 * through a native `<template>`, so Vue's `data-v-…` attribute reaches every
 * element and the component's styles stay isolated. The render-closure-fallback
 * SFCs render via a `render` closure delegated from the `<template>`
 * (`<component :is="render" />`), and Vue only auto-applies a `<style scoped>`
 * `data-v-…` attribute to that render output's **root** vnode — nested elements
 * (e.g. the drawer/hero/navbar internals) never receive it, so scoped rules
 * silently fail to apply there. Those fall back to an **unscoped** block, whose
 * rules stay in the shared `@layer mp.components` cascade layer (preserved from
 * the source) and rely on the components' unique BEM class names — exactly how
 * the original `@mission-platform/components` SFCs are namespaced — so the
 * styling applies to every element and matches the originals.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { type StyleImport } from '../../compiler/ast.js';

import type ts from 'typescript';

/**
 * Build the SFC `<style lang="scss">` block(s) for the component's CSS-Module
 * imports. When `scoped` is `true` the block is emitted as `<style … scoped>`;
 * callers pass `true` for native-`<template>` SFCs (where scoping works) and
 * `false` for the render-closure fallback (where it silently fails).
 */
export function buildStyles(styleModuleImports: StyleImport[], sourceFile: ts.SourceFile, scoped: boolean): string {
  const blocks: string[] = [];
  const sourceDir = path.dirname(sourceFile.fileName);
  for (const styleImport of styleModuleImports) {
    const stylePath = path.resolve(sourceDir, styleImport.specifier);
    if (!existsSync(stylePath)) {
      continue;
    }
    const lang = /\.(scss|sass)$/.test(styleImport.specifier) ? ' lang="scss"' : '';
    const attributes = `${lang}${scoped ? ' scoped' : ''}`;
    const css = readFileSync(stylePath, 'utf8').replace(/\s+$/, '');
    blocks.push(`<style${attributes}>\n${css}\n</style>`);
  }
  return blocks.join('\n');
}
