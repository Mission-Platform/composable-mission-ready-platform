import { Button, ToastContainer, useToast } from '@mission-platform/components/vue';

import type { ToastPosition } from '@mission-platform/components/vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ToastContainer` is the Vue 3 build of the write-once `BaseToastContainer` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`; the very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * It renders the toasts held in the shared `toast-store` (the neutral
 * counterpart of the Vue package's `useToast` composable, exported from the same
 * `./vue` / `./react` subpath) and teleports a fixed, anchored stack to
 * `<body>`. Mount a single instance near the root of your app and trigger toasts
 * imperatively with `useToast()`.
 */
const meta = {
  title: 'Components/Feedback/BaseToastContainer',
  component: ToastContainer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ToastContainer` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It subscribes to the shared observable toast store (the substitute for the Vue `useToast` reactive store) and teleports a positioned stack to `<body>`. Styling comes from the co-located `base-toast-container.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    position: {
      control: 'select',
      options: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    },
    ariaLabel: { control: 'text' },
  },
  args: {
    position: 'top-right',
  },
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveStore: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Trigger live toasts through the shared `useToast` store, rendered by `ToastContainer`.',
      },
    },
  },
  render: (arguments_) => ({
    components: { Button, ToastContainer },
    setup() {
      const toast = useToast();
      const position = (arguments_.position ?? 'top-right') as ToastPosition;
      return { toast, position };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <Button variant="secondary" @click="toast.info('Heads up — something happened.')">Info</Button>
        <Button variant="secondary" @click="toast.success('Your changes were saved.')">Success</Button>
        <Button variant="secondary" @click="toast.warning('Your session is about to expire.')">Warning</Button>
        <Button variant="secondary" @click="toast.error('Something went wrong.')">Error</Button>
        <Button variant="tertiary" @click="toast.clear()">Clear all</Button>
        <ToastContainer :position="position" />
      </div>
    `,
  }),
};
