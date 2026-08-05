import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { SearchInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `SearchInput` is the write-once `BaseSearchInput` component of `@mission-platform/components`. A `type="search"` field with a leading `⌕`
 * glyph (or spinner) and a clear `✕` button; the value is controlled via
 * `modelValue`, Enter fires `onSearch` and Escape clears, and the `v-model` +
 * `search`/`clear` emits become callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/BaseSearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SearchInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A `type="search"` field with a leading `⌕` glyph (or spinner) and a clear `✕` button; the value is controlled via `modelValue`, Enter fires `onSearch` and Escape clears. Styling comes from the co-located `base-search-input.module.scss`.',
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
    const [{ modelValue: value = '' }, updateArguments] = useArgs();

    return (
      <SearchInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
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
