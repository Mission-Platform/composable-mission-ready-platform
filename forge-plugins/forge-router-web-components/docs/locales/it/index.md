# @mission-platform/forge-router-web-components

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> forge-plugins/forge-router-web-components/docs/index.md: [forge-plugins/forge-router-web-components/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Forgia router target per componenti Web privi di framework.

## Caricamento del percorso asincrono

Utilizzare `loadingFallback` per mostrare uno spinner mentre viene risolta una visualizzazione del percorso asincrono.
`forge-router-outlet` esegue il rendering del fallback come sovrapposizione e mantiene quello corrente
view montata finché la destinazione non è pronta:

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

L'outlet rimuove la sovrapposizione dopo l'esito positivo, il reindirizzamento, l'annullamento o
fallimento. Le promesse di visualizzazione del percorso sono condivise tra la navigazione e il montaggio della presa,
quindi una fabbrica pigra non viene invocata due volte. Un risultato tardivo da un risultato obsoleto
la navigazione non può sostituire una visualizzazione più recente.

`forge-router-link` è il punto di ingresso SPA con ambito. Aggiorna la cronologia tramite
`push` per impostazione predefinita o `replace` quando è impostata la proprietà/attributo `replace`,
aggiorna il suo stato `active` e `exact-active` e lascia i clic modificati,
clic non primari, download, URL esterni e collegamenti mirati al nativo
navigatore.

## `Suspense` neutrale rispetto al framework

L'origine Forge condivisa può utilizzare il limite neutro e consentire a ciascun compilatore di abbassarlo
all'implementazione nativa del target:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

Per i componenti Web, utilizzare il contratto `loadingFallback` della presa del router
transizioni di percorso; non lo è alcun runtime del framework o intercettazione dell'ancora globale
richiesto.
