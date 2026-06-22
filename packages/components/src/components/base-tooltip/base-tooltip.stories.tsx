import { Button, Tooltip } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Tooltip` is the Vue 3 build of the write-once `BaseTooltip` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Overlays/BaseTooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Tooltip` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The trigger is the default slot. The hint is portalled to `document.body` through the neutral `<Teleport>` primitive (compiled to React `createPortal` / Vue `<Teleport>`) — mounted only while it is shown — and stays anchored to its trigger via the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks`) instead of `@floating-ui`. This example composes the package’s own `Button` as the trigger. Styling comes from the co-located `base-tooltip.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    disabled: { control: 'boolean' },
    delay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
  },
  args: {
    content: 'Save your changes',
    placement: 'top',
    disabled: false,
    delay: 0,
  },
  render: (arguments_) => ({
    components: { Tooltip, Button },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="padding: 4rem; display: flex; justify-content: center;">
        <Tooltip v-bind="args">
          <Button variant="secondary">Hover or focus me</Button>
        </Tooltip>
      </div>
    `,
  }),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bottom: Story = { args: { placement: 'bottom' } };

export const Right: Story = { args: { placement: 'right' } };

export const WithDelay: Story = { args: { delay: 300 } };

export const Disabled: Story = { args: { disabled: true } };
