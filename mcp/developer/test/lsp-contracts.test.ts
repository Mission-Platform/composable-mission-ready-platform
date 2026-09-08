import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { findRepoRoot } from '@mission-platform/mcp-shared/repo/paths';

import { normalizeLocations, normalizeSymbols, unsupported } from '../src/lsp/contracts.ts';

const packageUri = pathToFileURL(`${findRepoRoot()}/package.json`).href;
const range = {
  start: { line: 1, character: 2 },
  end: { line: 1, character: 8 },
};

describe('LSP response contracts', () => {
  it('normalizes locations to repository-relative paths and preserves ranges', () => {
    const [location] = normalizeLocations([{ uri: packageUri, range }], 10);
    assert.deepEqual(location, {
      uri: packageUri,
      path: 'package.json',
      range,
      external: false,
    });
  });

  it('normalizes document and workspace symbols, including document-symbol ranges', () => {
    const symbols = normalizeSymbols(
      [
        {
          name: 'createServer',
          kind: 12,
          range,
          children: [{ name: 'nested', kind: 13, range }],
        },
      ],
      1,
      packageUri,
    );
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0]?.location.path, 'package.json');
    assert.equal(symbols[0]?.children?.[0]?.name, 'nested');
  });

  it('returns empty results and enforces a result cap', () => {
    assert.deepEqual(normalizeLocations(null, 10), []);
    const locations = normalizeLocations(
      Array.from({ length: 5 }, (_, index) => ({
        uri: packageUri,
        range: { start: { line: index, character: 0 }, end: { line: index, character: 1 } },
      })),
      2,
    );
    assert.equal(locations.length, 2);
  });

  it('uses a structured unsupported-operation result', () => {
    assert.deepEqual(unsupported('lsp_find_references', 'lsp-1', 'yaml', 'referencesProvider'), {
      supported: false,
      operation: 'lsp_find_references',
      sessionId: 'lsp-1',
      languageId: 'yaml',
      reason: 'The yaml language server does not advertise referencesProvider.',
    });
  });
});
