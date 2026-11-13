# Contrato de anulación de componentes visuales e inventario de migración

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> Idioma: Español (es)

Estado: El registro de propiedad del componente y la compatibilidad con el estilo de ámbito Vue están
implementado. Bolsas tipo `properties`, emisión neutra `style`, ubicadas conjuntamente
`@property` parciales y Vue `v-bind()` reducción con reconocimiento de objetivos están implementados.

## Alcance y método de auditoría

El objetivo de la auditoría es el conjunto completo combinado con:

```text
packages/**/src/components/**/*.module.scss
```

La auditoría actual encontró **258 módulos fuente en 17 paquetes**. Para cada módulo, lo siguiente
Se comprobaron los puntos de contacto coubicados:

- `<component>.tsx`: la interfaz JSX neutral y la propiedad raíz/envoltorio;
- `<component>.module.scss` — declaraciones, variables `--forge-*` existentes,
  `--mp-*` cobertura de tokens, selectores, pseudoclases y reglas de medios; cada
  La referencia `--forge-*` con prefijo de componente concreto se compara con un
  inscripción parcial;
- `<component>.stories.tsx` — la superficie representativa del Libro de Cuentos;
- `<component>.spec.ts` — cobertura de regresión neutral y/o de representación objetivo;
- `index.ts` — la exportación de tipo/componente local y el componente del paquete
  barril (`packages/<package>/src/components/index.ts`).

Cada módulo auditado tiene una fuente `.tsx` neutral y una ubicación compartida.
`.stories.tsx`. Cada módulo tiene un `index.ts` ubicado conjuntamente excepto
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
ese paquete barril exporta el archivo fuente directamente. El nivel de paquete
Los barriles son, por lo tanto, el punto de contacto para la exportación, incluso cuando se vende un barril local.
desaparecido.

La clasificación es intencionalmente conservadora:

- **Prototipo**: ya implementa el patrón de bolsa anidada/variable heredada
  y es la referencia de compatibilidad.
- **Variable semántica existente**: ya emite una propiedad personalizada, pero la
  el valor se deriva de un accesorio semántico como `columns`; no lo dupliques
  en una bolsa de anulación genérica.
- **Migrar/revisar**: CSS visual ubicado conjuntamente que puede exponer a usuarios de propiedad limitada.
  controles respaldados por tokens después de una decisión de API componente por componente. un
  La declaración tokenizada no es por sí sola una razón para hacerla pública.
- **Excluido**: glifo generado, diagnóstico, proveedor/lienzo, estado sin renderizado,
  o estilo propiedad del editor sin anulación segura de propiedad del componente en esta pasada.

## Contrato

### forma publica

Cada componente aprobado para anulaciones posee una interfaz con nombre. el
La propiedad es opcional y no tiene firma de índice:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

La interfaz del componente concreto sigue siendo la exportación pública, por ejemplo.
`TypographyProperties`; no introduzca un diccionario `CSSProperties` global.
Utilice un alias más descriptivo cuando un valor tenga una gramática estable (por ejemplo,
`TypographyFontFamily` o `TypographyLineHeight`) y utilice `string` sólo cuando
la gramática CSS incluye legítimamente referencias simbólicas, `calc()`, comas o
valores definidos por el navegador. Las claves desconocidas deben rechazarse por exceso de TypeScript
control de propiedad.

La clave anidada es el concepto de propiedad del componente, no una declaración CSS sin formato. hacer
no exponer `display`, `position`, `content`, animaciones internas o un
declaración cuya decisión prevista ya está representada por una propiedad semántica
(`size`, `variant`, `columns`, `rows`, `gap`, y similares).

### Nombres de propiedades personalizados y resolución de hojas de estilo

Convierta una clave anidada en una propiedad personalizada estable de kebab-case:

| Clave anidada | Propiedad personalizada |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

El componente slug es el espacio de nombres CSS público. La declaración SCSS resuelve
la anulación antes del token/retroceso predeterminado:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

