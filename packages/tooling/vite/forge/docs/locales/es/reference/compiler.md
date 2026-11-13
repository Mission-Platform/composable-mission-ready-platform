# Canalización del compilador Forge

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/vite/forge/docs/reference/compiler.md: [packages/tooling/vite/forge/docs/reference/compiler.md](../../../reference/compiler.md)
> Idioma: Español (es)

Esta es una explicación de la arquitectura para los mantenedores de Mission Platform que necesitan comprender cómo funciona un framework neutral.
El módulo Forge se convierte en un paquete de marco nativo. El límite importante no es “una fuente emisora por marco” dentro
el complemento Vite. Forge tiene un controlador de compilación neutral, un contrato de complemento de destino explícito y un marco nativo propio.
construir adaptadores.

## La responsabilidad dividida

La compilación de Forge cruza varios paquetes, cada uno con una responsabilidad deliberadamente limitada:

| Capa | Posee | No posee |
| :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `@mission-platform/vite-plugin-forge` | Análisis, normalización, análisis neutral, IR semántica, optimización compartida, caché/descubrimiento, despacho y orquestación genérica Vite/tsdown | React, Vue, Solid, Svelte, componentes web o emisores de origen CMS |
| `@mission-platform/forge-plugin-api` | `FrameworkOutputPlugin`, contratos de destino semánticos, tipos de módulos generados, metadatos de destino y tipos de adaptador Vite/tsdown | Un registro de implementación del marco o de selección de objetivos |
| Paquetes `@mission-platform/forge-plugin-*` integrados | Reducción de objetivos, optimización de objetivos, generación de fuentes, diagnóstico de objetivos, metadatos de tiempo de ejecución y adaptadores de compilación nativos | Análisis neutral y orquestación entre objetivos |
| `@mission-platform/forge-cms-plugin-api` | `CmsOutputPlugin`, el modelo de contenido neutral, el controlador descubrir→analizar→emitir→escribir, cogeneración de isla y los ayudantes de compilación de CMS | Cualquier esquema, plantilla o forma de manifiesto específico de la plataforma |
| `@mission-platform/forge-cms-*` paquetes | Una plataforma de contenido para cada una: su mapeo de campos, dialecto de plantilla, forma de manifiesto y diagnóstico de plataforma | Clasificación de utilería neutral u orquestación entre objetivos |
| Paquete de archivos `tsdown.config.ts` | Seleccionar las instancias del complemento de destino y las anulaciones específicas del paquete | Reimplementación de etapas del compilador o tablas de cambio de marco |

La dirección de la dependencia es explícita: un paquete importa el complemento de destino que desea, pasa esa instancia al neutral
controlador y recibe una configuración de compilación específica del objetivo. El controlador nunca construye un objetivo a partir de una cadena ni importa
cada paquete de marco en caso de que sea necesario.

## El estricto oleoducto

El flujo canónico es una única interfaz neutral seguida de etapas propiedad del objetivo y una compilación nativa. Cada objetivo recibe
los mismos hechos semánticos; no necesita reconstruir el módulo neutral a partir de un archivo fuente generado.

```mermaid
flowchart LR
  Authoring["Neutral Forge .tsx"] --> Parse["Parse and normalize"]
  Parse --> Neutral["Neutral optimize"]
  Neutral --> IR["Semantic IR"]
  IR --> Lower["Target lower"]
  Lower --> TargetOptimize["Target optimize"]
  TargetOptimize --> Generate["Generate native source"]
  Generate --> Native["Native Vite or tsdown build"]
  Native --> Artifacts["Native modules and declarations"]
```

### Analizar y normalizar

El controlador lee TypeScript/JSX neutral y crea la representación AST genérica utilizada por el compilador. Normalización
resuelve convenciones de creación neutrales en hechos estables: importaciones, directivas, límites de componentes y enlaces, nodos JSX,
ranuras, marcadores estáticos y otras construcciones que se necesitan en etapas posteriores. Los diagnósticos se recopilan con ubicaciones de origen.
en lugar de estar oculto en un emisor objetivo.

### Optimización neutral e IR semántica

Los pases neutrales operan antes de que intervenga un marco. Pueden descubrir componentes y ayudas, reescribir importaciones, eliminar
directivas del compilador, inferir claves estables, podar ramas muertas neutrales y análisis reutilizables en caché. El resultado es un
`SemanticModule`: una representación explícita del componente del módulo o comportamiento componible y sus hechos neutrales.

