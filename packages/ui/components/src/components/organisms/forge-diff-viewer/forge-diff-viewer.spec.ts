import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeDiffViewer } from './forge-diff-viewer';

const ReactDiffViewer = toReactComponent(ForgeDiffViewer, 'DiffViewer');
const VueDiffViewer = toVueComponent(ForgeDiffViewer, 'DiffViewer');
describe('ForgeDiffViewer', () => {
  it('renders labelled diff modes and changes on both frameworks', async () => {
    const properties = {
      oldText: 'const value = 1;',
      newText: 'const value = 2;',
      fileName: 'example.ts',
      language: 'typescript',
      showLineNumbers: true,
    };
    const react = renderToStaticMarkup(createElement(ReactDiffViewer, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDiffViewer, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Code diff"');
      expect(html).toContain('example.ts');
      expect(html).toContain('Unified');
      expect(html).toContain('Split');
      expect(html).toContain('addition');
    }
  });

  it('builds a diff from old and new text', () => {
    const html = renderToStaticMarkup(createElement(ReactDiffViewer, { oldText: 'before', newText: 'after' }));
    expect(html).toContain('before');
    expect(html).toContain('after');
  });

  it('uses mode to select the split presentation', () => {
    const html = renderToStaticMarkup(
      createElement(ReactDiffViewer, { mode: 'split', oldText: 'before', newText: 'after' }),
    );
    expect(html).toContain('<h3>Original</h3>');
    expect(html).toContain('<h3>Changed</h3>');
  });

  it('uses the longest common subsequence to preserve unchanged lines', () => {
    const html = renderToStaticMarkup(
      createElement(ReactDiffViewer, { oldText: 'one\ntwo\nthree', newText: 'one\nthree' }),
    );
    expect(html.indexOf('one')).toBeLessThan(html.indexOf('two'));
    expect(html.indexOf('two')).toBeLessThan(html.indexOf('three'));
    expect(html).toContain('forge-diff-viewer__line--deletion');
  });
});
