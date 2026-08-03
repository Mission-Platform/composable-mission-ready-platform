import { h } from 'vue';

import * as iconsNamespace from '@mission-platform/icons/vue';
import { IconStar } from '@mission-platform/icons/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { Component } from 'vue';

/**
 * The Mission Platform icons, authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both Vue 3 and
 * React at build time by `@mission-platform/vite-plugin-forge`. This overview
 * consumes the Vue 3 build via `@mission-platform/icons/vue`; the very same
 * sources also ship as React components through the package's `./react` subpath
 * (see the React Storybook). Every individual icon also has its own story,
 * grouped by category, under `JSX Icons`.
 */

/**
 * Every exported icon component, paired with its export name, for the gallery.
 *
 * The Vue build compiles each icon to a `defineComponent(...)` **object** (not a
 * function), so the gallery must accept both objects and functions — filtering
 * on `typeof value === 'function'` alone would discard every Vue icon and leave
 * the overview empty.
 */
const galleryEntries = Object.entries(iconsNamespace).filter(
  ([name, value]) =>
    name.startsWith('Icon') && Boolean(value) && (typeof value === 'function' || typeof value === 'object'),
) as [string, Component][];

const meta = {
  title: 'Icons/Overview',
  component: IconStar,
  tags: ['autodocs'],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          'Cross-framework SVG icons — authored once in the neutral JSX dialect and shipped to both Vue 3 (this Storybook, via `@mission-platform/icons/vue`) and React (`@mission-platform/icons/react`). Each icon owns its `@layer mp.icons` styling via a co-located CSS Module (shipped as a per-icon CSS asset in the built package). Browse the full set below, or open an individual icon for its own controls.',
      },
    },
  },
} satisfies Meta<typeof IconStar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every icon in the package, rendered at the `lg` size with its export name. */
export const Gallery: Story = {
  render: () => ({
    setup() {
      return () =>
        h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))',
              gap: '1.5rem 1rem',
            },
          },
          galleryEntries.map(([name, Icon]) =>
            h(
              'div',
              {
                key: name,
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'center',
                },
              },
              [h(Icon, { size: 'lg' }), h('code', { style: { fontSize: '0.75rem', wordBreak: 'break-word' } }, name)],
            ),
          ),
        );
    },
  }),
};
