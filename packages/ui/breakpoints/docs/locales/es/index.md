# @mission-platform/breakpoints

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/ui/breakpoints/docs/index.md: [packages/ui/breakpoints/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/breakpoints` proporciona utilidades de punto de interrupción responsivas y componentes de ventana gráfica de **escritura única** para
Plataforma de la Misión. Los componentes (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) se crean una vez en el estado neutral.
`@mission-platform/forge-jsx` dialecto y compilado en **Vue 3 y React** por `@mission-platform/vite-plugin-forge`.

## Exportaciones

- `@mission-platform/breakpoints`: el punto de entrada único. La construcción que obtienes la decide el activo.
  `mp:<framework>` condición de exportación (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); sin ninguna condición establecida, se resuelve en el barril fuente JSX neutral (para componentes de una sola escritura)
  compilado por `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core`: tipos y utilidades independientes del marco.

Elija el marco **una vez** — `resolve.conditions` vía `defineFrameworkAppConfig` /
`frameworkResolveConditions` de `@mission-platform/vite-config` y `customConditions` a través de
Ajustes preestablecidos de `@mission-platform/typescript-config/framework-<name>`: luego importe todo con el especificador de paquete básico.

## Escala de punto de interrupción

La plataforma utiliza una escala de respuesta de siete pasos basada en los umbrales de ancho de la ventana gráfica:

| Clave | Etiqueta            | Umbral             | Dispositivo común/caso de uso       |
| :---- | :------------------ | :----------------- | :---------------------------------- |
| `2xs` | Extra-extra-pequeño | $\ge 0$ px         | Todos los dispositivos              |
| `xs`  | Extrapequeño        | $\ge 480$ px       | Teléfonos grandes                   |
| `sm`  | Pequeño             | $\ge 768$ px       | Retrato de tableta                  |
| `md`  | Medio               | $\ge 1024$ px      | Tableta horizontal/portátil pequeña |
| `lg`  | Grande              | $\ge 1920$ px      | Full HD/1080p                       |
| `xl`  | Extra grande        | $\ge 2560$ px      | QHD                                 |
| `2xl` | Extra extra grande  | $\ge 3840$ píxeles | 4K UHD                              |

## Utilidades principales (`/core`)

Ayudantes independientes del marco, seguros de usar desde cualquier marco (o ninguno):

- `breakpointKeys`: la matriz ordenada de claves de punto de interrupción.
- `breakpoints`: un mapa de claves para sus umbrales de píxeles de ancho mínimo.
- `getBreakpointValue(key)`: el umbral de píxeles para un punto de interrupción.
- `mediaQuery(key)`: una cadena de consulta de medios `min-width` (`'(min-width: 1920px)'`) o `'all'` para `2xs`.
- `maxMediaQuery(key)`: una cadena de consulta de medios de límite superior `max-width`, o `'not all'` para `2xs`.
- `resolveBreakpoint(width)`: dado un ancho de píxel, la clave del punto de interrupción activo.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

Se eliminó el elemento componible `useBreakpoints` exclusivo de Vue. Para una lógica de ventana gráfica reactiva personalizada, utilice estos `/core`
ayudantes con los propios ganchos de su marco (consulte, por ejemplo, el gancho React `useCompactViewport` de `apps/service-monitor`
construido en `maxMediaQuery`).

## Componentes

### `<ForgeShowAt>`

Representa condicionalmente el contenido de las ranuras/secundarios cuando la ventana gráfica cumple con los criterios de punto de interrupción especificados.

#### Uso

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### Accesorios

- `min?: BreakpointKey`: muestra contenido cuando la ventana gráfica está en o por encima de este punto de interrupción.
- `max?: BreakpointKey`: muestra contenido cuando la ventana gráfica está estrictamente por debajo de este punto de interrupción.

### `<ForgeHideAt>`

Lo inverso de `<ForgeShowAt>`: oculta condicionalmente el contenido de las ranuras/hijos cuando la ventana gráfica cumple con lo especificado
Criterios de punto de interrupción.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### Accesorios

Igual que `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

Una superposición de solo desarrollo fijada en la esquina inferior derecha que muestra el punto de interrupción activo actual y que
Los puntos de interrupción están activos. Sus etiquetas están localizadas a través de i18next (espacio de nombres `mp.breakpoints`) con valores predeterminados en inglés.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## Utilidades SCSS

La capa SCSS del punto de interrupción se encuentra en `@mission-platform/tokens`.

### mezclas

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Clases de utilidad de visibilidad

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
