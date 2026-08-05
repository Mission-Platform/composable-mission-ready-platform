import { h } from '@mission-platform/forge';

import { Separator } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Separator` is the write-once `BaseSeparator` component of `@mission-platform/components`. It renders a horizontal/vertical rule, or a
 * centred label between two lines when default-slot content is supplied.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Layout/BaseSeparator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Separator` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a horizontal/vertical rule, or a centred label between two lines when default-slot content is supplied. Styling comes from the co-located `base-separator.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['solid', 'dashed', 'dotted'] },
    spacing: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    decorative: { control: 'boolean' },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    spacing: 'md',
    decorative: false,
  },
  render: (arguments_) => (
    <div style={{ padding: 'var(--mp-spacing-4)', maxWidth: '28rem' }}>
      <p style={{ margin: 0, color: 'var(--mp-color-text-primary)' }}>Content above</p>
      <Separator {...arguments_} />
      <p style={{ margin: 0, color: 'var(--mp-color-text-primary)' }}>Content below</p>
    </div>
  ),
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};

export const Dashed: Story = { args: { variant: 'dashed' } };

export const Dotted: Story = { args: { variant: 'dotted' } };

export const Labelled: Story = {
  render: (arguments_) => (
    <div style={{ padding: 'var(--mp-spacing-4)', maxWidth: '28rem' }}>
      <p style={{ margin: 0, color: 'var(--mp-color-text-primary)' }}>Sign in with email</p>
      <Separator {...arguments_}>OR</Separator>
      <p style={{ margin: 0, color: 'var(--mp-color-text-primary)' }}>Continue with a provider</p>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (arguments_) => (
    <div style={{ display: 'flex', alignItems: 'center', height: '3rem', color: 'var(--mp-color-text-primary)' }}>
      <span>Left</span>
      <Separator {...arguments_} />
      <span>Right</span>
    </div>
  ),
};
