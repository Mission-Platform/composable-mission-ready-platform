import { ref } from 'vue';

import { RangeInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `RangeInput` is the Vue 3 build of the write-once `BaseRangeInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseRangeInput',
  component: RangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `RangeInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Like the Vue original it renders two bespoke `role="slider"` thumbs on a shared track (dragged with a pointer or moved with the keyboard); the `[lower, upper]` selection is controlled via `modelValue`, kept ordered with an optional `minDistance`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-range-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    showValue: true,
    disabled: false,
  },
  render: (arguments_) => ({
    components: { RangeInput },
    setup() {
      const value = ref(arguments_.modelValue ?? [20, 80]);
      return { args: arguments_, value };
    },
    template: '<RangeInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMinDistance: Story = { args: { minDistance: 20, modelValue: [30, 70] } };

export const Stepped: Story = { args: { step: 10, modelValue: [20, 60] } };

export const Disabled: Story = { args: { disabled: true } };
