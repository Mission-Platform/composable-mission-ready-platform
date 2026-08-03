import * as iconsNamespace from '@mission-platform/icons/react';
import { IconStar } from '@mission-platform/icons/react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentType } from 'react';

/**
 * The Mission Platform icons, authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both React and
 * Vue 3 at build time by `@mission-platform/vite-plugin-forge`. This overview
 * consumes the **React** build via `@mission-platform/icons/react`; the very
 * same sources also ship as Vue 3 components through the package's `./vue`
 * subpath (see the Vue Storybook). Every individual icon also has its own story,
 * grouped by category, under `JSX Icons`.
 */

/** Every exported icon component, paired with its export name, for the gallery. */
const galleryEntries = Object.entries(iconsNamespace).filter(
  ([name, value]) => name.startsWith('Icon') && typeof value === 'function',
) as [string, ComponentType<{ size?: number | string }>][];

const meta = {
  title: 'Icons/Overview',
  component: IconStar,
  tags: ['autodocs'],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          'Cross-framework SVG icons — authored once in the neutral JSX dialect and shipped to both React (this Storybook, via `@mission-platform/icons/react`) and Vue 3 (`@mission-platform/icons/vue`). Each icon owns its `@layer mp.icons` styling via a co-located CSS Module (shipped as a per-icon CSS asset in the built package). Browse the full set below, or open an individual icon for its own controls.',
      },
    },
  },
} satisfies Meta<typeof IconStar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every icon in the package, rendered at the `lg` size with its export name. */
export const Gallery: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))',
        gap: '1.5rem 1rem',
      }}
    >
      {galleryEntries.map(([name, Icon]) => (
        <div
          key={name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            textAlign: 'center',
          }}
        >
          <Icon size="lg" />
          <code style={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>{name}</code>
        </div>
      ))}
    </div>
  ),
};
