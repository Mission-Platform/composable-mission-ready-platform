# Sistema de construcción

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Idioma: Español (es)

Este documento explica la arquitectura y la mecánica del sistema de construcción de Mission Platform. Está diseñado para altas
rendimiento, compilaciones incrementales y distribución de paquetes multi-framework.

## Arquitectura central

Mission Platform utiliza un sistema de compilación por niveles que separa la orquestación de tareas de la compilación del espacio de trabajo individual.

### 1. Orquestación de tareas (Turborepo)

**Turborepo** es el orquestador de primer nivel. Gestiona el gráfico de dependencia entre espacios de trabajo y proporciona almacenamiento en caché para
todas las tareas.

- **Pipeline definido en `turbo.json`**: Tareas como `build`, `test` y `lint` se definen con sus dependencias.
  (por ejemplo, `build` depende de `^build`, lo que significa que todas las dependencias deben crearse primero).
- **Hashing**: Turborepo procesa archivos fuente, variables de entorno y dependencias globales para determinar si una tarea
  La salida se puede reutilizar desde el caché.
- **Paralelismo**: las tareas independientes se ejecutan simultáneamente para maximizar la utilización de la CPU.

### 2. Compilación de paquetes (tsdown)

La mayoría de los paquetes de biblioteca en `packages/` usan **tsdown** para la compilación.

- **Velocidad**: Construido sobre **Rolldown** (el sucesor de Rollup basado en Rust), proporcionando compilaciones casi instantáneas.
- **Desagregación**: Los paquetes se construyen con `unbundle: true`, preservando la estructura del módulo original en `dist/`. esto
  Garantiza una agitación de árboles óptima y una mejor depuración en aplicaciones de consumo.
- **CSS Threading**: un complemento personalizado vuelve a vincular las hojas de estilo extraídas con sus propios módulos JS, lo que garantiza que
  Al importar un componente se incorporan automáticamente sus estilos.

### 3. Paquete de aplicaciones (Vite)

Las aplicaciones implementables en `apps/` utilizan **Vite** para el desarrollo y la agrupación de producción.

- **Configuraciones compartidas**: las aplicaciones amplían `@mission-platform/vite-config` para garantizar canalizaciones PostCSS consistentes y
  resolución independiente del marco.
- **Soporte SSR/SSG**: aplicaciones como `my-care-notes` usan `vite-ssg` para la generación de sitios estáticos.

### Construcciones de paquetes Forge

Las compilaciones de paquetes Forge agregan una interfaz de compilador neutral al flujo normal `tsdown` o Vite. Un paquete consumidor importa
los complementos del marco que desea y pasa instancias explícitas a `tsdownForgeComponentPlugins` o
`tsdownForgeHookPlugins` dentro de una llamada `defineTsdownLibrary`. El controlador neutral crea IR semántico una vez, luego el complemento seleccionado posee la reducción del objetivo,
generación de código fuente, declaraciones, elementos externos de tiempo de ejecución y su adaptador nativo Vite/tsdown.

