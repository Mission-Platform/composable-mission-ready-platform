import { h } from '@mission-platform/forge';

import { Card } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Card` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Display/BaseCard',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Card` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The body is the default slot; the bordered header/footer regions are rendered only when their `header`/`footer` named slots are filled. Styling comes from the co-located `base-card.module.scss`.',
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
    <Card {...arguments_} style={{ maxWidth: '24rem' }}>
      A composable surface for grouping related content.
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHeaderAndFooter: Story = {
  render: (arguments_) => (
    <Card
      {...arguments_}
      style={{ maxWidth: '24rem' }}
      header="Card title"
      footer="Footer actions"
    >
      A composable surface for grouping related content.
    </Card>
  ),
};

export const Shadowed: Story = {
  args: { shadow: true },
  render: (arguments_) => (
    <Card {...arguments_} style={{ maxWidth: '24rem' }} header="Elevated">
      A composable surface for grouping related content.
    </Card>
  ),
};

export const Borderless: Story = { args: { bordered: false } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Error: Story = { args: { variant: 'error' } };

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      <Card variant="neutral" style={{ width: '12rem' }}>
        Neutral
      </Card>
      <Card variant="primary" style={{ width: '12rem' }}>
        Primary
      </Card>
      <Card variant="secondary" style={{ width: '12rem' }}>
        Secondary
      </Card>
      <Card variant="tertiary" style={{ width: '12rem' }}>
        Tertiary
      </Card>
      <Card variant="success" style={{ width: '12rem' }}>
        Success
      </Card>
      <Card variant="warning" style={{ width: '12rem' }}>
        Warning
      </Card>
      <Card variant="info" style={{ width: '12rem' }}>
        Info
      </Card>
      <Card variant="error" style={{ width: '12rem' }}>
        Error
      </Card>
      <Card variant="critical" style={{ width: '12rem' }}>
        Critical
      </Card>
    </div>
  ),
};

export const Compact: Story = {
  args: { padding: 'sm' },
  render: (arguments_) => (
    <Card {...arguments_} style={{ maxWidth: '24rem' }} header="Compact">
      A composable surface for grouping related content.
    </Card>
  ),
};
