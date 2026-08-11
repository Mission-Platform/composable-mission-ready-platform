import { createStorybookConfig } from '@mission-platform/storybook-framework';
import { tokenOverridesPlugin } from '@mission-platform/vite-plugin-token-overrides';

import type { StorybookConfig } from '@storybook/vue3-vite';

/**
 * The single Mission Platform Storybook app. The renderer, story globs, and
 * shared Vite wiring are all driven by `@mission-platform/storybook-framework`
 * from the `STORYBOOK_FRAMEWORK` env var (defaulting to `vue`), so
 * `STORYBOOK_FRAMEWORK=vue|react|svelte|solid|web-component pnpm storybook`
 * renders the same neutral story set on every selected framework — no duplicate
 * per-framework Storybook app is required.
 */
const config: StorybookConfig = createStorybookConfig({
  packages: [
    'breakpoints',
    'components',
    'resource-planner',
    'scheduler',
    'd3',
    'rxjs',
    'three',
    'forms',
    'content',
    'vcard',
    'icons',
    'layout',
    'map',
    'qr-code',
    'matrix-code',
    'barcode',
    'code-scanner',
    'email-components',
  ],
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), tokenOverridesPlugin({ source: 'design-tokens/overrides.tokens.json' })],
  }),
});

export default config;
