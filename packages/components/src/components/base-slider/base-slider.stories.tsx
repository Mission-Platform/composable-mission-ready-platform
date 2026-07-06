import { ref } from 'vue';

import { Slider } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Slider` is the Vue 3 build of the write-once `BaseSlider` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseSlider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Slider` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Like the Vue original it renders a bespoke `role="slider"` thumb on a track (dragged with a pointer or moved with the keyboard); the value is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-slider.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    showValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    showValue: true,
    disabled: false,
    ariaLabel: 'Value',
  },
  render: (arguments_) => ({
    components: { Slider },
    setup() {
      const value = ref(arguments_.modelValue ?? 50);
      return { args: arguments_, value };
    },
    template: '<Slider v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm', modelValue: 25 } };

export const Large: Story = { args: { size: 'lg', modelValue: 75 } };

export const Stepped: Story = { args: { min: 0, max: 10, step: 2, modelValue: 4 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 60 } };
