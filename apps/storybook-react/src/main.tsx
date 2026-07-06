import './style.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app';

const container = document.querySelector('#root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
