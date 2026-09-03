# @mission-platform/router

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/core/router/docs/index.md: [packages/core/router/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Eine Framework-unabhängige Routing-Bibliothek, die ein einheitliches Routenmodell und Framework-spezifische Adapter für Vue, React und bereitstellt
andere Frameworks.

## Überblick

Das `@mission-platform/router`-Paket implementiert ein **Framework-neutrales Routing-System**, das die Route trennt
Definition und Matching-Logik aus Framework-spezifischen Implementierungsdetails. Dadurch können Sie Ihre Routen einmalig definieren
und verwenden Sie sie über verschiedene Frameworks hinweg unter Wahrung der Konsistenz.

## Hauptmerkmale

- **Framework-Agnostic Core**: Definieren Sie Routen in einem neutralen Format, das über Frameworks hinweg funktioniert
- **Typsichere API**: Vollständige TypeScript-Unterstützung für Routendefinitionen und Navigation
- **Composable Architecture**: Verwenden Sie Composables, um auf den Routing-Status und die Navigation zuzugreifen
- **Pfadgrammatik**: Flexibler Pfadabgleich mit Parametern (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **Unterstützung für Abfragezeichenfolgen**: Integrierte Analyse und Serialisierung von Abfrageparametern
- **Verschachtelte Routen**: Unterstützung für hierarchische Routenstrukturen

## Hauptmodule und Exporte

### Kernroutenmodell

Das Framework-neutrale Routendefinitionssystem:

**`MpRoute`**: Stellt eine einzelne Route mit Pfad, Name und Metadaten dar.

**`defineRoutes`**: Erstellt einen Routenbaum aus einem Array von Routendefinitionen.

**Beispiel:**

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

### Pfad-Dienstprogramme

**`matchRoutes`**: Gleicht einen Standort mit einem Routenbaum ab und gibt übereinstimmende Routen zurück.

**Beispiel:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### Standort-Dienstprogramme

**`resolveLocation`**: Löst einen Routenstandort in einen URL-Pfad auf.

**Beispiel:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## Framework-Adapter

Adapter werden **nicht** als Unterpfade pro Framework verfügbar gemacht. `@mission-platform/router` deklariert die
`mp:<framework>`-Exportbedingungen für den einzelnen `.`-Eintrag, sodass Sie das Framework **einmal** auswählen –
`resolve.conditions` in Vite (siehe `defineFrameworkAppConfig` / `frameworkResolveConditions` von
`@mission-platform/vite-config`) und `customConditions` in TypeScript (über die
`@mission-platform/typescript-config/framework-<name>`-Voreinstellungen) – und importieren Sie dann alles mit dem bloßen Spezifizierer.
Jeder Adapter-Build exportiert auch den gesamten neutralen Kern erneut.

### Vue-Adapter (`mp:vue`-Bedingung)

Der Vue-spezifische Adapter ermöglicht die Integration mit `vue-router`.

**Hauptexporte:**

- **`createMpRouter`**: Erstellt eine Vue Router-Instanz aus neutralen Routen
- **`useMpRouter`**: Zusammensetzbar für den Zugriff auf die Router-Instanz
- **`useMpRoute`**: Zusammensetzbar, um auf aktuelle Routeninformationen zuzugreifen
- **`MpRouterLink`**: Framework-neutrale Router-Link-Komponente

**Beispiel:**

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

### React-Adapter (`mp:react`-Bedingung)

Der React-Adapter ermöglicht die Integration mit dem React-Router.

**Hauptexporte:**

– **`withMpRouter`**: HOC zur Bereitstellung des Router-Kontexts

- **`useMpRoute`**: Hook zum Zugriff auf aktuelle Routeninformationen
- **`MpLink`**: Framework-neutrale Linkkomponente für React

### RedwoodSDK-Adapter (`./redwood`)

RedwoodSDK gehört nicht zu den `mp:*`-Frameworks und verfügt daher über einen dedizierten Unterpfad. Es bietet Integration mit
`rwsdk/router` – die flache Anforderungs-/Antwort-Routentabelle, die von RedwoodSDK verwendet wird (React auf Cloudflare Workers).

**Hauptexporte:**

- **`toRedwoodRoutes`**: Übersetzt den neutralen `MpRoute`-Baum in eine flache Liste von `rwsdk`-Routendefinitionen (verschachtelt).
  Routen werden auf absolute Pfade reduziert).
- **`renderRoutes`**: Wickelt die übersetzten Routen spiegelnd in ein Dokument ein
  `rwsdk` ist `render(Document, routes, options)`.
- **`toRedwoodPath`**: Konvertiert ein neutrales Pfadmuster in Redwoods Grammatik (nur Platzhalter `:param` und `*`);
  `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: App-relative Hrefs von neutralen Standorten erstellen, seit RedwoodSDK
  navigiert mit einfachen Ankern.

**Beispiel:**

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

## Technische Details

### Abhängigkeiten

**Kernpaket:**

- **TypeScript**: Typdefinitionen und Typsicherheit
- **Keine Framework-Abhängigkeiten**: Reines JavaScript/TypeScript

**Vue-Adapter:**

- **vue-router**: Offizielle Vue Router-Bibliothek
- **vue**: Vue 3 Kern

**React-Adapter:**

- **react-router-dom**: React Router für Webanwendungen
- **react**: React Kern

### Architektur

Das Paket folgt einer mehrschichtigen Architektur:

1. **Kernschicht**: Framework-neutrales Routenmodell und Dienstprogramme
2. **Adapterschicht**: Framework-spezifische Implementierungen (Vue, React)
3. **Öffentliche API**: Einheitliche Schnittstelle für alle Frameworks

### Pfadgrammatik

Der Router unterstützt die folgenden Pfadparametermuster:

- `:param`: Erforderlicher Parameter (z. B. `/users/:id`)
- `:param?`: Optionaler Parameter (z. B. `/users/:id?`)
- `:param*`: Null oder mehr Parameter (z. B. `/files/:path*`)
- `:param+`: Ein oder mehrere Parameter (z. B. `/files/:path+`)
- `*`: Sammelplatzhalter (z. B. `/*`)

## Integrationsleitfaden

### Grundeinrichtung mit Vue

1. Installieren Sie das Paket:

```bash
pnpm add @mission-platform/router vue-router
```

2. Definieren Sie Ihre Routen:

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

3. Erstellen Sie den Router:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. Verwenden Sie in Ihrer App:

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

### Dynamisches Routen-Matching

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### Programmatische Navigation

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

## Erweiterte Funktionen

### Metafelder weiterleiten

Fügen Sie Metadaten zu Routen für benutzerdefinierte Logik hinzu:

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

### Routenwächter (Vue)

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

### Verschachtelte Routen

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

## Best Practices

1. **Routenorganisation**: Gruppieren Sie verwandte Routen und verwenden Sie verschachtelte Routen für Layoutkomponenten
2. **Benannte Routen**: Verwenden Sie für die programmatische Navigation immer benannte Routen
3. **Parametervalidierung**: Validieren Sie dynamische Parameter in Routenkomponenten
4. **Fehlerbehandlung**: Behandeln Sie 404 Fälle mit einer Catch-All-Route (`/*`)
5. **Lazy Loading**: Verwenden Sie dynamische Importe für die Codeaufteilung (Framework-spezifisch)
6. **Typsicherheit**: Definieren Sie Schnittstellen für Routenparameter und Abfrageobjekte
7. **Abfrageverwaltung**: Halten Sie die Abfrageparameter einfach und URL-sicher

## Migrationsleitfaden

### Direkt vom Vue-Router

Bei der Migration vom vue-Router zu @mission-platform/router:

1. Ersetzen Sie `createRouter` durch `createMpRouter`
2. Konvertieren Sie Routendefinitionen, um `defineRoutes` zu verwenden
3. Ersetzen Sie `<router-link>` durch `<MpRouterLink>`
4. Composables aktualisieren: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### Direkt vom React-Router

Bei der Migration von react-router-dom:

1. Definieren Sie Routen im Neutralformat mit `defineRoutes`
2. Ersetzen Sie `<Link>` durch `<MpLink>`
3. Verwenden Sie `useMpRoute()` anstelle von `useRoute()`
4. Umschließen Sie Komponenten mit `withMpRouter` für den Router-Zugriff

### Von Next.js

Berücksichtigen Sie bei Next.js-Anwendungen Folgendes:

- Verwendung der neutralen Routendefinitionen für Konsistenz
- Erstellen einer benutzerdefinierten Adapterschicht, falls erforderlich
- Nutzung des dateibasierten Routings von Next.js neben dem neutralen Modell
