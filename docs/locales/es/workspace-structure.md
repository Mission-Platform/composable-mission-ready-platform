# Estructura del espacio de trabajo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> Idioma: Español (es)

Este documento proporciona una referencia técnica para el diseño del monorepo de Mission Platform, los fines del directorio y la información interna.
convenciones de paquetes.

## Referencia de diseño de Monorepo

Mission Platform utiliza espacios de trabajo pnpm y Turborepo para administrar un entorno de múltiples paquetes. El repositorio está organizado.
en niveles funcionales:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/tooling/configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── packages/tooling/vite/           # Build-time extensions and compilers
├── packages/edge/workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
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
- **`my-care-notes/`**: La aplicación insignia de notas de atención.
- **`service-monitor/`**: el panel de estado del servicio RedwoodSDK respaldado por un objeto duradero.
- **`website/`**: El sitio web de productos y marketing de Mission Platform.
- **`storybook/`**: el banco de trabajo de componentes y el conjunto de pruebas visuales.

### 2. `packages/` (Bloques de construcción)

Bibliotecas versionadas y reutilizables consumidas por las aplicaciones. Se pretende que sean independientes del marco siempre que sea posible.

- **`@mission-platform/forge-jsx`**: adaptadores y tiempo de ejecución JSX neutrales en el marco.
- **`@mission-platform/components`**: la biblioteca de componentes de múltiples marcos.
- **`@mission-platform/forms`** y **`@mission-platform/forms-core`**: primitivas de forma basadas en esquemas.
- **`@mission-platform/content`** y **`@mission-platform/email-renderer`**: Canalizaciones de contenido y renderizado.
- **`@mission-platform/tokens`**: Fuente de verdad del token de diseño.
- **`@mission-platform/router`** y **`@mission-platform/i18n`**: enrutamiento y localización neutrales en el marco de trabajo.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`** y
  **`@mission-platform/qr-code`**: Paquetes de codificación y escaneo respaldados por Wasm.

### 3. `packages/tooling/configs/` (Fundación de herramientas)

Configuraciones compartidas que garantizan la coherencia en todos los espacios de trabajo. Los paquetes en este directorio se utilizan normalmente como
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** y **`stylelint-config/`**: reglas de formato y linting.
- **`typescript-config/`**: archivos `tsconfig.json` base para consumidores Node, DOM, biblioteca y marco.
- **`tsdown-config/`** y **`vite-config/`**: biblioteca común, aplicación, patrones de compilación Vite y Vitest.
- **`i18n-config/`** y **`storybook-framework/`**: configuración de entorno de trabajo y extracción de configuración regional compartida.

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
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` | Define los límites del espacio de trabajo, los miembros globales y los catálogos de dependencias. |
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
