import '@mission-platform/tokens/scss/tokens';
// highlight.js ships only a light theme here; the dark / auto (system) syntax
// palettes are layered on in `./styles/global.scss` so code blocks follow the
// active colour theme like the rest of the UI.
import 'highlight.js/styles/github.css';

// These bare imports intentionally resolve through `mp:web-component`. They
// register Forge custom elements without pulling framework runtime artifacts
// into the browser graph.
import '@mission-platform/components';
import '@mission-platform/content';
import '@mission-platform/forms';
import '@mission-platform/select';
import '@mission-platform/theme';

// Register the web-components layout module and retain its CSS sidecar in the
// production bundle.
import '@mission-platform/layouts';

import { updateRouteMetadata } from './app/metadata';
import { createDocsRouter } from './app/router';

import type { MpRouteChangeEvent, MpRouterAdapter } from '@mission-platform/router';

import './app/app-shell';

import './app/app.scss';
import './styles/global.scss';

interface DocsShellElement extends HTMLElement {
  setRouter?: (router: MpRouterAdapter) => void;
}

/**
 * Ensure the activation target exists for both the SPA shell (`index.html`) and
 * prerendered deep links. Prerender emits `<docs-app-shell>`; if a host page
 * only has a bare mount node, we create/upgrade one in place.
 */
function ensureAppShell(): DocsShellElement {
  const existing = document.querySelector<DocsShellElement>('docs-app-shell');
  if (existing) return existing;

  const mount = document.querySelector('#app') ?? document.body;
  const shell = document.createElement('docs-app-shell') as DocsShellElement;
  shell.id = 'app';

  const preexistingOutlet = mount.querySelector('forge-router-outlet') ?? document.querySelector('forge-router-outlet');
  if (preexistingOutlet) {
    shell.append(preexistingOutlet);
  } else {
    shell.append(document.createElement('forge-router-outlet'));
  }

  if (mount === document.body) {
    // Replace a non-shell #app mount when present; otherwise append.
    const legacyMount = document.querySelector('#app');
    if (legacyMount && legacyMount !== shell) {
      legacyMount.replaceWith(shell);
    } else {
      document.body.prepend(shell);
    }
  } else {
    mount.replaceWith(shell);
  }

  return shell;
}

const router = createDocsRouter();
const shell = ensureAppShell();

shell.setRouter?.(router);
const outlet = shell.querySelector<HTMLElement & { setRouter?: (router: MpRouterAdapter) => void }>(
  'forge-router-outlet',
);
outlet?.setRouter?.(router);

router.subscribe((event: MpRouteChangeEvent) => {
  if (event.type !== 'success' && event.type !== 'redirect') return;
  updateRouteMetadata(event.to);
});

void router.ready.then(() => {
  if (router.current.value) updateRouteMetadata(router.current.value);
});
