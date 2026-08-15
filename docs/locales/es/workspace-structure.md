# Estructura del espacio de trabajo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/workspace-structure.md](../../workspace-structure.md)
> Idioma: Español (es)

Este documento proporciona una referencia técnica para el diseño del monorepo de Mission Platform, fines de directorio e información interna.
convenciones de paquetes.

## Referencia de diseño de Monorepo

Usos de la plataforma de la misión pnpm espacios de trabajo y Turborepo para gestionar un entorno de múltiples paquetes. El repositorio está organizado.
en niveles funcionales:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Directorios primarios

### 1. `apps/` (Aplicaciones)

Las aplicaciones son unidades desplegables que componen la funcionalidad del `packages/` directorio. Suelen ser privados.
y nunca publicado en un registro.

- **`docs/`**: El Vite + Vue sitio de documentación para el corpus Markdown.
- **`my-care-notes/`**: La aplicación insignia de notas de atención.
- **`service-monitor/`**: El panel de estado del servicio RedwoodSDK respaldado por un objeto duradero.
- **`website/`**: El sitio web de productos y marketing de Mission Platform.
- **`storybook/`**: El banco de trabajo de componentes y el conjunto de pruebas visuales.

### 2. `packages/` (Bloques de construcción)

Bibliotecas versionadas y reutilizables consumidas por las aplicaciones. Se pretende que sean independientes del marco siempre que sea posible.

- **`@mission-platform/forge`**: El tiempo de ejecución y los adaptadores JSX neutrales en el marco de trabajo.
- **`@mission-platform/components`**: La biblioteca de componentes de múltiples marcos.
- **`@mission-platform/forms`** y **`@mission-platform/forms-core`**: Primitivas de forma basadas en esquemas.
- **`@mission-platform/content`** y **`@mission-platform/email-renderer`**: Canalizaciones de contenido y renderizado.
- **`@mission-platform/tokens`**: Fuente de verdad del token de diseño.
- **`@mission-platform/router`** y **`@mission-platform/i18n`**: Enrutamiento y localización neutrales en el marco de trabajo.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, y
  **`@mission-platform/qr-code`**: Paquetes de codificación y escaneo respaldados por Wasm.

### 3. `configs/` (Fundación de herramientas)

Configuraciones compartidas que garantizan la coherencia en todos los espacios de trabajo. Los paquetes en este directorio se utilizan normalmente como
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, y **`stylelint-config/`**: Reglas de formato y pelado.
- **`typescript-config/`**: Base `tsconfig.json` archivos para Node, DOM, biblioteca y consumidores de marcos.
- **`tsdown-config/`** y **`vite-config/`**: biblioteca común, aplicación, Vite, y Vitest construir patrones.
- **`i18n-config/`** y **`storybook-framework/`**: Extracción de configuración regional compartida y configuración del marco de trabajo.

### 4. `vite-plugins/` (Crear extensiones)

Complementos personalizados que amplían el Vite proceso de construcción.

- **`forge/`**: El compilador de varias etapas para componentes de Forge.
- **`tokens/`**: Genera artefactos de código a partir de definiciones de tokens DTCG.
- **`i18n/`**: Maneja la carga local y la extracción estática.

### 5. `workers/` (Servicios de borde)

Cloudflare Workers para lógica del lado del servidor y entrega optimizada de activos.

- **`api-proxy/`**: Proporciona acceso de solo lectura restringido a rutas API aprobadas.
- **`email-sender/`**: trabajador de exhibición de correo electrónico local respaldado por MailPit.
- **`forge-spa/`**: Sirve activos estáticos con un `ASSETS`-Reserva de SPA vinculante.

Aplicación implementable Los trabajadores son configurados por `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, y `apps/service-monitor/wrangler.jsonc`. El
`api-proxy` y `forge-spa` Los paquetes son dependencias agrupadas en lugar de independientes. Wrangler implementaciones.

## Convenciones de paquetes internos

Para mantener un entorno predecible, todos los paquetes y aplicaciones siguen un diseño interno estándar.

### Estándar `src/` Jerarquía

El código fuente está organizado por tipo funcional:

- **`components/`**: Lógica UI (SFC o TSX).
- **`composables/`**: Lógica reactiva y ganchos.
- **`utils/`**: Funciones puras y ayudantes independientes del marco.
- **`locales/`**: archivos de traducción JSON/YAML.
- **`styles/`**: SCSS parciales e integraciones de sistemas de diseño.

### Patrón de exportación de barriles

Cada directorio dentro `src/` debe contener un `index.ts` (archivo de barril).

- Los subdirectorios exportan sus símbolos internos a través de su local `index.ts`.
- la raíz `src/index.ts` actúa como punto de entrada público para todo el miembro del espacio de trabajo.

## Registro de configuración raíz

Los archivos clave en la raíz del repositorio gobiernan el comportamiento del monorepo:

| Archivo | Propósito |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | Define los límites del espacio de trabajo, los grupos de miembros y los catálogos de dependencias. |
| `turbo.json`            | Orquesta la canalización de compilación y el almacenamiento en caché de tareas.                    |
| `package.json`          | Scripts de nivel raíz y devDependencies en todo monorepo.                |
| `commitlint.config.mjs` | Hace cumplir la especificación de compromisos convencionales.                     |

## Gestión de dependencias y espacios de trabajo

La Plataforma de la Misión utiliza el `workspace:*` Protocolo para dependencias internas. Esto garantiza que los paquetes siempre utilicen el
versión local de otros miembros del espacio de trabajo durante el desarrollo.

### PNPM Catálogos

El repositorio aprovecha **pnpm catálogos** (definidos en `pnpm-workspace.yaml`) para centralizar las versiones de dependencia en
el monorepo. Esto evita la desviación de versiones y simplifica el mantenimiento.

### Ejecución de tareas

Las tareas entre espacios de trabajo se ejecutan a través de la raíz `package.json` usando Turborepo:

- `pnpm build`: cree todos los espacios de trabajo en el orden de dependencia correcto.
- `pnpm test`: Ejecute los conjuntos de pruebas para todos los espacios de trabajo con un `test` tarea. Usar `pnpm exec turbo run test --affected` para
  el alcance del CI del espacio de trabajo modificado.
- `pnpm lint`: Correr ESLint en todos los espacios de trabajo.
- `pnpm lint:style`: Correr Stylelint para estilos de aplicaciones y paquetes.
- `pnpm format`: Verifique el formato con Prettier.
- `pnpm i18n:extract`: Extrae claves de traducción para espacios de trabajo que poseen catálogos.
