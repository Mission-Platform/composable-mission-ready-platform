import './style.scss';

import { createMpI18n, mpNamespace } from '@mission-platform/i18n';
import { MpI18nProvider } from '@mission-platform/i18n/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { resources } from 'virtual:i18n-resources';

import App from './app';

const container = document.querySelector('#root');
if (container) {
  const i18n = createMpI18n({
    locale: 'en',
    namespace: mpNamespace('storybook-react'),
    resources,
  });
  createRoot(container).render(
    <StrictMode>
      <MpI18nProvider i18n={i18n}>
        <App />
      </MpI18nProvider>
    </StrictMode>,
  );
}
