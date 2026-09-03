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

- **Tubería definida en `turbo.json`**: Tareas como `build`, `test`, y `lint` están definidos con sus dependencias
  (por ejemplo, `build` depende de `^build`, lo que significa que todas las dependencias deben crearse primero).
- **Hashing**: Turborepo procesa archivos fuente, variables de entorno y dependencias globales para determinar si una tarea
  La salida se puede reutilizar desde el caché.
- **Paralelismo**: las tareas independientes se ejecutan simultáneamente para maximizar la utilización de la CPU.

### 2. Compilación de paquetes (tsdown)

La mayoría de los paquetes de biblioteca en `packages/` utilice **tsdown** para la compilación.

- **Velocidad**: Construido sobre **Rolldown** (el sucesor de Rollup basado en Rust), proporcionando compilaciones casi instantáneas.
- **Desagregación**: los paquetes se crean con `unbundle: true`, preservando la estructura original del módulo en `dist/`. esto
  Garantiza una agitación de árboles óptima y una mejor depuración en aplicaciones de consumo.
- **CSS Threading**: un complemento personalizado vuelve a vincular las hojas de estilo extraídas con sus propios módulos JS, lo que garantiza que
  Al importar un componente se incorporan automáticamente sus estilos.

### 3. Paquete de aplicaciones (Vite)

Aplicaciones desplegables en `apps/` usar **Vite** para desarrollo y agrupación de producción.

- **Configuraciones compartidas**: las aplicaciones se extienden `@mission-platform/vite-config` para garantizar canalizaciones PostCSS consistentes y
  resolución independiente del marco.
- **Soporte SSR/SSG**: Aplicaciones como `my-care-notes` usar `vite-ssg` para la generación de sitios estáticos.

### Construcciones de paquetes Forge

Las compilaciones de paquetes Forge agregan una interfaz de compilador neutral a la normal `tsdown` o Vite fluir. Un paquete consumidor importa
los complementos del marco que desea y pasa instancias explícitas a `defineTsdownForgeComponents` o
`defineTsdownForgeHooks`. El controlador neutral crea IR semántico una vez, luego el complemento seleccionado posee la reducción del objetivo,
generación de fuentes, declaraciones, elementos externos en tiempo de ejecución y su versión nativa ViteAdaptador /tsdown.