La salida de la plataforma de contenido es un segundo eje ortogonal configurado a través de `@mission-platform/forge-cms-plugin-api`. un
El consumidor pasa `tsdownForgeCmsPlugins` una lista de instancias `CmsOutputPlugin`, cada una de
que _compone_ un complemento de marco: `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, y así sucesivamente para Ghost, Jekyll y Webflow. Porque la plataforma y el
El marco se elige de forma independiente, `storyblok × vue` y `astro × solid` son configuración en lugar de código nuevo.

Las compilaciones de CMS se emiten en `dist/cms/<cms>/<framework>/**`, con manifiestos y otros complementos de plataforma reflejados en
`dist/cms/<cms>/`. Los objetivos que necesitan un tiempo de ejecución hidratado (Astro, Webflow) cogeneran un árbol de isla a partir del límite.
complemento de framework en la misma compilación. La división completa de responsabilidades y los límites de las etapas se describen en
[Canalización del compilador Forge](../../../packages/tooling/vite/forge/docs/locales/es/reference/compiler.md).

## contrato de construcción

`pnpm build` es la compilación agregada canónica. Delega la tarea `build` a nivel de paquete de Turbo sin establecer un
selector de marco, por lo que cada paquete de Forge emite su salida neutral y cada objetivo de marco configurado por ese
paquete. Los paquetes con proyecciones CMS emiten esas proyecciones y sus sidecars compartidos en la misma construcción por etapas.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Los paquetes Forge también conservan alias de compatibilidad reducida para reconstruir un objetivo:

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

Los alias utilizan el mismo corredor escrito que `build`; no contienen implementaciones `tsdown` independientes. `build:forge`
selecciona el objetivo neutral, mientras que los alias del marco seleccionan el directorio del marco correspondiente. Específico del paquete
Los comandos en modo artefacto de CMS permanecen disponibles cuando están expuestos, incluido el comando de activos compartidos de Storyblok y el
Comandos contenedores Storyblok por marco.

### Puesta en escena y promoción

Cada invocación de Forge escribe en una etapa local de paquete única en `node_modules/.cache/forge-build/`. El escenario es
ignorado por las entradas de Turbo y nunca se publica. Se comprueba el resultado de una compilación exitosa antes de la promoción:

- **Modo agregado** reemplaza atómicamente el árbol `dist` completo propiedad de Forge. Archivos neutrales, de marco y CMS obsoletos
  por tanto, se eliminan en lugar de satisfacer las exportaciones accidentalmente.
- **Modo objetivo** reemplaza atómicamente solo el subárbol del marco seleccionado (y su subárbol contenedor CMS coincidente),
  preservando la salida neutral, marco, correo electrónico y CMS no relacionados que ya están en `dist`. El corredor analiza el selector de CMS
  (por ejemplo, `FORGE_CMS_STORYBLOK_TARGET`) al marco solicitado junto con `FORGE_FRAMEWORK_TARGET`, por lo que el CMS de un paquete
  cableado (`forgeStoryblokCmsTargets`, etc.) en realidad reconstruye el contenedor coincidente en la misma etapa en lugar de ser
  silenciosamente abandonado de la promoción. La promoción solo borra un subárbol contenedor de CMS que la etapa regeneró; nunca
  elimina un contenedor CMS hermano que la compilación actual no reconstruyó.
- Los activos compartidos de CMS, como los esquemas Storyblok y `components.json`, tienen un destino compartido y no se eliminan mediante un
  posterior promoción marco.
- Una falla del compilador, una etapa vacía o una falla de promoción deja intacto el árbol publicado anteriormente y elimina el
  Directorio temporal de escenarios y promociones.

El resultado publicado permanece bajo el contrato `dist` existente: módulos neutrales y declaraciones, directorios marco
(`vue`, `react`, `svelte`, `solid`, `web-components`) y proyecciones de CMS bajo `cms/<cms>/<framework>`. Exportación de paquetes
Los mapas, incluidas las condiciones `mp:*` y las subrutas de CMS, continúan resolviendo estas rutas promocionadas.

### Tareas de paquete

| Tarea | Descripción |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` | Agregue salida neutral, marco, declaración, correo electrónico y CMS configurado a través del ejecutor compartido de Forge. |
| `build:forge` | Alias ​​de compatibilidad de salida de Forge neutral dirigido.                                                           |
| `build:react`, `build:vue`, `build:svelte` | Alias ​​de compatibilidad de marcos de destino.                                                                    |
| `build:solid`, `build:web-components` | Alias ​​de compatibilidad de marcos de destino.                                                                    |
| `build:check` | Valida tipos para un espacio de trabajo sin publicar resultados.                                                   |
| `build:watch` | Inicia una compilación incremental en modo de vigilancia para un espacio de trabajo.                                                   |

Turbo aplica un hash a los selectores de destino (`FORGE_BUILD_TARGET` y los selectores heredados de Forge/CMS) junto con el compartido
corredor y fuentes de puesta en escena. En consecuencia, las compilaciones agregadas y específicas no pueden reutilizar el resultado almacenado en caché de otra. finales
La salida `dist/**` está almacenada en caché; Los directorios temporales de puesta en escena y promoción están explícitamente excluidos.

### Etapas de creación de aplicaciones

Las aplicaciones que tienen etapas de compilación con significado independiente exponen esas etapas como tareas Turbo en lugar de encadenarlas.
ellos dentro de `build`:

- `@mission-platform/docs` ejecuta `build:check`, `build:bundle`, `build:prerender` y `build:verify` en orden.
- `@mission-platform/figma-forge-plugin` ejecuta `build:check`, `build:ui` y `build:main` a través de su tarea agregada `build`.
- `@mission-platform/icons` ejecuta `build:check`, `build:generate` y `build:sprite` a través de su tarea agregada `build`.

Los scripts agregados solo verifican que exista el resultado propiedad de la tarea; Turbo posee programación, ordenación de dependencias y
restauración de caché. Esto mantiene las etapas individuales observables y evita invocaciones Turbo anidadas o compilaciones a nivel de shell.
orquestación.

### Estrategia de almacenamiento en caché

Turborepo almacena en caché los siguientes artefactos:

- `dist/**`: artefactos JS/CSS creados.
- `.vite/**`: caché interna de Vite.
- `coverage/**`: Informes de cobertura de pruebas.

Para omitir el caché y forzar una compilación nueva, use el indicador `--force`:

```bash
pnpm build:force
```

Las tareas de solo declaración también se pueden almacenar en caché: `build:types` registra `dist/**/*.d.ts` y mapas de declaración como salidas, por lo que
Las compilaciones de tipos específicos restauran los archivos requeridos por los paquetes posteriores.

Los alias de compatibilidad y las tareas en modo artefacto de CMS son tareas de paquete, por lo que Turbo aún aplica su gráfico de dependencia y
entradas de caché específicas del objetivo. Las etapas temporales no son salidas de caché; sólo se publica el árbol `dist` promocionado o
restaurado desde el caché.

## Configuraciones compartidas

Las configuraciones de compilación están centralizadas en el directorio `packages/tooling/configs/` para mantener la coherencia en todo el monorepo.

| Paquete | Propósito |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` | Lógica Vite compartida para aplicaciones y compilaciones específicas de Vue.          |
| `@mission-platform/tsdown-config` | Lógica tsdown compartida para paquetes de biblioteca.                    |
| `@mission-platform/typescript-config` | Ajustes preestablecidos básicos de `tsconfig.json` para aplicaciones, bibliotecas y pruebas. |
| `@mission-platform/postcss-config` | Procesamiento CSS estandarizado (Autoprefixer, etc.).            |

