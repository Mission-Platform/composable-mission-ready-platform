import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';
import 'maplibre-gl/dist/maplibre-gl.css';
import './preview.scss';

import { createForgeI18N, forgeNamespace } from '@mission-platform/i18n';
import {
  resolveStorybookFramework,
  sharedPreviewDecorators,
  sharedPreviewParameters,
} from '@mission-platform/storybook-framework';
import { resources } from 'virtual:i18n-resources';

import { ensureMonacoEnvironment } from './monaco-environment';

import type { Decorator, Preview } from '@storybook/vue3-vite';
import type { ComponentType } from 'react';

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
    import('@mission-platform/i18n/vue'),
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
  const [{ ForgeI18NProvider }, { createElement }] = await Promise.all([
    import('@mission-platform/i18n/react'),
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

  parameters: sharedPreviewParameters,
};

export default preview;
