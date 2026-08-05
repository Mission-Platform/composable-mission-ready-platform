import { h } from '@mission-platform/forge';

import { ForgeDeviceMock } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeDeviceMock` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 *
 * It wraps arbitrary screen content (the default slot) in a decorative device
 * frame — `mobile`, `tablet`, `desktop`, or `browser`. Frames are drawn purely
 * with design tokens and authored in `em`, so the shared `size` token scales
 * the whole mock.
 */
const meta = {
  title: 'Molecules/Display/ForgeDeviceMock',
  component: ForgeDeviceMock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDeviceMock` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Pick a `device` frame (`mobile`, `tablet`, `desktop`, `browser`); the default slot is projected onto the device screen. Styling comes from the co-located `forge-device-mock.module.scss`.',
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
    <ForgeDeviceMock {...arguments_}>
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
    </ForgeDeviceMock>
  ),
} satisfies Meta<typeof ForgeDeviceMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = { args: { device: 'mobile' } };

export const MobileLandscape: Story = { args: { device: 'mobile', orientation: 'landscape' } };

export const Tablet: Story = { args: { device: 'tablet' } };

export const Desktop: Story = { args: { device: 'desktop' } };

export const Browser: Story = { args: { device: 'browser', url: 'https://mission-platform.dev' } };

export const AllDevices: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '24px' }}>
      <ForgeDeviceMock
        device="mobile"
        size="2xs"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Mobile</div>
      </ForgeDeviceMock>
      <ForgeDeviceMock
        device="tablet"
        size="2xs"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Tablet</div>
      </ForgeDeviceMock>
      <ForgeDeviceMock
        device="desktop"
        size="2xs"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Desktop</div>
      </ForgeDeviceMock>
      <ForgeDeviceMock
        device="browser"
        size="2xs"
        url="https://mission-platform.dev"
      >
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Browser</div>
      </ForgeDeviceMock>
    </div>
  ),
};
