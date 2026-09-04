import { ForgeCard } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeCard` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Display/ForgeCard',
  component: ForgeCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeCard` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The body is the default slot; the bordered header/footer regions are rendered only when their `header`/`footer` named slots are filled. Styling comes from the co-located `forge-card.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    shadow: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    padding: 'md',
    variant: 'neutral',
    shadow: false,
    bordered: true,
  },
  render: (arguments_) => (
    <div style={{ maxWidth: '24rem' }}>
      <ForgeCard {...arguments_}>A composable surface for grouping related content.</ForgeCard>
    </div>
  ),
} satisfies Meta<typeof ForgeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHeaderAndFooter: Story = {
  render: (arguments_) => (
    <div style={{ maxWidth: '24rem' }}>
      <ForgeCard
        {...arguments_}
        header="ForgeCard title"
        footer="Footer actions"
      >
        A composable surface for grouping related content.
      </ForgeCard>
    </div>
  ),
};

export const Shadowed: Story = {
  args: { shadow: true },
  render: (arguments_) => (
    <div style={{ maxWidth: '24rem' }}>
      <ForgeCard
        {...arguments_}
        header="Elevated"
      >
        A composable surface for grouping related content.
      </ForgeCard>
    </div>
  ),
};

export const Borderless: Story = { args: { bordered: false } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Error: Story = { args: { variant: 'error' } };

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {(
        ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'] as const
      ).map((variant) => (
        <div style={{ width: '12rem' }}>
          <ForgeCard variant={variant}>{variant[0].toUpperCase() + variant.slice(1)}</ForgeCard>
        </div>
      ))}
    </div>
  ),
};

export const Compact: Story = {
  args: { padding: 'sm' },
  render: (arguments_) => (
    <div style={{ maxWidth: '24rem' }}>
      <ForgeCard
        {...arguments_}
        header="Compact"
      >
        A composable surface for grouping related content.
      </ForgeCard>
    </div>
  ),
};
