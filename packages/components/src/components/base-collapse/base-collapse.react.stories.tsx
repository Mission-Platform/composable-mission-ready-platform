import { Collapse } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Collapse` is the **React** build of the write-once `BaseCollapse` in
 * `@mission-platform/components` — a disclosure built on the native
 * `<details>` element with a clickable `summary` and a default-slot body.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Display/BaseCollapse',
  component: Collapse,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Collapse` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Built on the native `<details>` element: the clickable summary uses the `summary` slot (or `summary` prop) and the body is the default slot, with a CSS-rotated chevron. Styling comes from the co-located `base-collapse.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    summary: { control: 'text' },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    summary: 'Show details',
    open: false,
    disabled: false,
  },
  render: (arguments_) => (
    <Collapse
      {...arguments_}
      style={{ maxWidth: '28rem' }}
    >
      This content is revealed when the disclosure is opened.
    </Collapse>
  ),
} satisfies Meta<typeof Collapse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { open: true } };

export const Success: Story = { args: { open: true, variant: 'success' } };

export const Error: Story = { args: { open: true, variant: 'error' } };

export const Disabled: Story = { args: { disabled: true } };
