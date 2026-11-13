# Estructura del espacio de trabajo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> Idioma: Español (es)

Este documento proporciona una referencia técnica para el diseño del monorepo de Mission Platform, fines de directorio e información interna.
convenciones de paquetes.

## Referencia de diseño de Monorepo

Mission Platform utiliza espacios de trabajo pnpm y Turborepo para administrar un entorno de múltiples paquetes. El repositorio está organizado.
en niveles funcionales:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/core/          # Framework-neutral runtime, Forge JSX/adapters, routing, i18n, and scheduling
├── packages/ui/            # Components, forms, layouts, themes, and design tokens
├── packages/content/       # Content, email, search, and SEO pipelines
├── packages/integrations/  # Barcode, maps, media, 3D, and interoperability adapters
├── packages/compiler/      # Figma bridges and Forge compiler plugins
├── packages/tooling/       # Shared configs and Vite/build-time extensions
├── packages/edge/          # Reusable Cloudflare Worker edge functions
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Directorios primarios

### 1. `apps/` (Aplicaciones)

Las aplicaciones son unidades implementables que componen la funcionalidad del directorio `packages/`. Suelen ser privados.
y nunca publicado en un registro.

- **`docs/`**: El sitio de documentación Vite + Vue para el corpus Markdown.
- **`figma-forge-plugin/`**: el complemento Figma que integra componentes creados por Forge con los flujos de trabajo de Figma.
- **`my-care-notes/`**: La aplicación insignia de notas de atención.
- **`service-monitor/`**: el panel de estado del servicio RedwoodSDK respaldado por un objeto duradero.
- **`website/`**: El sitio web de productos y marketing de Mission Platform.
- **`storybook/`**: el banco de trabajo de componentes y el conjunto de pruebas visuales.

### 2. `packages/` (Bloques de construcción)

Bibliotecas versionadas y reutilizables consumidas por las aplicaciones. Los directorios de dominio hacen explícita la propiedad sin cambiar los nombres de los paquetes ni las importaciones.

- **`core/`**: tiempo de ejecución neutral en el marco, Forge JSX/adaptadores, enrutamiento, localización, observabilidad, RxJS y servicios de programación.
- **`ui/`**: Componentes, puntos de interrupción, formularios, diseños, selección, temas, tokens y tipografía.
- **`content/`**: Modelos de contenido, componentes/renderizado de correo electrónico, herramientas de lenguaje y SEO.
- **`integrations/`**: Código de barras, escaneo de códigos, D3, mapas, códigos QR/matriciales, voz, Three.js y vCards.
- **`compiler/`**: Puentes Figma y complementos del compilador framework/router/CMS.
- **`tooling/`**: Paquetes de configuración compartidos y complementos Vite.
- **`edge/`**: Paquetes de trabajo utilizados por aplicaciones y ejemplos locales.

