# @mission-platform/forge-router-web-components

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> forge-plugins/forge-router-web-components/docs/index.md: [forge-plugins/forge-router-web-components/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Smeed een routerdoel voor raamwerkvrije webcomponenten.

## Asynchroon laden van routes

Gebruik `loadingFallback` om een ​​spinner weer te geven terwijl een asynchrone routeweergave wordt opgelost.
`forge-router-outlet` geeft de fallback weer als een overlay en behoudt de huidige
weergave gemonteerd totdat de bestemming gereed is:

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

Het stopcontact verwijdert de overlay na succes, omleiding, annulering of
mislukking. Routeweergavebeloften worden gedeeld tussen navigatie en uitlaatmontage,
er wordt dus niet tweemaal een beroep gedaan op een luie fabriek. Een laat resultaat van een verouderd
navigatie kan een nieuwere weergave niet vervangen.

`forge-router-link` is het bereikbare SPA-ingangspunt. Het werkt de geschiedenis bij
Standaard `push` of `replace` wanneer de eigenschap/kenmerk `replace` is ingesteld,
werkt de status `active` en `exact-active` bij en laat gewijzigde klikken achter,
niet-primaire klikken, downloads, externe URL's en gerichte links naar de native
browser.

## Kaderneutrale `Suspense`

Shared Forge-bron kan de neutrale grens gebruiken en elke compiler deze laten verlagen
naar de target-native implementatie:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

Voor webcomponenten gebruikt u het `loadingFallback`-contract van de router
routeovergangen; er is geen raamwerkruntime of globale ankeronderschepping mogelijk
vereist.
