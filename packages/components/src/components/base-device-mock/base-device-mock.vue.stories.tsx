import { DeviceMock } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `DeviceMock` is the Vue 3 build of the write-once `BaseDeviceMock` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * It wraps arbitrary screen content (the default slot) in a decorative device
 * frame — `mobile`, `tablet`, `desktop`, or `browser`. Frames are drawn purely
 * with design tokens and authored in `em`, so the shared `size` token scales
 * the whole mock.
 */
const meta = {
  title: 'Components/Display/BaseDeviceMock',
  component: DeviceMock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DeviceMock` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Pick a `device` frame (`mobile`, `tablet`, `desktop`, `browser`); the default slot is projected onto the device screen. Styling comes from the co-located `base-device-mock.module.scss`.',
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
  render: (arguments_) => ({
    components: { DeviceMock },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <DeviceMock v-bind="args">
        <div style="display: grid; place-items: center; height: 100%; padding: 1rem; text-align: center; background: var(--mp-color-bg-base);">
          Screen content
        </div>
      </DeviceMock>
    `,
  }),
} satisfies Meta<typeof DeviceMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = { args: { device: 'mobile' } };

export const MobileLandscape: Story = { args: { device: 'mobile', orientation: 'landscape' } };

export const Tablet: Story = { args: { device: 'tablet' } };

export const Desktop: Story = { args: { device: 'desktop' } };

export const Browser: Story = { args: { device: 'browser', url: 'https://mission-platform.dev' } };

export const AllDevices: Story = {
  render: () => ({
    components: { DeviceMock },
    template: `
      <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 24px;">
        <DeviceMock device="mobile" size="2xs">
          <div style="display: grid; place-items: center; height: 100%;">Mobile</div>
        </DeviceMock>
        <DeviceMock device="tablet" size="2xs">
          <div style="display: grid; place-items: center; height: 100%;">Tablet</div>
        </DeviceMock>
        <DeviceMock device="desktop" size="2xs">
          <div style="display: grid; place-items: center; height: 100%;">Desktop</div>
        </DeviceMock>
        <DeviceMock device="browser" size="2xs" url="https://mission-platform.dev">
          <div style="display: grid; place-items: center; height: 100%;">Browser</div>
        </DeviceMock>
      </div>
    `,
  }),
};
