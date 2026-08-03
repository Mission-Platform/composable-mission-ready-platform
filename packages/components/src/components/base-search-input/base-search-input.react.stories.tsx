import { useState } from 'react';

import { SearchInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `SearchInput` is the **React** build of the write-once `BaseSearchInput` in
 * `@mission-platform/components`. A `type="search"` field with a leading `⌕`
 * glyph (or spinner) and a clear `✕` button; the value is controlled via
 * `modelValue`, Enter fires `onSearch` and Escape clears, and the `v-model` +
 * `search`/`clear` emits become callback props. Authored once in the neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseSearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SearchInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A `type="search"` field with a leading `⌕` glyph (or spinner) and a clear `✕` button; the value is controlled via `modelValue`, Enter fires `onSearch` and Escape clears. Styling comes from the co-located `base-search-input.module.scss`.',
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
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? '');
    return (
      <SearchInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = { args: { modelValue: 'mission platform' } };

export const Loading: Story = { args: { modelValue: 'searching', loading: true } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'locked' } };
