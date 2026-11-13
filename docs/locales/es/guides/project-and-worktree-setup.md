# Guía de flujo de trabajo del tablero de proyecto y del árbol de trabajo de Git

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> Idioma: Español (es)

**Versión:** 2.0.0
**Repositorio:** `Mission-Platform/composable-mission-ready-platform`
**Hitos:**

- Hito n.º 1: mejoras en la arquitectura y el tiempo de ejecución de Flint
- Hito n.º 2: mejoras y pulido de la plataforma de componentes de la interfaz de usuario
- Hito #3: Cambio de marca de Fabrica y modernización de múltiples marcos

Las tablas del árbol de trabajo y del tablero que aparecen a continuación son una instantánea del repositorio, no un estado activo. Verificar sucursal, emisión y solicitud de extracción
estado en GitHub antes de confiar en ellos.

---

## 1. Motivación arquitectónica y modelo impulsado por los servicios públicos

En un monorepo TypeScript de marco múltiple de alto rendimiento con extensas herramientas de compilación y múltiples agentes autónomos, maximizar la velocidad de desarrollo y minimizar la fricción depende de dos capacidades operativas principales:

1. **Árboles de trabajo Git aislados con clones APFS de copia cero y almacenamiento en caché compartido:**
   - **Aislamiento:** Los desarrolladores y subagentes autónomos ejecutan flujos de trabajo paralelos en ramas dedicadas sin ensuciar el directorio de trabajo, intercambiar ramas o perder el estado de almacenamiento.
   - **Copia en escritura APFS:** Los módulos Node se clonan instantáneamente a través de macOS APFS (`cp -cR`), lo que garantiza cero asignación de disco adicional y tiempos de configuración inferiores a un segundo.
   - **Caché Turbo compartida:** `.turbo/cache` se inicializa en la raíz del repositorio y se comparte entre todos los árboles de trabajo vinculados, lo que elimina ciclos de prueba y compilación duplicados.
   - **Paridad del servidor de idiomas:** `agent-lsp.json` se sincroniza automáticamente en cada árbol de trabajo para que la inteligencia de código y las herramientas IDE funcionen de inmediato.

2. **Orquestación determinista de la junta de proyecto:**
   - Seguimiento de hitos arquitectónicos, problemas, prioridades y estados a lo largo de un ciclo de vida kanban de 5 etapas (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) en **The Board**.
   - Un problema está estrictamente marcado como **Listo** solo una vez que se fusiona con `main` mediante una solicitud de extracción.

---

## 2. Topología de árbol de trabajo activo