## TypeScript 7 cadena de herramientas

El catálogo del espacio de trabajo fija el compilador en TypeScript `7.0.2` estable. Las comprobaciones del espacio de trabajo y las compilaciones de declaraciones utilizan el
ejecutable nativo `tsc`, mientras que las integraciones del editor utilizan el servidor de idioma nativo TypeScript:

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

Los ajustes preestablecidos compartidos en `@mission-platform/typescript-config` siguen siendo la fuente de verdad para el objetivo, la resolución del módulo,
tipos de ambiente, rigor, referencias de proyectos y resultados de declaraciones. Las herramientas Forge y CMS no utilizan lo eliminado
API del compilador TypeScript; en su lugar, consume los contratos OXC/analizador neutral propiedad del repositorio. Esta frontera también potencia
el escáner de documentación del paquete y mantiene la salida generada de Forge independientemente de los componentes internos de la API del compilador.

Los archivos de declaración y JavaScript compilados se emiten únicamente en el directorio `dist` del paquete propietario. Forge generado
el árbol de fuentes del marco es una entrada de compilación temporal y se elimina una vez que se completa el paquete; no debe salir de `*.js` o
Archivos `*.d.ts` en `src` o directorios de caché a nivel de paquete.

Las declaraciones del paquete de destino Vue se sintetizan mediante el complemento de declaración `tsdown` de Forge. Esta ruta emite el paquete.
declaraciones sin invocar `vue-tsc`; no proporciona verificación de tipos para plantillas SFC de aplicaciones arbitrarias.
Las comprobaciones de aplicaciones SFC siguen siendo una puerta de aceptación explícita y actualmente requieren una versión ascendente compatible con TypeScript 7.
Lanzamiento `vue-tsc`. El `vue-tsc@3.3.11` disponible falla contra TypeScript `7.0.2` con
`ERR_PACKAGE_PATH_NOT_EXPORTED` para `typescript/lib/tsc`, mientras que `tsc` nativo no verifica intencionalmente `.vue`
archivos. No agregue un alias de compatibilidad TypeScript 6 para evitar este límite.

La configuración compartida ESLint utiliza `@babel/eslint-parser` para la sintaxis TypeScript, TSX y Vue y una pequeña
complemento de compatibilidad propiedad del repositorio para el `@typescript-eslint/no-explicit-any` retenido y
`@typescript-eslint/consistent-type-imports` ID de regla. Esto es intencionalmente sólo de sintaxis: el actual
La versión `typescript-eslint` rechaza TypeScript 7, por lo que las reglas de pelusa con reconocimiento de tipo se reemplazan por el TypeScript compartido
`noUnusedLocals` y `noUnusedParameters` comprueban hasta que esté disponible una versión ascendente compatible.

## Desarrollo local versus producción

### Desarrollo (tarea `dev`)

El servidor de desarrollo de Vite proporciona reemplazo de módulo en caliente (HMR). Cuando se inicia la tarea `dev` de una aplicación, Turborepo también se ejecuta
la tarea `build:watch` de la biblioteca de componentes junto con ella (a través de la clave `with` de la tarea), por lo que las ediciones a
`@mission-platform/components` se vuelven a compilar automáticamente y la aplicación en ejecución los recoge sin una reconstrucción manual.

### Producción (tarea `build`)

Turborepo ejecuta compilaciones en orden topológico. Un paquete sólo se construye después de que se hayan establecido todas sus dependencias internas.
construido con éxito. El resultado de `dist/` es lo que finalmente se publica o implementa.

## Avanzado: Integración WASM

Ciertos paquetes (por ejemplo, `@mission-platform/hunspell`, lectores de códigos de barras) involucran código Rust compilado en WebAssembly. Estos
Las compilaciones se organizan a través de tareas especializadas que utilizan `wasm-pack` para garantizar la coherencia del entorno y una óptima
rendimiento.
