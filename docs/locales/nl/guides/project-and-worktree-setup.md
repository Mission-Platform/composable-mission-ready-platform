# Project Board & Git Worktree-workflowgids

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> Taal: Nederlands (nl)

**Versie:** 2.0.0
**Repository:** `Mission-Platform/composable-mission-ready-platform`
**Mijlpalen:**

- Mijlpaal #1: Flint-architectuur en runtime-verbeteringen
- Mijlpaal #2: Verbeteringen en verfijning van het UI-componentenplatform
- Mijlpaal #3: Fabrica Rebrand & Multi-Framework-modernisering

De werkboom- en bordtabellen hieronder zijn een momentopname van de repository, geen live-status. Verifieer vertakking, probleem en pull-aanvraag
status in GitHub voordat u erop vertrouwt.

---

## 1. Architectuurmotivatie en utiliteitsgedreven model

In een multi-framework TypeScript monorepo met hoge doorvoer, uitgebreide compilertools en meerdere autonome agenten, hangt het maximaliseren van de ontwikkelingssnelheid en het minimaliseren van wrijving af van twee operationele kernmogelijkheden:

1. **Geïsoleerde Git-werkbomen met Zero-Copy APFS-klonen en gedeelde caching:**
   - **Isolatie:** Ontwikkelaars en autonome subagenten voeren parallelle werkstromen uit op specifieke branches zonder de werkmap te vervuilen, branches te verwisselen of de stash-status te verliezen.
   - **APFS Copy-on-Write:** Node-modules worden onmiddellijk gekloond via macOS APFS (`cp -cR`), waardoor geen extra schijftoewijzing en installatietijden van minder dan een seconde worden gegarandeerd.
   - **Gedeelde Turbo-cache:** `.turbo/cache` wordt geïnitialiseerd in de hoofdmap van de repository en gedeeld door alle gekoppelde werkbomen, waardoor dubbele bouw- en testcycli worden geëlimineerd.
   - **Taalserverpariteit:** `agent-lsp.json` wordt automatisch gesynchroniseerd in elke werkboom, zodat code-intelligentie en IDE-tools onmiddellijk werken.

2. **Deterministische Project Board Orchestration:**
   - Het bijhouden van architecturale mijlpalen, problemen, prioriteiten en statussen gedurende een kanban-levenscyclus van 5 fasen (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) op **The Board**.
   - Een probleem wordt slechts strikt gemarkeerd als **Gereed** zodra het is samengevoegd met `main` via een pull-verzoek.

---

## 2. Actieve werkboomtopologie

