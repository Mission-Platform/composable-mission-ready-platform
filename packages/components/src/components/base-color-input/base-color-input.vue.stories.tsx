import { ref } from 'vue';

import { ColorInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ColorInput` is the Vue 3 build of the write-once `BaseColorInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseColorInput',
  component: ColorInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ColorInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A native `<input type="color">` swatch is paired with a hex text field; the value is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-color-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Brand colour',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { ColorInput },
    setup() {
      const value = ref(arguments_.modelValue ?? '#3366ff');
      return { args: arguments_, value };
    },
    template: '<ColorInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof ColorInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Used across the marketing site.' } };

export const WithError: Story = { args: { error: 'Please choose a colour.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '#888888' } };
