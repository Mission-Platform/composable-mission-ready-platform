import { h } from '@mission-platform/forge';

import { Toast } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Toast` is the write-once `BaseToast` component of `@mission-platform/components` — the presentational toast item: an intent
 * glyph, an optional title, the message, and an optional dismiss button (firing
 * `onDismiss`). For live notifications, use the shared `useToast` store +
 * `ToastContainer`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Feedback/BaseToast',
  component: Toast,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Toast` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is the presentational toast item; for live notifications, use the shared `useToast` store + `ToastContainer`. Styling comes from the co-located `base-toast.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    title: { control: 'text' },
    message: { control: 'text' },
    dismissible: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    title: 'Notification',
    message: 'This is a single toast item.',
    dismissible: true,
  },
  render: (arguments_) => <Toast {...arguments_} />,
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = { args: { variant: 'success', title: 'Saved' } };

export const Error: Story = { args: { variant: 'error', title: 'Upload failed' } };

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '24rem' }}>
      <Toast
        variant="neutral"
        title="Note"
        message="A neutral message."
      />
      <Toast
        variant="primary"
        title="Primary"
        message="A primary message."
      />
      <Toast
        variant="secondary"
        title="Secondary"
        message="A secondary message."
      />
      <Toast
        variant="tertiary"
        title="Tertiary"
        message="A tertiary message."
      />
      <Toast
        variant="success"
        title="Success"
        message="Your changes were saved."
      />
      <Toast
        variant="warning"
        title="Warning"
        message="Your session is about to expire."
      />
      <Toast
        variant="info"
        title="Info"
        message="Something happened."
      />
      <Toast
        variant="error"
        title="Error"
        message="Something went wrong."
      />
      <Toast
        variant="critical"
        title="Critical"
        message="A critical failure occurred."
      />
    </div>
  ),
};
