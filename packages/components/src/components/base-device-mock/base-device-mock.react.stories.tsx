import { DeviceMock } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `DeviceMock` is the **React** build of the write-once `BaseDeviceMock` in
 * `@mission-platform/components`. It wraps arbitrary screen content (the default
 * slot) in a decorative device frame — `mobile`, `tablet`, `desktop`, or
 * `browser`. Frames are drawn purely with design tokens and authored in `em`, so
 * the shared `size` token scales the whole mock. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseDeviceMock',
  component: DeviceMock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DeviceMock` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Pick a `device` frame (`mobile`, `tablet`, `desktop`, `browser`); the default slot is projected onto the device screen. Styling comes from the co-located `base-device-mock.module.scss`.',
      },
    },
  },
  argTypes: {
    device: { control: 'select', options: ['mobile', 'tablet', 'desktop', 'browser'] },
    orientation: { control: 'inline-radio', options: ['portrait', 'landscape'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    url: { control: 'text' },
    ariaLabel: { control: 'text' },
  },
  args: {
    device: 'mobile',
    orientation: 'portrait',
    size: 'md',
    url: 'https://mission-platform.dev',
  },
  render: (arguments_) => (
    <DeviceMock {...arguments_}>
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          height: '100%',
          padding: '1rem',
          textAlign: 'center',
          background: 'var(--mp-color-bg-base)',
        }}
      >
        Screen content
      </div>
    </DeviceMock>
  ),
} satisfies Meta<typeof DeviceMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = { args: { device: 'mobile' } };

export const MobileLandscape: Story = { args: { device: 'mobile', orientation: 'landscape' } };

export const Tablet: Story = { args: { device: 'tablet' } };

export const Desktop: Story = { args: { device: 'desktop' } };

export const Browser: Story = { args: { device: 'browser', url: 'https://mission-platform.dev' } };

export const AllDevices: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 24 }}>
      <DeviceMock
        device="mobile"
        size="2xs"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Mobile</div>
      </DeviceMock>
      <DeviceMock
        device="tablet"
        size="2xs"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Tablet</div>
      </DeviceMock>
      <DeviceMock
        device="desktop"
        size="2xs"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Desktop</div>
      </DeviceMock>
      <DeviceMock
        device="browser"
        size="2xs"
        url="https://mission-platform.dev"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Browser</div>
      </DeviceMock>
    </div>
  ),
};
