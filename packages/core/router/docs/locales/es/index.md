# @mission-platform/router

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/core/router/docs/index.md: [packages/core/router/docs/index.md](../../index.md)
> Idioma: Español (es)

Una biblioteca de enrutamiento independiente del marco que proporciona un modelo de ruta unificado y adaptadores por marco para Vue, React y
otros marcos.

## Descripción general

El paquete `@mission-platform/router` implementa un **sistema de enrutamiento neutral en el marco** que separa la ruta
definición y lógica de coincidencia a partir de detalles de implementación específicos del marco. Esto le permite definir sus rutas una vez
y utilizarlos en diferentes marcos manteniendo la coherencia.

## Características clave

- **Núcleo independiente del marco**: defina rutas en un formato neutral que funcione en todos los marcos.
- **API Type-Safe**: compatibilidad completa con TypeScript para definiciones de rutas y navegación
- **Arquitectura componible**: use elementos componibles para acceder al estado de enrutamiento y la navegación
- **Gramática de ruta**: coincidencia de ruta flexible con parámetros (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **Compatibilidad con cadenas de consulta**: análisis y serialización integrados de parámetros de consulta
- **Rutas anidadas**: soporte para estructuras de rutas jerárquicas

## Principales Módulos y Exportaciones

### Modelo de ruta principal

El sistema de definición de rutas neutral en el marco:

**`MpRoute`**: Representa una única ruta con ruta, nombre y metadatos.

**`defineRoutes`**: Crea un árbol de rutas a partir de una matriz de definiciones de rutas.

**Ejemplo:**

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

### Utilidades de ruta

**`matchRoutes`**: compara una ubicación con un árbol de rutas y devuelve rutas coincidentes.

**Ejemplo:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### Utilidades de ubicación

**`resolveLocation`**: Resuelve una ubicación de ruta en una ruta URL.

**Ejemplo:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## Adaptadores de marco

Los adaptadores **no** están expuestos como subrutas por marco. `@mission-platform/router` declara la
`mp:<framework>` condiciones de exportación en su única entrada `.`, por lo que selecciona el marco **una vez** —
`resolve.conditions` en Vite (ver `defineFrameworkAppConfig` / `frameworkResolveConditions` de
`@mission-platform/vite-config`) y `customConditions` en TypeScript (a través del
`@mission-platform/typescript-config/framework-<name>` presets) y luego importar todo con el especificador simple.
Cada compilación de adaptador también reexporta todo el núcleo neutro.

### Adaptador Vue (condición `mp:vue`)

El adaptador específico Vue proporciona integración con `vue-router`.

**Principales Exportaciones:**

- **`createMpRouter`**: Crea una instancia de enrutador Vue a partir de rutas neutrales
- **`useMpRouter`**: Composable para acceder a la instancia del enrutador
- **`useMpRoute`**: Composable para acceder a información de ruta actual
- **`MpRouterLink`**: Componente de enlace de enrutador neutral en el marco

**Ejemplo:**

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

### Adaptador React (condición `mp:react`)

El adaptador React proporciona integración con el enrutador React.

**Principales Exportaciones:**

- **`withMpRouter`**: HOC para proporcionar contexto del enrutador
- **`useMpRoute`**: Gancho para acceder a la información de la ruta actual
- **`MpLink`**: Componente de enlace neutral del marco para React

### Adaptador RedwoodSDK (`./redwood`)

RedwoodSDK no es uno de los marcos `mp:*`, por lo que mantiene una subruta dedicada. Proporciona integración con
`rwsdk/router`: la tabla de ruta plana de solicitud/respuesta utilizada por RedwoodSDK (React en Cloudflare Workers).

**Principales Exportaciones:**

- **`toRedwoodRoutes`**: traduce el árbol neutral `MpRoute` en una lista plana de definiciones de ruta `rwsdk` (anidadas).
  las rutas se reducen a rutas absolutas).
- **`renderRoutes`**: Envuelve las rutas traducidas en un Documento, reflejando
  `render(Document, routes, options)` de `rwsdk`.
- **`toRedwoodPath`**: Convierte un patrón de ruta neutral en la gramática de Redwood (solo comodines `:param` y `*`;
  `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: cree hrefs relativos a la aplicación desde ubicaciones neutrales, desde RedwoodSDK
  Navega con anclas planas.

**Ejemplo:**

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

## Detalles técnicos

### Dependencias

**Paquete principal:**

- **TypeScript**: Definiciones de tipos y seguridad de tipos
- **Sin dependencias del marco**: JavaScript puro/TypeScript

**Adaptador Vue:**

- **vue-router**: Biblioteca oficial de enrutadores Vue
- **vue**: Vue 3 núcleos

**Adaptador React:**

- **react-router-dom**: React Enrutador para aplicaciones web
- **react**: núcleo React

### Arquitectura

El paquete sigue una arquitectura en capas:

1. **Capa central**: modelo de ruta y utilidades neutrales al marco
2. **Capa de adaptador**: implementaciones específicas del marco (Vue, React)
3. **API pública**: interfaz unificada para todos los marcos

### Gramática de ruta

El enrutador admite los siguientes patrones de parámetros de ruta:

- `:param`: parámetro requerido (por ejemplo, `/users/:id`)
- `:param?`: parámetro opcional (p. ej., `/users/:id?`)
- `:param*`: Cero o más parámetros (por ejemplo, `/files/:path*`)
- `:param+`: Uno o más parámetros (por ejemplo, `/files/:path+`)
- `*`: comodín general (por ejemplo, `/*`)

## Guía de integración

### Configuración básica con Vue

1. Instale el paquete:

```bash
pnpm add @mission-platform/router vue-router
```

2. Define tus rutas:

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

3. Cree el enrutador:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. Úsalo en tu aplicación:

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

### Coincidencia de ruta dinámica

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### Navegación programática

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

## Funciones avanzadas

### Metacampos de ruta

Agregue metadatos a rutas para lógica personalizada:

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

### Guardias de ruta (Vue)

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

### Rutas anidadas

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

## Mejores prácticas

1. **Organización de rutas**: agrupe rutas relacionadas y utilice rutas anidadas para los componentes de diseño
2. **Rutas con nombre**: utilice siempre rutas con nombre para la navegación programática
3. **Validación de parámetros**: validar parámetros dinámicos en componentes de ruta
4. **Manejo de errores**: Maneje 404 casos con una ruta general (`/*`)
5. **Carga diferida**: utilice importaciones dinámicas para dividir el código (específico del marco)
6. **Seguridad de tipos**: Defina interfaces para parámetros de ruta y objetos de consulta
7. **Administración de consultas**: mantenga los parámetros de consulta simples y seguros para URL

## Guía de migración

### Desde el enrutador Vue directamente

Al migrar del enrutador vue a @mission-platform/router:

1. Reemplace `createRouter` con `createMpRouter`
2. Convierta las definiciones de ruta para usar `defineRoutes`
3. Reemplace `<router-link>` con `<MpRouterLink>`
4. Actualizar elementos componibles: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### Desde el enrutador React directamente

Al migrar desde react-router-dom:

1. Definir rutas usando el formato neutral con `defineRoutes`
2. Reemplace `<Link>` con `<MpLink>`
3. Utilice `useMpRoute()` en lugar de `useRoute()`
4. Envuelva los componentes con `withMpRouter` para acceder al enrutador

### Desde Siguiente.js

Para aplicaciones Next.js, considere:

- Usar las definiciones de ruta neutral para mantener la coherencia.
- Crear una capa de adaptador personalizada si es necesario
- Aprovechar el enrutamiento basado en archivos Next.js junto con el modelo neutral