Si la declaración actual tiene un valor predeterminado no simbólico significativo, consérvelo como un
último recurso alternativo (`var(--forge-..., var(--mp-token, 1px))`). No crear un nuevo
Token de Mission Platform por un valor ya cubierto por `packages/tokens`.

Utilice `@property` con `inherits: true` cuando el valor deba cruzar descendientes,
selectores de variantes, pseudoclases o un límite de ventana emergente/contenedor. Pon el
mapa de propiedades personalizadas en línea en el elemento que posee la raíz BEM. por un
componente de elementos múltiples, colóquelo en el envoltorio confiable existente para que todos
los descendientes lo heredan; no confíe en los atributos de ámbito Vue en anidados
nodos de cierre de renderizado. Un portal renderizado fuera de ese contenedor necesita una información explícita.
decisión de propagación/host del portal, no una variable silenciosamente global.

### Integridad de la declaración

Cada propiedad `--forge-*` concreta leída por un módulo componente debe tener
exactamente un registro `@property` coincidente en el módulo importado,
`_forge-<component>-properties.scss` parcial coubicado. Las inscripciones se ajustan
según la especificación API Nivel 1 de propiedades y valores CSS del W3C:
usan `syntax: "*"` y `inherits: true` sin `initial-value` no válido
descriptor, lo que permite que se resuelvan los respaldos estándar `var(--forge-*, var(--mp-*))`
en una evaluación de estilo cercana a $O(1)$. Los registros se escriben como nombres concretos.
en lugar de interpolaciones Sass no resueltas. Esto incluye cada tamaño finito,
tono, estado, tipografía, ventana emergente y variante generada por mapa, además de anclajes semánticos
como `--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns` y
`--forge-grid-rows`.

Las declaraciones `--forge-*` son metadatos de anulación local del componente. el
Las variables `--mp-*` siguen siendo propiedad de `packages/tokens` y no deben ser
redeclarado en parciales de componentes. Una guardia repetible está disponible como
`pnpm validate:component-properties`; escanea solo los módulos fuente e informa
el módulo y la propiedad exactos en caso de faltantes, duplicados, huérfanos o no resueltos
declaraciones.

### Salida neutral y precedencia

La salida JSX neutral utiliza la propiedad estándar `style` producida por
`createForgeComponentStyle(prefix, props.properties)`. Su tipo acepta ambos.
Llaves de camelCase y kebab-case a través del `ForgePropertyBag` de la plataforma /
`CSSStyleProperties`, con conversión automática y prefijo:

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

Los valores no definidos se omiten del objeto emitido, por lo que los tokens de reserva permanecen
activo. Nunca emita una propiedad `styles`; no es parte del tiempo de ejecución neutral
contrato y sería un atributo DOM desconocido en objetivos que no lo reducen
especialmente. Las variables semánticas numéricas pueden mantener su `number` existente
representación; Los valores de anulación escritos son cadenas CSS, por lo que las unidades, comas, espacios,
y `calc()` permanecen intactos.

### Jerarquía de capas en cascada CSS y estructura atómica

Todos los estilos están organizados en una jerarquía `@layer` explícita y determinista.
declarado en la capa del token raíz (`@mission-platform/tokens`):

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

