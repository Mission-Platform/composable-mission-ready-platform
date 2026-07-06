import { ref } from 'vue';

import { Button, Popover, Stack, Typography } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Popover` is the Vue 3 build of the write-once `BasePopover` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Overlays/BasePopover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Popover` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The trigger is the `trigger` named slot and the body is the default slot. The panel is portalled to `document.body` through the neutral `<Teleport>` primitive (compiled to React `createPortal` / Vue `<Teleport>`) and stays anchored to its trigger via the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks`) instead of `@floating-ui`. Open state is controlled via `open` + `update:open`; outside-click + `Escape` dismissal listens on `document`. This example composes the package’s own `Button` (trigger) and `Stack` + `Typography` (body). Styling comes from the co-located `base-popover.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    placement: {
      control: 'select',
      options: [
        'top',
        'top-start',
        'top-end',
        'bottom',
        'bottom-start',
        'bottom-end',
        'left',
        'left-start',
        'left-end',
        'right',
        'right-start',
        'right-end',
      ],
    },
    offset: { control: { type: 'number', min: 0, max: 24, step: 1 } },
    closeOnOutsideClick: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    placement: 'bottom-start',
    offset: 6,
    closeOnOutsideClick: true,
    label: 'Account menu',
  },
  render: (arguments_) => ({
    components: { Popover, Button, Stack, Typography },
    setup() {
      const open = ref(false);
      return { args: arguments_, open };
    },
    template: `
      <div style="padding: 6rem; display: flex; justify-content: center;">
        <Popover v-bind="args" :open="open" @update-open="open = $event" @close="open = false">
          <template #trigger>
            <Button variant="secondary" @click="open = !open">Toggle popover</Button>
          </template>
          <Stack gap="2xs" style="padding: 0.5rem 1rem;">
            <Typography variant="label">Account</Typography>
            <Typography color="secondary" variant="body-sm">Popover content lives in the default slot.</Typography>
          </Stack>
        </Popover>
      </div>
    `,
  }),
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TopEnd: Story = { args: { placement: 'top-end' } };

export const RightStart: Story = { args: { placement: 'right-start' } };

export const WideOffset: Story = { args: { offset: 16 } };

export const PersistentOnOutsideClick: Story = { args: { closeOnOutsideClick: false } };