La salida de la plataforma de contenido es un segundo eje ortogonal configurado a través de `@mission-platform/forge-cms-plugin-api`. un
pases de consumo `defineTsdownForgeCms` (o `defineTsdownForgeCmsAll`) una lista de `CmsOutputPlugin` casos, cada uno de
que _compone_ un complemento de marco - `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, y así sucesivamente para Ghost, Jekyll y Webflow. Porque la plataforma y el
el marco se elige de forma independiente, `storyblok × vue` y `astro × solid` son configuración en lugar de código nuevo.

Las compilaciones de CMS emiten a `dist/cms/<cms>/<framework>/**`, con manifiestos y otros sidecares de plataforma reflejados en
`dist/cms/<cms>/`. Los objetivos que necesitan un tiempo de ejecución hidratado (Astro, Webflow) cogeneran un árbol de isla a partir del límite.
complemento de framework en la misma compilación. La división completa de responsabilidades y los límites de las etapas se describen en
[Canalización del compilador Forge](../../../packages/tooling/vite/forge/docs/locales/es/reference/compiler.md).

## contrato de construcción

`pnpm build` es la construcción agregada canónica. Delega a Turbonivel de paquete `build` tarea sin establecer un
selector de marco, por lo que cada paquete de Forge emite su salida neutral y cada objetivo de marco configurado por ese
paquete. Los paquetes con proyecciones CMS emiten esas proyecciones y sus sidecars compartidos en la misma construcción por etapas.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Los paquetes Forge también conservan alias de compatibilidad reducidos para reconstruir un objetivo:

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

Los alias utilizan el mismo corredor escrito que `build`; no contienen independientes `tsdown` implementaciones. `build:forge`
selecciona el objetivo neutral, mientras que los alias del marco seleccionan el directorio del marco correspondiente. Específico del paquete
Los comandos en modo artefacto de CMS permanecen disponibles cuando están expuestos, incluido el comando de activos compartidos de Storyblok y el
Comandos contenedores Storyblok por marco.

### Puesta en escena y promoción

Cada invocación de Forge escribe en una etapa local de paquete única en `node_modules/.cache/forge-build/`. El escenario es
ignorado por Turboentradas y nunca se publica. Se comprueba el resultado de una compilación exitosa antes de la promoción:

- **Modo agregado** reemplaza atómicamente el modo completo propiedad de Forge `dist` árbol. Archivos neutrales, de marco y CMS obsoletos
  por tanto, se eliminan en lugar de satisfacer las exportaciones accidentalmente.
- **Modo objetivo** reemplaza atómicamente solo el subárbol del marco seleccionado (y su subárbol contenedor CMS coincidente),
  Preservar la salida neutral, de marco, de correo electrónico y de CMS no relacionada que ya está en `dist`. El corredor analiza el selector de CMS
  (por ej. `FORGE_CMS_STORYBLOK_TARGET`) al marco solicitado junto con `FORGE_FRAMEWORK_TARGET`, entonces el CMS de un paquete
  cableado (`forgeStoryblokCmsTargets`, etc.) en realidad reconstruye el contenedor coincidente en la misma etapa en lugar de ser
  silenciosamente abandonado de la promoción. La promoción solo borra un subárbol contenedor de CMS que la etapa regeneró; nunca
  elimina un contenedor CMS hermano que la compilación actual no reconstruyó.
- Activos compartidos de CMS, como esquemas Storyblok y `components.json` tienen un destino compartido y no son eliminados por un
  posterior promoción marco.
- Una falla del compilador, una etapa vacía o una falla de promoción deja intacto el árbol publicado anteriormente y elimina el
  Directorio temporal de escenarios y promociones.

El resultado publicado permanece bajo el formato existente. `dist` contrato: módulos y declaraciones neutrales, directorios marco
(`vue`, `react`, `svelte`, `solid`, `web-components`), y proyecciones de CMS bajo `cms/<cms>/<framework>`. Exportación de paquetes
mapas, incluyendo `mp:*` condiciones y subrutas de CMS, continúan resolviendo contra estas rutas promocionadas.

### Tareas de paquete

| Tarea | Descripción |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       | Agregue salida neutral, marco, declaración, correo electrónico y CMS configurado a través del ejecutor compartido de Forge. |
| `build:forge` | Alias ​​de compatibilidad de salida de Forge neutral dirigido.                                                      |
| `build:react`, `build:vue`, `build:svelte` | Alias ​​de compatibilidad de marcos de destino.                                      |
| `build:solid`, `build:web-components` | Alias ​​de compatibilidad de marcos de destino.                                         |
| `build:check` | Valida tipos para un espacio de trabajo sin publicar resultados.                                               |
| `build:watch` | Inicia una compilación incremental en modo de vigilancia para un espacio de trabajo.                                               |

Turbo aplica un hash a los selectores de destino (`FORGE_BUILD_TARGET` y los selectores heredados de Forge/CMS) junto con el compartido
corredor y fuentes de puesta en escena. En consecuencia, las compilaciones agregadas y específicas no pueden reutilizar el resultado almacenado en caché de otra. Final
`dist/**` la salida se almacena en caché; Los directorios temporales de puesta en escena y promoción están explícitamente excluidos.

### Estrategia de almacenamiento en caché

Turborepo almacena en caché los siguientes artefactos:

- `dist/**`: Construyó artefactos JS/CSS.
- `.vite/**`: Vitecaché interno.
- `coverage/**`: Informes de cobertura de prueba.

Para omitir el caché y forzar una compilación nueva, use el `--force` bandera:

```bash
pnpm build:force
```

Los alias de compatibilidad y las tareas en modo artefacto de CMS son tareas de paquete, por lo que Turbo todavía aplica su gráfico de dependencia y
entradas de caché específicas del objetivo. Las etapas temporales no son salidas de caché; solo los promocionados `dist` árbol es publicado o
restaurado desde el caché.

## Configuraciones compartidas

Las configuraciones de compilación están centralizadas en el `packages/tooling/configs/` directorio para mantener la coherencia en todo el monorepo.

| Paquete | Propósito |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       | Compartido Vite lógica para aplicaciones y Vue-construcciones específicas.          |
| `@mission-platform/tsdown-config`     | Lógica tsdown compartida para paquetes de biblioteca.                    |
| `@mission-platform/typescript-config` | Base `tsconfig.json` ajustes preestablecidos para aplicaciones, bibliotecas y pruebas. |
| `@mission-platform/postcss-config`    | Procesamiento CSS estandarizado (Autoprefixer, etc.).            |

## Desarrollo local versus producción

### Desarrollo (`dev` tarea)

ViteEl servidor de desarrollo proporciona reemplazo de módulo en caliente (HMR). Cuando una aplicación `dev` La tarea comienza, Turborepo también se ejecuta.
la biblioteca de componentes `build:watch` tarea junto con ella (a través de la tarea) `with` clave), por lo que se edita
`@mission-platform/components` se recompilan automáticamente y la aplicación en ejecución los recoge sin una reconstrucción manual.

### Producción (`build` tarea)

Turborepo ejecuta compilaciones en orden topológico. Un paquete sólo se construye después de que se hayan establecido todas sus dependencias internas.
construido con éxito. La salida en `dist/` es lo que finalmente se publica o implementa.

## Avanzado: Integración WASM

Ciertos paquetes (por ejemplo, `@mission-platform/hunspell`, escáneres de códigos de barras) implican código Rust compilado en WebAssembly. Estos
Las compilaciones se organizan a través de tareas especializadas que utilizan `wasm-pack` para garantizar la coherencia del entorno y la óptima
rendimiento.
