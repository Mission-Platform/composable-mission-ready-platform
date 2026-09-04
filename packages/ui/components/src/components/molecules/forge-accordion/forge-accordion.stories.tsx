import { ForgeAccordion } from '@mission-platform/components';

import type { AccordionProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeAccordion` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Display/ForgeAccordion',
  component: ForgeAccordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeAccordion` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The original `ForgeAccordion`/`ForgeAccordionItem` pair shared open state through `provide`/`inject`; the neutral version flattens them into one component driven by an `items` array with internal open state (like the migrated `ForgeTabs`). Set `exclusive` to `false` to allow several items open at once. The icon chevron becomes a CSS-rotated `▾` glyph; styling comes from the co-located `forge-accordion.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    exclusive: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
  },
  args: {
    exclusive: true,
    items: [
      { id: 'shipping', title: 'Shipping', content: 'We ship worldwide within 3–5 business days.' },
      { id: 'returns', title: 'Returns', content: 'Returns are accepted within 30 days of delivery.' },
      { id: 'warranty', title: 'Warranty', content: 'All products carry a 2-year limited warranty.' },
    ],
  },
} satisfies Meta<typeof ForgeAccordion>;

export default meta;
type Story = StoryObj<AccordionProperties>;

export const Default: Story = {};

export const FirstOpen: Story = { args: { defaultOpen: ['shipping'] } };

export const Primary: Story = { args: { variant: 'primary', defaultOpen: ['shipping'] } };

export const Success: Story = { args: { variant: 'success', defaultOpen: ['shipping'] } };

export const Multiple: Story = { args: { exclusive: false, defaultOpen: ['shipping', 'warranty'] } };

export const WithDisabledItem: Story = {
  args: {
    items: [
      { id: 'shipping', title: 'Shipping', content: 'We ship worldwide within 3–5 business days.' },
      { id: 'returns', title: 'Returns', content: 'Returns are accepted within 30 days of delivery.' },
      { id: 'legacy', title: 'Legacy policy (unavailable)', content: 'No longer applicable.', disabled: true },
    ],
  },
};
