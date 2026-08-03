import { Tag } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Tag` is the Vue 3 build of the write-once `BaseTag` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseTag',
  component: Tag,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Tag` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a toned, rounded label (text via the composed neutral `Typography`); set `removable` to show a remove button that fires `onRemove`. Styling comes from the co-located `base-tag.module.scss`.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    disabled: { control: 'boolean' },
    removable: { control: 'boolean' },
  },
  args: {
    label: 'Tag',
    size: 'md',
    variant: 'neutral',
    disabled: false,
    removable: false,
  },
  render: (arguments_) => ({
    components: { Tag },
    setup() {
      return { args: arguments_ };
    },
    template: '<Tag v-bind="args" />',
  }),
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Success: Story = { args: { variant: 'success', label: 'Active' } };

export const Removable: Story = { args: { removable: true } };

export const Disabled: Story = { args: { disabled: true } };