Las hojas de estilo de los componentes asignan sus reglas a sus respectivos paquetes y atómicos.
subcapa (por ejemplo, `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), garantizando una precedencia en cascada predecible
sin conflictos de especificidad.

### Mejoras progresivas de rendimiento a través de `@supports`

Los componentes compuestos complejos y los organismos pesados aprovechan el CSS del navegador moderno
funciones protegidas por `@supports` consultas de funciones con gracia resistente
degradación:

1. **`content-visibility: auto`**: Diseño fuera de pantalla y costos de pintura para trabajos pesados.
   organismos (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   se difieren con `contain-intrinsic-size`.
2. **Consultas de contenedor (`@container`)**: Densidad adaptable y responsiva
   la tipografía de los componentes se adapta a las dimensiones del contenedor mediante
   `@supports (container-type: inline-size)`.
3. **Reservas de un solo salto**: las búsquedas de propiedades se mantienen superficiales
   `var(--forge-*, var(--mp-*))` gráficos para mantener el recálculo de estilo cerca de $O(1)$.

La prioridad es, de menor a mayor: reserva de token/tema, componente
regla variante/predeterminada, selección de accesorios semánticos, anulación de componente personalizada
propiedad, luego un estilo en línea del consumidor proporcionado explícitamente (si el objetivo
soporta uno). `className` sigue siendo el enlace de clase de la persona que llama y puede agregar reglas,
pero no debe ser tratado como un reemplazo de la maleta mecanografiada. la anulación
bolsa no cambia la variante semántica seleccionada ni omite el foco, deshabilitado,
reglas de movimiento reducido o de capas en cascada.

React, Svelte, Solid y la salida del componente web consumen el mapa neutral `style`.
Sólo la ruta de estilo SFC de plantilla nativa Vue puede reescribir posteriormente el archivo correspondiente.
Valor SCSS a `v-bind('properties.<name>')`; Vue respaldo de cierre de renderizado y
todas las rutas de hojas de estilo que no sean Vue deben seguir siendo CSS/SCSS ordinarios válidos.

Los puntos de contacto de implementación para esa reducción son el tiempo de ejecución neutral.
contrato en `packages/core/forge-jsx/src/runtime/types.ts` y `packages/core/forge-jsx/src/runtime/h.ts`,
el estilo neutral existente a Vue bajando en
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`, y el coubicado
conjunto de estilo/emisión en `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` y
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. Estos archivos llevan o bajan el
valor `style` escrito; no deben agregar un atributo `styles` específico del marco.

## Prototipo y candidatos existentes

Estos son exactamente los sitios de propiedades personalizadas existentes. Son regresión y
anclajes de compatibilidad, no una solicitud para reemplazar las API semánticas con bolsas.

| Componente | Módulo de estilo | Variables existentes | Propietario/disposición actual | Puntos de contacto posteriores |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | Superficie `--forge-typography-*` completa, incluidos valores base, visualización, variante, color, enlace y ventana emergente | Prototipo; heredado a través de la raíz de tipografía y el contenedor emergente truncado | `forge-typography.tsx`, local `index.ts`, `.spec.ts`, `.stories.tsx`; todos los nombres concretos están registrados en el parcial coubicado |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | Variable semántica existente; retener `columns` y su sujeción | `forge-logo-cloud.tsx`, barril local, especificaciones, historia; sin duplicado `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | Variable semántica existente; retener `columns` | `forge-stats-section.tsx`, barril local, especificaciones, historia; sin duplicado `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | Variable semántica existente; conservar `columns` | `forge-testimonials-section.tsx`, barril local, especificaciones, historia; sin duplicado `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | Variables semánticas existentes derivadas de `columns`/`rows`; conservar el comportamiento de sujeción y de punto de rotura | `forge-grid-layout.tsx`, barril local, especificaciones, historia; sin bolsa de rejilla duplicada |

El prototipo de tipografía ahora cuenta con un parcial de registro completo para cada
propiedad concreta consumida por su módulo, incluyendo todas las variantes finitas y
nombres emergentes. Su salida JSX neutral usa `style={style}` y mantiene el tipo escrito
extensión `CSSStyleProperties`; la API de tipografía semántica permanece sin cambios.

## Inventario a nivel de paquete

Las listas a continuación son el inventario completo de componentes para los 258 emparejados.
módulos de estilo. Para cada slug, el módulo, la fuente neutral, la historia y (donde
presente) las especificaciones están en el mismo directorio bajo el átomo existente del paquete,
ruta de molécula, organismo o plantilla. El módulo de paquete global en la primera
La columna es una especificación de ruta exacta para los archivos de estilo.

| Paquete y especificación de ruta exacta del módulo |   Contar | Disposición |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | Migrar/revisar la presentación del código de barras generado |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | Presentación de diagnóstico/depuración excluida |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | Migrar/revisar la presentación del marco/host del escáner |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 variables semánticas existentes; 81 migrar/revisar |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 migrar/revisar; 2 propiedad del editor/excluidas |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | Migrar/revisar; prioridad de herencia de ventana emergente/portal |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | Migrar/revisar, preservando la semántica de control |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | Envoltorios de glifos generados excluidos |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1 variable semántica existente; 6 migrar/revisar |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | Anfitrión MapLibre/canvas excluido |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | Migrar/revisar la presentación del código generado |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | Migrar/revisar la presentación del código generado |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | Migrar/revisar la presentación del dominio |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | Migrar/revisar la presentación del dominio |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | Migrar/revisar, preservando la semántica de selección |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 migrar/revisar; 2 exclusiones sin renderizado/estado |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | Prototipo |
| **Totales** | **258** | **141 migraciones/revisión, 5 prototipos/anclajes semánticos, 112 excluidos** |

### Señales de cobertura

Las siguientes señales provienen del mismo escaneo del módulo y son intencionalmente
ortogonal. **MP refs** cuenta los módulos que contienen referencias `--mp-*`; **color
literales** cuenta módulos que contienen una función de color o hexadecimal; **dimensión
literals** cuenta los módulos que contienen un literal de porcentaje/longitud CSS (incluidos
valores intencionales de cero/ventana gráfica); **Forge vars** cuenta los módulos que contienen un
variable `--forge-*` existente; **sin señal de token** cuenta los módulos que contienen
ni `--mp-*` ni `--forge-*`. Estas son señales de clasificación, no API automáticas.
decisiones.

| Paquete | Módulos | árbitros MP | Literales de color | Literales de dimensión | Vars de forja | Sin señal simbólica | Clasificación raíz/envoltura |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| código de barras | 1 | 1 | 0 | 1 | 0 | 0 | raíz de código de barras única |
| puntos de interrupción | 1 | 1 | 1 | 1 | 0 | 0 | raíz de diagnóstico |
| escáner de códigos | 1 | 1 | 0 | 1 | 0 | 0 | host del escáner/raíz del marco |
| componentes | 84 | 83 | 3 | 75 | 3 | 1 | raíces BEM; rejillas interiores y envoltorios seleccionados |
| contenido | 10 | 9 | 0 | 6 | 0 | 1 | raíces más envoltorios de editor/barra de herramientas |
| flotador | 8 | 8 | 0 | 8 | 0 | 0 | ventanas emergentes, cuadros de diálogo, notificaciones y contenedores adyacentes al portal |
| formularios | 28 | 28 | 0 | 25 | 0 | 0 | controlar las raíces con descendientes estatales |
| iconos | 106 | 0 | 0 | 1 | 0 | 106 | raíces de glifos generadas/envoltorios SVG |
| diseño | 7 | 2 | 0 | 7 | 1 | 4 | raíces de diseño; variables de cuadrícula en la raíz de la cuadrícula |
| mapa | 1 | 0 | 0 | 1 | 0 | 1 | Host de MapLibre/raíz de lienzo |
| código-matriz | 1 | 1 | 0 | 1 | 0 | 0 | raíz del código generado |
| código qr | 1 | 1 | 0 | 1 | 0 | 0 | raíz del código generado |
| planificador de recursos | 1 | 1 | 0 | 1 | 0 | 0 | raíz planificadora con descendientes densos |
| planificador | 1 | 1 | 0 | 1 | 0 | 0 | raíz del programador con descendientes densos |
| seleccionar | 3 | 3 | 0 | 3 | 0 | 0 | seleccionar/controlar raíces con descendientes emergentes |
| tema | 3 | 2 | 0 | 0 | 0 | 1 | alternar raíz; envoltorios de compositor/proveedor |
| tipografía | 1 | 1 | 0 | 1 | 1 | 0 | raíz de tipografía más contenedor emergente truncado |
| **Totales** | **258** | **143** | **4** | **134** | **5** | **114** | Las señales se superponen por diseño |

La regla de ubicación de la raíz se deriva de esta clasificación: módulos BEM ordinarios
adjunte el mapa a su raíz; `ForgeLogoCloud`, `ForgeStatsSection` y
`ForgeTestimonialsSection` actualmente coloca variables de columna semánticas en su
cuadrícula/lista interior; `ForgeGridLayout` coloca filas/columnas en su raíz; y
`ForgeTypography` coloca valores heredados en el contenedor emergente cuando eso
el envoltorio existe. Las estructuras emergentes flotantes/seleccionadas utilizan el mismo nivel contenedor
regla de herencia, y la guardia de declaración cubre todos los bienes utilizados por sus
estilos emergentes.

### `@mission-platform/barcode`, `breakpoints` y `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  - fuente, módulo, índice local, especificación, historia. Revisar solo generado/código de barras
  dimensiones o controles de superficie que no forman parte de la API de codificación de códigos de barras.
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  - fuente, módulo, índice local, especificación, historia. Excluido: este es un diagnóstico.
  visualización de ventana gráfica/depuración, no una superficie de tema visual reutilizable.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  - fuente, módulo, índice local, especificación, historia. Revisar el marco/contenedor del escáner
  controles únicamente; El comportamiento del motor del escáner no es un estilo de API.

### `@mission-platform/components` (84)

Todas las entradas siguientes tienen `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` y `<slug>/index.ts`, con el paquete
barril en `packages/ui/components/src/components/index.ts`.

**Anclajes de variables semánticas existentes:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**Migrar/revisar:**

- Átomos: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- Moléculas: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- Organismos: `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- Plantilla: `forge-hero`.

Los tres anclajes existentes siguen siendo solo de apoyo semántico para su actual
`columns` API; un pase posterior puede agregar otras propiedades de propiedad limitada, pero debe
No exponer una segunda forma de seleccionar columnas.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` están bajo su átomo/molécula/organismo existente
directorios y todos tienen fuente, módulo, historia, índice local y el paquete
barril en `packages/content/content/content/src/components/index.ts`.

Existen especificaciones para `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar` y
`forge-wysiwyg-editor`. Faltan especificaciones para los otros cuatro controles WYSIWYG.
`forge-monaco-editor` y `forge-wysiwyg-editor` están excluidos del acceso directo
Anulaciones de estilo del editor: Mónaco/editor DOM y el estado del editor poseen su interior
estilos. Sus hosts/barras de herramientas circundantes siguen siendo candidatos a revisión.

### `@mission-platform/float`, `forms`, `layout` y paquetes de dominio

- Flotante (los 8, cada uno con fuente/módulo/especificaciones/historia/índice local):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  Priorice la herencia de raíz a ventana emergente y el comportamiento del contenedor/portal.
- Formularios (los 28, cada uno con fuente/módulo/especificaciones/historia/índice local):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  Preservar `size`, semántica de validación, verificación, deshabilitación y selección.
- Diseño: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  son candidatos a revisión. `forge-grid-layout` es el ancla semántica existente
  y mantiene `rows`, `columns`, `gap`, `margin`, `padding` y `breakpoint`.
  El barril del paquete es `packages/ui/layout/src/components/index.ts`.
- Candidatos de dominio/generados (cada uno tiene fuente/módulo/historia/índice local/especificaciones
  a menos que se indique lo contrario): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; sin índice local, exportación directa desde
  `src/components/index.ts`) y `forge-scheduler` (`packages/scheduler`).