| Ruta del árbol de trabajo | Sucursal | Enfoque activo y problemas | Estado |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Espacio de trabajo principal de Monorepo, herramientas, orquestación de CI | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | Componentes principales de la interfaz de usuario: tabla, pestañas, vista de árbol, panel dividido, selección múltiple (n.° 51–n.° 56, n.° 60; PR n.° 63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | Flotación y superposición: reserva de posicionamiento de anclaje CSS y unificación de diálogo/modal (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | Formularios: contenedor `ForgeForm` basado en contexto con validación de esquema Zod/Valibot (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | Seleccione: cuadro combinado de búsqueda asíncrona, estados antirrebote y carga (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | Contenido: Modernización de `ForgeWysiwygEditor` para eliminar `execCommand` obsoleto (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Compilador y tiempo de ejecución de Flint: tabla suiza, SIMD, SonIR, expresiones regulares lineales (#43–#45, #48) | `LINKED` |

---

## 3. Comandos de gestión de Git Worktree

Las herramientas automatizadas del ciclo de vida del árbol de trabajo se proporcionan a través de los scripts `scripts/worktree-manager.ts` y `package.json` raíz:

Los comandos `pnpm worktree:*` siguientes son alias convenientes para el `scripts/worktree-manager.ts` correspondiente.
comandos. El formato de script directo es el recurso canónico cuando un alias de administrador de paquetes no está disponible.

```bash
# 1. List all active worktrees and their readiness state (LSP, dependencies, clean status)
pnpm worktree:list

# 2. Provision a new isolated worktree branching cleanly from origin/main
pnpm worktree:create <branch-name> [optional-target-path] [optional-base-ref]

# 3. Synchronize / setup an existing or linked worktree (Turbo cache, LSP, node_modules)
pnpm worktree:setup [path]

# 4. Safely tear down a clean worktree
pnpm worktree:remove <path> [--force]
```

### 3.1 Invariantes y salvaguardias del árbol de trabajo

Cuando se aprovisiona o configura un árbol de trabajo:

- **Referencia base:** De forma predeterminada, los nuevos árboles de trabajo se ramifican limpiamente desde `origin/main` en lugar de `HEAD` local, lo que evita la contaminación de las ramas en progreso.
- **Copia en escritura APFS:** En macOS, `node_modules` se clona a través de `cp -cR` antes de ejecutar `pnpm install --frozen-lockfile`, completando la configuración en segundos sin espacio adicional en el disco.
- **Turborepo Cache Sharing:** El directorio `.turbo/cache` se inicializa y se comparte entre árboles de trabajo.
- **Configuración de LSP:** `agent-lsp.json` se refleja desde el repositorio principal.
- **Cebado de compilación ascendente:** Prepara automáticamente las dependencias de compilación del espacio de trabajo ascendente (`turbo run build --filter <target>^...`) para eliminar fallas en las pruebas de estado limpio.
- **Verificación de integridad de la compilación:** Se ejecuta una prueba rápida para verificar que el entorno esté completamente operativo.

---

## 4. Hito 2: Mejoras en la plataforma de componentes de la interfaz de usuario ("La Junta")

Los problemas de Milestone 2 (n.° 51 a n.° 62) rastrean el cumplimiento de la accesibilidad, el pulido de la interacción y la paridad de funciones en todas las bibliotecas de componentes.

### 4.1 Seguimiento de problemas y estado del tablero

| Problema | Título | Pista | Prioridad | Complejidad | Etapa del tablero | Árbol de trabajo / PR |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | Accesibilidad | P0 - Crítico | S | `In Review` | PR #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | Accesibilidad | P0 - Crítico | S | `In Review` | PR #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | Accesibilidad | P0 - Crítico | METRO | `In Review` | PR #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | Interacción y polaco | P1 - Alto | METRO | `In Review` | PR #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | Paridad de visualización de datos | P1 - Alto | METRO | `In Review` | PR #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | Interacción y polaco | P1 - Alto | METRO | `In Review` | PR #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | Superposición y flotación | P2 - Medio | L | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | Formularios y Validación | P2 - Medio | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | Selección y cuadro combinado | P2 - Medio | L | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | Paridad de visualización de datos | P2 - Medio | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | Superposición y flotación | P2 - Medio | L | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | Contenido y editor | P2 - Medio | XL | `Ready` | `_content` |

Todos los problemas se asignan directamente a `@Cethric` en GitHub.

---

## 5. Hito 1: Arquitectura y modernización de Flint

Los problemas de Milestone 1 (#41 a #50) rastrean el núcleo del compilador, SonIR 2.0, la biblioteca estándar y los sistemas de tiempo de ejecución:

| Problema | Título | Pista | Prioridad | Complejidad | Etapa del tablero |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | Núcleo del compilador | P0 - Crítico | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Herramientas y LSP | P0 - Crítico | L | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | Biblioteca estándar | P1 - Alto | L | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm y SIMD | P1 - Alto | L | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR y optimización | P2 - Medio | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | Núcleo del compilador | P2 - Medio | L | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | Documentación | P3 - Bajo | METRO | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | Seguridad y límites | P0 - Crítico | L | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | Memoria y tiempo de ejecución | P1 - Alto | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | Memoria y tiempo de ejecución | P2 - Medio | XL | `Backlog` |

---

## 6. Hito 3: Cambio de marca de Fabrica y modernización de múltiples marcos

Los problemas del Hito 3 (#109 a #118) rastrean la migración de 4 fases a la arquitectura de la plataforma Fabrica (`Fabrica`, `Lathe`, `Scribe`):

| Problema | Título | Pista | Prioridad | Complejidad | Etapa del tablero |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | Cimientos y herramientas | P0 - Crítico | METRO | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | Fichas de diseño y UI | P0 - Crítico | METRO | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | Fichas de diseño y UI | P0 - Crítico | METRO | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | Fichas de diseño y UI | P0 - Crítico | L | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | Compilador y adaptadores | P1 - Alto | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | Escáner y tiempo de ejecución | P1 - Alto | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | Escáner y tiempo de ejecución | P2 - Medio | METRO | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | Aplicaciones y MCP | P1 - Alto | L | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | Aplicaciones y MCP | P1 - Alto | METRO | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | Documentación | P2 - Medio | L | `Backlog` |

Las especificaciones del problema de cambio de marca se mantienen en el proyecto GitHub al que hacen referencia los comandos `project:*` a continuación;
este documento no contiene una copia viva de ese trabajo pendiente.

---

## 7. Automatización de CLI de placa y proyecto de GitHub

La gestión del proyecto se coordina a través de los scripts `scripts/github-project-manager.ts` y raíz `package.json`:

```bash
# 1. View current project status and board stage mapping
pnpm project:status [components|flint|fabrica|all]

# 2. Export deterministic project plans (docs/ui-components-project-plan.json, docs/flint-project-plan.json & docs/fabrica-project-plan.json)
pnpm project:plan

# 3. Synchronize items and column transitions on "The Board"
pnpm project:board "The Board"

# 4. Provision or configure GitHub Project v2 via GraphQL
pnpm project:setup [components|flint|fabrica]
```

### 7.1 Configuración del alcance de autenticación de GitHub

Para actualizar los tableros de GitHub Projects v2 (`The Board`) a través de la CLI, el token GitHub OAuth debe incluir el alcance del permiso `project` o `read:project`.

Ejecuta en tu terminal:

```bash
gh auth refresh -s project,read:project
```

Alternativamente, configure un token de acceso personal con permisos de proyecto:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

Una vez otorgado, `pnpm project:board "The Board"` sincronizará automáticamente todas las transiciones de columnas directamente con GitHub Projects v2.
