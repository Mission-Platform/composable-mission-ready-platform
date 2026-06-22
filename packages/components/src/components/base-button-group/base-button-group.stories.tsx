import { Button, ButtonGroup } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ButtonGroup` is the Vue 3 build of the write-once `BaseButtonGroup` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ButtonGroup` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It wraps grouped buttons in a flex container; set `attached` to visually join them into a single segmented control. Styling comes from the co-located `base-button-group.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    attached: { control: 'boolean' },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md'] },
    variant: {
      control: 'select',
      options: [
        'neutral',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'info',
        'error',
        'critical',
      ],
    },
    ariaLabel: { control: 'text' },
  },
  args: {
    orientation: 'horizontal',
    attached: false,
    gap: 'sm',
    ariaLabel: 'Demo actions',
  },
  render: (arguments_) => ({
    components: { ButtonGroup, Button },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ButtonGroup v-bind="args">
        <Button variant="secondary">One</Button>
        <Button variant="secondary">Two</Button>
        <Button variant="secondary">Three</Button>
      </ButtonGroup>
    `,
  }),
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = { args: { orientation: 'vertical' } };

export const Attached: Story = { args: { attached: true } };

export const AttachedVertical: Story = { args: { attached: true, orientation: 'vertical' } };

export const WideGap: Story = { args: { gap: 'md' } };
