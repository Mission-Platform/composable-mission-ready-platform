import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  discoverPackageRoots,
  extractFlintSymbols,
  extractPackageDocs,
  extractTypeScriptSymbols,
  formatGeneratedDocumentation,
  renderReferenceMarkdown,
} from './extract-package-docs.ts';

const temporaryDirectories: string[] = [];
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function createDocumentationPackage(parentDirectory: string, packageName: string): Promise<string> {
  const packageRoot = join(parentDirectory, packageName);
  await mkdir(join(packageRoot, 'src'), { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: `@mission-platform/${packageName}`,
      exports: { '.': { types: './dist/index.d.ts' } },
    }),
    'utf8',
  );
  await writeFile(
    join(packageRoot, 'src', 'index.ts'),
    `/**
 * Adds one to a value.
 *
 * @param input Input value.
 * @returns The incremented value.
 */
export function add(input: number): number { return input + 1; }
`,
    'utf8',
  );
  return packageRoot;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

describe('package API documentation extraction', () => {
  it('does not discover generated extension server packages', async () => {
    const temporaryRoot = await createTemporaryDirectory('discover-package-roots-');
    await mkdir(join(temporaryRoot, 'packages'), { recursive: true });
    await mkdir(join(temporaryRoot, 'extensions', 'flint-vscode', 'server', 'dap'), { recursive: true });
    await mkdir(join(temporaryRoot, 'extensions', 'public-package'), { recursive: true });
    await writeFile(
      join(temporaryRoot, 'extensions', 'flint-vscode', 'server', 'dap', 'package.json'),
      JSON.stringify({ name: '@mission-platform/generated-dap' }),
      'utf8',
    );
    await writeFile(
      join(temporaryRoot, 'extensions', 'public-package', 'package.json'),
      JSON.stringify({ name: '@mission-platform/public-extension' }),
      'utf8',
    );

    const roots = await discoverPackageRoots(temporaryRoot);

    expect(roots).toEqual([join(temporaryRoot, 'extensions', 'public-package')]);
  });

  it('extracts public exports from an entrypoint and excludes implementation helpers', async () => {
    const symbols = await extractTypeScriptSymbols(
      fileURLToPath(new URL('../packages/integrations/barcode-wasm', import.meta.url)),
      {
        exports: { '.': { types: './dist/index.d.ts' } },
      },
    );

    expect(symbols.some(({ name }) => name === 'encodeBarcode')).toBe(true);
    expect(symbols.some(({ name }) => name === 'encodeBarcodeAsync')).toBe(true);
    expect(symbols.every(({ name }) => name !== 'encodeNative')).toBe(true);
  });

  it('renders constant signatures without duplicating the binding name', async () => {
    const symbols = await extractTypeScriptSymbols(
      fileURLToPath(new URL('../packages/flint/stdlib', import.meta.url)),
      {
        exports: { '.': { types: './dist/index.d.ts' } },
      },
    );

    const identity = symbols.find(({ name }) => name === 'FLINT_STDLIB_IDENTITY');
    expect(identity?.signature).toBe('export const FLINT_STDLIB_IDENTITY');
    expect(identity?.signature).not.toContain('FLINT_STDLIB_IDENTITY FLINT_STDLIB_IDENTITY');
  });

  it('follows local re-exports and preserves declaration documentation and aliases', async () => {
    const packageRoot = await createTemporaryDirectory('extract-typescript-');
    await mkdir(join(packageRoot, 'src', 'internal'), { recursive: true });
    await writeFile(
      join(packageRoot, 'src', 'internal', 'value.ts'),
      `/**
 * A documented value factory.
 *
 * @param input The source value.
 * @returns The normalized value.
 */
export function createValue(input: string): string { return input.trim(); }
`,
      'utf8',
    );
    await writeFile(
      join(packageRoot, 'src', 'internal', 'tsx.tsx'),
      `/** A TSX declaration. */
export interface Renderable { render(): JSX.Element; }
`,
      'utf8',
    );
    await writeFile(
      join(packageRoot, 'src', 'index.ts'),
      `export { createValue as makeValue } from './internal/value';
export * from './internal/value';
export type { Renderable } from './internal/tsx';
`,
      'utf8',
    );

    const symbols = await extractTypeScriptSymbols(packageRoot, {
      name: '@mission-platform/extract-typescript-fixture',
      exports: { '.': { types: './dist/index.d.ts' } },
    });

    expect(symbols.map(({ name }) => name)).toEqual(['Renderable', 'createValue', 'makeValue']);
    expect(symbols.find(({ name }) => name === 'createValue')).toMatchObject({
      description: 'A documented value factory.',
      signature: 'function createValue(input: string): string',
      tags: [
        { name: 'param', text: 'The source value.' },
        { name: 'returns', text: 'The normalized value.' },
      ],
      parameters: [{ name: 'input', type: 'string', description: 'The source value.' }],
      sourceModule: 'src/internal/value',
    });
    expect(symbols.find(({ name }) => name === 'Renderable')).toMatchObject({
      kind: 'interface',
      signature: 'export interface Renderable',
      sourceModule: 'src/internal/tsx',
    });
  });

  it('only extracts JSDoc and unwraps defaulted and rest parameters', async () => {
    const packageRoot = await createTemporaryDirectory('extract-parameters-');
    await mkdir(join(packageRoot, 'src'), { recursive: true });
    await writeFile(
      join(packageRoot, 'src', 'index.ts'),
      `/* This block comment is not API documentation. */
export interface Undocumented {}

/**
 * Builds a value.
 *
 * @param options Build options.
 * @param rest Additional values.
 */
export function build(options: BuildOptions = {}, ...rest: string[]): void {}
`,
      'utf8',
    );

    const symbols = await extractTypeScriptSymbols(packageRoot, {
      name: '@mission-platform/extract-parameter-fixture',
      exports: { '.': { types: './dist/index.d.ts' } },
    });

    expect(symbols.find(({ name }) => name === 'Undocumented')).toMatchObject({
      description: 'No description provided.',
    });
    expect(symbols.find(({ name }) => name === 'build')).toMatchObject({
      signature: 'function build(options: BuildOptions = {}, ...rest: string[]): void',
      parameters: [
        { name: 'options', type: 'BuildOptions', description: 'Build options.' },
        { name: 'rest', type: 'string[]', description: 'Additional values.' },
      ],
    });
    const markdown = renderReferenceMarkdown({
      packageName: '@mission-platform/extract-parameter-fixture',
      packageRoot,
      symbols,
    });
    expect(markdown).toContain('| options | BuildOptions | Build options. |');
    expect(markdown).toContain('| rest | string[] | Additional values. |');
    expect(markdown).not.toContain('| options: BuildOptions = {} |');
  });

  it('extracts documented public Flint declarations through the real parser', async () => {
    const packageRoot = await createTemporaryDirectory('extract-flint-');
    await mkdir(join(packageRoot, 'flint'), { recursive: true });
    await writeFile(
      join(packageRoot, 'flint', 'option.flint'),
      `/**
 * Optional value container.
 */
export enum Option<T> {
  None,
  Some(T),
}

/**
 * Returns true when the option holds a value.
 *
 * @param value Option value to inspect.
 * @returns true for Some.
 */
export fn is_some<T>(value: Option<T>) -> bool {
  return match value {
    Option::None => false,
    Option::Some(_) => true,
  };
}

fn helper() -> unit {}
`,
      'utf8',
    );

    const parserPath = fileURLToPath(new URL('../packages/flint/core/dist/parser.js', import.meta.url));
    const parserModule = (await import(pathToFileURL(parserPath).href)) as {
      readonly parseFlint: (
        source: string,
        fileName?: string,
        options?: { readonly root?: string },
      ) => {
        readonly module?: {
          readonly functions: readonly FlintSymbol[];
          readonly enums: readonly FlintSymbol[];
          readonly structs: readonly FlintSymbol[];
          readonly interfaces: readonly FlintSymbol[];
        };
        readonly diagnostics: readonly { readonly severity: string; readonly message: string }[];
      };
    };

    const symbols = await extractFlintSymbols(packageRoot, {
      parseFlint: parserModule.parseFlint,
    });

    expect(symbols.map(({ name }) => name).sort()).toEqual(['Option', 'is_some']);
    expect(symbols.every(({ kind }) => kind === 'flint-export')).toBe(true);
    expect(symbols.find(({ name }) => name === 'Option')?.signature).toBe('export enum Option');
    expect(symbols.find(({ name }) => name === 'is_some')?.signature).toContain('export fn is_some');
    expect(symbols.find(({ name }) => name === 'is_some')?.parameters).toEqual([
      expect.objectContaining({ name: 'value', type: 'Option<T>', description: 'Option value to inspect.' }),
    ]);
    expect(symbols.every(({ name }) => name !== 'helper')).toBe(true);

    const markdown = renderReferenceMarkdown({
      packageName: '@mission-platform/example-flint',
      packageRoot,
      symbols,
    });
    expect(markdown).toContain('**Kind:** flint-export');
    expect(markdown).toContain('### Option');
    expect(markdown).toContain('### is_some');
    expect(markdown).toContain('| value | Option<T> | Option value to inspect. |');
  });

  it('renders symbols in the supplied stable order with generated-file metadata', () => {
    const markdown = renderReferenceMarkdown({
      packageName: '@mission-platform/example',
      packageRoot: '/workspace/example',
      symbols: [
        {
          name: 'first',
          kind: 'function',
          signature: 'function first(value: string): string',
          description: 'First value.',
          parameters: [{ name: 'value', type: 'string', description: 'Input.' }],
          tags: [{ name: 'returns', text: 'The value.' }],
          sourceModule: 'src/index',
        },
      ],
    });

    expect(markdown).toContain('<!-- Generated by scripts/extract-package-docs.ts. Do not edit. -->');
    expect(markdown).toContain('### first');
    expect(markdown).toContain('| value | string | Input. |');
    expect(markdown).toContain('- **@returns:** The value.');
  });

  it('runs ESLint autofix before Prettier for the exact generated output path', async () => {
    const packageRoot = await createTemporaryDirectory('format-generated-');
    const outputPath = join(packageRoot, 'docs/reference/generated/api.md');
    const commands: { readonly file: string; readonly args: readonly string[]; readonly cwd?: string }[] = [];

    await formatGeneratedDocumentation(repositoryRoot, outputPath, async (file, args, options) => {
      commands.push({ file, args, cwd: options.cwd });
      return { stderr: '', stdout: '' };
    });

    expect(commands).toEqual([
      {
        file: resolve(repositoryRoot, 'scripts/node_modules/.bin/eslint'),
        args: ['--config', resolve(repositoryRoot, 'scripts/generated-docs-eslint.config.js'), '--fix', outputPath],
        cwd: repositoryRoot,
      },
      {
        file: resolve(repositoryRoot, 'scripts/node_modules/.bin/prettier'),
        args: ['--write', outputPath],
        cwd: repositoryRoot,
      },
    ]);
  });

  it('formats a single package without changing hand-authored documentation', async () => {
    const temporaryRoot = await createTemporaryDirectory('generate-single-package-');
    const packageRoot = await createDocumentationPackage(temporaryRoot, 'single-package');
    const handAuthoredPath = join(packageRoot, 'docs', 'README.md');
    const handAuthoredContent = '# Hand-authored documentation\n\nKeep this content unchanged.\n';
    await mkdir(join(packageRoot, 'docs'), { recursive: true });
    await writeFile(handAuthoredPath, handAuthoredContent, 'utf8');
    await mkdir(join(packageRoot, 'docs/reference/generated'), { recursive: true });
    const stalePath = join(packageRoot, 'docs/reference/generated', 'stale.md');
    await writeFile(stalePath, 'stale generated output', 'utf8');

    await extractPackageDocs(repositoryRoot, packageRoot);

    const outputPath = join(packageRoot, 'docs/reference/generated/api.md');
    const markdown = await readFile(outputPath, 'utf8');
    expect(markdown).toContain('<!-- Generated by scripts/extract-package-docs.ts. Do not edit. -->');
    expect(markdown).toContain('# @mission-platform/single-package API reference');
    expect(markdown).toContain('### add');
    expect(markdown).toContain('```typescript\nfunction add(input: number): number;\n```');
    expect(markdown).toContain('#### Parameters');
    expect(markdown).toContain('| input | number | Input value. |');
    expect(markdown).toContain('#### Contract');
    expect(markdown).toContain('- **@returns:** The incremented value.');
    expect(await readFile(handAuthoredPath, 'utf8')).toBe(handAuthoredContent);
    expect(await pathExists(stalePath)).toBe(false);
  }, 120_000);

  it('formats concurrent all-package outputs independently and is idempotent', async () => {
    const temporaryRoot = await createTemporaryDirectory('generate-all-packages-');
    const packageRoots = await Promise.all([
      createDocumentationPackage(temporaryRoot, 'first-package'),
      createDocumentationPackage(temporaryRoot, 'second-package'),
    ]);
    const unrelatedPath = join(temporaryRoot, 'README.md');
    const unrelatedContent = '# Repository fixture\n';
    await writeFile(unrelatedPath, unrelatedContent, 'utf8');

    await Promise.all(packageRoots.map((packageRoot) => extractPackageDocs(repositoryRoot, packageRoot)));
    const firstOutputPath = join(packageRoots[0], 'docs/reference/generated/api.md');
    const secondOutputPath = join(packageRoots[1], 'docs/reference/generated/api.md');
    const firstOutput = await readFile(firstOutputPath, 'utf8');
    const secondOutput = await readFile(secondOutputPath, 'utf8');

    expect(firstOutput).toContain('# @mission-platform/first-package API reference');
    expect(secondOutput).toContain('# @mission-platform/second-package API reference');
    expect(firstOutput).toContain('```typescript\nfunction add(input: number): number;\n```');
    expect(secondOutput).toContain('| input | number | Input value. |');
    expect(await readFile(unrelatedPath, 'utf8')).toBe(unrelatedContent);

    await Promise.all(packageRoots.map((packageRoot) => extractPackageDocs(repositoryRoot, packageRoot)));

    expect(await readFile(firstOutputPath, 'utf8')).toBe(firstOutput);
    expect(await readFile(secondOutputPath, 'utf8')).toBe(secondOutput);
  }, 120_000);
});

interface FlintSymbol {
  readonly kind: string;
  readonly name: string;
  readonly documentation?: {
    readonly description: string;
    readonly tags: readonly { readonly name: string; readonly subject?: string; readonly text: string }[];
  };
  readonly exported?: boolean;
  readonly parameters?: readonly { readonly name: string; readonly type: unknown }[];
  readonly result?: unknown;
  readonly iterable?: boolean;
}
