import { ref } from 'vue';

import { Rating } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Rating` is the Vue 3 build of the write-once `BaseRating` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseRating',
  component: Rating,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Rating` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A row of `★` glyph stars (the inline SVGs are substituted) with optional half-star precision, hover preview (neutral `useState`), and a read-only display mode; the value is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-rating.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    allowHalf: { control: 'boolean' },
    readonly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
  },
  args: {
    modelValue: 3,
    max: 5,
    size: 'md',
    allowHalf: false,
    readonly: false,
    disabled: false,
    clearable: false,
  },
  render: (arguments_) => ({
    components: { Rating },
    setup() {
      const value = ref(arguments_.modelValue ?? 0);
      return { args: arguments_, value };
    },
    template: '<Rating v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HalfStars: Story = { args: { allowHalf: true, modelValue: 3.5 } };

export const Clearable: Story = { args: { clearable: true } };

export const ReadOnly: Story = { args: { readonly: true, modelValue: 4 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 2 } };

export const Large: Story = { args: { size: 'lg', modelValue: 5 } };
