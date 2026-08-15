import { describe, expect, it } from 'vitest';

import { useMarkdown } from './use-markdown';

describe('useMarkdown', () => {
  it('collects an h2/h3 table of contents with stable anchor ids', () => {
    const markdown = '# Title\n\n## Section One\n\nBody text.\n\n### Nested Heading\n';
    const { toc } = useMarkdown(
      () => markdown,
      () => 'overview',
    );

    expect(toc.value.map((item) => item.id)).toEqual(['section-one', 'nested-heading']);
    expect(toc.value.map((item) => item.depth)).toEqual([2, 3]);
    expect(toc.value.map((item) => item.text)).toEqual(['Section One', 'Nested Heading']);
  });

  it('de-duplicates repeated heading ids across every level', () => {
    const markdown = '## Setup\n\n## Setup\n';
    const { toc } = useMarkdown(
      () => markdown,
      () => 'overview',
    );

    expect(toc.value.map((item) => item.id)).toEqual(['setup', 'setup-1']);
  });

  it('resolves relative Markdown links to in-app routes', () => {
    const { resolveHref } = useMarkdown(
      () => '',
      () => 'overview',
    );

    expect(resolveHref.value('./testing.md')).toBe('/testing');
    expect(resolveHref.value('configs/index.md')).toBe('/configs/index');
    expect(resolveHref.value('./testing.md#usage')).toBe('/testing#usage');
  });

  it('resolves parent-relative links against the current document directory', () => {
    const { resolveHref } = useMarkdown(
      () => '',
      () => 'configs/index',
    );

    expect(resolveHref.value('../overview.md')).toBe('/overview');
  });

  it('keeps relative links inside the active locale', () => {
    const { resolveHref } = useMarkdown(
      () => '',
      () => 'configs/index',
      () => 'ja',
    );

    expect(resolveHref.value('../overview.md#はじめに')).toBe('/ja/overview#はじめに');
  });

  it('leaves non-Markdown links (external, anchors) unresolved', () => {
    const { resolveHref } = useMarkdown(
      () => '',
      () => 'overview',
    );

    expect(resolveHref.value('https://example.com')).toBeUndefined();
    expect(resolveHref.value('#section')).toBeUndefined();
  });
});
