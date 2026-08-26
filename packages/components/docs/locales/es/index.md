# @mission-platform/components

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/components/docs/index.md: [packages/components/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/components` es la biblioteca de componentes residuales de escritura única para Mission Platform. Cada componente en
esta biblioteca se crea una vez utilizando un dialecto JSX de marco neutral (a través de `@mission-platform/forge`) y luego se compila en
tiempo de compilación en salidas nativas **Vue 3**, **React**, **Svelte**, **Solid** y **Componente web**.

`ForgeTypography` es propiedad del paquete `@mission-platform/typography` dedicado. Importarlo desde ese paquete en lugar
que de `@mission-platform/components`.

## Arquitectura: "Escribe una vez, ejecuta en cualquier lugar"

Este paquete demuestra una arquitectura entre marcos de alta eficiencia:

- **Fuente neutral**: los componentes se escriben en archivos `.tsx` usando `@mission-platform/forge`.
- **Compilación en dos etapas**: Usando `@mission-platform/vite-plugin-forge`, la fuente neutra se transforma en
  código fuente específico del marco (Vue SFC y React TSX) y luego compilado por las respectivas cadenas de herramientas nativas.
- **Cero gastos generales de tiempo de ejecución**: no hay adaptadores de tiempo de ejecución. Los consumidores importan componentes nativos con el producto básico.
  especificador `@mission-platform/components`; el marco se elige **una vez** a través de la exportación `mp:<framework>`
  condición — `resolve.conditions` (ver `defineFrameworkAppConfig` / `frameworkResolveConditions` de
  `@mission-platform/vite-config`) y `customConditions` (a través del
  `@mission-platform/typescript-config/framework-<name>` preajustes).
- **Integración de Storyblok**: el proceso de compilación también genera configuraciones y envoltorios de bloques de Storyblok, lo que permite
  Diseños basados en CMS que utilizan estos mismos componentes.

## Escala de tamaño universal

Cada componente de la biblioteca admite un accesorio `size` que sigue una escala de camiseta canónica. Esto asegura una consistencia
escalado en todos los elementos de la interfaz de usuario.

| Valor | Etiqueta               |
| :---- | :--------------------- |
| `2xs` | Extra-extra-pequeño    |
| `xs`  | Extrapequeño           |
| `sm`  | Pequeño                |
| `md`  | Medio (predeterminado) |
| `lg`  | Grande                 |
| `xl`  | Extra grande           |
| `2xl` | Extra extra grande     |

La mayoría de los componentes aplican una utilidad de tamaño compartida que ajusta el `font-size` según los tokens de diseño. Algunos complejos
Los componentes (como `ForgeButton` o `ForgeHero`) tienen un estilo personalizado por tamaño para el relleno, los márgenes y el diseño.

## Catálogo de componentes

### Diseño y estructura

Primitivas para organizar el contenido de la página.

| Componente       | Descripción                                                 | Accesorios clave                                     |
| :--------------- | :---------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack`     | Pila Flexbox (fila/columna) con espacio configurable.       | `direction`, `gap` (`2xs-2xl`), `justify`, `align`   |
| `ForgeGrid`      | Primitiva de diseño de cuadrícula CSS.                      | `rows`, `cols`, `gap`, `justify`, `align`            |
| `ForgeSeparator` | Divisor visual (horizontal/vertical) con etiqueta opcional. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | Disposición de mampostería de varias columnas.              | `columns`, `minColumnWidth`, `gap`                   |

### Shell de aplicaciones y navegación

Componentes de alto nivel para estructura y enrutamiento de aplicaciones.

| Componente                   | Descripción                                                               | Accesorios clave                                |
| :--------------------------- | :------------------------------------------------------------------------ | :---------------------------------------------- |
| `ForgeNavbar`                | Barra de navegación superior responsiva con marca y menú de hamburguesas. | `brand`, `sticky`, `mobileTitle`                |
| `ForgeDrawer`                | Panel deslizante (fijo o responsivo en línea).                            | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination`            | Control controlado de navegación por la página.                           | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `ForgeTabs`                  | Lista de pestañas ARIA con índice de pestañas y paneles itinerantes.      | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | Menús recursivos accesibles/barra de menú con submenús.                   | `items`, `orientation`, `ariaLabel`             |
| `ForgeBreadcrumb`            | Rastro jerárquico de enlaces.                                             | `items`, `separator`                            |

### Tipografía y contenido

Bloques de contenido semántico y estilo de texto.

| Componente   | Descripción                                                          | Accesorios clave                        |
| :----------- | :------------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | Banner de página con título, subtítulo, fondo multimedia y acciones. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | Cita en bloque semántica con atribución.                             | `variant`, `tone`, `author`, `source`   |
| `ForgeList`  | Lista genérica (ordenada/desordenada/descripción).                   | `items`, `variant`, `tone`, `divided`   |

### Formularios y entradas

Elementos interactivos para la entrada de datos.

| Componente                               | Descripción                                                       | Accesorios clave                             |
| :--------------------------------------- | :---------------------------------------------------------------- | :------------------------------------------- |
| `ForgeButton`                            | Botón fundamental con variantes y estado de carga.                | `variant`, `size`, `loading`, `disabled`     |
| `ForgeIconButton`                        | Botón compacto de solo íconos.                                    | `label` (obligatorio), `variant`, `size`     |
| `ForgeInput` / `ForgeTextarea`           | Campos de texto con etiquetas, sugerencias y estados de error.    | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio`           | Entradas booleanas o de selección de grupos.                      | `modelValue`, `value`, `label`               |
| `ForgeSwitch`                            | Interruptor de palanca para configuraciones booleanas.            | `modelValue`, `label`, `size`                |
| `ForgeNumberStepper`                     | Entrada de números con botones de incremento/disminución.         | `modelValue`, `min`/`max`, `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | Selectores de rango de pulgar simple o doble.                     | `modelValue`, `min`/`max`, `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | Selectores de fecha y rango de fechas con calendarios emergentes. | `modelValue`, `min`/`max`, `size`            |
| `ForgeColorInput`                        | Selector de color con campo de texto hexadecimal.                 | `modelValue`, `size`, `label`                |

### Visualización y virtualización de datos

Componentes para manejar grandes conjuntos de datos de manera eficiente.

| Componente             | Descripción                                                            | Accesorios clave                              |
| :--------------------- | :--------------------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable`           | Tabla de datos ordenable con estados de carga y vacío.                 | `columns`, `rows`, `onSort`, `loading`        |
| `ForgeVirtualList`     | Lista en ventana para matrices grandes (presenta solo filas visibles). | `items`, `itemHeight`, `height`               |
| `ForgeVirtualTable`    | Mesa ordenable virtualizada con encabezado adhesivo.                   | `columns`, `rows`, `rowHeight`, `onSort`      |
| `ForgeVirtualTreeView` | Vista de árbol en ventana con lógica de expandir/contraer.             | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView`        | Árbol accesible recursivo (no virtualizado).                           | `nodes`, `defaultOpen`, `onSelect`            |
| `ForgeTimeline`        | Lista de eventos vertical u horizontal.                                | `items`, `orientation`, `align`               |

### Comentarios y superposiciones

Indicadores de notificación y carga.

| Componente         | Descripción                                           | Accesorios clave                                     |
| :----------------- | :---------------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner`     | Anillo de carga indeterminado.                        | `size`, `variant`, `label`                           |
| `ForgeSkeleton`    | Marcador de posición brillante para cargar contenido. | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | Seguimiento de progreso determinado o indeterminado.  | `value`, `max`, `variant`, `indeterminate`           |
| `ForgeStatusIcon`  | Pequeño glifo indicador de estado tonificado.         | `status`, `size`, `label`                            |

### Medios de comunicación

Manejo de imágenes, videos y apariencia de la plataforma.

| Componente             | Descripción                                                                           | Accesorios clave                       |
| :--------------------- | :------------------------------------------------------------------------------------ | :------------------------------------- |
| `ForgeResponsiveImage` | `<picture>` con dirección artística y tamaños/srcset nativos.                         | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | Reproductor de vídeo responsivo con relación de aspecto fija.                         | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | Vídeo de fondo con sangrado completo y soporte de movimiento reducido.                | `src`, `overlay`, `minHeight`          |
| `ForgeDeviceMock`      | Marco del dispositivo (móvil/tableta/escritorio/navegador) alrededor de una pantalla. | `device`, `orientation`, `url`, `size` |

## Detalles de implementación

### Tragamonedas versus accesorios

Debido al dialecto JSX neutral, algunos componentes usan **ranuras con nombre** (compiladas con los elementos secundarios/accesorios de React y con los elementos con nombre de Vue).
slots) mientras que otros usan **Scoped Render-Props** para virtualización de alto rendimiento.

### Integración temática

Los componentes relacionados con el tema son propiedad de `@mission-platform/theme`. Importar `ForgeThemeToggle`, `ForgeThemeProvider`,
y `ForgeThemeComposer` de ese paquete; sus tiendas singleton administran los atributos `data-theme` en la raíz del documento
y variables CSS de token de diseño sin necesidad de un proveedor de estado global en cada aplicación.

El inventario residual completo y la división futura del paquete teniendo en cuenta la dependencia se documentan en
[el mapa de descomposición](decomposition-map.md). `ForgeDrawer` y `ForgeWindowPopout` permanecen en este paquete pendientes
la decisión separada de límite de ventana/superposición que se describe allí.
