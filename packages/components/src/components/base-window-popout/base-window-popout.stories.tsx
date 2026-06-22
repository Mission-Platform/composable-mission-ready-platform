import { WindowPopout } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `WindowPopout` is the Vue 3 build of the write-once `BaseWindowPopout` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Layout/BaseWindowPopout',
  component: WindowPopout,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `WindowPopout` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Inline it shows its default-slot content and a toggle button; clicking the button opens the content in a separate browser window and shows an in-page placeholder. The neutral dialect models neither Vue `<Teleport>` nor React `createPortal`, so the popped-out window receives a static HTML snapshot of the inline content; the open/close state is reported via the `onOpen` / `onClose` callback props. Styling comes from the co-located `base-window-popout.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    title: { control: 'text' },
    width: { control: 'number' },
    height: { control: 'number' },
    popoutLabel: { control: 'text' },
    popinLabel: { control: 'text' },
  },
  args: {
    title: 'Popped-out content',
    width: 600,
    height: 400,
    popoutLabel: 'Pop out',
    popinLabel: 'Pop back in',
  },
  render: (arguments_) => ({
    components: { WindowPopout },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <WindowPopout v-bind="args">
        <div style="padding: var(--mp-spacing-4); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); color: var(--mp-color-text-primary);">
          <h3 style="margin-top: 0;">Detachable panel</h3>
          <p>Click “Pop out” to open this content in a separate browser window.</p>
        </div>
      </WindowPopout>
    `,
  }),
} satisfies Meta<typeof WindowPopout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabels: Story = { args: { popoutLabel: 'Detach', popinLabel: 'Re-attach' } };
