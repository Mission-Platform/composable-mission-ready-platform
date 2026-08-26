# Referencia de token de componente de Forge

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tokens/docs/reference/component-tokens.md: [packages/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> Idioma: Español (es)

Este es el inventario canónico y la transferencia de Figma para los componentes creados por Forge. Es intencionalmente independiente de
los adaptadores de marco generados: la misma entrada se aplica a Vue, React, Solid, Svelte y componentes web.

## leyendo el contrato

La fuente de la verdad es el árbol de fuentes de componentes recursivos debajo
[`tokens/component/`](../../../../tokens/component), agrupados por nivel atómico
(`atoms/`, `molecules/`, `organisms/` y `templates/`). Cada fuente se genera de forma independiente, mientras que todas las fuentes
conservar el mismo contrato `component.*` DTCG estable:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

La ruta DTCG es también la ruta de anulación de Figma y del tiempo de ejecución; sólo el nombre CSS generado elimina el contenedor `component`.
Por ejemplo, `component.button.primary.background.hover` se emite como `--mp-button-primary-background-hover`. un
El ID de origen, como `component/atoms/button`, identifica el archivo propietario del contrato, no una nueva ruta DTCG.

Los valores de los componentes son alias de los documentos temáticos primitivos y semánticos existentes. En consecuencia, la colección Figma tiene
Modos **Claro** y **Oscuro** sin duplicar tokens de componentes. El comportamiento claro/oscuro en tiempo de ejecución continúa utilizándose
Pines de subárbol `color-scheme`, `light-dark()`, `[data-theme]` y `.theme-*`. Los consumidores y Storybook pueden anular cualquier
hoja debajo de `component` en `overrides.tokens.json`; se aplica una anulación después de la hoja de estilo del token generado. Anulaciones
Continúe usando las claves `component.*` aunque las propiedades personalizadas de CSS usen el espacio de nombres de la capa.

## Diseño de origen y salida generada

Cada contrato visual tiene un propietario bajo el árbol de fuentes atómicas. El generador descubre nuevos archivos de forma recursiva, por lo que
La nueva fuente no requiere un registro de descriptor:

```text
packages/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

Los barriles SCSS y TypeScript generados incluyen cada fuente de componentes en un orden determinista de identificación de fuente. Componente
los archivos pueden reutilizar contratos compartidos como `button`, `field`, `input`, `navigation` y `overlay`; componentes compuestos
no debe duplicar esas rutas de token. Se mantienen los componentes de solo comportamiento, los glifos solo heredados y las fórmulas de diseño/DOM
fuera del contrato de token visual a menos que una entrada de inventario les asigne la propiedad visual.

### Ranuras semánticas y vocabulario de estados.

| Familia de tragamonedas                      | Papel de Figma                                        | Estados típicos                                                                        |
| -------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | Superficie de relleno o control                       | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | Color de tipografía o estilo de tipografía con nombre | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | Indicación de trazo y teclado                         | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | Geometría y elevación                                 | predeterminado o tamaño específico                                                     |
| `opacity` / `transition`                     | Desacentuación y movimiento                           | `disabled`, `loading`, `hover`, `active`                                               |

A continuación solo se enumeran los estados admitidos por un componente. `expanded` se utiliza para revelar/seleccionar superficies, `selected`
para opciones/pestañas/navegación y `invalid` para validación de formulario; no se requieren variables de estado no utilizadas.

## Resumen de inventario

El inventario del repositorio se basa en las siguientes rutas de origen estrechas:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| Artefacto                  | Contar | Significado                                                                                                         |
| -------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------- |
| Fuentes de componentes TSX |    249 | Fuentes de componentes de correo electrónico y Forge que no son historias                                           |
| Historias coubicadas       |    246 | Tres fuentes recursivas de Markdown/tree helper intencionalmente no tienen una historia independiente               |
| Módulos CSS                |    219 | Módulos de estilo visual local; el correo electrónico en línea y los contratos heredados también están documentados |
| Paquetes                   |     20 | Cada paquete que contiene un componente fuente                                                                      |

La superficie generada después de la auditoría contiene **2841 hojas de token**: 132 activas, 2161 protegidas y 548 ambiguas;
No quedan candidatos. La limpieza eliminó 189 hojas inalcanzables en total: los 185 candidatos de la
informe de revisión más 4 hojas netas de paleta de segundo orden (6 eliminadas, 2 restauradas como hojas `.500` accesibles) expuestas después del cierre del alias. Esta reducción afecta a los generados
exportaciones primitivas, semánticas, tipográficas y estructurales únicamente; retuvo las rutas `component.*` y sus
`--mp-<layer>-*` los nombres no se modifican. Los tres alias no resueltos (`color.surface.raised`, `radius.2xs` y
`font.weight.light`) son anteriores a esta auditoría y permanecen sin cambios.

La clasificación es por fuente, no por paquete:

- **Visual**: posee un módulo CSS o una salida visual en línea y se asigna al contrato que se muestra en la tabla del paquete.
- **Visual heredado**: no muestra ningún host con estilo independiente; su apariencia proviene de un niño, padre, `currentColor`,
  un host/lienzo de terceros, o el contrato del componente compuesto.
- **Solo comportamiento**: controla el comportamiento de renderizado o ventana gráfica y no toma ninguna decisión visual propia.

Cada viñeta a continuación es una entrada de inventario. A menos que una historia esté marcada como `story: missing`, el componente tiene una coincidencia
`<component>.stories.tsx` al lado de la fuente. Un encabezado de paquete/nivel proporciona el prefijo de ruta de origen estable.

## `@mission-platform/components`

### Átomos — `packages/components/src/components/atoms/`

| Componente               | Clasificación | Contrato                                        | Accesorios de apariencia / estados                                                                                      |
| ------------------------ | ------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `forge-avatar`           | visuales      | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; colores de estado predeterminados/deshabilitados               |
| `forge-background-video` | visuales      | `component.media`                               | fuente, reproducción automática/silenciado/bucle; predeterminado/superposición                                          |
| `forge-badge`            | visuales      | `component.feedback`                            | `variant`, `size`; predeterminado/deshabilitado                                                                         |
| `forge-button`           | visuales      | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; predeterminado/al pasar el cursor/activo/enfoque-visible/deshabilitado/cargando |
| `forge-icon-button`      | visuales      | `component.button.<variant>` + `component.icon` | etiqueta, `variant`, `size`; predeterminado/al pasar el cursor/activo/enfoque-visible/deshabilitado/cargando            |
| `forge-progress-bar`     | visuales      | `component.feedback`                            | valor, variante; predeterminado/cargando/deshabilitado                                                                  |
| `forge-quote`            | visuales      | `component.typography` + `component.surface`    | cita, variante; predeterminado                                                                                          |
| `forge-responsive-image` | visuales      | `component.media`                               | fuente, aspecto/adaptación; predeterminado/marcador de posición                                                         |
| `forge-responsive-video` | visuales      | `component.media`                               | fuente, controles/reproducción automática; predeterminado/superposición                                                 |
| `forge-separator`        | visuales      | `component.surface`                             | orientación; predeterminado                                                                                             |
| `forge-skeleton`         | visuales      | `component.feedback`                            | forma/tamaño; cargando                                                                                                  |
| `forge-spinner`          | visuales      | `component.feedback`                            | tamaño, variante; cargando                                                                                              |
| `forge-stack`            | visuales      | `component.layout`                              | dirección, `gap`, alineación; predeterminado                                                                            |
| `forge-status-icon`      | visuales      | `component.feedback.<status>`                   | estatus, tamaño; predeterminado/deshabilitado                                                                           |
| `forge-tag`              | visuales      | `component.feedback`                            | variante, tamaño, extraíble; predeterminado/al pasar el cursor/deshabilitado                                            |
| `forge-theme-toggle`     | visuales      | `component.button` + `component.icon`           | tema, tamaño; predeterminado/al pasar el cursor/activo/seleccionado                                                     |
| `forge-typography`       | visuales      | `component.typography`                          | `as`, variante tipográfica, color; predeterminado/enlace/deshabilitado                                                  |

### Moléculas — `packages/components/src/components/molecules/`

| Componente                | Clasificación   | Contrato                                                | Accesorios de apariencia / estados                                                                                                   |
| ------------------------- | --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `forge-accordion`         | visuales        | `component.surface` + `component.navigation`            | artículos ampliados; predeterminado/al pasar el cursor/enfoque visible/expandido/deshabilitado                                       |
| `forge-alert-banner`      | visuales        | `component.feedback` + `component.overlay`              | estado, desestimable; predeterminado/al pasar el cursor/enfoque visible                                                              |
| `forge-breadcrumb`        | visuales        | `component.navigation`                                  | elementos; predeterminado/al pasar el cursor/seleccionado/enfoque visible                                                            |
| `forge-button-group`      | visuales        | `component.button-group`                                | orientación, adjunto, variante, hueco; predeterminado/enfoque visible/deshabilitado                                                  |
| `forge-card`              | visuales        | `component.surface`                                     | variante, relleno; predeterminado/al pasar el cursor/seleccionado                                                                    |
| `forge-chat-bubble`       | visuales        | `component.media` + `component.surface`                 | autor, dirección/estado; predeterminado/seleccionado                                                                                 |
| `forge-collapse`          | visuales        | `component.collapse`                                    | abierto, variante, deshabilitado; predeterminado/al pasar el cursor/enfoque visible/expandido/deshabilitado                          |
| `forge-device-mock`       | visuales        | `component.media.device`                                | dispositivo, orientación, tamaño; predeterminado                                                                                     |
| `forge-dropdown`          | visuales        | `component.overlay` + `component.navigation`            | abierto, colocación; predeterminado/expandido/enfoque visible                                                                        |
| `forge-grid`              | visuales        | `component.layout.grid`                                 | columnas, huecos, rellenos; predeterminado                                                                                           |
| `forge-in-view`           | visuales        | `component.layout`                                      | límite; contrato de hijo heredado                                                                                                    |
| `forge-language-switcher` | heredado-visual | `component.navigation` + contrato de selección de niños | lugar; predeterminado/ampliado/seleccionado                                                                                          |
| `forge-list`              | visuales        | `component.surface`                                     | variante, brecha; predeterminado/seleccionado                                                                                        |
| `forge-masonry`           | visuales        | `component.layout.masonry`                              | columnas, huecos, rellenos; predeterminado                                                                                           |
| `forge-menu-item`         | visuales        | `component.navigation`                                  | activo/deshabilitado; predeterminado/al pasar el cursor/enfoque visible/seleccionado/deshabilitado                                   |
| `forge-menu`              | visuales        | `component.navigation`                                  | abierto/orientación; predeterminado/ampliado                                                                                         |
| `forge-navbar-item`       | visuales        | `component.navigation.navbar-item`                      | activo, desplegable, variante, deshabilitado; predeterminado/al pasar el cursor/enfoque visible/seleccionado/expandido/deshabilitado |
| `forge-pagination`        | visuales        | `component.navigation`                                  | página, tamaño; predeterminado/al pasar el cursor/enfoque visible/seleccionado/deshabilitado                                         |
| `forge-popover`           | visuales        | `component.overlay`                                     | abierto, colocación; predeterminado/expandido/enfoque visible                                                                        |
| `forge-tabs`              | visuales        | `component.navigation`                                  | orientación, pestaña activa; predeterminado/al pasar el cursor/enfoque visible/seleccionado/deshabilitado                            |
| `forge-timeline`          | visuales        | `component.timeline`                                    | estado, orientación, marcador delineado; predeterminado/seleccionado                                                                 |
| `forge-toast`             | visuales        | `component.overlay` + `component.feedback`              | estado, duración; predeterminado/cargando                                                                                            |
| `forge-tooltip`           | visuales        | `component.overlay`                                     | abierto, colocación; predeterminado/ampliado                                                                                         |
| `forge-window-popout`     | visuales        | `component.overlay.window-popout`                       | abierto, tamaño; predeterminado/al pasar el cursor/enfoque visible/seleccionado                                                      |

### Organismos y plantillas — `packages/components/src/components/{organisms,templates}/`

| Componente                 | Clasificación   | Contrato                                                | Accesorios de apariencia / estados                                                                                                                                        |
| -------------------------- | --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forge-carousel`           | visuales        | `component.navigation.carousel`                         | diapositivas, controles, reproducción automática, tono; predeterminado/al pasar el cursor/enfoque visible/seleccionado/deshabilitado                                      |
| `forge-chat-area`          | visuales        | `component.media.chat-area`                             | tamaño, espacios para encabezado/pie de página, desplazamiento automático; predeterminado/cargando                                                                        |
| `forge-dialog`             | visuales        | `component.overlay`                                     | abierto, título/pie de página; predeterminado/expandido/enfoque visible                                                                                                   |
| `forge-drawer`             | visuales        | `component.overlay.drawer`                              | abrir, ubicación/tamaño, cambiar tamaño; predeterminado/al pasar el cursor/activo/expandido                                                                               |
| `forge-menubar`            | visuales        | `component.navigation.menubar`                          | artículos, bordeados, tamaño; predeterminado/al pasar el cursor/enfoque visible/expandido/deshabilitado                                                                   |
| `forge-modal`              | visuales        | `component.overlay`                                     | abierto, tamaño, encabezado/pie de página; predeterminado/expandido/enfoque visible                                                                                       |
| `forge-navbar`             | visuales        | `component.navigation.navbar`                           | elementos, modo responsivo; predeterminado/al pasar el cursor/enfoque visible/seleccionado                                                                                |
| `forge-table`              | visuales        | `component.data.table`                                  | columnas, tamaño, título, rayado/bordeado/al pasar el cursor, tono, carga; predeterminado/al pasar el cursor/enfoque-visible/cargando                                     |
| `forge-theme-composer`     | visuales        | `component.surface` + `component.field`                 | valores temáticos; predeterminado/no válido                                                                                                                               |
| `forge-theme-provider`     | visuales        | `component.layout`                                      | modo temático; predeterminado/claro/oscuro                                                                                                                                |
| `forge-toast-container`    | visuales        | `component.overlay`                                     | colocación; predeterminado/cargando                                                                                                                                       |
| `forge-tree-view-item`     | heredado-visual | `component.navigation` + `component.surface`            | ampliado, seleccionado, deshabilitado; predeterminado/al pasar el cursor/enfoque visible/expandido/seleccionado/deshabilitado                                             |
| `forge-tree-view`          | visuales        | `component.data.tree`                                   | nodos, tamaño, apertura predeterminada, renderizador de etiquetas; predeterminado/al pasar el cursor/enfoque visible/expandido/seleccionado                               |
| `forge-virtual-list`       | visuales        | `component.data.virtual-list`                           | elementos, tamaño, altura del elemento, altura, sobreexploración, renderizador de filas; predeterminado/seleccionado                                                      |
| `forge-virtual-log-viewer` | visuales        | `component.code.virtual-log-viewer`                     | nivel/filtro, columnas, cola de seguimiento; predeterminado/hover/enfoque-visible/advertir/error/fatal                                                                    |
| `forge-virtual-table`      | visuales        | `component.data.virtual-table` + `component.data.table` | columnas, tamaño, filaAltura, altura, sobreexploración, rayado/bordeado, ordenar; predeterminado/al pasar el cursor/enfoque visible                                       |
| `forge-virtual-tabs`       | visuales        | `component.navigation.tabs`                             | variante, pestaña activa, cerrable/agregable; predeterminado/al pasar el cursor/enfoque visible/seleccionado/deshabilitado                                                |
| `forge-virtual-tree-view`  | visuales        | `component.data.virtual-tree`                           | nodos, tamaño, altura del elemento, altura, sobreexploración, apertura predeterminada, renderizador de filas; predeterminado/al pasar el cursor/enfoque visible/expandido |
| `forge-hero`               | visuales        | `component.layout.hero`                                 | medios, alineación, tamaño, superposición; predeterminado                                                                                                                 |

## Paquetes especializados de Forge

| Paquete/nivel            | Componente                     | Clasificación       | Contrato                                               | Accesorios de apariencia / estados                                                                   |
| ------------------------ | ------------------------------ | ------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | visuales            | `component.code.barcode`                               | valor, formato, tamaño; predeterminado/cargando/no válido                                            |
| `breakpoints/atoms`      | `forge-hide-at`                | sólo comportamiento | ninguno                                                | `min`, `max`; visibilidad de la ventana gráfica solamente                                            |
| `breakpoints/atoms`      | `forge-show-at`                | sólo comportamiento | ninguno                                                | `min`, `max`; visibilidad de la ventana gráfica solamente                                            |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | visuales            | `component.debug.breakpoint`                           | visualización del punto de interrupción; predeterminado                                              |
| `code-scanner/organisms` | `forge-code-scanner`           | visuales            | `component.code.scanner`                               | cámara/formato, escaneo; predeterminado/cargando/no válido                                           |
| `content/atoms`          | `forge-code-block`             | visuales            | `component.code`                                       | idioma, copia; predeterminado/seleccionado                                                           |
| `content/atoms`          | `forge-mermaid`                | visuales            | `component.code`                                       | fuente del diagrama, carga/error; predeterminado/cargando/no válido                                  |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | visuales            | `component.button` + `component.icon`                  | comando, activo; predeterminado/al pasar el cursor/activo/enfoque visible/deshabilitado/seleccionado |
| `content/molecules`      | `forge-markdown`               | visuales            | `component.typography` + `component.code`              | tamaño, enlaces; predeterminado/no válido                                                            |
| `content/molecules`      | `markdown-block`               | heredado-visual     | `component.typography` + contratos infantiles          | ficha, tamaño; heredado                                                                              |
| `content/molecules`      | `markdown-inline`              | heredado-visual     | `component.typography`                                 | token, enlaces; heredado/al pasar el cursor/seleccionado                                             |
| `content/molecules`      | `forge-wysiwyg-block-controls` | visuales            | `component.editor.block-controls` + `component.button` | selección de bloque; predeterminado/al pasar el cursor/enfoque visible/seleccionado                  |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | visuales            | `component.editor.block-menu` + `component.overlay`    | abierto; predeterminado/ampliado/seleccionado                                                        |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | visuales            | `component.editor.status-bar`                          | estado; predeterminado/no válido/cargando                                                            |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | visuales            | `component.editor.toolbar` + `component.button`        | comandos; predeterminado/deshabilitado                                                               |
| `content/organisms`      | `forge-monaco-editor`          | visuales            | `component.editor.monaco` + `component.code`           | idioma, solo lectura; predeterminado/deshabilitado/no válido                                         |
| `content/organisms`      | `forge-wysiwyg-editor`         | visuales            | `component.editor.wysiwyg` + `component.code`          | editable, no válido; predeterminado/enfoque-visible/no válido/deshabilitado                          |
| `float/molecules`        | `forge-alert-banner`           | visuales            | `component.feedback` + `component.overlay`             | estado, desestimable; predeterminado/enfoque visible                                                 |
| `float/molecules`        | `forge-dropdown`               | visuales            | `component.overlay` + `component.navigation`           | abierto; predeterminado/ampliado/seleccionado                                                        |
| `float/molecules`        | `forge-popover`                | visuales            | `component.overlay`                                    | abierto; predeterminado/ampliado                                                                     |
| `float/molecules`        | `forge-toast`                  | visuales            | `component.overlay` + `component.feedback`             | estado; predeterminado/cargando                                                                      |
| `float/molecules`        | `forge-tooltip`                | visuales            | `component.overlay`                                    | abierto; predeterminado/ampliado                                                                     |
| `float/organisms`        | `forge-dialog`                 | visuales            | `component.overlay`                                    | abierto, título/pie de página; predeterminado/expandido/enfoque visible                              |
| `float/organisms`        | `forge-modal`                  | visuales            | `component.overlay`                                    | abierto, tamaño, encabezado/pie de página; predeterminado/expandido/enfoque visible                  |
| `float/organisms`        | `forge-toast-container`        | visuales            | `component.overlay`                                    | colocación; predeterminado/cargando                                                                  |

### Formularios — `packages/forms/src/components/`

Todas las entradas del formulario utilizan las funciones compartidas de etiqueta/ayudante/error `component.field` además del contrato siguiente. Nativo
Los estados de control están representados sólo donde el control los respalda.

| Nivel      | Componentes (una entrada por nombre separado por comas)                                                                                                                                                                                                                                                                                                                   | Clasificación / contrato                                                                                                                                                   | Accesorios y estados de apariencia compartida                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| átomos     | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | visual / `component.checkable` para casilla de verificación/radio/clasificación/control deslizante/interruptor; `component.input` para entrada/rango-entrada/área de texto | `size`, accesorios de etiqueta/valor; default/hover/active/focus-visible/disabled/invalid/selected donde sea compatible                 |
| moléculas  | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | visual / `component.input`, `component.select`, `component.checkable`, o `component.field` según control compuesto                                                         | `size`, `disabled`, accesorios de validación y selección; predeterminado/enfoque visible/deshabilitado/expandido/seleccionado/no válido |
| organismos | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | visual / `component.field` + contratos compuestos de entrada/selección/superposición                                                                                       | esquema, pasos, validación; predeterminado/enfoque visible/deshabilitado/expandido/seleccionado/no válido                               |

### Iconos — `packages/icons/src/components/`

Las 106 entradas de íconos son **heredadas-visuales**. Los glifos utilizan `currentColor`; su tamaño está controlado por el consumidor o se asigna a
`component.icon.size`. No reciben una variable por glifo. Cada uno tiene una historia coubicada y sigue el mismo
roles de color predeterminados/seleccionados/deshabilitados donde el padre expone ese estado.

| Categoría de icono      | Componentes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| comunicación/mensajería | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| comunicación/compartir  | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| contenido/edición       | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| contenido/archivos      | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| datos/filtrado          | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| datos/tablas            | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| dibujar/transformar     | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| mapas/países            | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| mapas/geografía         | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| mapas/capas             | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| mapas/marcadores        | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| medios/captura          | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| medios/reproducción     | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| navegación/controles    | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| navegación/enlaces      | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| navegación/búsqueda     | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| objetos/sistema         | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| rutas/direcciones       | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| seguridad/acceso        | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| estado/comentarios      | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| texto/formato           | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| hora/calendario         | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Otros paquetes visuales

| Paquete/nivel                | Componente                                                                                                                                         | Clasificación       | Contrato                                                     | Accesorios de apariencia / estados                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `layout/atoms`               | `forge-container`                                                                                                                                  | visuales            | `component.layout`                                           | ancho máximo, relleno; predeterminado                                                                                                   |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | visuales            | `component.layout`                                           | configuración de diseño y espacios; predeterminado                                                                                      |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | heredado-visual     | `component.map`                                              | opciones de fuente/capa/marcador/ventana emergente del mapa; ventana emergente predeterminada/enfoque visible, otras heredadas del host |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | visuales            | `component.map`                                              | controles, estilo, ventana emergente; predeterminado/cargando/seleccionado                                                              |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | visuales            | `component.code`                                             | valor, tamaño; predeterminado/no válido/cargando                                                                                        |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | visuales            | `component.code`                                             | valor, tamaño; predeterminado/no válido/cargando                                                                                        |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | visuales            | `component.resource-planner`                                 | recursos, alcance, selección; predeterminado/al pasar el cursor/seleccionado/enfoque-visible/conflicto/no disponible                    |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | visuales            | `component.scheduler`                                        | gama, eventos, selección; predeterminado/enfoque-visible/hoy/fuera/ocupado                                                              |
| `select/atoms`               | `forge-tag`                                                                                                                                        | visuales            | `component.feedback`                                         | variante, tamaño, extraíble; predeterminado/al pasar el cursor/deshabilitado                                                            |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | heredado-visual     | `component.select` + `component.navigation`                  | lugar; predeterminado/ampliado/seleccionado                                                                                             |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | visuales            | `component.select` + `component.input` + `component.field`   | tamaño, opciones, modelo, validación; predeterminado/al pasar el cursor/enfoque visible/deshabilitado/expandido/seleccionado/no válido  |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | visuales            | `component.button` + `component.icon`                        | modo; predeterminado/al pasar el cursor/activo/seleccionado                                                                             |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | visuales            | `component.surface` + `component.field` / `component.layout` | valores/modo del tema; predeterminado/claro/oscuro/no válido                                                                            |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | heredado-visual     | `component.media`                                            | las dimensiones del lienzo del host son estructurales; superficie heredada                                                              |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | visuales            | `component.typography`                                       | variante, color, `as`; predeterminado/enlace/deshabilitado                                                                              |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | sólo comportamiento | ninguno                                                      | serializa datos del calendario; sin anfitrión visual                                                                                    |
| `vcard`                      | `forge-vcard`                                                                                                                                      | sólo comportamiento | ninguno                                                      | serializa datos de contacto; sin anfitrión visual                                                                                       |

## Componentes de correo electrónico

`@mission-platform/email-components` se incluye porque sus fuentes TSX son escritas por Forge. Los clientes de correo electrónico no
consumir propiedades personalizadas en tiempo de ejecución: el renderizador resuelve los mismos roles semánticos en valores en línea. Cada entrada a continuación
es visual y usa `component.email`, con `component.button`, `component.typography` o `component.media` donde se indique.

| Nivel      | Componentes                                                                   | Contrato                                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| átomos     | `email-button`                                                                | `component.email` + `component.button.<variant>`; variantes neutral/primaria/secundaria/terciaria/éxito/advertencia/info/error/crítica/fantasma; predeterminado/al pasar el cursor/activo/deshabilitado |
| átomos     | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; predeterminado                                                                                                        |
| moléculas  | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; predeterminado/seleccionado donde los enlaces son interactivos                                                                                                                       |
| organismos | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; predeterminado                                                                                                                                              |
| plantillas | `email-container`, `email-document`, `email-section`                          | `component.email`; modo de fuente predeterminado/claro/oscuro                                                                                                                                           |

## Cobertura de historia y anulación

Hay 246 historias ubicadas conjuntamente para 249 fuentes componentes. Las únicas fuentes sin historias independientes son las
ayudantes recursivos `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block` y `content/molecules/forge-markdown/markdown-inline`; su
Los estados visuales son ejercidos por sus historias principales y están documentados anteriormente como visuales heredados.

La vista previa compartida de Storybook carga `@mission-platform/tokens/scss/tokens`, el complemento de anulación de Storybook y el
`theme` mundial. Para inspeccionar el contrato, configure el tema global en claro u oscuro y use los controles de las historias componentes;
para probar las anulaciones del consumidor, edite `apps/storybook/design-tokens/overrides.tokens.json` en `component` usando un
Valor `{ "light": "...", "dark": "..." }`. El esquema de anulación es
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

Las siguientes hojas tienen un alcance de componente intencional y también se pueden anular en un host de componente individual
con la propiedad personalizada CSS generada. Los valores de reserva en los componentes compuestos conservan el valor predeterminado cuando un host
no define una anulación.

| Componente           | Ruta de anulación de DTCG                          | Patrón de variable CSS generado                        |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Lista de verificación de transferencia de Figma

1. Cree la colección de variables `Mission Platform / Component` con los modos Claro y Oscuro.
2. Importe las rutas de los componentes del árbol de origen `component/<atomic-level>/`, conservando el componente, la variante, la ranura,
   y segmentos estatales.
3. Vincule las variables de los componentes a las variables primitivas/semánticas correspondientes en lugar de copiar colores sin formato o valores de escala.
4. Cree propiedades de componentes para las variantes y tamaños documentados; cree variantes de estado solo para los estados enumerados en el inventario.
5. Mantenga las fórmulas de diseño, los puntos de interrupción de la ventana gráfica, el comportamiento del lienzo y el comportamiento de DOM/accesibilidad fuera de la colección de variables visuales.
