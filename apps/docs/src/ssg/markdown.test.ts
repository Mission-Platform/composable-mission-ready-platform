import { describe, expect, it } from 'vitest';

import { renderDocumentationMarkdown, resolveInternalHref } from './markdown';

import type { DocumentationSourceRoot } from '../documentation-sources';

describe('ssg markdown pipeline', () => {
  it('renders valid heading hierarchy without the regex placeholder nesting bug', () => {
    const source = '# Configuration Packages\n\nCentralizing configurations.\n\n## Overview\n\nDetails here.\n';
    const { html, toc, title } = renderDocumentationMarkdown(source, 'configs/index');

    expect(title).toBe('Configuration Packages');
    expect(html).toContain('<h1 id="configuration-packages">Configuration Packages</h1>');
    expect(html).toContain('<h2 id="overview">Overview</h2>');
    expect(html).not.toContain('</h1></p>');
    expect(html).not.toContain('</p><p><h2');
    expect(toc.map((item) => item.id)).toEqual(['overview']);
  });

  it('rewrites internal Markdown links with data-internal markers', () => {
    const source = '# Title\n\nSee [Testing](./testing.md#usage) and [external](https://example.com).\n';
    const { html } = renderDocumentationMarkdown(source, 'overview', 'fr');

    expect(html).toContain('href="/fr/testing#usage"');
    expect(html).toContain('data-internal="true"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
  });

  it('resolves parent-relative links against the current slug directory', () => {
    expect(resolveInternalHref('../overview.md', 'configs/index', 'ja')).toBe('/ja/overview');
  });

  it('resolves package-local and package-to-project links using owning roots', () => {
    const project: DocumentationSourceRoot = {
      kind: 'project',
      rootDirectory: '/repo/docs',
      routePrefix: '',
      workspaceDirectory: '',
    };
    const barcode: DocumentationSourceRoot = {
      kind: 'package',
      rootDirectory: '/repo/packages/barcode/docs',
      routePrefix: 'packages/barcode',
      workspaceDirectory: 'packages/barcode',
      packageName: '@mission-platform/barcode',
    };
    const context = {
      currentRoot: barcode,
      roots: [project, barcode],
      hasDocument: (slug: string) => ['packages/barcode/reference', 'overview'].includes(slug),
    };

    expect(resolveInternalHref('./reference.md', 'packages/barcode/index', 'fr', context)).toBe(
      '/fr/packages/barcode/reference',
    );
    expect(resolveInternalHref('../../../../docs/overview.md', 'packages/barcode/index', 'fr', context)).toBe(
      '/fr/overview',
    );
  });
});