El IR semántico es el contrato entre el compilador genérico y un complemento de destino. La interfaz analiza la fuente neutral.
usar Oxc en estructuras AST genéricas y expresiones/intervalos respaldados por código fuente sin producir ni transformar TypeScript
Nodos AST. Los reductores y emisores de destino consumen registros, diagnósticos y ediciones de origen `SemanticModule` sin contacto directo.
Acoplamiento a nodos AST del analizador, manteniendo la caché serializable y garantizando que la fuente se analice solo una vez.

### Reducción y optimización de objetivos.

El autor de la llamada proporciona una instancia `FrameworkOutputPlugin`. El controlador llama a su función `lower` con el módulo semántico
y un `TargetContext`, que produce `TargetIntentions` con un plan `lowered` requerido. Bajar mapas de conceptos neutrales a
conceptos de destino: por ejemplo, los ganchos y ranuras neutrales se convierten en el estado/ciclo de vida y la representación de ranura del objetivo, mientras que
Los elementos neutrales se convierten en el modelo de elemento o componente del objetivo.

La función `optimize` del complemento luego realiza una simplificación específica del objetivo en el plan reducido. Recibe lo compartido
opciones neutrales junto con un punto de extensión para opciones objetivo. Esto mantiene las reglas del marco fuera del optimizador neutral.
al mismo tiempo que permite que un objetivo optimice su propia representación generada antes de la generación de la fuente.

El compilador requiere estrictamente la reducción antes de la generación: `service.ts` y la canalización del compilador afirman que
`intentions.lowered` existe y que su discriminador de marco coincide con el ID de destino a través de
`assertTargetIntentionsLowered`. Se rechaza la generación directa sin descenso; Los complementos de destino ya no bajan silenciosamente
bajo demanda.

### Generación de fuentes y compilación nativa.

La función `generate` del complemento recibe el `TargetIntentions` reducido y optimizado y devuelve un `GeneratedModule`.
Puede incluir la fuente primaria, módulos auxiliares y diagnósticos de destino. La fuente generada es deliberadamente una
artefacto intermedio propiedad del paquete de destino: React, Vue, Solid, Svelte y los componentes web pueden elegir cada uno
forma de origen que espera su cadena de herramientas nativa.

La etapa final no es otro emisor de Forge. El adaptador `build.vite` o `build.tsdown` del complemento proporciona el nativo
complementos de framework y configuraciones de compilación para el árbol generado. Vite nativo/compilación rolldown, generación de declaraciones,
la externalización y el empaquetado de resultados se realizan utilizando la cadena de herramientas normal de ese objetivo.

### Diagnóstico y almacenamiento en caché

Los diagnósticos incluyen la fase del compilador, el destino, el intervalo de origen y un motivo procesable. Un objetivo debe informar un no compatible
node semántico en lugar de emitir silenciosamente un cierre de tiempo de ejecución genérico o una fuente nativa no válida. Módulos semánticos neutros
se almacenan en caché por contenido fuente, tipo de módulo y opciones que afectan la semántica; las etapas de destino reciben el mismo contenido en caché
módulo para cada marco seleccionado manteniendo la reducción y optimización de objetivos independientes.

## Ciclo de vida del servicio y compilaciones incrementales

Vite y los ayudantes tsdown utilizan un `ForgeCompilerService` en proceso durante la vida útil de una sesión de compilación. El servicio es propietario
la instantánea de origen, el gráfico, la interfaz analizada, la optimización neutral, la IR semántica y las cachés de artefactos de destino. es seguro
servir a varios objetivos explícitos en secuencia o simultáneamente; Los artefactos de destino están codificados por ID de destino y nunca comparten un
directorio generado. Los ayudantes de una sola vez eliminan el servicio después de la compilación, mientras que los ayudantes de vigilancia lo retienen hasta el Vite.
El servidor se cierra.

Una clave de caché efectiva incluye la huella digital de origen, el tipo de módulo, las opciones del compilador y del enrutador, source-root/config
huellas dactilares, ID de objetivo y huella digital del complemento, y condiciones relevantes. Un archivo modificado invalida su gráfico inverso
dependientes, incluidos componentes transitivos y entradas de gancho, en lugar de borrar objetivos no relacionados. `tsconfig.json`
`baseUrl` y `paths` se incluyen en la preparación del gráfico, por lo que los alias se resuelven de forma coherente en las compilaciones Vite y tsdown.
Llame a `invalidate(changedFiles)` desde integraciones de reloj personalizadas y llame a `dispose()` cuando ya no sea necesario un servicio.

