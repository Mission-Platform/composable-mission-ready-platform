# Directorio de API de paquetes

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Idioma: Español (es)

Esta página de todo el proyecto es un directorio de capacidades y compatibilidad de paquetes.
contratos. La instalación canónica, el uso, las limitaciones y los detalles de API para
cada paquete vive al lado de ese paquete en `packages/*/docs/`, `configs/*/docs/`,
y `forge-plugins/*/docs/`. Las referencias de API generadas deben agregarse a la propiedad.
paquete en lugar de esta página.

> **Las importaciones siempre son simples.** Los paquetes `@mission-platform/*` de envío de marco exponen un solo `.`
> entrada custodiada por la exportación `mp:vue`, `mp:react`, `mp:solid` y `mp:web-component`
> condiciones. Seleccione el marco **una vez** — a través de `resolve.conditions` (consulte `defineFrameworkAppConfig` /
> `frameworkResolveConditions` de `@mission-platform/vite-config`) y `customConditions` (a través del
> `@mission-platform/typescript-config/framework-<name>` ajustes preestablecidos) - luego importe todo con el simple
> especificador de paquete. Consulte [Configuración del consumidor externo](external-consumer-setup.md).

## Marco central

### @mission-platform/forge

La base de la arquitectura de "escritura única", que proporciona ganchos y un tiempo de ejecución JSX neutral en el marco.

