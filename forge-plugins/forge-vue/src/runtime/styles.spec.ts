import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, afterEach, beforeEach } from "vitest";

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
      ".forge-badge { color: red; }\n",
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
    expect(block).toContain(".forge-badge { color: red; }");
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
});
