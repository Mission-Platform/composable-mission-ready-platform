import { h } from '@mission-platform/forge';

import { Tag } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Tag` is the write-once `BaseTag` component of `@mission-platform/components` — a toned, rounded label (text via the composed
 * neutral `Typography`); set `removable` to show a remove button that fires
 * `onRemove`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Display/BaseTag',
  component: Tag,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Tag` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a toned, rounded label; set `removable` to show a remove button that fires `onRemove`. Styling comes from the co-located `base-tag.module.scss`.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    disabled: { control: 'boolean' },
    removable: { control: 'boolean' },
  },
  args: {
    label: 'Tag',
    size: 'md',
    variant: 'neutral',
    disabled: false,
    removable: false,
  },
  render: (arguments_) => <Tag {...arguments_} />,
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Success: Story = { args: { variant: 'success', label: 'Active' } };

export const Removable: Story = { args: { removable: true } };

export const Disabled: Story = { args: { disabled: true } };
