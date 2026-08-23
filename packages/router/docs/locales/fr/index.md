# @mission-platform/router

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/router/docs/index.md: [packages/router/docs/index.md](../../index.md)
> Langue: Français (fr)

Une bibliothèque de routage indépendante du framework qui fournit un modèle de route unifié et des adaptateurs par framework pour Vue, React et
d'autres cadres.

## Aperçu

Le package `@mission-platform/router` implémente un **système de routage indépendant du framework** qui sépare l'itinéraire
définition et logique de correspondance à partir des détails de mise en œuvre spécifiques au framework. Cela vous permet de définir vos itinéraires une fois
et utilisez-les dans différents frameworks tout en maintenant la cohérence.

## Principales fonctionnalités

- **Framework-Agnostic Core** : définissez des routes dans un format neutre qui fonctionne sur tous les frameworks
- **API Type-Safe** : prise en charge complète de TypeScript pour les définitions d'itinéraire et la navigation
- **Architecture Composable** : utilisez des composables pour accéder à l'état de routage et à la navigation
- **Grammaire du chemin** : correspondance de chemin flexible avec les paramètres (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **Prise en charge des chaînes de requête** : analyse et sérialisation intégrées des paramètres de requête
- **Routes imbriquées** : prise en charge des structures de routes hiérarchiques

## Principaux modules et exportations

### Modèle d'itinéraire principal

Le système de définition d'itinéraire indépendant du cadre :

**`MpRoute`** : représente une route unique avec le chemin, le nom et les métadonnées.

**`defineRoutes`** : crée une arborescence de routes à partir d'un tableau de définitions de routes.

**Exemple:**

```typescript
import { defineRoutes } from '@mission-platform/router';

const routes = defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: UserProfile,
  },
]);
```

### Utilitaires de chemin

**`matchRoutes`** : fait correspondre un emplacement à une arborescence de routes et renvoie les routes correspondantes.

**Exemple:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### Utilitaires de localisation

**`resolveLocation`** : résout un emplacement d'itinéraire en un chemin d'URL.

**Exemple:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## Adaptateurs de cadre

Les adaptateurs ne sont **pas** exposés en tant que sous-chemins par framework. `@mission-platform/router` déclare le
Conditions d'exportation `mp:<framework>` sur son unique entrée `.`, vous sélectionnez donc le framework **une fois** —
`resolve.conditions` dans Vite (voir `defineFrameworkAppConfig` / `frameworkResolveConditions` de
`@mission-platform/vite-config`) et `customConditions` dans TypeScript (via le
`@mission-platform/typescript-config/framework-<name>` presets) — puis importez le tout avec le simple spécificateur.
Chaque version d'adaptateur réexporte également l'intégralité du noyau neutre.

### Adaptateur Vue (état `mp:vue`)

L'adaptateur spécifique à Vue permet l'intégration avec `vue-router`.

**Principales exportations :**

- **`createMpRouter`** : crée une instance de routeur Vue à partir de routes neutres
- **`useMpRouter`** : Composable pour accéder à l'instance du routeur
- **`useMpRoute`** : Composable pour accéder aux informations d'itinéraire actuelles
- **`MpRouterLink`** : composant de liaison de routeur indépendant du framework

**Exemple:**

```vue
<template>
  <div>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { MpRouterLink, createMpRouter } from '@mission-platform/router';
  import { createApp } from 'vue';
  import routes from './routes';

  const router = createMpRouter({
    routes,
    history: 'web', // or 'hash' or 'memory'
  });

  createApp(App).use(router).mount('#app');
</script>
```

### Adaptateur React (état `mp:react`)

L'adaptateur React permet l'intégration avec le routeur React.

**Principales exportations :**

- **`withMpRouter`** : HOC pour fournir le contexte du routeur
- **`useMpRoute`** : Hook pour accéder aux informations actuelles sur l'itinéraire
- **`MpLink`** : composant de lien indépendant du framework pour React

### Adaptateur RedwoodSDK (`./redwood`)

RedwoodSDK ne fait pas partie des frameworks `mp:*`, il conserve donc un sous-chemin dédié. Il permet l'intégration avec
`rwsdk/router` — la table de routage plate de requête/réponse utilisée par RedwoodSDK (React sur Cloudflare Workers).

**Principales exportations :**

- **`toRedwoodRoutes`** : traduit l'arborescence neutre `MpRoute` en une liste plate de définitions de routes `rwsdk` (imbriquées
  les itinéraires sont aplatis en chemins absolus).
- **`renderRoutes`** : Encapsule les itinéraires traduits dans un document, en miroir
  `rwsdk` et `render(Document, routes, options)`.
