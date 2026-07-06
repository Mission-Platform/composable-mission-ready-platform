import { Collapse } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Collapse` is the Vue 3 build of the write-once `BaseCollapse` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseCollapse',
  component: Collapse,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Collapse` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Built on the native `<details>` element: the clickable summary uses the `summary` slot (or `summary` prop) and the body is the default slot, with a CSS-rotated chevron. Styling comes from the co-located `base-collapse.module.scss`.',
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
  render: (arguments_) => ({
    components: { Collapse },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<Collapse v-bind="args" style="max-width: 28rem;">This content is revealed when the disclosure is opened.</Collapse>',
  }),
} satisfies Meta<typeof Collapse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { open: true } };

export const Success: Story = { args: { open: true, variant: 'success' } };

export const Error: Story = { args: { open: true, variant: 'error' } };

export const Disabled: Story = { args: { disabled: true } };
