import { ref } from 'vue';

import { Switch } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Switch` is the Vue 3 build of the write-once `BaseSwitch` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseSwitch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Switch` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A `role="switch"` checkbox styled as a sliding track/thumb across the `2xs … 2xl` size scale; the value is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-switch.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Enable notifications',
    size: 'md',
    disabled: false,
  },
  render: (arguments_) => ({
    components: { Switch },
    setup() {
      const value = ref(Boolean(arguments_.modelValue));
      return { args: arguments_, value };
    },
    template: '<Switch v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const On: Story = { args: { modelValue: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithHint: Story = { args: { hint: 'Sends a push notification for each new message.' } };

export const WithError: Story = { args: { error: 'Notifications are blocked by your browser.' } };

export const Disabled: Story = { args: { disabled: true } };
