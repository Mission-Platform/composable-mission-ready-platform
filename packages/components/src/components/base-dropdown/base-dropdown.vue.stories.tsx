import { ref } from 'vue';

import { Button, Dropdown, Stack } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Dropdown` is the Vue 3 build of the write-once `BaseDropdown` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Overlays/BaseDropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Dropdown` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The trigger is the `trigger` named slot and the menu is the default slot. The panel is portalled to `document.body` through the neutral `<Teleport>` primitive (compiled to React `createPortal` / Vue `<Teleport>`) and stays anchored to its trigger via the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks`) instead of `@floating-ui`; `matchTriggerWidth` uses CSS `anchor-size(width)` with no JS measurement. This example composes the package’s own `Button` (trigger) and `Stack` + ghost `Button`s (menu items). Styling comes from the co-located `base-dropdown.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'bottom', 'top-start', 'top-end', 'top'],
    },
    matchTriggerWidth: { control: 'boolean' },
    maxHeight: { control: 'text' },
    closeOnOutsideClick: { control: 'boolean' },
  },
  args: {
    placement: 'bottom-start',
    matchTriggerWidth: true,
    maxHeight: '240px',
    closeOnOutsideClick: true,
  },
  render: (arguments_) => ({
    components: { Dropdown, Button, Stack },
    setup() {
      const open = ref(false);
      const choose = (): void => {
        open.value = false;
      };
      return { args: arguments_, open, choose };
    },
    template: `
      <div style="padding: 4rem; display: flex; justify-content: center;">
        <Dropdown v-bind="args" :open="open" @update-open="open = $event" @close="open = false">
          <template #trigger>
            <Button variant="secondary" @click="open = !open">Menu ▾</Button>
          </template>
          <Stack gap="2xs">
            <Button variant="tertiary" @click="choose">Profile</Button>
            <Button variant="tertiary" @click="choose">Settings</Button>
            <Button variant="tertiary" @click="choose">Sign out</Button>
          </Stack>
        </Dropdown>
      </div>
    `,
  }),
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BottomEnd: Story = { args: { placement: 'bottom-end' } };

export const Top: Story = { args: { placement: 'top' } };

export const IntrinsicWidth: Story = { args: { matchTriggerWidth: false } };

export const ShortMaxHeight: Story = { args: { maxHeight: '120px' } };
