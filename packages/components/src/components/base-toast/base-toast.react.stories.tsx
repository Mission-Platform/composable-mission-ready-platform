import { Toast } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Toast` is the **React** build of the write-once `BaseToast` in
 * `@mission-platform/components` — the presentational toast item: an intent
 * glyph, an optional title, the message, and an optional dismiss button (firing
 * `onDismiss`). For live notifications, use the shared `useToast` store +
 * `ToastContainer`. Authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Feedback/BaseToast',
  component: Toast,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Toast` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It is the presentational toast item; for live notifications, use the shared `useToast` store + `ToastContainer`. Styling comes from the co-located `base-toast.module.scss`.',
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
