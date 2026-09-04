import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeProfileCard } from './forge-profile-card';

const ReactProfileCard = toReactComponent(ForgeProfileCard, 'ProfileCard');
const VueProfileCard = toVueComponent(ForgeProfileCard, 'ProfileCard');

describe('ForgeProfileCard', () => {
  it('renders identity, metadata, and an accessible action on both frameworks', async () => {
    const properties = {
      user: {
        name: 'Ada Lovelace',
        role: 'Engineer',
        initials: 'AL',
        socials: [{ id: 'github', label: 'GitHub', href: '/ada' }],
      },
      variant: 'compact' as const,
      editable: true,
      stats: [{ id: 'projects', label: 'Projects', value: 4 }],
    };
    const react = renderToStaticMarkup(createElement(ReactProfileCard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueProfileCard, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Ada Lovelace');
      expect(html).toContain('Engineer');
      expect(html).toContain('Edit profile');
      expect(html).toContain('GitHub');
      expect(html).toContain('Projects');
      expect(html).toContain('forge-profile-card--compact');
    }
  });
});
