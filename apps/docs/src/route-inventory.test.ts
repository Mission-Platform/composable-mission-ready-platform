import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildIncludedRoutes,
  buildSitemapUrls,
  collectDocumentSlugs,
  discoverDocumentationRoots,
  rootForSlug,
} from './route-inventory';
import { parseDocumentationModulePath, parseWorkspaceDocumentationPath } from './documentation-sources';
import { documentationSourceRoots, documents } from './documentation';

describe('documentation route inventory', () => {
  const repoRoot = path.resolve(import.meta.dirname, '../../..');
  const roots = discoverDocumentationRoots(repoRoot);
  const slugs = collectDocumentSlugs(roots);

  it('discovers project and package-owned documentation roots', () => {
    expect(roots.some((root) => root.kind === 'project' && root.routePrefix === '')).toBe(true);
    expect(roots.some((root) => root.routePrefix === 'packages/barcode')).toBe(true);
    expect(slugs).toContain('packages/barcode/index');
  });

  it('keeps Node route inventory in parity with runtime Markdown discovery', () => {
    const runtimeSlugs = Object.keys(documents).toSorted();
    const runtimeRootPrefixes = documentationSourceRoots.map((root) => root.routePrefix).toSorted();
    const nodeRootPrefixes = roots.map((root) => root.routePrefix).toSorted();

    expect(nodeRootPrefixes).toEqual(runtimeRootPrefixes);
    expect(slugs).toEqual(runtimeSlugs);
  });

  it('discovers documentation for the DAP package', () => {
    expect(roots.some((root) => root.routePrefix === 'packages/forge-web-script-dap')).toBe(true);
    expect(slugs).toContain('packages/forge-web-script-dap/reference/generated/api');
  });

  it('uses one ownership parser for root, nested package, and unsupported paths', () => {
    expect(parseWorkspaceDocumentationPath('docs/overview.md')).toEqual({
      workspaceDirectory: '',
      documentPath: 'overview.md',
    });
    expect(parseWorkspaceDocumentationPath('extensions/fws-vscode/server/dap/docs/reference/api.md')).toEqual({
      workspaceDirectory: 'extensions/fws-vscode/server/dap',
      documentPath: 'reference/api.md',
    });
    expect(parseWorkspaceDocumentationPath('apps/website/docs/index.md')).toBeUndefined();

    const parsed = parseDocumentationModulePath(
      '../../../packages/barcode/docs/locales/fr/index.md',
      '@mission-platform/barcode',
    );
    expect(parsed?.locale).toBe('fr');
    expect(parsed?.sourceRoot.routePrefix).toBe('packages/barcode');
    expect(parsed?.documentPath).toBe('index');
    expect(parseDocumentationModulePath('../../../packages/barcode/docs/locales/pt/index.md')).toBeUndefined();
  });

  it('includes package routes in localized prerender and sitemap inventories', () => {
    const routes = buildIncludedRoutes(slugs);
    expect(routes).toContain('/packages/barcode/index');
    expect(routes).toContain('/fr/packages/barcode/index');

    const packageUrl = buildSitemapUrls(slugs).find((url) => url.loc.endsWith('/packages/barcode/index'));
    expect(packageUrl?.alternates.some((alternate) => alternate.href.endsWith('/de/packages/barcode/index'))).toBe(
      true,
    );
  });

  it('prefers the most specific (longest) documentation root for nested package slugs', () => {
    const parentRoot = {
      kind: 'package' as const,
      rootDirectory: '/root',
      routePrefix: 'ext/parent',
      workspaceDirectory: 'ext/parent',
    };
    const nestedRoot = {
      kind: 'package' as const,
      rootDirectory: '/root/nested',
      routePrefix: 'ext/parent/nested',
      workspaceDirectory: 'ext/parent/nested',
    };
    const roots = [parentRoot, nestedRoot];

    const slug = 'ext/parent/nested/reference/api';
    const root = rootForSlug(slug, roots);
    expect(root).toBe(nestedRoot);
  });
});
