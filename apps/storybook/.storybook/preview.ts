import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '../design-tokens/overrides.generated.scss';
import 'maplibre-gl/dist/maplibre-gl.css';
import './preview.scss';

import { createForgeI18N, forgeNamespace } from '@mission-platform/i18n';
import {
  resolveStorybookFramework,
  sharedPreviewDecorators,
  sharedPreviewParametersFor,
} from '@mission-platform/storybook-framework';
import { resources } from 'virtual:i18n-resources';

import { ensureMonacoEnvironment } from './monaco-environment';

import type { Decorator, Preview } from '@storybook/vue3-vite';
import type { i18n as I18nInstance } from 'i18next';
import type { ComponentType, ReactNode } from 'react';

// Wire Monaco's web workers up front so the WYSIWYG editor (and any other
// `ForgeMonacoEditor` story) runs its language services off the main thread
// instead of freezing the preview iframe — see `./monaco-environment.ts`.
ensureMonacoEnvironment();

const framework = resolveStorybookFramework();

const frameworkDecorators: Decorator[] = [];

// Framework-specific runtime setup. We use top-level await to branch on the
// resolved framework so that for a React build no Vue-only runtime is required
// at render time and vice versa.
if (framework === 'vue') {
  const [{ setup }, { createForgeI18NVue }, { createMemoryHistory, createRouter }] = await Promise.all([
    import('@storybook/vue3-vite'),
    import('@mission-platform/i18n'),
    import('vue-router'),
  ]);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  setup((app) => {
    app.use(
      createForgeI18NVue(
        createForgeI18N({
          namespace: forgeNamespace('storybook'),
          resources,
        }),
      ),
    );
    app.use(router);
  });
} else if (framework === 'react') {
  // `@mission-platform/i18n` is a single specifier whose build is chosen by the
  // active `mp:<framework>` condition, so only one framework's surface is ever
  // visible to TypeScript. This file type-checks under `mp:vue` (see
  // `tsconfig.node.json`) while still needing to *run* under `mp:react`, so the
  // React-only export is described locally rather than imported as a type.
  type ForgeI18NReactModule = {
    ForgeI18NProvider: ComponentType<{ i18n: I18nInstance; children?: ReactNode }>;
  };
  const [{ ForgeI18NProvider }, { createElement }] = await Promise.all([
    import('@mission-platform/i18n') as unknown as Promise<ForgeI18NReactModule>,
    import('react'),
  ]);

  const i18n = createForgeI18N({
    namespace: forgeNamespace('storybook-react'),
    resources,
  });

  frameworkDecorators.push(((Story: unknown) =>
    createElement(ForgeI18NProvider, { i18n }, createElement(Story as ComponentType))) as Decorator);
}

const preview: Preview = {
  decorators: [...sharedPreviewDecorators(), ...frameworkDecorators],

  initialGlobals: {
    theme: 'light',
    viewport: { value: 'md', isRotated: false },
  },

  parameters: sharedPreviewParametersFor(framework),
};

export default preview;