El informe de servicio expone tiempos de fase, aciertos/errores de caché, archivos invalidados, advertencias, errores y artefactos emitidos.
cuenta. Los archivos faltantes, las extensiones no compatibles, los alias no resueltos, las exportaciones con formato incorrecto y los errores de configuración de destino son
Diagnóstico estructurado. Las advertencias llegan al reportero de compilación; Los errores impiden la generación y promoción.

Cada instantánea de destino tiene un manifiesto de artefacto que enumera los módulos generados, módulos adicionales, declaraciones, mapas de origen, activos,
entradas y sumas de verificación. La promoción nativa valida que el manifiesto esté completo y tenga alcance objetivo antes de reemplazar el
última salida exitosa. Una compilación fallida, cancelada o con tiempo de espera agotado elimina solo su etapa y conserva los objetivos hermanos y
el árbol `dist` anterior.

La primera implementación está deliberadamente en proceso porque los complementos de destino contienen funciones nativas y propiedad de la persona que llama.
adaptadores. Más adelante se puede introducir un trabajador o un transporte/demonio entre procesos detrás del mismo contrato de servicio; no es un
registro de framework y no es necesario para el flujo de trabajo actual Vite/tsdown.

## Propiedad explícita del objetivo

Los contratos centrales viven en `packages/compiler/plugins/forge-plugin-api/src/framework.ts`:

- `FrameworkOutputPlugin` identifica un objetivo a través de `id: FrameworkId` y posee `lower`, `optimize`, `generate` y `build`.
- `FrameworkId` (`JsxFramework | (string & {})`) proporciona un alias de identificador de marco abierto para complementos de destino, lo que permite
  cualquier objetivo personalizado para definir una ID de cadena única y al mismo tiempo mantener el autocompletado IDE para objetivos integrados conocidos.
- `JsxFramework` representa la unión cerrada de frameworks integrados (`react`, `vue`, `solid`, `svelte`, `web-components`),
  se utiliza cuando las comodidades y directivas integradas (`use react`, `use vue`, etc.) están explícitamente previstas.
- `TargetContext` incluye un contexto de compilación genérico, como el tipo de módulo, el nombre del componente y las carpetas de los componentes descubiertos.
- `TargetLoweredModule` representa el plan rebajado propiedad del objetivo, discriminado en `framework: FrameworkId`.
- `TargetIntentions<TLowered>` envuelve el módulo semántico con un plan `lowered: TLowered` requerido, conservando el diagnóstico.
- `GeneratedModule` describe la fuente generada, su lenguaje de salida, módulos auxiliares y diagnósticos.
- `ForgeBuildAdapters` proporciona adaptadores Vite y tsdown de tipo independiente.
- `FrameworkSourceMetadata`, los elementos externos del tiempo de ejecución y los metadatos del nombre para mostrar permiten que la orquestación genérica derive detalles de salida
  sin una declaración de cambio de destino.

Los objetivos integrados se construyen mediante sus propios paquetes, por ejemplo `forgeReactFramework()`, `forgeVueFramework()`,
`forgeSolidFramework()`, `forgeSvelteFramework()` y `forgeWebComponentsFramework()`. Un paquete selecciona sólo el
objetivos que publica:

```ts
import { tsdownForgeComponentPlugins } from '@mission-platform/vite-plugin-forge';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: 'src/index.ts',
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    frameworks: [
      forgeVueFramework(),
      forgeReactFramework(),
      forgeSvelteFramework(),
      forgeSolidFramework(),
      forgeWebComponentsFramework(),
    ],
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    name: 'MissionPlatformComponents',
  }),
});
```

## Aplicaciones de componentes web y `mp:web-component`