- Seleccione: `forge-tag`, `forge-multiselect` y `forge-select`, cada uno con
  source/module/spec/story/local index y el barril del paquete. Mantener opción
  Semántica de accesorios de estado y selección.
- Tema: `forge-theme-toggle` es candidato a revisión; `forge-theme-composer`
  y `forge-theme-provider` están excluidos de la migración de anulación visual como
  Estado del tema/infraestructura del proveedor sin renderizado. El barril del paquete es
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

Los 106 módulos de íconos se generan envoltorios de glifos bajo
`packages/ui/icons/src/components/**`, tiene una fuente neutral, módulo, historia y
exportación local, y son exportados por el generado
`packages/ui/icons/src/components/index.ts`. Ninguno tiene una especificación de ubicación conjunta. el
Los nombres completos generados son:

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

Estos estilos sólo establecen el contenedor de glifos (`inline-flex`, alineación,
`currentColor`, o tamaño SVG). Los consumidores ya controlan el tamaño de los iconos a través de
el contexto de icono/fuente circundante o la API semántica del icono. No agregues un
bolsa a cada icono generado.

### `@mission-platform/map` y `@mission-platform/typography`

`forge-map-libre` es el único módulo host de MapLibre en
`packages/integrations/map/src/components/organisms/forge-map-libre/`; tiene una historia y
exportaciones locales/de paquetes, pero sin especificaciones de ubicación conjunta. Su motor de lienzo/mapa posee el
modelo visual interno, por lo que está excluido; sólo se debe considerar el comportamiento del tamaño del host
se considerará si una API posterior lo requiere explícitamente.

