import { h, type MpElement } from '@mission-platform/forge';
import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { useD3 } from './use-d3';

// A neutral chart component that appends a rect to its SVG via D3 on mount.
function Chart(): MpElement {
  const reference = useD3<SVGSVGElement>((selection) => {
    selection.append('rect').attr('width', 10).attr('height', 10);
  });
  return h('svg', { class: 'chart', ref: reference });
}

describe('useD3 (neutral render-once baseline)', () => {
  it('returns an empty ref container', () => {
    const reference = useD3(() => {});
    // eslint-disable-next-line unicorn/no-null
    expect(reference).toEqual({ current: null });
  });

  it('does not run the draw callback during a single render (effects are deferred)', () => {
    const draw = vi.fn();
    useD3(draw);
    expect(draw).not.toHaveBeenCalled();
  });
});

describe('useD3 authors the same component for React and Vue', () => {
  const ReactChart = toReactComponent(Chart, 'Chart');
  const VueChart = toVueComponent(Chart, 'Chart');

  it('renders the host svg with no drawn content yet on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactChart));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueChart) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toContain('class="chart"');
      // The D3 draw runs in an effect, which does not fire during SSR / the
      // neutral render, so the appended <rect> is absent on both frameworks.
      expect(html).not.toContain('<rect');
    }
  });
});
