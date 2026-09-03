# @mission-platform/forge-router-web-components

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/compiler/plugins/forge-router-web-components/docs/index.md: [packages/compiler/plugins/forge-router-web-components/docs/index.md](../../index.md)
> Langue: Français (fr)

Cible de routeur Forge pour les composants Web sans framework.

## Chargement de route asynchrone

Utilisez `loadingFallback` pour afficher une double flèche pendant la résolution d'une vue d'itinéraire asynchrone.
`forge-router-outlet` restitue la solution de secours sous forme de superposition et conserve la valeur actuelle.
vue montée jusqu'à ce que la destination soit prête :

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

Le point de vente supprime la superposition après un succès, une redirection, une annulation ou
échec. Les promesses de vue d'itinéraire sont partagées entre la navigation et le montage en prise,
donc une usine paresseuse n'est pas invoquée deux fois. Un résultat tardif dû à un outil obsolète
la navigation ne peut pas remplacer une vue plus récente.

`forge-router-link` est le point d’entrée SPA délimité. Il met à jour l'historique via
`push` par défaut ou `replace` lorsque la propriété/attribut `replace` est défini,
met à jour son état `active` et `exact-active`, et laisse les clics modifiés,
clics non principaux, téléchargements, URL externes et liens ciblés vers le natif
navigateur.

## `Suspense` indépendant du cadre

La source Shared Forge peut utiliser la limite neutre et laisser chaque compilateur la réduire
à l'implémentation native cible :

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

Pour les composants Web, utilisez le contrat `loadingFallback` de la prise du routeur pour
transitions d'itinéraire ; aucun environnement d'exécution de framework ou interception d'ancre globale n'est
requis.