`forge-typography` es el único módulo de tipografía en
`packages/ui/typography/src/components/atoms/forge-typography/`. Su fuente,
índice local, barril de paquete (`packages/ui/typography/src/components/index.ts`),
Las especificaciones y la historia son los puntos de contacto exactos del Paso 2. Su herencia existente
Las propiedades son la referencia para la familia de fuentes, interlineado, métricas de visualización y
truncar descendientes emergentes.

## Exclusiones explícitas y reglas solo semánticas

1. **Componentes de correo electrónico:** no hay ningún módulo de correo electrónico en el conjunto de 258 coincidencias. Estilos de correo electrónico
   están intencionalmente en línea y siguen un modelo de representación separado; no agregues
   este contrato a `packages/email-components`.
2. **Iconos generados:** quedan los 106 módulos `@mission-platform/icons`
   Componentes semánticos de glifos, sin bolsa visual por icono.
3. **Hosts de diagnóstico/infraestructura:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` y `ForgeThemeProvider` permanecen excluidos para el
   razones anteriores. DOM, propiedad del editor/Mónaco, también permanece excluido.
4. **Dimensiones semánticas existentes:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns` y
   `ForgeGridLayout.rows`/`columns` siguen siendo los únicos propietarios de esas decisiones.
   Los nombres de sus propiedades personalizadas existentes no deben entrar en conflicto con los de la bolsa futura.
   nombres.
