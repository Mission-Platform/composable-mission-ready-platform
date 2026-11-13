# Projektboard und Git Worktree-Workflow-Leitfaden

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> Sprache: Deutsch (de)

**Version:** 2.0.0
**Repository:** `Mission-Platform/composable-mission-ready-platform`
**Meilensteine:**

- Meilenstein Nr. 1: Flint-Architektur und Laufzeitverbesserungen
- Meilenstein Nr. 2: Verbesserungen und Politur der UI-Komponentenplattform
- Meilenstein Nr. 3: Fabrica-Rebranding und Multi-Framework-Modernisierung

Bei den Arbeitsbaum- und Board-Tabellen unten handelt es sich um einen Repository-Schnappschuss, nicht um einen Live-Status. Überprüfen Sie Branch, Issue und Pull-Request
Zustand in GitHub, bevor Sie sich darauf verlassen.

---

## 1. Architekturmotivation und nutzenorientiertes Modell

In einem Multi-Framework-TypeScript-Monorepo mit hohem Durchsatz, umfangreichen Compiler-Tools und mehreren autonomen Agenten hängt die Maximierung der Entwicklungsgeschwindigkeit und die Minimierung der Reibung von zwei zentralen Betriebsfunktionen ab:

1. **Isolierte Git-Arbeitsbäume mit Zero-Copy-APFS-Klonen und gemeinsamem Caching:**
   - **Isolierung:** Entwickler und autonome Subagenten führen parallele Workstreams auf dedizierten Zweigen aus, ohne das Arbeitsverzeichnis zu verunreinigen, Zweige auszutauschen oder den Stash-Status zu verlieren.
   - **APFS Copy-on-Write:** Node-Module werden sofort über macOS APFS (`cp -cR`) geklont, wodurch keine zusätzliche Festplattenzuweisung und Einrichtungszeiten von weniger als einer Sekunde gewährleistet werden.
   - **Gemeinsamer Turbo-Cache:** `.turbo/cache` wird im Repository-Stamm initialisiert und von allen verknüpften Arbeitsbäumen gemeinsam genutzt, wodurch doppelte Build- und Testzyklen vermieden werden.
   - **Sprachserverparität:** `agent-lsp.json` wird automatisch in jeden Arbeitsbaum synchronisiert, sodass Code-Intelligenz und IDE-Tools sofort funktionieren.

2. **Deterministische Projektboard-Orchestrierung:**
   - Verfolgen Sie architektonische Meilensteine, Probleme, Prioritäten und Status über einen 5-stufigen Kanban-Lebenszyklus (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) auf **The Board**.
   – Ein Problem wird nur dann streng als **Fertig** markiert, wenn es über eine Pull-Anfrage mit `main` zusammengeführt wird.

---

## 2. Aktive Worktree-Topologie

