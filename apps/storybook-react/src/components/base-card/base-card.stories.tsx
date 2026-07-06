import { Card } from '../../jsx-react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Card` is the **React** build of the write-once `BaseCard` in
 * `@mission-platform/components` — a surface container with optional
 * header/footer regions, authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseCard',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Card` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The body is the default slot; the header/footer regions render only when their content props are supplied.',
      },
    },
  },
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    shadow: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    padding: 'md',
    shadow: false,
    bordered: true,
  },
  render: (arguments_) => (
    <Card {...arguments_}>This is the card body. The body is the component&apos;s default slot.</Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Shadow: Story = { args: { shadow: true } };

export const Borderless: Story = { args: { bordered: false } };

export const WithHeaderAndFooter: Story = {
  args: {
    header: <strong>Card header</strong>,
    footer: <small>Card footer</small>,
  },
};