5. **Accesorios de interacción semántica:** `size`, `variant`, estado marcado/seleccionado,
   El estado de validación, el punto de interrupción, las filas/columnas y el comportamiento de control no son
   Claves de anulación de CSS. La bolsa puede ajustar el valor visual de un componente en torno a
   el estado semántico seleccionado, pero no puede reemplazar ese estado.

## Lista de verificación de implementación del paso 2

- Agregue una interfaz `properties` escrita solo a las filas clasificadas
  **Migrar/revisar** después de confirmar que la declaración es propiedad del componente.
- Escriba cada estilo de anulación neutral como `CSSStyleProperties` intersectado con
  las claves de propiedad personalizadas explícitas del componente (`string | undefined`); hacer
  No reemplace esto con `Record<string, string>` o un diccionario CSS global.
- Agregue un respaldo `--forge-<slug>-<key>` por clave expuesta, con respaldo de token
  y `inherits: true` cuando los descendientes lo requieran.
- Adjunte solo valores definidos a la raíz/envoltorio del componente a través de `style`;
  nunca `styles` y nunca un atributo de bolsa desconocido.
- Actualice el índice local exacto y el barril de componentes del paquete cuando haya un nuevo público.
  se introduce el tipo; preservar el orden/convenciones de exportación existentes.
- Agregue cobertura predeterminada/una anulación/estado anidado a cada especificación afectada y una
  anular el ejemplo a la historia coubicada existente. Utilice las especificaciones de anclaje para
  logo/estadísticas/testimonios/cuadrícula para proteger variables semánticas.
- Mantenga el trabajo del emisor Vue por separado: se pueden usar estilos con ámbito de plantilla nativa
  Vue `v-bind()`, mientras que la fuente neutral y otros estilos de destino deben permanecer
  neutral en cuanto al marco.
