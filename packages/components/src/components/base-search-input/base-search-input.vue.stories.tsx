import { ref } from 'vue';

import { SearchInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `SearchInput` is the Vue 3 build of the write-once `BaseSearchInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseSearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SearchInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A `type="search"` field with a leading `⌕` glyph (or spinner) and a clear `✕` button; the value is controlled via `modelValue`, Enter fires `onSearch` and Escape clears, and the original `v-model` + `search`/`clear` emits become callback props. Styling comes from the co-located `base-search-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    placeholder: 'Search…',
    size: 'md',
    loading: false,
    disabled: false,
  },
  render: (arguments_) => ({
    components: { SearchInput },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<SearchInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = { args: { modelValue: 'mission platform' } };

export const Loading: Story = { args: { modelValue: 'searching', loading: true } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'locked' } };