El destino de los componentes web emite elementos personalizados registrados y es la compilación de Forge sin marco utilizada por los documentos estáticos.
y otros consumidores DOM. Selecciónelo a través de la condición de exportación compartida en lugar de importar un paquete específico de destino
camino; esto mantiene consistente cada importación de `@mission-platform/*` y evita que Vue u otro tiempo de ejecución de framework
entrando al paquete:

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: { conditions: frameworkResolveConditions('mp:web-component') },
});
```

El preajuste TypeScript correspondiente es `@mission-platform/typescript-config/framework-web-component` con
`customConditions: ['mp:web-component']`. Las aplicaciones del navegador pueden utilizar el historial del navegador nativo; compilaciones estáticas/prerenderizadas
debe proporcionar el historial de memoria y registrar elementos durante el paso de renderizado. Los elementos de enlace y salida del enrutador aceptan
objetivos de ruta complejos como propiedades y son independientes del modelo de creación de componentes del compilador de Forge.

Las instancias son propiedad de la persona que llama. Las instancias nuevas pueden contener opciones y metadatos específicos del objetivo, y una lista de complementos vacía
es un error de configuración en lugar de una solicitud para utilizar un registro predeterminado oculto. Esto hace que agregar un nuevo objetivo sea una
cambio de paquete aditivo: implemente el contrato del complemento de salida, publique sus adaptadores de compilación y selecciónelo en los consumidores.

```mermaid
flowchart LR
  Consumer["Package tsdown.config.ts"] --> Driver["vite-plugin-forge"]
  Consumer --> React["forge-plugin-react"]
  Consumer --> Vue["forge-plugin-vue"]
  Consumer --> Cms["forge-cms-* target"]
  API["forge-plugin-api contracts"] --> Driver
  API --> React
  API --> Vue
  Cms --> CmsApi["forge-cms-plugin-api driver"]
  Driver --> Native["Target-owned native adapters"]