- **`@mission-platform/forge-jsx`**: adaptadores y tiempo de ejecución JSX neutrales en el marco.
- **`@mission-platform/components`**: la biblioteca de componentes multi-framework.
- **`@mission-platform/forms`** y **`@mission-platform/forms-core`**: primitivas de forma basadas en esquemas.
- **`@mission-platform/content`** y **`@mission-platform/email-renderer`**: Canalizaciones de contenido y renderizado.
- **`@mission-platform/tokens`**: Fuente de verdad del token de diseño.
- **`@mission-platform/router`** y **`@mission-platform/i18n`**: enrutamiento y localización neutrales en el marco de trabajo.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`** y
  **`@mission-platform/qr-code`**: Paquetes de codificación y escaneo respaldados por Wasm.

### 3. `packages/tooling/configs/` (Fundación de herramientas)

Configuraciones compartidas que garantizan la coherencia en todos los espacios de trabajo. Los paquetes en este directorio se utilizan normalmente como
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, y **`stylelint-config/`**: Reglas de formato y pelado.
- **`typescript-config/`**: Base `tsconfig.json` archivos para Node, DOM, biblioteca y consumidores de marcos.
- **`tsdown-config/`** y **`vite-config/`**: biblioteca común, aplicación, Vite, y Vitest construir patrones.
- **`i18n-config/`** y **`storybook-framework/`**: Extracción de configuración regional compartida y configuración del marco de trabajo.

### 4. `packages/tooling/vite/` (Extensiones de compilación)

Complementos personalizados que amplían el proceso de compilación Vite.

- **`forge/`**: el compilador de varias etapas para componentes de Forge.
- **`tokens/`**: genera artefactos de código a partir de definiciones de tokens DTCG.
- **`i18n/`**: Maneja la carga local y la extracción estática.

### 5. `packages/edge/workers/` (Servicios perimetrales)

Cloudflare Workers para lógica del lado del servidor y entrega optimizada de activos.

- **`api-proxy/`**: proporciona acceso de solo lectura restringido a rutas API aprobadas.
- **`email-sender/`**: trabajador de exhibición de correo electrónico local respaldado por MailPit.
- **`forge-spa/`**: ofrece recursos estáticos con un respaldo de SPA vinculado a `ASSETS`.

Los trabajadores de aplicaciones implementables están configurados por `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc` y `apps/service-monitor/wrangler.jsonc`. el
Los paquetes `api-proxy` y `forge-spa` son dependencias agrupadas en lugar de implementaciones Wrangler independientes.

### 6. `packages/compiler/plugins/` (Complementos del compilador Forge)

Complementos y adaptadores de salida específicos del marco para el compilador Forge.

- **`forge-cms-plugin-api/`**: Generación de artefactos CMS e integración del adaptador Vite/tsdown.
- **`forge-cms-astro/`**, **`forge-cms-ghost/`**, **`forge-cms-jekyll/`**, **`forge-cms-storyblok/`**, **`forge-cms-webflow/`**: adaptadores de integración específicos de CMS.
- **`forge-plugin-api/`**: Interfaces del complemento del compilador Forge compartido.
- **`forge-vue/`**, **`forge-react/`**, **`forge-solid/`**, **`forge-svelte/`**, **`forge-web-components/`**: generación de código específico del marco y adaptadores de tiempo de ejecución.
- **`forge-router-plugin-api/`**, **`forge-router-vue/`**, **`forge-router-react/`**, **`forge-router-solid/`**, **`forge-router-svelte/`**, **`forge-router-web-components/`**, **`forge-router-redwood/`**: adaptadores de integración específicos del marco del enrutador.

## Convenciones de paquetes internos

Para mantener un entorno predecible, todos los paquetes y aplicaciones siguen un diseño interno estándar.

### Jerarquía estándar `src/`

El código fuente está organizado por tipo funcional:

- **`components/`**: lógica UI (SFC o TSX).
- **`composables/`**: Lógica reactiva y ganchos.
- **`utils/`**: funciones puras y ayudantes independientes del marco.
- **`locales/`**: archivos de traducción JSON/YAML.
- **`styles/`**: SCSS parciales e integraciones de sistemas de diseño.

### Patrón de exportación de barriles

Cada directorio dentro de `src/` debe contener un `index.ts` (archivo barril).

- Los subdirectorios exportan sus símbolos internos a través de su `index.ts` local.
- La raíz `src/index.ts` actúa como punto de entrada público para todo el miembro del espacio de trabajo.

## Registro de configuración raíz

Los archivos clave en la raíz del repositorio gobiernan el comportamiento del monorepo:

| Archivo | Propósito |
| :---------------------- | :------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Define los límites del espacio de trabajo, los grupos de miembros y los catálogos de dependencias. |
| `turbo.json` | Orquesta la canalización de compilación y el almacenamiento en caché de tareas.                    |
| `package.json` | Scripts de nivel raíz y devDependencies en todo monorepo.                |
| `commitlint.config.mjs` | Hace cumplir la especificación de compromisos convencionales.                     |

## Gestión de dependencias y espacios de trabajo

Mission Platform utiliza el protocolo `workspace:*` para dependencias internas. Esto garantiza que los paquetes siempre utilicen el
versión local de otros miembros del espacio de trabajo durante el desarrollo.

### PNPM Catálogos

El repositorio aprovecha los **catálogos pnpm** (definidos en `pnpm-workspace.yaml`) para centralizar las versiones de dependencia en
el monorepo. Esto evita la desviación de versiones y simplifica el mantenimiento.

### Ejecución de tareas

Las tareas entre espacios de trabajo se ejecutan a través de la raíz `package.json` usando Turborepo:

- `pnpm build`: construye todos los espacios de trabajo en el orden de dependencia correcto.
- `pnpm test`: ejecute los conjuntos de pruebas para todos los espacios de trabajo con una tarea `test`. Utilice `pnpm exec turbo run test --affected` para
  el alcance del CI del espacio de trabajo modificado.
- `pnpm lint`: ejecute ESLint en todos los espacios de trabajo.
- `pnpm lint:style`: ejecute Stylelint para estilos de aplicaciones y paquetes.
- `pnpm format`: Verifique el formato con Prettier.
- `pnpm i18n:extract`: Extraer claves de traducción para espacios de trabajo propietarios de catálogos.
