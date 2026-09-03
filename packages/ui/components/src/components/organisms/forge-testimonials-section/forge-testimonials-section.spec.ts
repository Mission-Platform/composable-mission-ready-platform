import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTestimonialsSection } from './forge-testimonials-section';

const ReactTestimonials = toReactComponent(ForgeTestimonialsSection, 'TestimonialsSection');
const VueTestimonials = toVueComponent(ForgeTestimonialsSection, 'TestimonialsSection');

describe('ForgeTestimonialsSection', () => {
  it('renders testimonial quotes and navigation affordances on both frameworks', async () => {
    const properties = {
      title: 'Loved by teams',
      testimonials: [
        { id: 't1', quote: 'A joy to use.', name: 'Sam', role: 'Founder' },
        { id: 't2', quote: 'Ships faster.', name: 'Lee', role: 'Designer' },
      ],
      variant: 'carousel' as const,
      autoplay: true,
      columns: 2,
    };
    const react = renderToStaticMarkup(createElement(ReactTestimonials, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTestimonials, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Loved by teams');
      expect(html).toContain('A joy to use.');
      expect(html).toContain('Sam');
      expect(html).toContain('aria-label="Next testimonial"');
      expect(html).toContain('Pause autoplay');
    }
  });
});
