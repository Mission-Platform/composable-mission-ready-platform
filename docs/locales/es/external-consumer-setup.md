# Configuración del consumidor externo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
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

Si estas usando Vite, puede utilizar las funciones auxiliares de `@mission-platform/vite-config` para establecer automáticamente las condiciones de resolución correctas.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript Configuración

Para asegurar la TypeScript Language Service (LSP) resuelve tipos para el marco correcto, debe extender un marco preestablecido desde `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## Instalación del paquete

Instale los paquetes requeridos desde su registro:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### Dependencias de pares

La mayoría de los paquetes de Mission Platform externalizan sus dependencias de tiempo de ejecución. Asegúrese de tener el marco correspondiente y las bibliotecas compartidas instaladas en su proyecto:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

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
