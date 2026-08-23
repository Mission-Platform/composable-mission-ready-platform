# @mission-platform/router

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/router/docs/index.md: [packages/router/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een raamwerk-agnostische routeringsbibliotheek die een uniform routemodel en adapters per raamwerk biedt voor Vue, React en
andere kaders.

## Overzicht

Het `@mission-platform/router`-pakket implementeert een **framework-neutraal routesysteem** dat de route scheidt
definitie en bijpassende logica op basis van raamwerkspecifieke implementatiedetails. Hiermee kunt u uw routes eenmalig definiëren
en gebruik ze in verschillende raamwerken met behoud van de consistentie.

## Belangrijkste kenmerken

- **Framework-Agnostic Core**: definieer routes in een neutraal formaat dat over raamwerken heen werkt
- **Type-Safe API**: Volledige TypeScript-ondersteuning voor routedefinities en navigatie
- **Composable Architecture**: gebruik composables om toegang te krijgen tot de routeringsstatus en navigatie
- **Padgrammatica**: flexibele padmatching met parameters (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **Ondersteuning voor queryreeksen**: ingebouwde parsering en serialisatie van queryparameters
- **Geneste routes**: ondersteuning voor hiërarchische routestructuren

## Hoofdmodules en exporten

### Kernroutemodel

Het raamwerkneutrale routedefinitiesysteem:

**`MpRoute`**: vertegenwoordigt één route met pad, naam en metagegevens.

**`defineRoutes`**: Creëert een routeboom op basis van een reeks routedefinities.

**Voorbeeld:**

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

### Padhulpprogramma's

**`matchRoutes`**: vergelijkt een locatie met een routeboom en retourneert overeenkomende routes.

**Voorbeeld:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### Locatievoorzieningen

**`resolveLocation`**: zet een routelocatie om in een URL-pad.

**Voorbeeld:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## Kaderadapters

Adapters worden **niet** weergegeven als subpaden per raamwerk. `@mission-platform/router` verklaart de
`mp:<framework>` exportvoorwaarden op zijn enkele `.`-invoer, dus u selecteert het raamwerk **eenmaal** —
`resolve.conditions` in Vite (zie `defineFrameworkAppConfig` / `frameworkResolveConditions` van
`@mission-platform/vite-config`) en `customConditions` in TypeScript (via de
`@mission-platform/typescript-config/framework-<name>`-voorinstellingen) - en importeer vervolgens alles met de kale specificatie.
Elke adapterbuild exporteert ook de hele neutrale kern opnieuw.

### Vue Adapter (`mp:vue` staat)

De Vue-specifieke adapter biedt integratie met `vue-router`.

**Belangrijkste exportproducten:**

- **`createMpRouter`**: Creëert een Vue Router-instantie van neutrale routes
- **`useMpRouter`**: configureerbaar voor toegang tot de routerinstantie
- **`useMpRoute`**: samen te stellen om toegang te krijgen tot huidige route-informatie
- **`MpRouterLink`**: Kaderneutrale routerverbindingscomponent

**Voorbeeld:**

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

### React Adapter (`mp:react` staat)

De React-adapter biedt integratie met de React-router.

**Belangrijkste exportproducten:**

- **`withMpRouter`**: HOC om routercontext te bieden
- **`useMpRoute`**: Hook voor toegang tot huidige route-informatie
- **`MpLink`**: raamwerkneutrale linkcomponent voor React

### RedwoodSDK-adapter (`./redwood`)

RedwoodSDK is niet een van de `mp:*`-frameworks en houdt dus een speciaal subpad bij. Het biedt integratie met
`rwsdk/router` — de platte aanvraag/antwoord-routetabel die wordt gebruikt door RedwoodSDK (React op Cloudflare Workers).

**Belangrijkste exportproducten:**

- **`toRedwoodRoutes`**: Vertaalt de neutrale `MpRoute`-structuur naar een platte lijst met `rwsdk`-routedefinities (geneste
  routes worden afgevlakt tot absolute paden).
- **`renderRoutes`**: Verpakt de vertaalde routes in een document, spiegelend
  `rwsdk` en `render(Document, routes, options)`.
- **`toRedwoodPath`**: Converteert een neutraal padpatroon naar de grammatica van Redwood (alleen `:param` en `*` wildcards);
  `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: bouw app-relatieve hrefs vanaf neutrale locaties, sinds RedwoodSDK
  navigeert met gewone ankers.

**Voorbeeld:**

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

## Technische details

### Afhankelijkheden

**Kernpakket:**

- **TypeScript**: Typedefinities en typeveiligheid
- **Geen raamwerkafhankelijkheden**: Pure JavaScript/TypeScript

**Vue-adapter:**

- **vue-router**: officiële Vue routerbibliotheek
- **vue**: Vue 3 kernen

**React-adapter:**

- **react-router-dom**: React Router voor webapplicaties
- **react**: React-kern

### Architectuur

Het pakket volgt een gelaagde architectuur:

1. **Kernlaag**: raamwerkneutraal routemodel en nutsvoorzieningen
2. **Adapterlaag**: raamwerkspecifieke implementaties (Vue, React)
3. **Openbare API**: uniforme interface voor alle frameworks

### Padgrammatica

De router ondersteunt de volgende padparameterpatronen:

- `:param`: vereiste parameter (bijvoorbeeld `/users/:id`)
- `:param?`: optionele parameter (bijvoorbeeld `/users/:id?`)
- `:param*`: nul of meer parameters (bijvoorbeeld `/files/:path*`)
- `:param+`: een of meer parameters (bijvoorbeeld `/files/:path+`)
- `*`: Catch-all-wildcard (bijvoorbeeld `/*`)

## Integratie Gids

### Basisinstallatie met Vue

1. Installeer het pakket:

```bash
pnpm add @mission-platform/router vue-router
```

2. Bepaal uw routes:

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

3. Maak de router:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. Gebruik in uw app:

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

### Dynamische routematching

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### Programmatische navigatie

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

## Geavanceerde functies

### Route-metavelden

Metagegevens toevoegen aan routes voor aangepaste logica:

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

### Routewachten (Vue)

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

### Geneste routes

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

## Beste praktijken

1. **Routeorganisatie**: Groepeer gerelateerde routes samen en gebruik geneste routes voor lay-outcomponenten
2. **Benoemde routes**: gebruik altijd benoemde routes voor programmatische navigatie
3. **Parametervalidatie**: Valideer dynamische parameters in routecomponenten
4. **Foutafhandeling**: 404 cases behandelen met een catch-all-route (`/*`)
5. **Lazy Loading**: gebruik dynamische import voor het splitsen van codes (framework-specifiek)
6. **Typeveiligheid**: Definieer interfaces voor routeparameters en queryobjecten
7. **Querybeheer**: houd queryparameters eenvoudig en URL-veilig

## Migratiegids

### Rechtstreeks vanaf de Vue-router

Bij het migreren van vue-router naar @mission-platform/router:

1. Vervang `createRouter` door `createMpRouter`
2. Converteer routedefinities om `defineRoutes` te gebruiken
3. Vervang `<router-link>` door `<MpRouterLink>`
4. Composables bijwerken: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### Rechtstreeks vanaf de React-router

Bij het migreren vanuit react-router-dom:

1. Definieer routes met behulp van het neutrale formaat met `defineRoutes`
2. Vervang `<Link>` door `<MpLink>`
3. Gebruik `useMpRoute()` in plaats van `useRoute()`
4. Verpak de componenten met `withMpRouter` voor toegang tot de router

### Van Next.js

Voor Next.js-toepassingen kunt u het volgende overwegen:

- Gebruik van de neutrale routedefinities voor consistentie
- Indien nodig een aangepaste adapterlaag maken
- Gebruikmaken van op bestanden gebaseerde routing van Next.js naast het neutrale model
