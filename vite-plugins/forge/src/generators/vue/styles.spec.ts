import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type StyleImport, parseTsx } from '../../compiler/ast';

import { buildStyles } from './styles';

// `buildStyles` reads the imported stylesheet from disk relative to the neutral
// source, so the tests write a real `.module.scss` next to a source file whose
// `fileName` lives in the same temp directory.
describe('the Vue emitter builds `<style>` blocks', () => {
  let sourceDir: string;

  const styleImport = (specifier: string): StyleImport => ({
    name: 'styles',
    specifier,
    flatSpecifier: specifier,
    base: path.basename(specifier),
  });

  beforeEach(() => {
    sourceDir = mkdtempSync(path.join(tmpdir(), 'mp-styles-'));
    writeFileSync(path.join(sourceDir, 'forge-badge.module.scss'), '.forge-badge { color: red; }\n');
  });

  afterEach(() => {
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it('emits a **scoped** `<style lang="scss" scoped>` block for native-`<template>` SFCs', () => {
    const sourceFile = parseTsx(path.join(sourceDir, 'forge-badge.tsx'), '');
    const block = buildStyles([styleImport('./forge-badge.module.scss')], sourceFile, true);

    expect(block).toContain('<style lang="scss" scoped>');
    expect(block).toContain('.forge-badge { color: red; }');
  });

  it('emits an **unscoped** `<style lang="scss">` block for the render-closure fallback', () => {
    const sourceFile = parseTsx(path.join(sourceDir, 'forge-badge.tsx'), '');
    const block = buildStyles([styleImport('./forge-badge.module.scss')], sourceFile, false);

    expect(block).toContain('<style lang="scss">');
    expect(block).not.toContain('scoped');
  });

  it('skips stylesheet imports whose file is missing on disk', () => {
    const sourceFile = parseTsx(path.join(sourceDir, 'forge-badge.tsx'), '');
    const block = buildStyles([styleImport('./does-not-exist.module.scss')], sourceFile, true);

    expect(block).toBe('');
  });
});
