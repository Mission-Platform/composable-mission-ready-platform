import { describe, expect, it } from 'vitest';

import { validateForgeDesignDocument, validateForgeExportBundle } from './document';
import { validateRepositoryRelativePath } from './paths';

import type { ForgeDesignDocument } from '../model';

const fixture: ForgeDesignDocument = {
  schemaVersion: 1,
  source: { nodeId: 'root', name: 'Example' },
  root: {
    id: 'root',
    name: 'Example',
    type: 'frame',
    children: [{ id: 'child', name: 'Copy', type: 'text', text: { characters: 'Hello' } }],
  },
  assets: [{ id: 'logo', fileName: 'assets/logo.png', mimeType: 'image/png', content: new Uint8Array([1, 2, 3]) }],
  diagnostics: [],
};

describe('Forge document validation', () => {
  it('accepts a valid serializable design fixture', () => {
    expect(validateForgeDesignDocument(fixture)).toEqual([]);
  });

  it('reports duplicate node ids and unsafe export paths', () => {
    const invalid: ForgeDesignDocument = {
      ...fixture,
      root: { ...fixture.root, children: [{ ...fixture.root.children![0], id: 'root' }] },
    };
    expect(validateForgeDesignDocument(invalid).map((item) => item.code)).toContain('DUPLICATE_NODE_ID');
    const exportCodes = validateForgeExportBundle({
      files: [{ path: '../escape.tsx' }, { path: '../escape.tsx' }],
    }).map((item) => item.code);
    expect(exportCodes).toEqual(expect.arrayContaining(['DUPLICATE_EXPORT_PATH', 'INVALID_EXPORT_PATH']));
    expect(exportCodes.filter((code) => code === 'INVALID_EXPORT_PATH')).toHaveLength(2);
  });

  it('normalizes Windows separators but rejects traversal and unsupported files', () => {
    expect(validateRepositoryRelativePath(String.raw`components\button.tsx`)).toMatchObject({
      valid: true,
      normalizedPath: 'components/button.tsx',
    });
    expect(validateRepositoryRelativePath('../button.tsx').reason).toBe('traversal');
    expect(validateRepositoryRelativePath('button.txt').reason).toBe('unsupported-extension');
  });
});
