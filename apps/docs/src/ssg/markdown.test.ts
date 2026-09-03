import { describe, expect, it } from 'vitest';

import { renderDocumentationMarkdown, resolveInternalHref } from './markdown';

import type { DocumentationSourceRoot } from '../documentation-sources';

describe('ssg markdown pipeline', () => {
  it('renders valid heading hierarchy without the regex placeholder nesting bug', () => {
    const source = '# Configuration Packages\n\nCentralizing configurations.\n\n## Overview\n\nDetails here.\n';
    const { html, toc, title } = renderDocumentationMarkdown(source, 'packages/tooling/configs/eslint-config/index');

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

  it('escapes raw HTML and removes executable Markdown URLs', () => {
    const source =
      '# Title\n\n[unsafe](javascript:alert(1)) [encoded](%6aavascript:alert(1)) ![image](data:image/svg+xml,test)\n\n<img src="x" onerror="alert(1)">';
    const { html } = renderDocumentationMarkdown(source, 'overview');

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:image');
    expect(html).not.toContain('<img src="x" onerror=');
    expect(html).toContain('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
  });

  it('resolves parent-relative links against the current slug directory', () => {
    expect(resolveInternalHref('../overview.md', 'packages/tooling/configs/eslint-config/index', 'ja')).toBe(
      '/ja/packages/tooling/configs/overview',
    );
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
      rootDirectory: '/repo/packages/integrations/barcode/docs',
      routePrefix: 'packages/integrations/barcode',
      workspaceDirectory: 'packages/integrations/barcode',
      packageName: '@mission-platform/barcode',
    };
    const context = {
      currentRoot: barcode,
      roots: [project, barcode],
      hasDocument: (slug: string) => ['packages/integrations/barcode/reference', 'overview'].includes(slug),
    };

    expect(resolveInternalHref('./reference.md', 'packages/integrations/barcode/index', 'fr', context)).toBe(
      '/fr/packages/integrations/barcode/reference',
    );
    expect(
      resolveInternalHref('../../../../docs/overview.md', 'packages/integrations/barcode/index', 'fr', context),
    ).toBe('/fr/overview');
  });
});
