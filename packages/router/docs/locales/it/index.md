# @mission-platform/router

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/router/docs/index.md: [packages/router/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Una libreria di routing indipendente dal framework che fornisce un modello di routing unificato e adattatori per framework per Vue, React e
altri quadri.

## Panoramica

Il pacchetto `@mission-platform/router` implementa un **sistema di routing indipendente dal framework** che separa il percorso
definizione e logica di corrispondenza dai dettagli di implementazione specifici del framework. Ciò ti consente di definire i tuoi percorsi una volta
e utilizzarli in diversi framework mantenendo la coerenza.

## Caratteristiche principali

- **Framework-Agnostic Core**: definisci percorsi in un formato neutro che funzioni su tutti i framework
- **API Type-Safe**: supporto completo TypeScript per la definizione dei percorsi e la navigazione
- **Architettura componibile**: utilizza i componenti componibili per accedere allo stato del routing e alla navigazione
- **Grammatica del percorso**: corrispondenza flessibile del percorso con i parametri (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **Supporto per stringhe di query**: analisi e serializzazione integrate dei parametri di query
- **Percorsi nidificati**: supporto per strutture di percorsi gerarchici

## Moduli principali ed esportazioni

### Modello del percorso principale

Il sistema di definizione dei percorsi indipendente dal contesto:

**`MpRoute`**: rappresenta un singolo percorso con percorso, nome e metadati.

**`defineRoutes`**: crea un albero di percorso da un array di definizioni di percorso.

**Esempio:**

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

### Utilità del percorso

**`matchRoutes`**: abbina una posizione a un albero di percorsi e restituisce percorsi corrispondenti.

**Esempio:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### Utilità di localizzazione

**`resolveLocation`**: risolve la posizione di un instradamento in un percorso URL.

**Esempio:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## Adattatori quadro

Gli adattatori **non** vengono esposti come percorsi secondari per framework. `@mission-platform/router` dichiara il
Condizioni di esportazione `mp:<framework>` sulla sua singola voce `.`, quindi seleziona il framework **una volta** —
`resolve.conditions` in Vite (vedi `defineFrameworkAppConfig` / `frameworkResolveConditions` da
`@mission-platform/vite-config`) e `customConditions` in TypeScript (tramite il
`@mission-platform/typescript-config/framework-<name>` preset) - quindi importa tutto con lo specificatore nudo.
Ciascuna build dell'adattatore riesporta anche l'intero nucleo neutro.

### Adattatore Vue (condizione `mp:vue`)

L'adattatore specifico Vue fornisce l'integrazione con `vue-router`.

**Principali esportazioni:**

- **`createMpRouter`**: crea un'istanza del router Vue da percorsi neutri
- **`useMpRouter`**: Componibile per accedere all'istanza del router
- **`useMpRoute`**: Componibile per accedere alle informazioni sul percorso corrente
- **`MpRouterLink`**: componente di collegamento router indipendente dal framework

**Esempio:**

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

### Adattatore React (condizione `mp:react`)

L'adattatore React fornisce l'integrazione con il router React.

**Principali esportazioni:**

- **`withMpRouter`**: HOC per fornire il contesto del router
- **`useMpRoute`**: Aggancio per accedere alle informazioni sul percorso corrente
- **`MpLink`**: componente di collegamento indipendente dal framework per React

### Adattatore RedwoodSDK (`./redwood`)

RedwoodSDK non è uno dei framework `mp:*`, quindi mantiene un sottopercorso dedicato. Fornisce l'integrazione con
`rwsdk/router`: la tabella di routing flat di richiesta/risposta utilizzata da RedwoodSDK (React su Cloudflare Workers).

**Principali esportazioni:**

- **`toRedwoodRoutes`**: traduce l'albero neutro `MpRoute` in un elenco semplice di definizioni di percorso `rwsdk` (nidificate
  i percorsi vengono appiattiti in percorsi assoluti).
- **`renderRoutes`**: racchiude i percorsi tradotti in un documento, mirroring
  `render(Document, routes, options)` di `rwsdk`.
- **`toRedwoodPath`**: converte un modello di percorso neutro nella grammatica di Redwood (solo caratteri jolly `:param` e `*`);
  `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: crea href relativi alle app da posizioni neutre, a partire da RedwoodSDK
  naviga con ancore semplici.

**Esempio:**

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

## Dettagli tecnici

### Dipendenze

**Pacchetto principale:**

- **TypeScript**: definizioni di tipo e sicurezza del tipo
- **Nessuna dipendenza dal framework**: JavaScript puro/TypeScript

**Adattatore Vue:**

- **vue-router**: libreria ufficiale del router Vue
- **vue**: Vue 3 core

**Adattatore React:**

- **react-router-dom**: React Router per applicazioni web
- **react**: nucleo React

### Architettura

Il pacchetto segue un'architettura a strati:

1. **Core Layer**: modello di percorso e utilità indipendenti dal contesto
2. **Livello adattatore**: implementazioni specifiche del framework (Vue, React)
3. **API pubblica**: interfaccia unificata per tutti i framework

### Grammatica del percorso

Il router supporta i seguenti modelli di parametri di percorso:

- `:param`: Parametro obbligatorio (es. `/users/:id`)
- `:param?`: Parametro opzionale (es. `/users/:id?`)
- `:param*`: Zero o più parametri (ad esempio `/files/:path*`)
- `:param+`: Uno o più parametri (es. `/files/:path+`)
- `*`: carattere jolly catch-all (ad esempio `/*`)

## Guida all'integrazione

### Configurazione di base con Vue

1. Installa il pacchetto:

```bash
pnpm add @mission-platform/router vue-router
```

2. Definisci i tuoi percorsi:

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

3. Crea il router:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. Utilizza nella tua app:

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

### Corrispondenza dinamica del percorso

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### Navigazione programmatica

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

## Funzionalità avanzate

### Meta campi del percorso

Aggiungi metadati alle rotte per la logica personalizzata:

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

### Protezioni del percorso (Vue)

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

### Percorsi nidificati

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

## Migliori pratiche

1. **Organizzazione del percorso**: raggruppa insieme percorsi correlati e utilizza percorsi nidificati per i componenti del layout
2. **Percorsi con nome**: utilizza sempre percorsi con nome per la navigazione programmatica
3. **Convalida parametri**: convalida i parametri dinamici nei componenti del percorso
4. **Gestione degli errori**: gestione di 404 casi con un percorso generale (`/*`)
5. **Lazy Loading**: utilizza importazioni dinamiche per la suddivisione del codice (specifica del framework)
6. **Type Safety**: definisce le interfacce per i parametri di instradamento e gli oggetti di query
7. **Gestione delle query**: mantieni i parametri delle query semplici e sicuri per gli URL

## Guida alla migrazione

### Direttamente dal router Vue

Durante la migrazione dal router vue a @mission-platform/router:

1. Sostituire `createRouter` con `createMpRouter`
2. Convertire le definizioni del percorso per utilizzare `defineRoutes`
3. Sostituire `<router-link>` con `<MpRouterLink>`
4. Aggiorna i componibili: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### Direttamente dal router React

Durante la migrazione da react-router-dom:

1. Definire i percorsi utilizzando il formato neutro con `defineRoutes`
2. Sostituire `<Link>` con `<MpLink>`
3. Utilizzare `useMpRoute()` invece di `useRoute()`
4. Avvolgere i componenti con `withMpRouter` per l'accesso al router

### Da Next.js

Per le applicazioni Next.js, considerare:

- Utilizzo delle definizioni del percorso neutro per coerenza
- Creazione di un livello adattatore personalizzato, se necessario
- Sfruttare il routing basato su file Next.js insieme al modello neutro
