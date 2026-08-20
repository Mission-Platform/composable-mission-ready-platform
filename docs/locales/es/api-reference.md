# Referencia de API

Referencia técnica para los paquetes principales y adaptadores de marco de Mission Platform.

> **Las importaciones siempre están vacías.** Envío del marco `@mission-platform/*` Los paquetes exponen un solo `.`
> entrada custodiada por el `mp:vue`, `mp:react`, `mp:solid`, y `mp:web-component` exportar
> condiciones. Seleccione el marco **una vez** — a través de `resolve.conditions` (ver `defineFrameworkAppConfig` /
> `frameworkResolveConditions` de `@mission-platform/vite-config`) y `customConditions` (a través del
> `@mission-platform/typescript-config/framework-<name>` ajustes preestablecidos) - luego importe todo con el simple
> especificador de paquete. Ver [Configuración del consumidor externo](external-consumer-setup.md).

## Marco central

### @mission-platform/forge

La base de la arquitectura de "escritura única", que proporciona ganchos y un tiempo de ejecución JSX neutral en el marco.

| Exportar           | Tipo      | Descripción                                                                                                                      |
| :----------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | Función   | Fábrica JSX y fragmento para componentes de creación.                                                            |
| `useState`         | Gancho    | Gancho de estado neutral en el marco.                                                                            |
| `useEffect`        | Gancho    | Gancho con efecto marco neutro.                                                                                  |
| `useMemo`          | Gancho    | Gancho de memorización neutral en el marco.                                                                      |
| `useRef`           | Gancho    | Gancho de referencia neutral en el marco.                                                                        |
| `useContext`       | Gancho    | Gancho de contexto neutral al marco.                                                                             |
| `toVueComponent`   | Adaptador | Convierte un componente de forja en un Vue 3 componentes (de `@mission-platform/forge/vue`).  |
| `toReactComponent` | Adaptador | Convierte un componente de forja en un React componente (de `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | Descripción                                                                                                                                                                         |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| Exportar                                                             | Tipo             | Descripción                                                                                                                                           |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | Tipo             | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | Función          | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Adaptador        | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | Gancho           | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## Interfaz de usuario y diseño

### @mission-platform/tokens

Fichas de diseño centralizadas para colores, tipografía y espaciado.

| Exportar      | Descripción                                                                                                                    |
| :------------ | :----------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | Objeto JS/TS que contiene todos los tokens de diseño (por ejemplo, `tokens.color.primary`). |
| `tokens.scss` | Variables SCSS para uso en hojas de estilo.                                                                    |

### @mission-platform/breakpoints

Utilidades responsivas y componentes de visibilidad.

| Exportar         | Tipo       | Descripción                                                                                              |
| :--------------- | :--------- | :------------------------------------------------------------------------------------------------------- |
| `useBreakpoints` | Gancho     | Devuelve el estado del punto de interrupción reactivo.                                   |
| `ShowIf`         | Componente | Representa niños solo cuando coincide una condición de punto de interrupción.            |
| `HideIf`         | Componente | Oculta los elementos secundarios cuando coincide una condición de punto de interrupción. |

### @mission-platform/components

Componentes de interfaz de usuario compartidos creados una vez y disponibles para múltiples marcos.

- **Importar**: siempre `@mission-platform/components`; el activo `mp:<framework>` La condición decide si obtienes el
  Vue 3, React, Solid, o compilación de componentes web.
- **Subrutas por componente**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) también tiene en cuenta la condición y carga solo el componente de ese componente.
- **Componentes**: `ForgeButton`, `ForgeInput`, `ForgeModal`y más.

## Paquetes de funciones

### @mission-platform/i18n

Sistema de internacionalización basado en i18next.

| Exportar          | Descripción                                                                                    |
| :---------------- | :--------------------------------------------------------------------------------------------- |
| `createForgeI18N` | Inicializa la instancia i18n con los valores predeterminados de la plataforma. |
| `useI18n`         | Gancho para traducciones y cambio de configuración regional en componentes.    |

### @mission-platform/seo

Gestión de metaetiquetas y SEO.

| Exportar | Descripción                                                                                                                        |
| :------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `useSeo` | Enganche para establecer de forma declarativa el título de la página, las metaetiquetas y los datos de Open Graph. |

### @mission-platform/map

Envoltorio reactivo para MapLibre GL.

| Componente      | Descripción                                                    |
| :-------------- | :------------------------------------------------------------- |
| `<MpMap>`       | Componente contenedor del mapa principal.      |
| `<MpMapMarker>` | Componente para colocar marcadores en el mapa. |

### @mission-platform/code-scanner

Escaneo de códigos de barras y códigos QR basado en cámara.

| Componente        | Descripción                                                                                          |
| :---------------- | :--------------------------------------------------------------------------------------------------- |
| `<MpCodeScanner>` | Componente que inicializa la transmisión de la cámara y emite resultados de escaneo. |

## Integraciones

### @mission-platform/rxjs

Puentea los observables RxJS al estado del componente.

| Gancho          | Descripción                                                                                  |
| :-------------- | :------------------------------------------------------------------------------------------- |
| `useObservable` | Se suscribe a un observable y devuelve su último valor como estado reactivo. |

### @mission-platform/d3

Integración D3.js neutral en el marco de trabajo.

| Gancho  | Descripción                                                                                            |
| :------ | :----------------------------------------------------------------------------------------------------- |
| `useD3` | Vincula una selección D3 a una referencia de componente con gestión del ciclo de vida. |

### @mission-platform/hunspell

WebAssembly-powered spell checking.

| Exportar       | Descripción                                                                 |
| :------------- | :-------------------------------------------------------------------------- |
| `initHunspell` | Carga y crea una instancia del módulo Hunspell WebAssembly. |
| `spell`        | Comprueba si una palabra está escrita correctamente.        |
| `suggest`      | Proporciona sugerencias de ortografía para una palabra.     |

## Lectura adicional

- [Vue 2 a Vue 3 Guía de migración](migration-guides/vue2-to-vue3.md)
- [Descripción general de la configuración del proyecto](configs/index.md)
- [Estructura del espacio de trabajo](workspace-structure.md)

## Índice completo del paquete del espacio de trabajo

El siguiente índice se genera a partir de los manifiestos del paquete y se mantiene aquí para que la referencia de la API pública cubra todos los
paquete en `packages/`, incluidas las fachadas WebAssembly escritas.

### Núcleo y interfaz de usuario

| Paquete                        | Propósito                                                                                          |
| :----------------------------- | :------------------------------------------------------------------------------------------------- |
| `@mission-platform/forge`      | Adaptadores y tiempo de ejecución JSX neutrales en el marco de trabajo.            |
| `@mission-platform/components` | Componentes de interfaz de usuario de escritura única.                             |
| `@mission-platform/icons`      | Componentes de iconos SVG de escritura única.                                      |
| `@mission-platform/layouts`    | Componentes de aplicación, contenedor y diseño responsivo.                         |
| `@mission-platform/forms`      | Formularios de esquema y componentes de creación de formularios visuales.          |
| `@mission-platform/forms-core` | Derivación de esquemas, validación y lógica de dominio del creador de formularios. |
| `@mission-platform/tokens`     | Propiedades personalizadas de CSS y tokens de diseño SCSS.                         |

### Componibles e integraciones

| Paquete                                         | Propósito                                                                                                     |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `@mission-platform/breakpoints`                 | Ayudantes de visibilidad y estado de punto de interrupción receptivos.                        |
| `@mission-platform/d3`                          | Utilidades de margen y componibles del ciclo de vida de selección D3.                         |
| `@mission-platform/i18n`                        | Ayudantes de integración de marco y estado de i18next.                                        |
| `@mission-platform/map`                         | Componentes de mapas MapLibre y elementos componibles.                                        |
| `@mission-platform/observers`                   | Componibles de intersección, mutación y observador de rendimiento.                            |
| `@mission-platform/phone-number`                | Análisis y formato de números de teléfono de WebAssembly escritos.                            |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.                                  |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.                                      |
| `@mission-platform/rxjs`                        | RxJS observables y componibles por suscripción.                                               |
| `@mission-platform/scheduler`                   | Lógica de dominio de diseño de calendario, recurrencia y interfaz de usuario del programador. |
| `@mission-platform/vcard`                       | Datos y componentes RFC 6350 vCard y RFC 5545 iCalendar.                                      |
| `@mission-platform/content`                     | Contenido AST, constructores, Monaco, Markdown y componentes WYSIWYG.                         |
| `@mission-platform/seo`                         | Metadatos, Open Graph y elementos componibles de datos estructurados.                         |
| `@mission-platform/speech-audio`                | Componibles de voz, audio y Web MIDI.                                                         |
| `@mission-platform/three`                       | Componibles de ciclo de vida y lienzo de Three.js.                            |

### Paquetes de código y WebAssembly

| Paquete                                     | Propósito                                                                                    |
| :------------------------------------------ | :------------------------------------------------------------------------------------------- |
| `@mission-platform/barcode`                 | Codificación/decodificación de códigos de barras 1D de fachada y componente. |
| `@mission-platform/code-scan-wasm`          | Módulo WebAssembly del escáner de imágenes generadas.                        |
| `@mission-platform/code-scanner`            | Componente de escaneo de código de imagen y cámara.                          |
| `@mission-platform/matrix-code`             | Fachada de codificación/decodificación Data Matrix y Azteca.                 |
| `@mission-platform/matrix-code-decode-wasm` | Módulo WebAssembly decodificador de Matrix Code generado.                    |
| `@mission-platform/matrix-code-encode-wasm` | Módulo WebAssembly del codificador Matrix Code generado.                     |
| `@mission-platform/qr-code`                 | Codificación/decodificación QR de fachada y componente.                      |
| `@mission-platform/qr-code-decode-wasm`     | Módulo WebAssembly decodificador QR generado.                                |
| `@mission-platform/qr-code-encode-wasm`     | Módulo WebAssembly del codificador QR generado.                              |
| `@mission-platform/harper`                  | Integración de estilo y gramática de Harper para Mónaco.                     |
| `@mission-platform/hunspell`                | Envoltorio de corrección ortográfica de Emscripten Hunspell.                 |

### Forjar objetivos del compilador

Estos viven en `forge-plugins/` en vez de `packages/`. Un complemento **framework** decide en qué tiempo de ejecución es un componente neutral
se reduce a; un destino **CMS** decide en qué plataforma de contenido se proyecta. Los dos ejes se componen, por lo que cualquier CMS
El objetivo puede estar vinculado a cualquier complemento del marco. Ver [Canalización del compilador Forge](forge-compiler.md).

| Paquete                                         | Propósito                                                                                                            |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` contrato, tipos de IR semánticos y tipos de adaptadores de compilación.      |
| `@mission-platform/forge-plugin-react`          | React objetivo de salida.                                                                            |
| `@mission-platform/forge-plugin-vue`            | Vue 3 objetivos de salida.                                                                           |
| `@mission-platform/forge-plugin-solid`          | Solid objetivo de salida.                                                                            |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 objetivos de salida.                                                                        |
| `@mission-platform/forge-plugin-web-components` | Destino de salida de componentes web.                                                                |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` contrato, modelo de contenido neutral, controlador CMS y ayudantes de compilación. |
| `@mission-platform/forge-cms-storyblok`         | Objetos de componentes de Storyblok, envoltorios de bloques y `components.json`.                     |
| `@mission-platform/forge-cms-astro`             | Estático `.astro` plantillas y `client:load` islas marco.                                            |
| `@mission-platform/forge-cms-ghost`             | Parciales de manillar Ghost y un `config.custom` fragmento del tema.                                 |
| `@mission-platform/forge-cms-jekyll`            | El líquido Jekyll incluye, `_data` esquema y un `_config.yml` fragmento.                             |
| `@mission-platform/forge-cms-webflow`           | flujo web `declareComponent` componentes del código y un `webflow.json` fragmento de biblioteca.     |

#### @mission-platform/forge-cms-plugin-api

| Exportar                  | Tipo    | `createMpRouter`                                                                                                   |
| :------------------------ | :------ | :----------------------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Función | Proyecta los accesorios de un componente neutral en el modelo de contenido neutral de plataforma.  |
| `ContentComponent`        | Tipo    | Ordenado `ContentField`s, ranuras y el `interactive` bandera.                                      |
| `ContentFieldKind`        | Tipo    | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.                    |
| `CmsOutputPlugin`         | Tipo    | El contrato de destino: un complemento de marco vinculado más los cuatro emisores. |
| `defineForgeCmsPlugin`    | Función | Valida un destino CMS en el momento de la configuración.                                           |
| `generateCmsArtifacts`    | Función | El controlador genérico descubrir → IR → modelo de contenido → emitir → escribir.                  |
| `defineTsdownForgeCms`    | Función | Configuración tsdown para un objetivo CMS, emitiendo `dist/cms/<cms>/<framework>/**`.              |
| `defineTsdownForgeCmsAll` | Función | tsdown configs para obtener una lista de destinos de CMS.                                          |
