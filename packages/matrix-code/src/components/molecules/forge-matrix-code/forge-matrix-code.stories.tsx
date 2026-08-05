import { ForgeMatrixCode } from '@mission-platform/matrix-code';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeMatrixCode` is the write-once `ForgeMatrixCode` in
 * `@mission-platform/matrix-code`. The component is authored **once** in the
 * framework-neutral JSX dialect (`@mission-platform/forge`) and compiled at
 * build time by `@mission-platform/vite-plugin-forge` to every supported
 * framework.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/matrix-code` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Data Display/ForgeMatrixCode',
  component: ForgeMatrixCode,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMatrixCode` — a 2D Data Matrix (ECC 200) symbol authored once in the neutral JSX dialect and shipped to all supported frameworks. The payload is encoded entirely on the client by the WebAssembly `@mission-platform/matrix-code` encoder (automatic symbol sizing and Reed-Solomon error correction) and drawn as a crisp SVG. The `error` case becomes the `onError` callback prop. Opt into a save/copy toolbar via `showActions` (or the individual `show*Button` props). Styling comes from the co-located `forge-matrix-code.module.scss`.',
      },
    },
  },
  argTypes: {
    symbology: {
      control: 'select',
      options: ['datamatrix', 'gs1datamatrix', 'datamatrixrectangular', 'aztec'],
    },
    size: { control: { type: 'number', min: 80, max: 480, step: 8 } },
    margin: { control: { type: 'number', min: 0, max: 8, step: 1 } },
    color: { control: 'color' },
    background: { control: 'color' },
    moduleShape: { control: 'select', options: ['square', 'rounded', 'dot'] },
    showActions: { control: 'boolean' },
    showDownloadButton: { control: 'boolean' },
    showCopyImageButton: { control: 'boolean' },
    showCopyValueButton: { control: 'boolean' },
  },
  args: {
    value: 'https://mission-platform.dev',
    symbology: 'datamatrix',
    size: 200,
    margin: 1,
    color: '#000000',
    background: '#ffffff',
    ariaLabel: 'Link to mission-platform.dev',
  },
} satisfies Meta<typeof ForgeMatrixCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NumericPayload: Story = { args: { value: '0123456789' } };

export const Gs1DataMatrix: Story = {
  args: { value: '0102345678901234', symbology: 'gs1datamatrix' },
};

export const RectangularDataMatrix: Story = {
  args: { value: '0123456789', symbology: 'datamatrixrectangular' },
};

export const Aztec: Story = {
  args: { value: 'https://mission-platform.dev', symbology: 'aztec' },
};

export const Coloured: Story = { args: { color: '#1d4ed8', background: '#eff6ff' } };

export const NoQuietZone: Story = { args: { margin: 0 } };

export const LongPayload: Story = {
  args: { value: 'The quick brown fox jumps over the lazy dog.' },
};

export const WithActions: Story = {
  args: { showActions: true },
};

export const DotModules: Story = { args: { moduleShape: 'dot' } };

export const RoundedModules: Story = { args: { moduleShape: 'rounded' } };

export const LinearGradient: Story = {
  args: { gradient: { from: '#7c3aed', to: '#2563eb', rotation: 45 } },
};

export const RadialGradient: Story = {
  args: { moduleShape: 'dot', gradient: { type: 'radial', from: '#0ea5e9', to: '#1e3a8a' } },
};

export const WithLogo: Story = {
  args: {
    logo: {
      href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%231d4ed8'/%3E%3C/svg%3E",
    },
  },
};
