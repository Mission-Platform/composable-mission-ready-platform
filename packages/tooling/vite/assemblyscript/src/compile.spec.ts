import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { compileAssemblyScript } from './compile';

describe('compileAssemblyScript', () => {
  it('isolates default intermediates for concurrent invocations', async () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'assemblyscript-compile-'));
    const firstEntry = join(rootDir, 'first.ts');
    const secondEntry = join(rootDir, 'second.ts');
    const firstOutput = join(rootDir, 'first.generated.js');
    const secondOutput = join(rootDir, 'second.generated.js');

    try {
      writeFileSync(firstEntry, 'export function first(): i32 { return 1; }\n');
      writeFileSync(secondEntry, 'export function second(): i32 { return 2; }\n');

      await Promise.all([
        compileAssemblyScript({ entry: firstEntry, outFile: firstOutput, rootDir }),
        compileAssemblyScript({ entry: secondEntry, outFile: secondOutput, rootDir }),
      ]);

      const firstWasm = readFileSync(firstOutput, 'utf8').match(/const WASM_BASE64 = "([^"]+)"/u)?.[1];
      const secondWasm = readFileSync(secondOutput, 'utf8').match(/const WASM_BASE64 = "([^"]+)"/u)?.[1];

      expect(firstWasm).toBeDefined();
      expect(secondWasm).toBeDefined();
      expect(firstWasm).not.toBe(secondWasm);
      expect(readdirSync(join(rootDir, 'build'))).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('preserves an explicitly configured intermediate path', async () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'assemblyscript-compile-'));
    const wasmPath = join(rootDir, 'custom', 'module.wasm');

    try {
      writeFileSync(join(rootDir, 'entry.ts'), 'export function answer(): i32 { return 42; }\n');

      await compileAssemblyScript({
        entry: 'entry.ts',
        outFile: 'generated.js',
        wasmFile: 'custom/module.wasm',
        rootDir,
      });

      expect(existsSync(wasmPath)).toBe(true);
      expect(existsSync(wasmPath.replace(/\.wasm$/u, '.js'))).toBe(true);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
