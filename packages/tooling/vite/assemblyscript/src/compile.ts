import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { buildGeneratedModule, extractInstantiate } from './generate.js';

// The published `assemblyscript/asc` type definitions re-export a virtual
// module (`types:assemblyscript/cli/index`) that a standard `tsc` project
// cannot resolve, so we model the tiny slice of the compiler API we rely on.
interface AscResult {
  error: Error | null;
  stdout: { toString(): string };
  stderr: { toString(): string };
}
interface AscModule {
  main(argv: string[], options?: Record<string, unknown>): Promise<AscResult>;
}

/** Options controlling AssemblyScript compilation and code generation. */
export interface AssemblyScriptCompileOptions {
  /** Entry `.ts` file, relative to `rootDir` (or absolute). */
  entry: string;
  /**
   * Path of the generated, self-contained ES module to emit (base64-inlined
   * wasm + `loadModule()`), relative to `rootDir` (or absolute).
   */
  outFile: string;
  /**
   * Intermediate `.wasm` path used by the compiler, relative to `rootDir` (or
   * absolute). Defaults to a unique temporary path under `build/`.
   */
  wasmFile?: string;
  /** Base directory for resolving relative paths. Defaults to `process.cwd()`. */
  rootDir?: string;
  /** `asc` optimize level (`-O`). Defaults to `3`. */
  optimizeLevel?: number;
  /** `asc` shrink level. Defaults to `1`. */
  shrinkLevel?: number;
  /** Also emit a human-readable `.wat` next to the wasm. Defaults to `false`. */
  emitText?: boolean;
}

function resolvePath(rootDir: string, value: string): string {
  return isAbsolute(value) ? value : resolve(rootDir, value);
}

/**
 * Compile an AssemblyScript entry to WebAssembly and emit a single
 * self-contained ES module with the wasm binary inlined as base64.
 *
 * Runs the AssemblyScript compiler programmatically (no external CLI process),
 * then post-processes the ESM bindings so instantiation is driven from the
 * inlined binary rather than a `.wasm` URL.
 */
export async function compileAssemblyScript(options: AssemblyScriptCompileOptions): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const entryPath = resolvePath(rootDir, options.entry);
  const outPath = resolvePath(rootDir, options.outFile);
  let temporaryDirectory: string | undefined;
  let wasmPath: string;
  if (options.wasmFile === undefined) {
    mkdirSync(resolve(rootDir, 'build'), { recursive: true });
    temporaryDirectory = mkdtempSync(resolve(rootDir, 'build/assemblyscript-'));
    wasmPath = resolve(temporaryDirectory, 'module.wasm');
  } else {
    wasmPath = resolvePath(rootDir, options.wasmFile);
  }
  const bindingsPath = wasmPath.replace(/\.wasm$/u, '.js');
  const optimizeLevel = options.optimizeLevel ?? 3;
  const shrinkLevel = options.shrinkLevel ?? 1;

  try {
    mkdirSync(dirname(wasmPath), { recursive: true });

    const argv = [
      entryPath,
      '--outFile',
      wasmPath,
      '--bindings',
      'esm',
      '--exportRuntime',
      '--optimizeLevel',
      String(optimizeLevel),
      '--shrinkLevel',
      String(shrinkLevel),
    ];
    if (options.emitText) {
      argv.push('--textFile', wasmPath.replace(/\.wasm$/u, '.wat'));
    }

    const asc = (await import('assemblyscript/asc')).default as unknown as AscModule;
    const { error, stderr } = await asc.main(argv, {});
    if (error) {
      throw new Error(`AssemblyScript compilation failed: ${error.message}\n${stderr.toString()}`);
    }

    const wasm = readFileSync(wasmPath);
    const bindings = readFileSync(bindingsPath, 'utf8');
    const moduleSource = buildGeneratedModule(wasm.toString('base64'), extractInstantiate(bindings));

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, moduleSource, 'utf8');
  } finally {
    if (temporaryDirectory !== undefined) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }
}
