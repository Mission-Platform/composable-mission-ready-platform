import { CodeScanner } from '@mission-platform/code-scanner/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `CodeScanner` is the Vue 3 build of the write-once `BaseCodeScanner` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`; the very same source also
 * ships as a React component via the package's `./react` subpath. It decodes a
 * QR code, Data Matrix, or 1D barcode from an uploaded image or a live camera
 * stream using the dependency-free Rust/WebAssembly scanner engine.
 */
const meta = {
  title: 'Components/Inputs/BaseCodeScanner',
  component: CodeScanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `CodeScanner` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/code-scanner/vue`) and React (`@mission-platform/code-scanner/react`). Uploads are decoded with `createImageBitmap` + a canvas; the live camera is opened with `getUserMedia` and its frames polled on an interval. Each detection is surfaced through the `onResult` callback. Styling comes from the co-located `base-code-scanner.module.scss`. Note: the live-camera path needs a real browser with camera permission.',
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