```

Las flechas desde un consumidor hacia el conductor y hacia el paquete objetivo son intencionales. El consumidor es dueño de la selección de objetivos;
el conductor posee orquestación genérica; y cada paquete de destino posee la implementación del marco.

## Construcciones de componentes

Los paquetes de componentes crean módulos neutrales contra `@mission-platform/forge-jsx`, generalmente a través de un barril de componentes neutrales.
`tsdownForgeComponentPlugins` devuelve complementos tsdown nativos para cada objetivo proporcionado. Los consumidores agregan esos complementos a uno
`defineTsdownLibrary` llamada; La generación permanece perezosa hasta que tsdown invoca sus ganchos de ciclo de vida. Para cada objetivo:

1. analiza, normaliza y analiza los módulos de componentes neutros;
2. ejecuta pases neutrales y crea módulos semánticos;
3. invoca las etapas de reducción, optimización y generación del complemento seleccionado;
4. escribe los módulos auxiliares y de origen de destino en una memoria caché específica del destino;
5. invoca los adaptadores tsdown/Vite del complemento;
6. emite el directorio de destino, las declaraciones, los elementos externos del tiempo de ejecución y los artefactos de entrada del paquete.

La fuente neutral se comparte, pero los árboles y las declaraciones generados son específicos del objetivo. Por lo tanto, una compilación Vue puede usar Vue.
Herramientas de declaración SFC y Vue, mientras que una compilación React puede usar tipos nativos React JSX y React. La configuración del paquete puede
aún agregue anulaciones de llamadas, manejo de CSS, complementos de declaración u opciones Vite específicas del objetivo sin moverlas
preocupaciones en el compilador genérico.

## Construcciones de gancho y componibles

Los ganchos son elementos componibles neutrales en lugar de componentes de la interfaz de usuario, pero utilizan el mismo límite de propiedad de destino explícito. un gancho
El consumidor pasa un `FrameworkOutputPlugin` a `tsdownForgeHookPlugins` y agrega el complemento devuelto a
`defineTsdownLibrary`. El controlador genérico analiza la entrada neutral,
conserva los módulos independientes del marco siempre que sea posible y envía módulos dependientes del objetivo a través del estricto protocolo del complemento.
bajar/optimizar/generar ruta.

El complemento seleccionado controla el idioma de salida del enlace y el adaptador nativo. Esto permite, por ejemplo, que se cree un gancho React.
use importaciones compatibles con React y una compilación de enlace Vue para exponer el comportamiento basado en Vue `Ref`, mientras que los módulos de utilidad neutrales permanecen
sin cambios. Cada objetivo recibe sus propias declaraciones del árbol de objetivos generado; ninguna declaración compartida pretende que
Todos los consumidores de marcos tienen los mismos tipos de ganchos.

## Proyección CMS

Proyectar componentes en una _plataforma de contenido_ es un eje ortogonal al descenso del marco, no un marco
Implementación oculta dentro del controlador principal. Un componente se convierte en un bloque Storyblok, una isla Astro, un parcial Fantasma, un
Incluye Jekyll o un componente de código de Webflow, y cada uno de ellos se puede combinar con **cualquier** complemento de salida del marco.
`storyblok × vue`, `astro × solid` y `ghost × web-components` son, por lo tanto, configuración en lugar de código nuevo.

`@mission-platform/forge-cms-plugin-api` es dueño de esa costura. Aporta tres cosas:

1. **Un modelo de contenido neutral.** `analyzeContentComponent` asigna la interfaz de accesorios de un componente a lo ordenado.
   `ContentField` con un tipo (`text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`), un JSDoc
   descripción, un indicador obligatorio, un valor predeterminado literal, metadatos de ranura y un indicador `@cmsSetting`. Se eliminan los accesorios de devolución de llamada
   y una unión que mezcla literales de cadena con `string`/`number` se degrada a `text`; se decide una vez, por lo que cada plataforma
   está de acuerdo. Cuando se proporciona el IR semántico, `ContentComponent.interactive` informa si el componente lleva estado,
   árbitros, efectos o eventos.
2. **Un contrato objetivo.** `CmsOutputPlugin` _compone_ un `FrameworkOutputPlugin` en lugar de serlo, y declara el
   emisores `emitSchema`, `emitTemplate`, `emitManifest` y `emitEntry`. `defineForgeCmsPlugin` lo valida en
   tiempo de configuración, incluida la restricción `supportedFrameworks` de un objetivo.
3. **Un controlador genérico y ayudantes de compilación.** `generateCmsArtifacts` descubre el cilindro neutral, obtiene la información de cada componente.
   IR a través de `analyzeForgeModule`, analiza el modelo de contenido, llama a los emisores del objetivo y escribe cada retorno
   `CmsArtifact`. `tsdownForgeCmsPlugins` lo inyecta en una configuración tsdown propiedad de la persona que llama y emite
   `dist/cms/<cms>/<framework>/**`, reflejando artefactos `asset: true` en `dist/cms/<cms>/`.

El controlador nunca asigna una identificación de cadena a un objetivo: los consumidores construyen y pasan instancias, exactamente como lo hacen para
complementos de marco:

```ts
import { tsdownForgeCmsPlugins } from '@mission-platform/forge-cms-plugin-api';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { forgeStoryblokCms } from '@mission-platform/forge-cms-storyblok';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: 'src/index.ts',
  plugins: tsdownForgeCmsPlugins({
    rootDir: import.meta.dirname,
    targets: [
      forgeStoryblokCms({
        packageName: '@mission-platform/components',
        plugin: forgeReactFramework(),
        storyblokRuntime: '@storyblok/react',
      }),
      forgeStoryblokCms({
        packageName: '@mission-platform/components',
        plugin: forgeVueFramework(),
        storyblokRuntime: '@storyblok/vue',
      }),
    ],
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
  }),
});
```

```mermaid
flowchart TD
  Barrel["Neutral component barrel"] --> Driver["forge-cms-plugin-api driver"]
  Driver --> IR["analyzeForgeModule → SemanticModule"]
  IR --> Model["analyzeContentComponent → ContentComponent"]
  Model --> Target["CmsOutputPlugin"]
  IR --> Target
  FW["FrameworkOutputPlugin"] --> Target
  FW --> Island["Co-generated island tree"]
  Island --> Target
  Target --> Out["dist/cms/&lt;cms&gt;/&lt;framework&gt;/**"]
```

### los objetivos

| Paquete | Fábrica | Emite |
| :-------------------------------------- | :------------------ | :------------------------------------------------------------------------------------------- |
| `@mission-platform/forge-cms-storyblok` | `forgeStoryblokCms` | un objeto componente por componente, un contenedor de bloque de marco, `components.json`, una entrada escrita |
| `@mission-platform/forge-cms-astro` | `forgeAstroCms` | `.astro` estática o una isla `client:load`, más una `content.config.ts` zod |
| `@mission-platform/forge-cms-ghost` | `forgeGhostCms` | Parciales de manillar más un fragmento del tema `config.custom` |
| `@mission-platform/forge-cms-jekyll` | `forgeJekyllCms` | El líquido incluye más `_data/forge-components.yml` y un fragmento `_config.yml` |
| `@mission-platform/forge-cms-webflow` | `forgeWebflowCms` | Declaraciones de componentes de código `declareComponent` más un fragmento de biblioteca `webflow.json` |

Cada mapeo no admitido produce un `CompilerDiagnostic` con una fase, un código y un motivo procesable en lugar de un
omisión silenciosa: Ghost advierte sobre campos numéricos y al exceder su límite de configuración de ~20, Webflow advierte cuando un número
se degrada a texto y Astro advierte cuando un accesorio predeterminado no puede cruzar el límite de la isla. Las advertencias se registran; errores abortar
la construcción.

### Islas

Un objetivo que declara `island: 'framework'` (Astro, Webflow) necesita un componente de tiempo de ejecución real para hidratarse. en lugar de
importar la subruta `./vue` o `./react` ya creada del paquete host, lo que haría que la salida del CMS dependiera de otra
la compilación se ejecutó primero: el controlador ejecuta el **complemento de marco vinculado** sobre el mismo barril neutral en un hermano
`island/` y la plantilla emitida importa un archivo de su propiedad. La isla está compilada por el propio tsdown de ese complemento.
complementos de escenario en la misma compilación.

Esta es la razón por la que Astro es un objetivo de CMS en lugar de un complemento de marco: anteriormente incluía una isla DOM de vainilla enrollada a mano.
tiempo de ejecución que volvió a implementar el estado, las referencias, los efectos y los eventos del IR. En cambio, componer un complemento de marco significa una
El componente Astro interactivo se comporta exactamente como el mismo componente en cualquier otra compilación.

## Dónde buscar al depurar

Primero rastree una compilación por responsabilidad en lugar de por el archivo generado:

1. **Entrada y diagnóstico:** inspeccione `packages/tooling/vite/forge/src/compiler/` para análisis, descubrimiento, optimización neutral,
   construcción semántica de IR y agregación de diagnóstico.
2. **Comportamiento objetivo:** inspeccionar el paquete `forge-plugin-*` seleccionado y sus `lower`, `optimize`, `generate` y compilar.
   Implementaciones de adaptadores.
3. **Forma de compilación genérica:** inspeccione `packages/tooling/vite/forge/src/generate.ts`, `generate-hooks.ts` y `tsdown.ts` en busca de caché,
   comportamiento de salida, declaración y anulación de llamadas.
4. **Salida de CMS:** inspeccione `packages/compiler/plugins/forge-cms-plugin-api/` para ver el modelo de contenido, el controlador y la compilación.
   ayudantes, luego el objetivo `packages/compiler/plugins/forge-cms-*` específico para sus emisores y mapeo de plataforma.
5. **Selección de paquete:** inspeccione las dependencias `tsdown.config.ts` y `forge-plugin-*` directas del paquete consumidor.

Para una compilación repetida o de observación, primero inspeccione `ForgeCompilationReport`: una tasa de aciertos baja apunta al origen/configuración o al destino.
huellas dactilares, mientras que un gran conjunto de archivos afectados apunta a bordes de gráficos o configuración de alias. Verifique el manifiesto de destino
antes de inspeccionar la salida del paquete nativo; distingue un artefacto generado faltante de un error de compilación nativo.

La evidencia más útil es la primera etapa fallida y su diagnóstico. Si la IR semántica es incorrecta, corrija el análisis neutral o
análisis. Si el IR es correcto pero la fuente nativa es incorrecta, corrija el complemento de destino seleccionado. Si la fuente generada es correcta
pero el paquete falla, inspeccione el adaptador Vite/tsdown de ese complemento o la configuración de anulación del consumidor.

## Ampliando Forge con un objetivo

Para agregar un objetivo de marco sin reintroducir la propiedad central:

1. cree un paquete `forge-plugin-*` con un `FrameworkOutputPlugin` que devuelva de fábrica;
2. implementar la reducción de `SemanticModule` a las intenciones objetivo;
3. agregar optimización de objetivos y generación de fuentes, incluidos módulos auxiliares y diagnósticos;
4. proporcionar metadatos de origen de destino, nombres externos de tiempo de ejecución y adaptadores Vite/tsdown;
5. agregar pruebas enfocadas para casos extremos semánticos y artefactos generados;
6. agregue el complemento como una dependencia directa en cada paquete que publica el destino;
7. pasar nuevas instancias de complementos en la configuración de compilación de ese paquete.

No agregue una ID de marco a un registro en `vite-plugin-forge`, importe un paquete de marco desde el controlador neutral ni agregue
una rama específica de destino para el análisis genérico y la orquestación de salida. El contrato está intencionalmente abierto, así que apunte
los paquetes pueden evolucionar su representación de origen mientras la canalización neutral permanece estable.

## Ampliación de Forge con un destino CMS

Agregar una plataforma de contenido sigue la misma forma aditiva, una capa hacia arriba:

1. cree un paquete `forge-cms-*` dependiendo de `@mission-platform/forge-cms-plugin-api`;
2. exportar una fábrica que devuelve `defineForgeCmsPlugin({ id, framework, packageName, … })`, tomando el complemento del marco
   de la persona que llama en lugar de elegir uno;
3. implementar `emitTemplate` y cualquiera de los `emitSchema`, `emitManifest` y `emitEntry` que la plataforma necesite:
   La plataforma de solo plantilla, como Ghost o Jekyll, implementa solo los dos primeros y el controlador escribe un marcador de posición.
   entrada;
4. Asigne los `ContentFieldKind` neutrales al vocabulario de campo de la plataforma en un solo lugar y presione un
   `CompilerDiagnostic` para cada mapeo que la plataforma no puede representar fielmente;
5. configure `island: 'framework'` si la plataforma necesita un tiempo de ejecución hidratado y `supportedFrameworks` si solo acepta
   algunos complementos del marco;
6. agregue una especificación sobre los dispositivos compartidos exportados desde `@mission-platform/forge-cms-plugin-api/fixtures`, para que el nuevo
   el objetivo se ejerce exactamente contra los mismos insumos que cualquier otro;
7. agregue el paquete como una dependencia directa de cada consumidor que publica el objetivo y pase una nueva instancia a
   `tsdownForgeCmsPlugins`.

No agregue lógica de clasificación de accesorios al objetivo: una solución para la unión, JSDoc, el valor predeterminado o el manejo de ranuras pertenece al
Modelo de contenido compartido para que todas las plataformas se beneficien al mismo tiempo.

## Orientación migratoria

### Migración desde exportaciones AST heredadas de TypeScript

Se eliminó la capa de compatibilidad AST TypeScript heredada en `packages/tooling/vite/forge/src/compiler/ast.ts`.
Oxc es ahora la única ruta AST del compilador a través del controlador Forge:

- Ya no se proporcionan fábricas de AST heredadas, visitantes, transformadores ni calzas de compatibilidad `@ts-nocheck`.
- Si su código consumió ayudantes de `compiler/ast.ts`, migre a los módulos hermanos enfocados:
  - `compiler/components.js`: Límite del componente y hechos de declaración.
  - `compiler/constants.js`: Módulo neutro y constantes de marcador de tiempo de ejecución.
  - `compiler/directives.js`: Inspección de directivas y resolución marco.
  - `compiler/facts.js`: Datos AST, tramos y utilidades de inspección.
  - `compiler/imports.js`: Declaración de importación e inspección de especificadores.

### Migración para personas que llaman directamente a la generación objetivo

Se han eliminado todos los complementos integrados (`forge-vue`, `forge-web-components`, `forge-react`, `forge-solid`, `forge-svelte`).
Reducción de respaldo de generación directa:

- Llamar a `plugin.generate(intentions)` con intenciones no reducidas (o intenciones que carecen de `lowered`) ahora arroja un
  `TypeError`.
- Las personas que llaman directamente y los conjuntos de pruebas deben invocar `plugin.lower(module, context)` y `plugin.optimize(loweredIntentions, options)`.
  antes de llamar a `generate()`, o ejecutar la compilación a través del servicio de compilación estándar:
  `createForgeCompilerService().compile(request, plugin)`.
- Los autores de complementos personalizados deben asegurarse de que `lower()` establezca un plan `lowered` no vacío con un `framework` coincidente.
  discriminador en el `TargetIntentions` devuelto.

Para obtener una descripción general del sistema de compilación y la dirección de dependencia en toda la plataforma, consulte [Sistema de compilación](../../../../../../docs/build-system.md) y
[Arquitectura de plataforma de misión](../../../../../../docs/architecture.md).
