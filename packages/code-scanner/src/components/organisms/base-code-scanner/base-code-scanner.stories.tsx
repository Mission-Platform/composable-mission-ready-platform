import { CodeScanner } from '@mission-platform/code-scanner';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `CodeScanner` is the write-once `BaseCodeScanner` in
 * `@mission-platform/code-scanner`. The component is authored **once** in the
 * framework-neutral JSX dialect (`@mission-platform/forge`) and compiled at
 * build time by `@mission-platform/vite-plugin-forge` to every supported
 * framework. It decodes a QR code, Data Matrix, or 1D barcode from an uploaded
 * image or a live camera stream using the dependency-free Rust/WebAssembly
 * scanner engine.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/code-scanner` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Organisms/Inputs/BaseCodeScanner',
  component: CodeScanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `CodeScanner` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Uploads are decoded with `createImageBitmap` + a canvas; the live camera is opened with `getUserMedia` and its frames polled on an interval. Each detection is surfaced through the `onResult` callback. Styling comes from the co-located `base-code-scanner.module.scss`. Note: the live-camera path needs a real browser with camera permission.',
      },
    },
  },
  argTypes: {
    facingMode: { control: 'select', options: ['environment', 'user'] },
    scanIntervalMs: { control: { type: 'number', min: 100, max: 2000, step: 50 } },
    scanRoi: { control: { type: 'number', min: 0.1, max: 1, step: 0.05 } },
    showFileUpload: { control: 'boolean' },
    showCamera: { control: 'boolean' },
    stopOnDecode: { control: 'boolean' },
    debug: { control: 'boolean' },
  },
  args: {
    facingMode: 'environment',
    scanIntervalMs: 300,
    scanRoi: 0.7,
    showFileUpload: true,
    showCamera: true,
    stopOnDecode: true,
    debug: false,
    onResult: (result) => console.log('scanned', result),
    onError: (error) => console.warn('scan error', error),
  },
} satisfies Meta<typeof CodeScanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const UploadOnly: Story = { args: { showCamera: false } };

export const CameraOnly: Story = { args: { showFileUpload: false } };

export const KeepScanning: Story = { args: { stopOnDecode: false } };
