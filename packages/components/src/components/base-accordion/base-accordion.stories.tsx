import { Accordion } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Accordion` is the Vue 3 build of the write-once `BaseAccordion` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseAccordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Accordion` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The original `BaseAccordion`/`BaseAccordionItem` pair shared open state through `provide`/`inject`; the neutral version flattens them into one component driven by an `items` array with internal `useState` open state (like the migrated `BaseTabs`). Set `exclusive` to `false` to allow several items open at once. The icon chevron becomes a CSS-rotated `▾` glyph; styling comes from the co-located `base-accordion.module.scss`.',
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
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

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
