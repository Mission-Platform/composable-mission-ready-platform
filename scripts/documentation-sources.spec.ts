import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

import { discoverDocumentationRoots, qualifiedSlug, rootForPath } from './documentation-sources';

const repositoryRoot = resolve(import.meta.dirname, '..');

describe('documentation source ownership', () => {
  it('discovers project and package roots with stable qualified prefixes', () => {
    const roots = discoverDocumentationRoots(repositoryRoot);
    const project = roots.find((root) => root.kind === 'project');
    const barcode = roots.find((root) => root.routePrefix === 'packages/barcode');

    expect(project?.routePrefix).toBe('');
    expect(barcode?.packageName).toBe('@mission-platform/barcode');
    expect(barcode === undefined ? undefined : qualifiedSlug(barcode, 'index')).toBe('packages/barcode/index');
  });

  it('selects the most specific root for nested package paths', () => {
    const roots = discoverDocumentationRoots(repositoryRoot);
    const nestedPath = `${repositoryRoot}/extensions/fws-vscode/server/dap/docs/reference/generated/api.md`;

    expect(rootForPath(nestedPath, roots)?.routePrefix).toBe('extensions/fws-vscode/server/dap');
  });
});