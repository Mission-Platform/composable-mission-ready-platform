# @mission-platform/forge-router-web-components

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> forge-plugins/forge-router-web-components/docs/index.md: [forge-plugins/forge-router-web-components/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Forge-Router-Ziel für Framework-freie Webkomponenten.

## Laden asynchroner Routen

Verwenden Sie `loadingFallback`, um einen Spinner anzuzeigen, während eine asynchrone Routenansicht aufgelöst wird.
`forge-router-outlet` rendert den Fallback als Overlay und behält den aktuellen Stand bei
Ansicht montiert, bis das Ziel bereit ist:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

Das Outlet entfernt das Overlay nach Erfolg, Weiterleitung, Abbruch oder
Misserfolg. Routenansichtszusagen werden zwischen Navigation und Steckdosenmontage geteilt,
Daher wird eine Lazy Factory nicht zweimal aufgerufen. Ein spätes Ergebnis aus einem veralteten
Die Navigation kann eine neuere Ansicht nicht ersetzen.

`forge-router-link` ist der bereichsbezogene SPA-Einstiegspunkt. Es aktualisiert den Verlauf durch
`push` standardmäßig oder `replace`, wenn die Eigenschaft/das Attribut `replace` festgelegt ist,
aktualisiert seinen `active`- und `exact-active`-Status und hinterlässt geänderte Klicks,
nicht-primäre Klicks, Downloads, externe URLs und gezielte Links zur nativen URL
Browser.

## Frameworkneutrales `Suspense`

Shared Forge-Quellen können die neutrale Grenze verwenden und sie von jedem Compiler senken lassen
zur Target-Native-Implementierung:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

Verwenden Sie für Webkomponenten den `loadingFallback`-Vertrag des Router-Ausgangs
Streckenübergänge; Es gibt keine Framework-Laufzeit- oder globale Ankerabfangfunktion
erforderlich.
