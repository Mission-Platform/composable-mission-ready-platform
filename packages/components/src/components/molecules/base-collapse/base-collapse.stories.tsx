import { h } from '@mission-platform/forge';

import { Collapse } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Collapse` is the write-once component of `@mission-platform/components`.
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
  title: 'Molecules/Display/BaseCollapse',
  component: Collapse,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Collapse` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Built on the native `<details>` element: the clickable summary uses the `summary` slot (or `summary` prop) and the body is the default slot, with a CSS-rotated chevron. Styling comes from the co-located `base-collapse.module.scss`.',
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
    <Collapse {...arguments_} style={{ maxWidth: '28rem' }}>
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
