import { QrCode } from '@mission-platform/qr-code/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `QrCode` is the Vue 3 build of the write-once `BaseQrCode` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Data Display/BaseQrCode',
  component: QrCode,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `QrCode` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The payload is encoded entirely on the client by the WebAssembly `@mission-platform/qr-code` encoder and drawn as a crisp SVG. The `variant` prop switches between a standard square QR Code (`qr`), a compact square Micro QR Code (`micro`), and a wide Rectangular Micro QR / rMQR Code (`rmqr`). The original `computed` render becomes the neutral `useMemo`, and the `error` emit becomes the `onError` callback prop. Opt into a save/copy toolbar via `showActions` (or the individual `show*Button` props). Styling comes from the co-located `base-qr-code.module.scss`.',
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['qr', 'micro', 'rmqr'] },
    errorCorrection: { control: 'select', options: ['L', 'M', 'Q', 'H'] },
    size: { control: { type: 'number', min: 80, max: 480, step: 8 } },
    margin: { control: { type: 'number', min: 0, max: 8, step: 1 } },
    color: { control: 'color' },
    background: { control: 'color' },
    moduleShape: { control: 'select', options: ['square', 'rounded', 'dot'] },
    finderShape: { control: 'select', options: ['square', 'rounded', 'dot'] },
    showActions: { control: 'boolean' },
    showDownloadButton: { control: 'boolean' },
    showCopyImageButton: { control: 'boolean' },
    showCopyValueButton: { control: 'boolean' },
  },
  args: {
    value: 'https://mission-platform.dev',
    variant: 'qr',
    errorCorrection: 'M',
    size: 200,
    margin: 4,
    color: '#000000',
    background: '#ffffff',
    ariaLabel: 'Link to mission-platform.dev',
  },
} satisfies Meta<typeof QrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighErrorCorrection: Story = { args: { errorCorrection: 'H' } };

/**
 * A **Micro QR Code** (ISO/IEC 18004): a compact square symbol (M1–M4, 11×11 to
 * 17×17) for very short payloads. Micro QR supports error-correction levels
 * `L`, `M` and `Q` only.
 */
export const MicroQr: Story = {
  args: { variant: 'micro', value: '12345', errorCorrection: 'L', ariaLabel: 'Micro QR Code' },
};

/**
 * A **Rectangular Micro QR (rMQR) Code** (ISO/IEC 23941): a wide, short symbol
 * that fits neatly on narrow surfaces. rMQR supports levels `M` and `H` only.
 */
export const RectangularMicroQr: Story = {
  args: { variant: 'rmqr', value: 'https://mission-platform.dev', errorCorrection: 'M', ariaLabel: 'rMQR Code' },
};

export const MicroQrRounded: Story = {
  args: { variant: 'micro', value: 'HELLO', errorCorrection: 'M', moduleShape: 'rounded' },
};

export const Coloured: Story = { args: { color: '#1d4ed8', background: '#eff6ff' } };

export const NoQuietZone: Story = { args: { margin: 0 } };

export const LongPayload: Story = {
  args: { value: 'The quick brown fox jumps over the lazy dog. '.repeat(6) },
};

export const WithActions: Story = {
  args: { showActions: true },
};

export const DotModules: Story = { args: { moduleShape: 'dot' } };

export const RoundedModules: Story = { args: { moduleShape: 'rounded' } };

export const RoundedDotFinders: Story = {
  args: { moduleShape: 'rounded', finderShape: 'dot' },
};

export const LinearGradient: Story = {
  args: { gradient: { from: '#7c3aed', to: '#2563eb', rotation: 45 } },
};

export const RadialGradient: Story = {
  args: { moduleShape: 'dot', gradient: { type: 'radial', from: '#0ea5e9', to: '#1e3a8a' } },
};

export const WithLogo: Story = {
  args: {
    errorCorrection: 'H',
    logo: {
      href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%231d4ed8'/%3E%3C/svg%3E",
    },
  },
};
