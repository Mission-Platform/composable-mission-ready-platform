import { h, type MpElement } from '@mission-platform/forge';

import * as iconsNamespace from '@mission-platform/icons';
import {
  ForgeIconAlert,
  ForgeIconArrow,
  ForgeIconCountryGlobe,
  ForgeIconFlag,
  ForgeIconRoute,
  ForgeIconStar,
  IconSpriteProvider,
} from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/** Neutral icon component shape used by the gallery grid. */
type IconComponent = (properties: { size?: number | string }) => MpElement;

/**
 * The Mission Platform icons, authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to every supported
 * framework at build time by `@mission-platform/vite-plugin-forge`. This
 * overview consumes the bare `@mission-platform/icons` import, which
 * auto-resolves to the framework selected by `STORYBOOK_FRAMEWORK`. Every
 * individual icon also has its own story, grouped by category, under
 * `JSX Icons`.
 */

/**
 * Every exported icon component, paired with its export name, for the gallery.
 *
 * The value check must accept **objects** as well as functions: only the React
 * and Solid builds export an icon as a plain function — the Vue build exports
 * `defineComponent({…})` (an object) and the web-component build a custom
 * element class. Filtering on `typeof value === 'function'` alone left the
 * gallery empty on the default (Vue) workbench.
 */
const galleryEntries = Object.entries(iconsNamespace).filter(
  ([name, value]) =>
    name.startsWith('ForgeIcon') && (typeof value === 'function' || (typeof value === 'object' && value !== null)),
) as [string, IconComponent][];

if (galleryEntries.length === 0) {
  throw new Error(
    '[icons] The overview gallery found no `ForgeIcon*` exports — the active framework build exports a shape this filter does not recognise.',
  );
}

const meta = {
  title: 'icons/overview',
  component: ForgeIconStar,
  tags: ['autodocs'],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          'Cross-framework SVG icons — authored once in the neutral JSX dialect and shipped to all supported frameworks. Each icon owns its `@layer mp.icons` styling via a co-located CSS Module (shipped as a per-icon CSS asset in the built package). Browse the full set below, or open an individual icon for its own controls.',
      },
    },
  },
} satisfies Meta<typeof ForgeIconStar>;

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

/** Repeated references share one inline symbol host instead of duplicating geometry. */
export const SpriteProvider: Story = {
  render: () => (
    <IconSpriteProvider>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <ForgeIconAlert
          ariaLabel="Alert"
          size="lg"
        />
        <ForgeIconArrow
          ariaLabel="Arrow right"
          direction="right"
          size="lg"
        />
        <ForgeIconRoute
          ariaLabel="Route"
          size="lg"
        />
        <ForgeIconFlag
          ariaLabel="United States flag"
          countryCode="US"
          size="lg"
        />
        <ForgeIconCountryGlobe
          ariaLabel="United States globe"
          countryCode="US"
          size="lg"
        />
      </div>
    </IconSpriteProvider>
  ),
};
