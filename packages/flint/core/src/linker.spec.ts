import { describe, expect, it } from 'vitest';

import { validateFlintLinks } from './linker.ts';

describe('Forge Web Script linker boundary', () => {
  it('rejects dynamic edges within one project', () => {
    const result = validateFlintLinks({
      modules: [
        {
          fileName: '/app/a.flint',
          moduleId: 'a',
          projectRoot: '/app',
          source: '',
          contentHash: 'a',
          module: {} as never,
        },
        {
          fileName: '/app/b.flint',
          moduleId: 'b',
          projectRoot: '/app',
          source: '',
          contentHash: 'b',
          module: {} as never,
        },
      ],
      projects: [{ root: '/app', id: 'app' }],
      edges: [
        {
          importer: '/app/a.flint',
          source: './b.flint',
          resolved: '/app/b.flint',
          linkMode: 'dynamic',
          span: { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 },
        },
      ],
    });
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['FLINT-LINK-002']);
  });

  it('resolves foreign symbols against relocatable objects', () => {
    const result = validateFlintLinks(
      {
        modules: [
          {
            fileName: '/app/interop.flint',
            moduleId: 'interop',
            projectRoot: '/app',
            source: '',
            contentHash: 'interop_hash',
            module: {
              kind: 'module',
              name: 'interop',
              imports: [],
              sourceImports: [],
              structs: [],
              enums: [],
              interfaces: [],
              functions: [],
              foreignCapabilities: [
                {
                  kind: 'foreign-capability',
                  abi: 'C',
                  library: 'zstd',
                  callingConvention: 'wasm-c-abi',
                  functions: [
                    {
                      kind: 'foreign-function',
                      name: 'ZSTD_compress',
                      parameters: [],
                      result: {
                        name: 'u32',
                        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                      },
                      span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                    },
                    {
                      kind: 'foreign-function',
                      name: 'ZSTD_versionNumber',
                      parameters: [],
                      result: {
                        name: 'u32',
                        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                      },
                      span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                    },
                  ],
                  span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                },
              ],
              span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
            },
          },
        ],
        projects: [{ root: '/app', id: 'app' }],
        edges: [],
      },
      {
        foreignObjects: [
          {
            name: 'libzstd',
            path: '/vendor/libzstd.a',
            format: 'wasm-relocatable',
            exportedSymbols: ['ZSTD_compress', 'ZSTD_versionNumber'],
          },
        ],
      },
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.foreignSymbols).toEqual([
      {
        symbol: 'ZSTD_compress',
        library: 'zstd',
        callingConvention: 'wasm-c-abi',
        objectPath: '/vendor/libzstd.a',
        resolved: true,
      },
      {
        symbol: 'ZSTD_versionNumber',
        library: 'zstd',
        callingConvention: 'wasm-c-abi',
        objectPath: '/vendor/libzstd.a',
        resolved: true,
      },
    ]);
  });

  it('detects duplicate providers for the same foreign symbol with FLINT-LINK-007', () => {
    const result = validateFlintLinks(
      {
        modules: [
          {
            fileName: '/app/interop.flint',
            moduleId: 'interop',
            projectRoot: '/app',
            source: '',
            contentHash: 'hash1',
            module: {
              kind: 'module',
              name: 'interop',
              imports: [],
              sourceImports: [],
              structs: [],
              enums: [],
              interfaces: [],
              functions: [],
              foreignCapabilities: [
                {
                  kind: 'foreign-capability',
                  abi: 'C',
                  library: 'crypto',
                  callingConvention: 'wasm-c-abi',
                  functions: [
                    {
                      kind: 'foreign-function',
                      name: 'init',
                      parameters: [],
                      result: {
                        name: 'u32',
                        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                      },
                      span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                    },
                  ],
                  span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                },
              ],
              span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
            },
          },
        ],
        projects: [{ root: '/app', id: 'app' }],
        edges: [],
      },
      {
        foreignObjects: [
          {
            name: 'libcrypto-a',
            path: '/vendor/libcrypto-a.a',
            library: 'crypto',
            format: 'wasm-relocatable',
            exportedSymbols: ['init'],
          },
          {
            name: 'libcrypto-b',
            path: '/vendor/libcrypto-b.a',
            library: 'crypto',
            format: 'wasm-relocatable',
            exportedSymbols: ['init'],
          },
        ],
      },
    );

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FLINT-LINK-007',
        message: expect.stringContaining("Duplicate foreign symbol 'init' provided for library 'crypto'"),
      }),
    );
  });
});
