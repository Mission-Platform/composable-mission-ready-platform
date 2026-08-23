# Configuración del consumidor externo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Idioma: Español (es)

Esta guía explica cómo consumir paquetes de Mission Platform en proyectos ubicados fuera del monorepo principal. Se centra en el uso de compilaciones específicas del marco y en la gestión de tokens de diseño.

## Selección del marco a través de condiciones

Los componentes de Mission Platform se crean una vez usando `@mission-platform/forge` y distribuido como múltiples paquetes específicos del marco (Vue 3, React, Solidy componentes web) dentro de un único paquete.

Para seleccionar el paquete correcto, debe configurar su herramienta de compilación y TypeScript para utilizar **Condiciones de exportación personalizadas**.

### Condiciones marco admitidas

| Marco | Condición de exportación |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Componentes web** | `mp:web-component` |

## Configuración del proyecto

### 1. Vite Configuración

Si estas usando Vite, puede utilizar las funciones auxiliares de `@mission-platform/vite-config` para establecer automáticamente las condiciones de resolución correctas. Una aplicación sin marco debería seleccionar `mp:web-component`; no instale ni configure un Vue complemento para ese objetivo.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript Configuración

Para asegurar la TypeScript Language Service (LSP) resuelve tipos para el marco correcto, debe extender un marco preestablecido desde `@mission-platform/typescript-config`.

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
su aplicación y el objetivo Forge correspondiente (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, o `-web-components`). La aplicación posee definiciones de rutas, proveedores, guardias, cargadores y el nativo
instancia de enrutador; Los paquetes reutilizables importan sólo capacidades de `@mission-platform/router`.

## Uso de componentes

Con las condiciones configuradas correctamente, puede importar componentes desde la raíz del paquete. La herramienta de compilación seleccionará automáticamente el paquete que coincida con su `mp:*` condición.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Enrutamiento sin marco

Utilice el historial de memoria para pruebas y prerenderizado, u omítalo `history` en un navegador para utilizar el historial del navegador. Registrar enrutador
elementos una vez; asigne destinos de ruta como propiedades cuando contengan parámetros, valores de consulta o hashes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
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

Todos los componentes de Mission Platform consumen estas variables, por lo que los cambios en el `:root` El nivel se propagará por toda la interfaz de usuario.
