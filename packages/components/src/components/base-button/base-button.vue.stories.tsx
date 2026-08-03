import { Button } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Button` is the Vue 3 build of the write-once `BaseButton` in this package.
 * Like `Badge`, it is authored **once** in the framework-neutral JSX dialect
 * and compiled straight to a Vue functional component at build time by
 * `@mission-platform/vite-plugin-forge`, while the same source also ships to
 * React via the package's `./react` subpath. It mirrors the
 * `@mission-platform/components` `BaseButton`: the canonical colour variants
 * plus a transparent `ghost` treatment, the `2xs → 2xl` size scale, and
 * built-in `disabled` / `loading` states.
 */
const meta = {
  title: 'Components/Display/BaseButton',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Button` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It exposes the same nine `variant`s, the `2xs → 2xl` `size` scale, and built-in `disabled` / `loading` states as the `@mission-platform/components` `BaseButton`. Click events are suppressed while the button is disabled or loading, and the loading spinner exposes an accessible `loadingLabel` (defaulting to `Loading…`). The demo styling on this page comes from the co-located `base-button.module.scss`; the component itself only emits BEM class names.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'neutral',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'info',
        'error',
        'critical',
        'ghost',
      ],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
  },
  render: (arguments_) => ({
    components: { Button },
    setup() {
      return { args: arguments_ };
    },
    template: '<Button v-bind="args">Save</Button>',
  }),
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Tertiary: Story = { args: { variant: 'tertiary' } };

export const Neutral: Story = { args: { variant: 'neutral' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Info: Story = { args: { variant: 'info' } };

export const Error: Story = { args: { variant: 'error' } };

export const Critical: Story = { args: { variant: 'critical' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };
