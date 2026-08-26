# `@mission-platform/layouts`

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> Idioma: Español (es)

Diseños de patrones y aplicaciones de marco neutral para Vue 3 y React, creados con el dialecto Forge JSX y con estilo
con fichas de diseño de Mission Platform.

## Descripción general

El paquete `@mission-platform/layouts` contiene shells de aplicaciones, contenedores, diseños verticales y cuatro reutilizables.
Plantillas de patrones responsivos. Sus componentes se exportan a través del paquete existente condicionado al marco, por lo que
la misma fuente funciona con Vue 3, React, Solid, Svelte y componentes web.

## Características

- **Shell de la aplicación**: `ForgeApplicationLayout`, `ForgeContainer` y `ForgeVerticalLayout`
- **Composición de Bento**: un héroe dominante con funciones y regiones de apoyo.
- **Cuadrícula regular**: celdas con nombre ordenadas para colecciones de tarjetas de estado y métricas
- **Composición del patrón F**: regiones de encabezado, introducción, artículo, secundaria y pie de página de estilo documentación
- **Composición del patrón Z**: alternancia de regiones de contenido superior, media e inferior
- **Capacidad de respuesta solo CSS**: reflujo móvil primero sin `window`, `matchMedia` o estado del cliente
- **Integración de tokens de diseño**: los espacios, el relleno y los márgenes utilizan tokens de espaciado de Mission Platform

## Instalación

```bash
pnpm add @mission-platform/layouts
```

## Uso

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## Referencia de API

### Controles compartidos

Las cuatro plantillas de patrones aceptan:

- `tag`: `div`, `section`, `article`, `main` o `aside`
- `gap`, `margin` y `padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl` o `2xl`
- `breakpoint`: `xs`, `sm`, `md`, `lg` o `xl`

Los componentes comienzan como diseños de una columna o apilados. En el punto de interrupción seleccionado, aplican su patrón específico.
áreas de la cuadrícula. Los contenedores de región tienen clases de estilo BEM predecibles y se emiten solo cuando su ranura con nombre está presente.

### Contratos regionales

| Componente            | Regiones nombradas                                         | Fuente de composición                                                         |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `ForgeBentoLayout`    | `hero`, `feature`, `supporting`                            | Secciones destacadas y destacadas del marketing de sitios web                 |
| `ForgeGridLayout`     | `cell1` a `cell12`                                         | Tarjetas del panel de control de servicio y resúmenes de estado               |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer`        | Barra de navegación/contexto de Docs, artículo, barra lateral y pie de página |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Contenido y acciones alternos de la página de destino                         |

`ForgeGridLayout` acepta `rows` y `columns`, fija ambos a uno o más, limita el área renderizable a 12 nombres
celdas y utiliza un respaldo de una sola columna debajo de su punto de interrupción. Las celdas con nombre siempre se representan en el orden de origen.

## Guía de composición del producto

Las plantillas extraen la estructura, no el comportamiento de la aplicación. Tarjetas de paquetes del sitio web y contenido de preguntas frecuentes, navegación de documentos y
el enrutamiento y el sondeo del monitor de servicio, los formularios y el estado del incidente siguen siendo propiedad de sus aplicaciones. Esas aplicaciones
puede pasar su contenido existente a las regiones nombradas sin introducir importaciones de `apps/` a `packages/layout`.

Para mayor accesibilidad, mantenga el contenido proporcionado en orden de lectura semántica y trate las áreas de la cuadrícula CSS solo como ubicación visual.
El contenido extenso está protegido por `min-width: 0` y `overflow-wrap: anywhere`; SSR no requiere `window` o
`matchMedia`.

## Licencia

Cláusula BSD-4