- **`toRedwoodPath`** : convertit un modèle de chemin neutre en grammaire de Redwood (caractères génériques `:param` et `*` uniquement ;
  `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`** : créez des hrefs relatifs aux applications à partir d'emplacements neutres, depuis RedwoodSDK
  navigue avec des ancres simples.

**Exemple:**

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([renderRoutes(Document, routes)]);
```

## Détails techniques

### Dépendances

**Forfait de base :**

- **TypeScript** : définitions de types et sécurité de type
- **Aucune dépendance de framework** : JavaScript pur/TypeScript

**Adaptateur Vue :**

- **vue-router** : bibliothèque officielle du routeur Vue
- **vue** : Vue 3 cœurs

**Adaptateur React :**

- **react-router-dom** : React Routeur pour applications Web
- **react** : noyau React

### Architecture

Le package suit une architecture en couches :

1. **Core Layer** : modèle de route et utilitaires neutres en termes de framework
2. **Adapter Layer** : implémentations spécifiques au framework (Vue, React)
3. **API publique** : interface unifiée pour tous les frameworks

### Grammaire du chemin

Le routeur prend en charge les modèles de paramètres de chemin suivants :

- `:param` : paramètre obligatoire (par exemple, `/users/:id`)
- `:param?` : paramètre facultatif (par exemple, `/users/:id?`)
- `:param*` : Zéro ou plusieurs paramètres (par exemple, `/files/:path*`)
- `:param+` : Un ou plusieurs paramètres (par exemple, `/files/:path+`)
- `*` : caractère générique fourre-tout (par exemple, `/*`)

## Guide d'intégration

### Configuration de base avec Vue

1. Installez le package :

```bash
pnpm add @mission-platform/router vue-router
```

2. Définissez vos itinéraires :

```typescript
// src/routes.ts
import { defineRoutes } from '@mission-platform/router';
import HomePage from './pages/Home.vue';
import AboutPage from './pages/About.vue';

export default defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
]);
```

3. Créez le routeur :

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. Utilisez dans votre application :

```vue
// src/App.vue
<script setup lang="ts">
  import { MpRouterLink } from '@mission-platform/router';
</script>

<template>
  <nav>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>
  </nav>
  <router-view />
</template>
```

### Correspondance dynamique d'itinéraire

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### Navigation programmatique

```vue
<script setup lang="ts">
  import { useMpRouter } from '@mission-platform/router';

  const router = useMpRouter();

  const goToAbout = () => {
    router.push('/about');
  };

  const navigateWithParams = () => {
    router.push({
      name: 'user-profile',
      params: { id: '123' },
      query: { tab: 'details' },
    });
  };
</script>
```

## Fonctionnalités avancées

### Acheminer les champs méta

Ajoutez des métadonnées aux routes pour une logique personnalisée :

```typescript
const routes = defineRoutes([
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      adminOnly: true,
    },
  },
]);
```

### Gardes de route (Vue)

```typescript
import { createMpRouter } from '@mission-platform/router';

const router = createMpRouter({
  routes,
  history: 'web',
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

### Itinéraires imbriqués

```typescript
const routes = defineRoutes([
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
      },
    ],
  },
]);
```

## Meilleures pratiques

1. **Organisation des itinéraires** : regroupez les itinéraires associés et utilisez des itinéraires imbriqués pour les composants de mise en page.
2. **Routes nommées** : utilisez toujours des routes nommées pour la navigation par programmation
3. **Validation des paramètres** : validez les paramètres dynamiques dans les composants d'itinéraire
4. **Gestion des erreurs** : gérer 404 cas avec une route fourre-tout (`/*`)
5. **Lazy Loading** : utilisez les importations dynamiques pour le fractionnement du code (spécifique au framework)
6. **Type Safety** : définir des interfaces pour les paramètres de route et les objets de requête
7. **Gestion des requêtes** : gardez les paramètres de requête simples et sécurisés pour les URL

## Guide de migration

### Depuis le routeur Vue directement

Lors de la migration du routeur vue vers @mission-platform/router :

1. Remplacez `createRouter` par `createMpRouter`
2. Convertissez les définitions d'itinéraire pour utiliser `defineRoutes`
3. Remplacez `<router-link>` par `<MpRouterLink>`
4. Mettre à jour les composables : `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### Depuis le routeur React directement

Lors de la migration depuis react-router-dom :

1. Définissez les itinéraires en utilisant le format neutre avec `defineRoutes`
2. Remplacez `<Link>` par `<MpLink>`
3. Utilisez `useMpRoute()` au lieu de `useRoute()`
4. Enveloppez les composants avec `withMpRouter` pour l'accès au routeur

### À partir de Next.js

Pour les applications Next.js, pensez à :

- Utilisation des définitions d'itinéraires neutres pour plus de cohérence
- Création d'une couche d'adaptateur personnalisée si nécessaire
- Exploitation du routage basé sur les fichiers Next.js parallèlement au modèle neutre
