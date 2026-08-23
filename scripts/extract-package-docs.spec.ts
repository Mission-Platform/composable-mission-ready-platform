import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  extractFwsSymbols,
  extractTypeScriptSymbols,
  renderReferenceMarkdown,
} from './extract-package-docs.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

describe('package API documentation extraction', () => {
  it('extracts public exports from an entrypoint and excludes implementation helpers', async () => {
    const symbols = await extractTypeScriptSymbols(fileURLToPath(new URL('../packages/barcode', import.meta.url)), {
      exports: { '.': { types: './dist/index.d.ts' } },
    });

    expect(symbols.some(({ name }) => name === 'encodeBarcode')).toBe(true);
    expect(symbols.some(({ name }) => name === 'decodeBarcode')).toBe(true);
    expect(symbols.every(({ name }) => name !== 'encodeRawBarcode')).toBe(true);
  });

  it('renders constant signatures without duplicating the binding name', async () => {
    const symbols = await extractTypeScriptSymbols(
      fileURLToPath(new URL('../packages/forge-web-script-stdlib', import.meta.url)),
      {
        exports: { '.': { types: './dist/index.d.ts' } },
      },
    );

    const identity = symbols.find(({ name }) => name === 'FORGE_WEB_SCRIPT_STDLIB_IDENTITY');
    expect(identity?.signature).toBe('export const FORGE_WEB_SCRIPT_STDLIB_IDENTITY');
    expect(identity?.signature).not.toContain(
      'FORGE_WEB_SCRIPT_STDLIB_IDENTITY FORGE_WEB_SCRIPT_STDLIB_IDENTITY',
    );
  });

  it('extracts documented public FWS declarations through the real parser', async () => {
    const packageRoot = await createTemporaryDirectory('extract-fws-');
    await mkdir(join(packageRoot, 'fws'), { recursive: true });
    await writeFile(
      join(packageRoot, 'fws', 'option.fws'),
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

    const parserPath = fileURLToPath(new URL('../packages/forge-web-script/dist/parser.js', import.meta.url));
    const parserModule = (await import(pathToFileURL(parserPath).href)) as {
      readonly parseForgeWebScript: (
        source: string,
        fileName?: string,
        options?: { readonly root?: string },
      ) => {
        readonly module?: {
          readonly functions: readonly unknown[];
          readonly enums: readonly unknown[];
          readonly structs: readonly unknown[];
          readonly interfaces: readonly unknown[];
        };
        readonly diagnostics: readonly { readonly severity: string; readonly message: string }[];
      };
    };

    const symbols = await extractFwsSymbols(packageRoot, {
      parseForgeWebScript: parserModule.parseForgeWebScript,
    });

    expect(symbols.map(({ name }) => name).sort()).toEqual(['Option', 'is_some']);
    expect(symbols.every(({ kind }) => kind === 'fws-export')).toBe(true);
    expect(symbols.find(({ name }) => name === 'Option')?.signature).toBe('export enum Option');
    expect(symbols.find(({ name }) => name === 'is_some')?.signature).toContain('export fn is_some');
    expect(symbols.find(({ name }) => name === 'is_some')?.parameters).toEqual([
      expect.objectContaining({ name: 'value', type: 'Option<T>', description: 'Option value to inspect.' }),
    ]);
    expect(symbols.every(({ name }) => name !== 'helper')).toBe(true);

    const markdown = renderReferenceMarkdown({
      packageName: '@mission-platform/example-fws',
      packageRoot,
      symbols,
    });
    expect(markdown).toContain('**Kind:** fws-export');
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
});
