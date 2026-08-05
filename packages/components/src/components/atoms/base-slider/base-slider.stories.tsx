import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Slider } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Slider` is the write-once `BaseSlider` component of `@mission-platform/components`. It renders a bespoke `role="slider"` thumb on a
 * track (dragged with a pointer or moved with the keyboard); the value is
 * controlled via `modelValue` and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/BaseSlider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Slider` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a bespoke `role="slider"` thumb on a track; the value is controlled via `modelValue`. Styling comes from the co-located `base-slider.module.scss`.',
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
  render: (arguments_) => {
    const [{ modelValue: value = 50 }, updateArguments] = useArgs();

    return (
      <Slider
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm', modelValue: 25 } };

export const Large: Story = { args: { size: 'lg', modelValue: 75 } };

export const Stepped: Story = { args: { min: 0, max: 10, step: 2, modelValue: 4 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 60 } };
