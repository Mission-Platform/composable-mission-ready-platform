import { ForgeButton } from '@mission-platform/components';
import { h } from '@mission-platform/forge';

import { useToast, type ToastPosition } from '../../../stores/toast-store/toast-store';

import { ForgeToastContainer } from './forge-toast-container';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeToastContainer` is the write-once `ForgeToastContainer` component of `@mission-platform/float`.
 * It subscribes to the shared observable toast
 * store (the substitute for the Vue `useToast` reactive store) and teleports a
 * positioned stack to `<body>`. Mount a single instance near the root of your
 * app and trigger toasts imperatively with `useToast()`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Feedback/ForgeToastContainer',
  component: ForgeToastContainer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeToastContainer` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It subscribes to the shared observable toast store and teleports a positioned stack to `<body>`. Styling comes from the co-located `forge-toast-container.module.scss`.',
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
} satisfies Meta<typeof ForgeToastContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveStore: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Trigger live toasts through the shared `useToast` store, rendered by `ForgeToastContainer`.',
      },
    },
  },
  render: (arguments_) => {
    const toast = useToast();
    const position = (arguments_.position ?? 'top-right') as ToastPosition;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => toast.info('Heads up — something happened.')}
        >
          Info
        </ForgeButton>
        <ForgeButton
          variant="secondary"
          onClick={() => toast.success('Your changes were saved.')}
        >
          Success
        </ForgeButton>
        <ForgeButton
          variant="secondary"
          onClick={() => toast.warning('Your session is about to expire.')}
        >
          Warning
        </ForgeButton>
        <ForgeButton
          variant="secondary"
          onClick={() => toast.error('Something went wrong.')}
        >
          Error
        </ForgeButton>
        <ForgeButton
          variant="tertiary"
          onClick={() => toast.clear()}
        >
          Clear all
        </ForgeButton>
        <ForgeToastContainer position={position} />
      </div>
    );
  },
};