| Werkboompad | Filiaal | Actieve focus en problemen | Staat |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Monorepo hoofdwerkruimte, tooling, CI-orkestratie | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | Kerncomponenten van de UI: Tabel, Tabbladen, TreeView, SplitPane, Multiselect (#51–#56, #60; PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | Zwevend en overlay: terugval op CSS-ankerpositionering en dialoog/modale unificatie (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | Formulieren: contextgestuurde `ForgeForm`-container met Zod/Valibot-schemavalidatie (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | Selecteer: Asynchrone zoekcombobox, debounce en laadstatussen (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | Inhoud: `ForgeWysiwygEditor` moderniseren om verouderde `execCommand` (#62) te elimineren | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Flint Compiler & Runtime: Zwitserse tabel, SIMD, SonIR, lineaire regex (#43–#45, #48) | `LINKED` |

---

## 3. Git Worktree-beheeropdrachten

Geautomatiseerde werkboomlevenscyclustools worden geleverd via `scripts/worktree-manager.ts`- en root-`package.json`-scripts:

De onderstaande `pnpm worktree:*`-opdrachten zijn gemaksaliassen voor de overeenkomstige `scripts/worktree-manager.ts`
opdrachten. De directe scriptvorm is de canonieke terugval wanneer een pakketbeheerderalias niet beschikbaar is.

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

### 3.1 Worktree-invarianten en beveiligingen

Wanneer een werkboom wordt ingericht of geconfigureerd:

- **Basisreferentie:** Standaard vertakken nieuwe werkbomen zich netjes vanaf `origin/main` in plaats van lokale `HEAD`, waardoor vervuiling van de vertakkingen wordt voorkomen.
- **APFS Copy-on-Write:** Op macOS wordt `node_modules` gekloond via `cp -cR` voordat `pnpm install --frozen-lockfile` wordt uitgevoerd, waardoor de installatie binnen enkele seconden wordt voltooid zonder extra schijfruimte.
- **Turborepo Cache delen:** De map `.turbo/cache` wordt geïnitialiseerd en gedeeld tussen werkbomen.
- **LSP-configuratie:** `agent-lsp.json` wordt gespiegeld vanuit de hoofdrepository.
- **Upstream Build Priming:** Bereidt automatisch de upstream-afhankelijkheden van de werkruimte-build voor (`turbo run build --filter <target>^...`) om testfouten in de schone toestand te elimineren.
- **Build Sanity Verification:** Er wordt een snelle testcontrole uitgevoerd om te verifiëren dat de omgeving volledig operationeel is.

---

## 4. Mijlpaal 2: Verbeteringen van het UI-componentenplatform ("Het bord")

Mijlpaal 2-nummers (#51 tot en met #62) houden de naleving van de toegankelijkheidsregels, het verbeteren van de interactie en de pariteit van functies in de componentbibliotheken bij.

### 4.1 Probleemopvolging en bestuursstatus

| Uitgave | Titel | Volg | Prioriteit | Complexiteit | Bestuursfase | Werkboom / PR |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | Toegankelijkheid | P0 - Kritiek | S | `In Review` | PR #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | Toegankelijkheid | P0 - Kritiek | S | `In Review` | PR #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | Toegankelijkheid | P0 - Kritiek | M | `In Review` | PR #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | Interactie & Pools | P1 - Hoog | M | `In Review` | PR #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | Pariteit gegevensweergave | P1 - Hoog | M | `In Review` | PR #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | Interactie & Pools | P1 - Hoog | M | `In Review` | PR #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | Overlay & zwevend | P2 - Middel | L | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | Formulieren & Validatie | P2 - Middel | XL| `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | Selectie & Combobox | P2 - Middel | L | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | Pariteit gegevensweergave | P2 - Middel | XL| `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | Overlay & zwevend | P2 - Middel | L | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | Inhoud en redactie | P2 - Middel | XL| `Ready` | `_content` |

Alle problemen worden rechtstreeks toegewezen aan `@Cethric` op GitHub.

---

## 5. Mijlpaal 1: Flint Architectuur & Modernisering

Mijlpaal 1-nummers (#41 tot en met #50) volgen de compilerkern, SonIR 2.0, standaardbibliotheek en runtime-systemen:

| Uitgave | Titel | Volg | Prioriteit | Complexiteit | Bestuursfase |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | Compilerkern | P0 - Kritiek | XL| `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Gereedschap & LSP | P0 - Kritiek | L | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | Standaardbibliotheek | P1 - Hoog | L | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm & SIMD | P1 - Hoog | L | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR & Optimalisatie | P2 - Middel | XL| `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | Compilerkern | P2 - Middel | L | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | Documentatie | P3 - Laag | M | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | Beveiliging en grenzen | P0 - Kritiek | L | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | Geheugen en looptijd | P1 - Hoog | XL| `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | Geheugen en looptijd | P2 - Middel | XL| `Backlog` |

---

## 6. Mijlpaal 3: Fabrica Rebrand & Multi-Framework-modernisering

Mijlpaal 3-nummers (#109 tot en met #118) volgen de migratie in vier fasen naar de Fabrica-platformarchitectuur (`Fabrica`, `Lathe`, `Scribe`):

| Uitgave | Titel | Volg | Prioriteit | Complexiteit | Bestuursfase |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | Fundering & Gereedschap | P0 - Kritiek | M | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | Ontwerptokens en gebruikersinterface | P0 - Kritiek | M | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | Ontwerptokens en gebruikersinterface | P0 - Kritiek | M | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | Ontwerptokens en gebruikersinterface | P0 - Kritiek | L | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | Compiler en adapters | P1 - Hoog | XL| `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | Scanner en runtime | P1 - Hoog | XL| `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | Scanner en runtime | P2 - Middel | M | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | Toepassingen & MCP | P1 - Hoog | L | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | Toepassingen & MCP | P1 - Hoog | M | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | Documentatie | P2 - Middel | L | `Backlog` |

De specificaties van het rebrandingprobleem worden bijgehouden in het GitHub-project waarnaar wordt verwezen door de onderstaande `project:*`-opdrachten;
dit document bevat geen live kopie van die achterstand.

---

## 7. GitHub Project & Board CLI-automatisering

Het projectbeheer wordt gecoördineerd via `scripts/github-project-manager.ts`- en root-`package.json`-scripts:

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

### 7.1 GitHub-verificatiebereik instellen

Om GitHub Projects v2-kaarten (`The Board`) bij te werken via de CLI, moet het GitHub OAuth-token het machtigingsbereik `project` of `read:project` bevatten.

Voer in uw terminal uit:

```bash
gh auth refresh -s project,read:project
```

U kunt ook een persoonlijk toegangstoken met projectrechten instellen:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

Eenmaal toegekend, synchroniseert `pnpm project:board "The Board"` automatisch alle kolomovergangen rechtstreeks naar GitHub Projects v2.
