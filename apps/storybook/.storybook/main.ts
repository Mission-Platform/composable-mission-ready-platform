import { createStorybookConfig } from '@mission-platform/storybook-framework';

import type { StorybookConfig } from '@storybook/vue3-vite';

/**
 * The single Mission Platform Storybook app. The renderer, story globs, and
 * shared Vite wiring are all driven by `@mission-platform/storybook-framework`
 * from the `STORYBOOK_FRAMEWORK` env var (defaulting to `vue`), so
 * `STORYBOOK_FRAMEWORK=vue|react pnpm storybook` renders the same story set on
 * the selected framework — no duplicate per-framework Storybook app required.
 */
const config: StorybookConfig = createStorybookConfig({
  packages: [
    'breakpoints',
    'components',
    'd3',
    'rxjs',
    'three',
    'forms',
    'icons',
    'layout',
    'map',
    'qr-code',
    'matrix-code',
    'barcode',
    'code-scanner',
    'wysiwyg',
  ],
});

export default config;
