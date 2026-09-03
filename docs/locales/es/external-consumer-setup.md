# Configuración del consumidor externo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Idioma: Español (es)

Esta guía explica cómo consumir paquetes de Mission Platform en proyectos ubicados fuera del monorepo principal. Se centra en el uso de compilaciones específicas del marco y en la gestión de tokens de diseño.

## Selección del marco a través de condiciones

Los componentes de Mission Platform se crean una vez usando `@mission-platform/forge` y se distribuyen como múltiples paquetes específicos del marco (Vue 3, React, Solid y componentes web) dentro de un solo paquete.

Para seleccionar el paquete correcto, debe configurar su herramienta de compilación y TypeScript para usar **Condiciones de exportación personalizadas**.

### Condiciones marco admitidas

| Marco | Condición de exportación |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Componentes web** | `mp:web-component` |

## Configuración del proyecto

### 1. Configuración Vite

Si está utilizando Vite, puede utilizar las funciones auxiliares de `@mission-platform/vite-config` para establecer automáticamente las condiciones de resolución correctas. Una aplicación sin marco debe seleccionar `mp:web-component`; no instale ni configure un complemento Vue para ese destino.

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. Configuración TypeScript

Para garantizar que el servicio de lenguaje (LSP) TypeScript resuelva los tipos para el marco correcto, debe ampliar un marco preestablecido de `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## Instalación del paquete

Instale los paquetes requeridos desde su registro:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### Dependencias de pares

La mayoría de los paquetes de Mission Platform externalizan sus dependencias de tiempo de ejecución. Asegúrese de tener el marco correspondiente y las bibliotecas compartidas instaladas en su proyecto:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

El paquete de enrutador neutral no tiene dependencias de tiempo de ejecución de marco o biblioteca de enrutador. Instale el enrutador nativo seleccionado por
su aplicación y el objetivo de Forge correspondiente (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` o `-web-components`). La aplicación posee definiciones de rutas, proveedores, guardias, cargadores y el nativo
instancia de enrutador; Los paquetes reutilizables importan solo capacidades de `@mission-platform/router`.

## Uso de componentes

Con las condiciones configuradas correctamente, puede importar componentes desde la raíz del paquete. La herramienta de compilación seleccionará automáticamente el paquete que coincida con su condición `mp:*`.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Enrutamiento sin marco

Utilice el historial de memoria para pruebas y prerenderizado, u omita `history` en un navegador para utilizar el historial del navegador. Registrar enrutador
elementos una vez; asigne destinos de ruta como propiedades cuando contengan parámetros, valores de consulta o hashes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### Navegación asíncrona con un control giratorio de carga

Los componentes de ruta asíncronos pueden mantener la página actual visible mientras se abre la siguiente vista.
cargas. Configure el recurso de salida al crear el enrutador de componentes web;
`forge-router-link` luego realiza la navegación SPA con `pushState` (o reemplaza
historial cuando `replace` está habilitado):

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

El outlet posee la superposición de carga y no elimina el actualmente montado.
vista hasta que el destino se resuelva. Borra la superposición para un éxito,
Navegación redirigida, cancelada y fallida. Clics modificados, descargas,
Las URL externas y los enlaces con otro destino conservan el comportamiento nativo del navegador.

Al crear una fuente compartida de Forge, utilice el límite neutral directamente y deje
cada compilador selecciona su implementación nativa:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

## Personalización del token de diseño

Mission Platform utiliza propiedades personalizadas de CSS (variables) para tokens de diseño. Puede anular estos tokens globalmente en la hoja de estilo raíz de su aplicación.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;

  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

Todos los componentes de Mission Platform consumen estas variables, por lo que los cambios en el nivel `:root` se propagarán por toda la interfaz de usuario.
