import BaseQrCode from './base-qr-code.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Data Display/BaseQrCode',
  component: BaseQrCode,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    errorCorrection: { control: 'inline-radio', options: ['L', 'M', 'Q', 'H'] },
    size: { control: { type: 'range', min: 80, max: 360, step: 8 } },
    margin: { control: { type: 'range', min: 0, max: 8, step: 1 } },
    color: { control: 'color' },
    background: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    value: 'https://mission-platform.com',
    errorCorrection: 'M',
    size: 200,
    margin: 4,
    color: '#000000',
    background: '#ffffff',
    ariaLabel: 'Open mission-platform.com',
  },
  parameters: {
    docs: {
      description: {
        component:
          '`QrCode` encodes a URL or arbitrary text into a scannable QR Code, rendered as a crisp SVG with no runtime dependencies. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
} satisfies Meta<typeof BaseQrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default code encoding the Mission Platform URL at error-correction level M. */
export const Default: Story = {};

/** Highest error-correction level — survives more occlusion (e.g. a centred logo). */
export const HighErrorCorrection: Story = {
  args: { errorCorrection: 'H', ariaLabel: 'High error correction QR code' },
};

/** Brand-coloured modules on a tinted background. Keep strong contrast for scanning. */
export const Themed: Story = {
  args: { color: '#1f2a44', background: '#eef2ff' },
};

/** No quiet zone — useful when the surrounding layout already provides padding. */
export const NoMargin: Story = {
  args: { margin: 0 },
};

/** A longer payload automatically selects a higher-density QR version. */
export const LongPayload: Story = {
  args: {
    value: 'https://mission-platform.com/docs/getting-started?utm_source=storybook&utm_campaign=qr-demo',
    ariaLabel: 'Open the getting-started guide',
  },
};