| Arbeitsbaumpfad | Zweig | Aktiver Fokus und Probleme | Staat |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Monorepo-Hauptarbeitsbereich, Tools, CI-Orchestrierung | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | Kernkomponenten der Benutzeroberfläche: Tabelle, Registerkarten, TreeView, SplitPane, Multiselect (#51–#56, #60; PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | Float & Overlay: CSS-Ankerpositionierungs-Fallback und Dialog-/modale Vereinheitlichung (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | Formulare: Kontextgesteuerter `ForgeForm`-Container mit Zod/Valibot-Schemavalidierung (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | Wählen Sie: Kombinationsfeld für asynchrone Suche, Entprellung und Ladestatus (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | Inhalt: Modernisierung von `ForgeWysiwygEditor` zur Beseitigung des veralteten `execCommand` (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Flint Compiler & Runtime: Schweizer Tabelle, SIMD, SonIR, linearer Regex (#43–#45, #48) | `LINKED` |

---

## 3. Git Worktree-Verwaltungsbefehle

Automatisierte Worktree-Lebenszyklus-Tools werden über die Skripte `scripts/worktree-manager.ts` und Root `package.json` bereitgestellt:

Die folgenden `pnpm worktree:*`-Befehle sind praktische Aliase für den entsprechenden `scripts/worktree-manager.ts`
Befehle. Die direkte Skriptform ist der kanonische Fallback, wenn ein Paketmanager-Alias ​​nicht verfügbar ist.

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

### 3.1 Arbeitsbauminvarianten und Schutzmaßnahmen

When a worktree is provisioned or configured:

- **Basisreferenz:** Standardmäßig verzweigen neue Arbeitsbäume sauber von `origin/main` statt vom lokalen `HEAD`, wodurch eine Verschmutzung durch laufende Verzweigungen verhindert wird.
- **APFS Copy-on-Write:** Unter macOS wird `node_modules` über `cp -cR` geklont, bevor `pnpm install --frozen-lockfile` ausgeführt wird, wodurch die Einrichtung in Sekundenschnelle ohne zusätzlichen Speicherplatzbedarf abgeschlossen wird.
- **Turborepo-Cache-Freigabe:** Das `.turbo/cache`-Verzeichnis wird initialisiert und von allen Arbeitsbäumen gemeinsam genutzt.
- **LSP-Konfiguration:** `agent-lsp.json` wird vom Haupt-Repository gespiegelt.
- **Upstream-Build-Priming:** Bereitet automatisch Upstream-Workspace-Build-Abhängigkeiten vor (`turbo run build --filter <target>^...`), um Fehler beim Clean-State-Test zu vermeiden.
- **Build Sanity Verification:** Eine schnelle Testprüfung wird ausgeführt, um zu überprüfen, ob die Umgebung voll funktionsfähig ist.

---

## 4. Meilenstein 2: Verbesserungen der UI-Komponentenplattform („Das Board“)

Meilenstein 2-Probleme (Nr. 51 bis Nr. 62) verfolgen die Einhaltung der Barrierefreiheit, die Verbesserung der Interaktion und die Funktionsparität in den Komponentenbibliotheken.

### 4.1 Problemverfolgung und Platinenstatus

| Problem | Titel | Verfolgen | Priorität | Komplexität | Board-Bühne | Arbeitsbaum / PR |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | Barrierefreiheit | P0 – Kritisch | S | `In Review` | PR #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | Barrierefreiheit | P0 – Kritisch | S | `In Review` | PR #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | Barrierefreiheit | P0 – Kritisch | M | `In Review` | PR #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | Interaktion & Polnisch | P1 - Hoch | M | `In Review` | PR #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | Datenanzeigeparität | P1 - Hoch | M | `In Review` | PR #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | Interaktion & Polnisch | P1 - Hoch | M | `In Review` | PR #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | Overlay & Float | P2 – Mittel | L | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | Formulare und Validierung | P2 – Mittel | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | Auswahl & Combobox | P2 – Mittel | L | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | Datenanzeigeparität | P2 – Mittel | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | Overlay & Float | P2 – Mittel | L | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | Inhalt & Herausgeber | P2 – Mittel | XL | `Ready` | `_content` |

Alle Probleme werden direkt `@Cethric` auf GitHub zugewiesen.

---

## 5. Meilenstein 1: Flint Architecture & Modernization

Meilenstein-1-Probleme (Nr. 41 bis Nr. 50) betreffen den Compiler-Kern, SonIR 2.0, die Standardbibliothek und Laufzeitsysteme:

| Problem | Titel | Verfolgen | Priorität | Komplexität | Board-Bühne |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | Compilerkern | P0 – Kritisch | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Werkzeuge und LSP | P0 – Kritisch | L | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | Standardbibliothek | P1 - Hoch | L | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm & SIMD | P1 - Hoch | L | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR & Optimierung | P2 – Mittel | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | Compilerkern | P2 – Mittel | L | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | Dokumentation | P3 – Niedrig | M | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | Sicherheit & Grenzen | P0 – Kritisch | L | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | Speicher und Laufzeit | P1 - Hoch | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | Speicher und Laufzeit | P2 – Mittel | XL | `Backlog` |

---

## 6. Meilenstein 3: Fabrica-Rebranding und Multi-Framework-Modernisierung

Meilenstein-3-Probleme (Nr. 109 bis Nr. 118) verfolgen die 4-Phasen-Migration zur Fabrica-Plattformarchitektur (`Fabrica`, `Lathe`, `Scribe`):

| Problem | Titel | Verfolgen | Priorität | Komplexität | Board-Bühne |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | Fundament & Werkzeug | P0 – Kritisch | M | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | Design-Tokens und Benutzeroberfläche | P0 – Kritisch | M | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | Design-Tokens und Benutzeroberfläche | P0 – Kritisch | M | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | Design-Tokens und Benutzeroberfläche | P0 – Kritisch | L | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | Compiler und Adapter | P1 - Hoch | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | Scanner & Laufzeit | P1 - Hoch | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | Scanner & Laufzeit | P2 – Mittel | M | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | Anwendungen & MCP | P1 - Hoch | L | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | Anwendungen & MCP | P1 - Hoch | M | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | Dokumentation | P2 – Mittel | L | `Backlog` |

Die Spezifikationen für das Rebranding-Problem werden im GitHub-Projekt verwaltet, auf das durch die folgenden `project:*`-Befehle verwiesen wird.
Dieses Dokument enthält keine Live-Kopie dieses Backlogs.

---

## 7. GitHub-Projekt- und Board-CLI-Automatisierung

Die Projektverwaltung wird über `scripts/github-project-manager.ts`- und Root-`package.json`-Skripte koordiniert:

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

### 7.1 Einrichtung des GitHub-Authentifizierungsbereichs

Um GitHub Projects v2-Boards (`The Board`) über die CLI zu aktualisieren, muss das GitHub OAuth-Token den Berechtigungsbereich `project` oder `read:project` enthalten.

Führen Sie in Ihrem Terminal aus:

```bash
gh auth refresh -s project,read:project
```

Alternativ können Sie ein persönliches Zugriffstoken mit Projektberechtigungen festlegen:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

Nach der Gewährung synchronisiert `pnpm project:board "The Board"` alle Spaltenübergänge automatisch direkt mit GitHub Projects v2.
