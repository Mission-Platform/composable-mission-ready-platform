import { AlertBanner } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `AlertBanner` is the **React** build of the write-once `BaseAlertBanner` in
 * `@mission-platform/components` — an intent-toned notification with an optional
 * title, status glyph, dismiss button, and an `actions` slot. Authored once in
 * the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Feedback/BaseAlertBanner',
  component: AlertBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `AlertBanner` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders an intent-toned notification with an optional title, status glyph, dismiss button, and an `actions` slot. Styling comes from the co-located `base-alert-banner.module.scss`.',
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
    dismissible: { control: 'boolean' },
    icon: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    title: 'Heads up',
    dismissible: false,
    icon: true,
  },
  render: (arguments_) => <AlertBanner {...arguments_}>Your changes have been saved.</AlertBanner>,
} satisfies Meta<typeof AlertBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = { args: { variant: 'success', title: 'Success' } };

export const Warning: Story = { args: { variant: 'warning', title: 'Warning' } };

export const Error: Story = { args: { variant: 'error', title: 'Something went wrong' } };

export const Critical: Story = { args: { variant: 'critical', title: 'Critical' } };

export const Neutral: Story = { args: { variant: 'neutral', title: 'Note' } };

export const Dismissible: Story = {
  args: { dismissible: true },
  render: (arguments_) => <AlertBanner {...arguments_}>This banner can be dismissed.</AlertBanner>,
};

export const WithActions: Story = {
  args: { title: 'Update available', actions: 'Update now' },
  render: (arguments_) => <AlertBanner {...arguments_}>A new version is ready.</AlertBanner>,
};
