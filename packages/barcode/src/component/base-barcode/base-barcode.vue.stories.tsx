import { Barcode } from '@mission-platform/barcode/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Barcode` is the Vue 3 build of the write-once `BaseBarcode` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Data Display/BaseBarcode',
  component: Barcode,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Barcode` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/barcode/vue`) and React (`@mission-platform/barcode/react`). The payload is encoded entirely on the client by the WebAssembly `@mission-platform/barcode` encoder and drawn as a crisp SVG. The original `computed` render becomes the neutral `useMemo`, and the `error` emit becomes the `onError` callback prop. Opt into a save/copy toolbar via `showActions` (or the individual `show*Button` props). Styling comes from the co-located `base-barcode.module.scss`.',
      },
    },
  },
  argTypes: {
    symbology: {
      control: 'select',
      options: [
        'code128',
        'gs1-128',
        'code39',
        'code39ext',
        'code93',
        'code93ext',
        'ean13',
        'ean8',
        'upca',
        'upce',
        'itf',
        'itf14',
        'codabar',
        'msi',
        'pharmacode',
      ],
    },
    height: { control: { type: 'number', min: 20, max: 240, step: 10 } },
    moduleWidth: { control: { type: 'number', min: 1, max: 6, step: 1 } },
    margin: { control: { type: 'number', min: 0, max: 20, step: 1 } },
    color: { control: 'color' },
    background: { control: 'color' },
    displayValue: { control: 'boolean' },
    showActions: { control: 'boolean' },
    showDownloadButton: { control: 'boolean' },
    showCopyImageButton: { control: 'boolean' },
    showCopyValueButton: { control: 'boolean' },
  },
  args: {
    value: '012345678905',
    symbology: 'upca',
    height: 80,
    moduleWidth: 2,
    margin: 10,
    color: '#000000',
    background: '#ffffff',
    ariaLabel: 'Product barcode',
  },
} satisfies Meta<typeof Barcode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Code128: Story = { args: { value: 'MISSION-PLATFORM', symbology: 'code128' } };

export const Code39: Story = { args: { value: 'HELLO WORLD', symbology: 'code39' } };

export const Ean13: Story = { args: { value: '4006381333931', symbology: 'ean13' } };

export const Ean8: Story = { args: { value: '96385074', symbology: 'ean8' } };

export const Itf: Story = { args: { value: '1234567890', symbology: 'itf' } };

export const Codabar: Story = { args: { value: '40156', symbology: 'codabar' } };

export const Gs1128: Story = { args: { value: '0102345678901234', symbology: 'gs1-128' } };

export const Code93: Story = { args: { value: 'MISSION 93', symbology: 'code93' } };

export const Code39Extended: Story = { args: { value: 'Mission#42', symbology: 'code39ext' } };

export const Code93Extended: Story = { args: { value: 'Mission#42', symbology: 'code93ext' } };

export const UpcE: Story = { args: { value: '01234565', symbology: 'upce' } };

export const Itf14: Story = { args: { value: '1540014128876', symbology: 'itf14' } };

export const Msi: Story = { args: { value: '1234567', symbology: 'msi' } };

export const Pharmacode: Story = { args: { value: '1234', symbology: 'pharmacode' } };

export const WithText: Story = { args: { displayValue: true } };

export const Coloured: Story = { args: { color: '#1d4ed8', background: '#eff6ff', displayValue: true } };

export const Tall: Story = { args: { height: 140, moduleWidth: 3 } };

export const WithActions: Story = { args: { showActions: true, displayValue: true } };