| Exportar | Tipo | Descripción |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`, `Fragment` | Función | Fábrica JSX y fragmento para componentes de creación.                                      |
| `useState` | Gancho | Gancho de estado neutral en el marco.                                                           |
| `useEffect` | Gancho | Gancho con efecto marco neutro.                                                          |
| `useMemo` | Gancho | Gancho de memorización neutral en el marco.                                                     |
| `useRef` | Gancho | Gancho de referencia neutral en el marco.                                                       |
| `useContext` | Gancho | Gancho de contexto neutral al marco.                                                         |
| `toVueComponent` | Adaptador | Convierte un componente de forja en un componente Vue 3 (de `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adaptador | Convierte un componente de forja en un componente React (de `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

El controlador del compilador acepta instancias `FrameworkOutputPlugin` explícitas; lo hace
no proporciona un registro marco. `defineViteForgeComponents` y
`defineTsdownForgeComponents` (más el gancho y los ayudantes de CMS) comparten un proceso
`ForgeCompilerService` para una sesión de compilación o visualización.

| Capacidad | Descripción |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ciclo de vida del servicio | Reutilice el estado de fuente, gráfico, fuente analizada, IR semántica y artefacto de destino en todas las compilaciones; deseche los servicios de una sola vez una vez finalizados y los servicios de vigilancia al cerrar. |
| Claves de caché | Huellas digitales de origen/dependencia/configuración, opciones de compilador y enrutador, `tsconfig` `baseUrl`/`paths`, ID de destino, identidad/versión del complemento y condiciones relevantes.      |
| Invalidación de reloj | Los archivos modificados invalidan los dependientes del gráfico inverso, incluidos los componentes transitivos y las entradas de gancho; las instantáneas de destino no relacionadas siguen siendo reutilizables.                     |
| Diagnóstico/informe | Informa el tiempo de fase, los recuentos de aciertos y errores de caché, los archivos afectados, las advertencias, los errores y los recuentos de artefactos emitidos. Los errores bloquean la promoción.                                 |
| Manifiesto de artefacto | Enumera entradas, módulos, declaraciones, mapas de origen, activos y sumas de verificación con alcance objetivo antes de la promoción atómica.                                                     |
| Punto de extensión | Implementar y pasar un `FrameworkOutputPlugin` desde un paquete `forge-plugin-*` propiedad de la persona que llama; no agregue ramas de destino al conductor neutral.                        |

Configurar alias a través del proyecto `tsconfig.json` (`baseUrl` y
`paths`); Vite y la preparación del gráfico tsdown utilizan los mismos hechos de alias. Enrutador
La selección, los complementos del enrutador y las condiciones se envían a través de componentes y
ayudantes de gancho. Un futuro trabajador/demonio puede sentarse detrás del contrato de servicio, pero
la implementación respaldada está actualmente en proceso.

### @mission-platform/router

Contratos de ruta neutrales en el marco, ayudantes de coincidencia pura y marcadores de compilador para
paquetes compartidos. Las aplicaciones poseen registros de ruta e instancias de enrutador nativo; el
El destino del enrutador Forge seleccionado por la aplicación proporciona las capacidades de tiempo de ejecución.

| Exportación/paquete | Tipo | Descripción |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Tipos | Registros de ruta, parámetros, estado de consulta/hash, metadatos y objetivos de navegación.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Funciones | Defina árboles de rutas y resuelva rutas sin un DOM o tiempo de ejecución de marco.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Tipos | Resultados/eventos de navegación, guardias, historial conectable y contratos de adaptador.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Marcadores del compilador | Capacidades de enlace neutral, estado de ruta, navegación, resolución y salida consumidas por paquetes compartidos.                               |
| `@mission-platform/forge-router-*` | Forjar objetivos | Destinos de enrutador nativos seleccionados independientemente para el enrutador Vue, el enrutador React, el enrutador SolidJS, SvelteKit, RedwoodSDK y componentes web. |

Los paquetes de tiempo de ejecución tienen su propio historial y estado reactivo; el paquete neutral nunca importa un marco de interfaz de usuario. Para componentes web,
registre los elementos una vez y pase objetivos complejos a través de propiedades DOM en lugar de atributos serializados:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### Vistas de rutas asíncronas y `Suspense`

El compilador neutral de Forge reconoce `Suspense` y lo baja al nativo
Límite asíncrono para el objetivo seleccionado. Mantener el respaldo en la fuente compartida
para que cada objetivo presente el mismo estado de carga sin importar un marco
adaptador:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid y Svelte reciben su límite de suspenso nativo. un
La aplicación sin marco utiliza el respaldo de salida del enrutador de componentes web.
para vistas de rutas asíncronas en su lugar:

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

El enrutador emite una superposición de carga desde `forge-router-outlet` mientras que el async
La vista de ruta se resuelve. La vista actual permanece montada hasta que se selecciona el destino.
listo, y la superposición se elimina después del éxito, redireccionamiento, cancelación o
fracaso.

## Interfaz de usuario y diseño

### @mission-platform/tokens

Fichas de diseño centralizadas para colores, tipografía y espaciado.

| Exportar | Descripción |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` | Objeto JS/TS que contiene todos los tokens de diseño (por ejemplo, `tokens.color.primary`). |
| `tokens.scss` | Variables SCSS para uso en hojas de estilo.                                    |

### @mission-platform/breakpoints

Utilidades responsivas y componentes de visibilidad.

| Exportar | Tipo | Descripción |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` | Gancho | Devuelve el estado del punto de interrupción reactivo.                        |
| `ShowIf` | Componente | Representa niños solo cuando coincide una condición de punto de interrupción. |
| `HideIf` | Componente | Oculta los elementos secundarios cuando coincide una condición de punto de interrupción.        |

### @mission-platform/components

Componentes de interfaz de usuario compartidos creados una vez y disponibles para múltiples marcos.

- **Importar**: siempre `@mission-platform/components`; la condición activa `mp:<framework>` decide si obtiene el
  Vue 3, React, Solid o compilación de componentes web.
- **Subrutas por componente**: `@mission-platform/components/<path>` (p. ej.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) también reconoce la condición y carga solo el componente de ese componente.
  trozo.
- **Componentes**: `ForgeButton`, `ForgeInput`, `ForgeModal` y más.

## Paquetes de funciones

### @mission-platform/i18n

Sistema de internacionalización basado en i18next.

| Exportar | Descripción |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | Inicializa la instancia i18n con los valores predeterminados de la plataforma.     |
| `useI18n` | Gancho para traducciones y cambio de configuración regional en componentes. |

### @mission-platform/seo

Gestión de metaetiquetas y SEO.

| Exportar | Descripción |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` | Enganche para establecer de forma declarativa el título de la página, las metaetiquetas y los datos de Open Graph. |

### @mission-platform/map

Envoltorio reactivo para MapLibre GL.

| Componente | Descripción |
| :-------------- | :---------------------------------------- |
| `<MpMap>` | Componente contenedor del mapa principal.             |
| `<MpMapMarker>` | Componente para colocar marcadores en el mapa. |

### @mission-platform/code-scanner

Escaneo de códigos de barras y códigos QR basado en cámara.

| Componente | Descripción |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` | Componente que inicializa la transmisión de la cámara y emite resultados de escaneo. |

## Integraciones

### @mission-platform/rxjs

Puentea los observables RxJS al estado del componente.

| Gancho | Descripción |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` | Se suscribe a un observable y devuelve su último valor como estado reactivo. |

### @mission-platform/d3

Integración D3.js neutral en el marco de trabajo.

| Gancho | Descripción |
| :------ | :----------------------------------------------------------------- |
| `useD3` | Vincula una selección D3 a una referencia de componente con gestión del ciclo de vida. |

### @mission-platform/hunspell

Revisión ortográfica basada en WebAssembly.

| Exportar | Descripción |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Carga y crea una instancia del módulo Hunspell WebAssembly. |
| `spell` | Comprueba si una palabra está escrita correctamente.                  |
| `suggest` | Proporciona sugerencias de ortografía para una palabra.               |

## Monitoreo de servicio

### API de supervisión de servicios

La aplicación de monitoreo de servicios proporciona puntos finales públicos y autenticados para monitorear el estado del servicio.

#### Puntos finales públicos

Los puntos finales públicos exponen solo información de estado mínima y no requieren autenticación:

- **`GET /api/services`**: Devuelve el estado acumulado para cada servicio monitoreado. La respuesta incluye solo `{ id, name, type }` para cada servicio, más `now` y `intervalSeconds`. No se expone ninguna configuración de destino, URL, hosts, consultas, encabezados, umbrales o topología.
- **`GET /api/metrics?service=<id>&since=<ms>`**: devuelve métricas de series temporales sin procesar para un servicio. El parámetro `since` está limitado por la ventana de retención configurada. La respuesta incluye solo `service`, `now`, `since` y `samples`.

#### Puntos finales autenticados

Los puntos finales autenticados requieren el token de portador `MONITOR_API_TOKEN` y exponen la configuración completa del monitor:

- **`POST /api/check`**: Activa un ciclo de sonda inmediato.
- **`GET /api/monitors`**: Lista todos los monitores con configuración completa.
- **`POST /api/monitors`**: Crea un nuevo monitor.
- **`PATCH /api/monitors/<id>`**: Actualizar un monitor existente.
- **`DELETE /api/monitors/<id>`**: Eliminar un monitor y borrar sus contadores históricos.

#### Política de sonda y destino

Service-monitor impone límites estrictos al comportamiento de la sonda:

- **Esquemas permitidos**: las sondas URL tienen por defecto `https://` (y el puerto 443), a menos que esté habilitado el modo privado confiable; `http://` está permitido en modo confiable.
- **Puertos permitidos**: las sondas de URL permiten el puerto 443; Las sondas del host permiten una línea base de puertos [53, 80, 123, 443, 1883, 8883].
- **Destinos prohibidos**: direcciones privadas/de enlace local (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10) a menos que se confíe explícitamente.
- **Límites de solicitud/respuesta**: las solicitudes de sondeo están limitadas a 64 KB; las respuestas están limitadas a 256 KB. Las pruebas de velocidad están limitadas a 25 MB.
- **Política de redireccionamiento**: los redireccionamientos deben permanecer dentro del mismo origen y prefijos de ruta aprobados; Se rechazan las redirecciones de origen cruzado o de ruta no permitida.
- **Retención del historial**: el historial de incidentes, actualizaciones y mantenimiento está limitado por límites de recuento de elementos (máximo 100 elementos por monitor). La retención predeterminada de los datos de métricas es de 24 horas.

#### Representación del lado del servidor (SSR)

La capa SSR del monitor de servicio requiere autenticación antes de serializar la configuración del monitor privado en los accesorios del cliente. Las solicitudes no autenticadas reciben solo el estado público DTO.

### Trabajador remitente de correo electrónico

El trabajador remitente de correo electrónico proporciona un escaparate de desarrollo local para la prestación y entrega de correo electrónico.

#### Modos de implementación

- **Desarrollo local** (predeterminado): envía a MailPit en `localhost:1025`. No se requiere autenticación.
- **Implementación no local**: requiere autorización explícita de portador `EMAIL_DEPLOYMENT_TOKEN`, lista de permitidos `EMAIL_ALLOWED_ORIGINS` y lista de permitidos `EMAIL_ALLOWED_RECIPIENTS`. Se aplica la limitación de velocidad a través de `EMAIL_RATE_LIMITER`.

#### Solicitar validación

Todas las solicitudes por correo electrónico deben:

- Utilice `Content-Type: application/json`.
- Incluya una dirección de correo electrónico de destinatario válida (campo `to`, máximo 254 caracteres).
- Incluya un nombre de destinatario (`recipientName`, entre 1 y 100 caracteres).
- Incluir HTML de correo electrónico completo (`html`, máximo 240 KB).
- Pasar las comprobaciones de compatibilidad HTML a través de `assertCompatibleEmailHtml`.

#### Valores predeterminados cerrados fallidamente

Las implementaciones no locales sin una configuración explícita rechazarán todas las solicitudes. Las implementaciones locales siguen sin restricciones para facilitar el desarrollo.

## Verificación de artefactos de Forge Web Script

### Identidad del contenido del artefacto

Los artefactos de Forge Web Script utilizan una identidad de contenido SHA-256 versionada en el formato `sha256-v1:<hex>`. Este resumen se calcula sobre el binario de artefacto completo y se almacena en el campo `contentHash` del manifiesto de artefacto.

#### Integridad versus autenticidad

Un hash de contenido **detecta cambios de contenido accidentales o no autorizados** en comparación con un valor esperado confiable. **No**:

- Autenticar el productor u origen del artefacto.
- Reemplazar firmas criptográficas o controles de acceso al despliegue.
- Garantizar que el artefacto sea seguro de ejecutar.

#### Flujo de trabajo de verificación

1. **Obtenga el hash esperado** de una fuente confiable (por ejemplo, un manifiesto firmado, un registro de compilación de CI o una configuración segura).
2. **Calcule el hash del artefacto** usando el verificador: `fws_verify_artifact(artifact)` devuelve `contentHash`.
3. **Comparar hashes**: si coinciden, el artefacto no ha sido alterado accidental o maliciosamente desde que se registró el valor esperado.
4. **Verifique el manifiesto**: use `fws_inspect_manifest` para verificar las importaciones, exportaciones, metadatos y el cumplimiento de políticas de capacidad de forma independiente.

#### Versionado

El prefijo `sha256-v1` permite futuras actualizaciones del algoritmo hash sin ambigüedad. Las personas que llaman deben manejar con elegancia tanto los formatos de resumen antiguos (si los hay) como los actuales.

## Lectura adicional

- [Guía de migración de Vue 2 a Vue 3](migration-guides/vue2-to-vue3.md)
- [Descripción general de la configuración del proyecto](configs/index.md)
- [Estructura del espacio de trabajo](workspace-structure.md)

## Índice completo del paquete del espacio de trabajo

El siguiente índice se genera a partir de los manifiestos del paquete y se guarda aquí para que la referencia de la API pública cubra todos los
paquete en `packages/`, incluidas las fachadas WebAssembly escritas.

### Núcleo y interfaz de usuario

| Paquete | Propósito |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge` | Adaptadores y tiempo de ejecución JSX neutrales en el marco de trabajo.                   |
| `@mission-platform/components` | Componentes de interfaz de usuario de escritura única.                                     |
| `@mission-platform/icons` | Componentes de iconos SVG de escritura única.                               |
| `@mission-platform/layouts` | Componentes de aplicación, contenedor y diseño responsivo.     |
| `@mission-platform/forms` | Formularios de esquema y componentes de creación de formularios visuales.              |
| `@mission-platform/forms-core` | Derivación de esquemas, validación y lógica de dominio de creación de formularios. |
| `@mission-platform/tokens` | Propiedades personalizadas de CSS y tokens de diseño SCSS.                 |

### Componibles e integraciones

| Paquete | Propósito |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` | Ayudantes de visibilidad y estado de punto de interrupción receptivos.              |
| `@mission-platform/d3` | Utilidades de margen y componibles del ciclo de vida de selección D3.          |
| `@mission-platform/i18n` | Ayudantes de integración de marco y estado de i18next.                 |
| `@mission-platform/map` | Componentes de mapas MapLibre y elementos componibles.                         |
| `@mission-platform/observers` | Componibles de intersección, mutación y observador de rendimiento.    |
| `@mission-platform/phone-number` | Análisis y formato de números de teléfono de WebAssembly escritos.           |
| `@mission-platform/router` | Contratos de ruta neutrales en el marco y capacidades de compilación.     |
| `@mission-platform/forge-router-web-components` | Destino del enrutador de componentes web y tiempo de ejecución sin marco.         |
| `@mission-platform/rxjs` | RxJS observables y componibles por suscripción.                    |
| `@mission-platform/scheduler` | Lógica de dominio de diseño de calendario, recurrencia y interfaz de usuario del programador.      |
| `@mission-platform/vcard` | Datos y componentes RFC 6350 vCard y RFC 5545 iCalendar.       |
| `@mission-platform/content` | Contenido AST, constructores, Monaco, Markdown y componentes WYSIWYG. |
| `@mission-platform/seo` | Metadatos, Open Graph y elementos componibles de datos estructurados.           |
| `@mission-platform/speech-audio` | Componibles de voz, audio y Web MIDI.                         |
| `@mission-platform/three` | Componibles de ciclo de vida y lienzo de Three.js.                       |

### Paquetes de código y WebAssembly

| Paquete | Propósito |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | Codificación/decodificación de códigos de barras 1D de fachada y componente.   |
| `@mission-platform/code-scanner` | Componente de escaneo de código de imagen y cámara.        |
| `@mission-platform/matrix-code` | Fachada de codificación/decodificación Data Matrix y Azteca.      |
| `@mission-platform/qr-code` | Codificación/decodificación QR de fachada y componente.           |
| `@mission-platform/harper` | Integración de estilo y gramática de Harper para Mónaco. |
| `@mission-platform/hunspell` | Envoltorio de corrección ortográfica de Emscripten Hunspell.      |

### Forjar objetivos del compilador

Estos viven en `forge-plugins/` en lugar de `packages/`. Un complemento **framework** decide en qué tiempo de ejecución es un componente neutral
se reduce a; un destino **CMS** decide en qué plataforma de contenido se proyecta. Los dos ejes se componen, por lo que cualquier CMS
El objetivo puede estar vinculado a cualquier complemento del marco. Consulte la [Canalización del compilador Forge](../../../vite-plugins/forge/docs/locales/es/reference/compiler.md).

| Paquete | Propósito |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | Contrato `FrameworkOutputPlugin`, tipos de IR semánticos y tipos de adaptadores de compilación.     |
| `@mission-platform/forge-plugin-react` | React objetivo de salida.                                                              |
| `@mission-platform/forge-plugin-vue` | Vue Objetivo de 3 salidas.                                                              |
| `@mission-platform/forge-plugin-solid` | Solid destino de salida.                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte Objetivo de 5 salidas.                                                           |
| `@mission-platform/forge-plugin-web-components` | Destino de salida de componentes web.                                                     |
| `@mission-platform/forge-cms-plugin-api` | Contrato `CmsOutputPlugin`, modelo de contenido neutral, controlador CMS y ayudantes de compilación. |
| `@mission-platform/forge-cms-storyblok` | Objetos de componentes de Storyblok, envoltorios de bloques y `components.json`.                |
| `@mission-platform/forge-cms-astro` | Plantillas estáticas `.astro` e islas de marco `client:load`.                    |
| `@mission-platform/forge-cms-ghost` | Parciales de Ghost Manillares y un fragmento del tema `config.custom`.                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid incluye el esquema `_data` y un fragmento `_config.yml`.             |
| `@mission-platform/forge-cms-webflow` | Componentes de código `declareComponent` de Webflow y un fragmento de biblioteca `webflow.json`. |

#### @mission-platform/forge-cms-plugin-api

| Exportar | Tipo | Descripción |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` | Función | Proyecta los accesorios de un componente neutral en el modelo de contenido neutral de plataforma.   |
| `ContentComponent` | Tipo | Ordenó `ContentField`, ranuras y la bandera `interactive`.                     |
| `ContentFieldKind` | Tipo | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin` | Tipo | El contrato de destino: un complemento de marco vinculado más los cuatro emisores.           |
| `defineForgeCmsPlugin` | Función | Valida un destino CMS en el momento de la configuración.                                   |
| `generateCmsArtifacts` | Función | El controlador genérico descubrir → IR → modelo de contenido → emitir → escribir.                |
| `defineTsdownForgeCms` | Función | tsdown config para un destino CMS, emitiendo `dist/cms/<cms>/<framework>/**`.     |
| `defineTsdownForgeCmsAll` | Función | tsdown configs para obtener una lista de destinos de CMS.                                       |
