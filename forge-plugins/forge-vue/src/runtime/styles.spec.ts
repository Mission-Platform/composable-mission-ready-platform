import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { compileScript, compileStyle, parse } from "vue/compiler-sfc";

import { buildStyles } from "./styles.js";

import type { StyleImport } from "@mission-platform/forge-plugin-api/compiler/ast.js";

// `buildStyles` reads the imported stylesheet from disk relative to the neutral
// source, so the tests write a real `.module.scss` next to a source file whose
// recorded `fileName` lives in the same temp directory.
describe("the Vue emitter builds `<style>` blocks", () => {
  let sourceDirectory: string;

  const styleImport = (specifier: string): StyleImport => ({
    name: "styles",
    specifier,
    flatSpecifier: specifier,
    base: path.basename(specifier),
  });

  beforeEach(() => {
    sourceDirectory = mkdtempSync(path.join(tmpdir(), "mp-styles-"));
    writeFileSync(
      path.join(sourceDirectory, "forge-badge.module.scss"),
      "@layer mp.components { .forge-badge { color: var(--forge-badge-color, red); } }\n",
    );
  });

  afterEach(() => {
    rmSync(sourceDirectory, { recursive: true, force: true });
  });

  it('emits a **scoped** `<style lang="scss" scoped>` block for native-`<template>` SFCs', () => {
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./forge-badge.module.scss")],
      fileName,
      true,
    );

    expect(block).toContain('<style lang="scss" scoped>');
    expect(block).toContain(
      ".forge-badge { color: var(--forge-badge-color, red); }",
    );
  });

  it('emits an **unscoped** `<style lang="scss">` block for the render-closure fallback', () => {
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./forge-badge.module.scss")],
      fileName,
      false,
    );

    expect(block).toContain('<style lang="scss">');
    expect(block).not.toContain("scoped");
  });

  it("skips stylesheet imports whose file is missing on disk", () => {
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./does-not-exist.module.scss")],
      fileName,
      true,
    );

    expect(block).toBe("");
  });

  it("inlines relative Sass @use partials into the SFC style block", () => {
    writeFileSync(
      path.join(sourceDirectory, "_forge-badge-properties.scss"),
      "@property --forge-badge-color {\n  syntax: '<color>';\n  inherits: true;\n  initial-value: transparent;\n}\n",
    );
    writeFileSync(
      path.join(sourceDirectory, "forge-badge.module.scss"),
      "@use './forge-badge-properties';\n\n.forge-badge { color: var(--forge-badge-color, red); }\n",
    );
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./forge-badge.module.scss")],
      fileName,
      true,
    );

    expect(block).toContain("@property --forge-badge-color");
    expect(block).toContain(
      ".forge-badge { color: var(--forge-badge-color, red); }",
    );
    expect(block).not.toContain("@use './forge-badge-properties'");
  });

  it("injects reactive bindings on the component root for scoped SFC styles", () => {
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./forge-badge.module.scss")],
      fileName,
      true,
      [
        {
          customProperty: "--forge-badge-color",
          expression: '$props.properties?.["color"]',
        },
      ],
    );

    expect(block).toContain(
      `.forge-badge {\n  --forge-badge-color: v-bind('$props.properties?.["color"] ?? "var(--mp-badge-color)"');\n}`,
    );
    expect(block).toContain("@layer mp.components {");
    const source = block.match(/<style[^>]*>\n([\s\S]*)\n<\/style>/)?.[1];
    expect(source).toBeDefined();
    const compiled = compileStyle({
      filename: `${fileName}.vue`,
      id: "data-v-forge-badge",
      scoped: true,
      preprocessLang: "scss",
      source: source!,
    });
    expect(compiled.errors).toHaveLength(0);
    expect(compiled.code).toContain("--forge-badge-color: var(");

    const parsed = parse(
      `<script setup lang="ts">\nconst properties = defineProps<{ properties?: { color?: string } }>();\n</script>\n${block}`,
      { filename: `${fileName}.vue` },
    );
    expect(parsed.errors).toHaveLength(0);
    expect(
      compileScript(parsed.descriptor, { id: "data-v-forge-badge" }).content,
    ).toContain("useCssVars");
  });

  it("keeps existing Sass @use directives before injected rules", () => {
    writeFileSync(
      path.join(sourceDirectory, "forge-badge.module.scss"),
      "@use 'sass:math';\n\n@layer mp.components { .forge-badge { color: var(--forge-badge-color, red); } }\n",
    );
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./forge-badge.module.scss")],
      fileName,
      true,
      [
        {
          customProperty: "--forge-badge-color",
          expression: '$props.properties?.["color"]',
        },
      ],
    );

    expect(block.indexOf("@use 'sass:math';")).toBeLessThan(
      block.indexOf("--forge-badge-color: v-bind("),
    );
  });

  it("does not leak Vue bindings into render-closure styles", () => {
    const fileName = path.join(sourceDirectory, "forge-badge.tsx");
    const block = buildStyles(
      [styleImport("./forge-badge.module.scss")],
      fileName,
      false,
      [
        {
          customProperty: "--forge-badge-color",
          expression: '$props.properties?.["color"]',
        },
      ],
    );

    expect(block).not.toContain("v-bind(");
    expect(block).toContain(
      ".forge-badge { color: var(--forge-badge-color, red); }",
    );
  });
});
