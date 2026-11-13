# Guida al flusso di lavoro Project Board e Git Worktree

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> Lingua: Italiano (it)

**Versione:** 2.0.0
**Archivio:** `Mission-Platform/composable-mission-ready-platform`
**Pietre miliari:**

- Traguardo n. 1: architettura Flint e miglioramenti del runtime
- Traguardo n. 2: miglioramenti e perfezionamento della piattaforma dei componenti dell'interfaccia utente
- Pietra miliare n. 3: rebranding di Fabrica e modernizzazione multi-framework

L'albero di lavoro e le tabelle della scheda riportate di seguito sono uno snapshot del repository, non uno stato live. Verificare ramo, problema e richiesta pull
state in GitHub prima di fare affidamento su di essi.

---

## 1. Motivazione architettonica e modello guidato dall'utilità

In un monorepo TypeScript multi-framework ad alto throughput con strumenti di compilazione estesi e più agenti autonomi, massimizzare la velocità di sviluppo e ridurre al minimo l'attrito dipende da due capacità operative principali:

1. **Alberi di lavoro Git isolati con cloni APFS a copia zero e memorizzazione nella cache condivisa:**
   - **Isolamento:** gli sviluppatori e gli agenti secondari autonomi eseguono flussi di lavoro paralleli su rami dedicati senza sporcare la directory di lavoro, scambiare rami o perdere lo stato di stash.
   - **Copia su scrittura APFS:** i moduli Node vengono clonati istantaneamente tramite macOS APFS (`cp -cR`), garantendo zero allocazione di dischi aggiuntivi e tempi di configurazione inferiori al secondo.
   - **Cache Turbo condivisa:** `.turbo/cache` viene inizializzato nella radice del repository e condiviso tra tutti gli alberi di lavoro collegati, eliminando cicli di creazione e test duplicati.
   - **Parità del server linguistico:** `agent-lsp.json` viene sincronizzato automaticamente in ciascun albero di lavoro in modo che l'intelligenza del codice e gli strumenti IDE funzionino immediatamente.

2. **Orchestrazione deterministica del comitato di progetto:**
   - Monitoraggio dei traguardi architettonici, dei problemi, delle priorità e degli stati in un ciclo di vita kanban in 5 fasi (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) su **The Board**.
   - Un problema viene rigorosamente contrassegnato come **Fine** solo dopo essere stato unito a `main` tramite una richiesta pull.

---

## 2. Topologia dell'albero di lavoro attivo

| Percorso dell'albero di lavoro | Ramo | Focus attivo e problemi | Stato |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Area di lavoro principale di Monorepo, strumenti, orchestrazione CI | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | Componenti principali dell'interfaccia utente: tabella, schede, visualizzazione ad albero, pannello diviso, selezione multipla (#51–#56, #60; PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | Mobile e sovrapposizione: posizionamento di ancoraggio CSS fallback e unificazione finestra di dialogo/modale (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | Moduli: contenitore `ForgeForm` basato sul contesto con convalida dello schema Zod/Valibot (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | Selezionare: casella combinata di ricerca asincrona, antirimbalzo e stati di caricamento (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | Contenuto: Modernizzazione di `ForgeWysiwygEditor` per eliminare `execCommand` deprecato (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Compilatore e runtime Flint: tabella svizzera, SIMD, SonIR, regex lineare (#43–#45, #48) | `LINKED` |

---

## 3. Comandi di gestione Git Worktree

Gli strumenti automatizzati per il ciclo di vita dell'albero di lavoro vengono forniti tramite gli script `scripts/worktree-manager.ts` e root `package.json`:

I comandi `pnpm worktree:*` riportati di seguito sono alias pratici per il corrispondente `scripts/worktree-manager.ts`
comandi. La forma dello script diretto è il fallback canonico quando un alias del gestore pacchetti non è disponibile.

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

### 3.1 Invarianti e salvaguardie dell'albero di lavoro

Quando viene eseguito il provisioning o la configurazione di un albero di lavoro:

- **Riferimento base:** Per impostazione predefinita, i nuovi alberi di lavoro si ramificano in modo pulito da `origin/main` anziché da `HEAD` locale, prevenendo l'inquinamento del ramo in corso.
- **Copia in scrittura APFS:** Su macOS, `node_modules` viene clonato tramite `cp -cR` prima di eseguire `pnpm install --frozen-lockfile`, completando la configurazione in pochi secondi senza alcun ingombro su disco aggiuntivo.
- **Condivisione della cache Turborepo:** la directory `.turbo/cache` viene inizializzata e condivisa tra alberi di lavoro.
- **Configurazione LSP:** `agent-lsp.json` è sottoposto a mirroring dal repository principale.
- **Priming della build upstream:** prepara automaticamente le dipendenze di build dell'area di lavoro upstream (`turbo run build --filter <target>^...`) per eliminare gli errori dei test in stato pulito.
- **Verifica dell'integrità della build:** viene eseguito un rapido test di controllo per verificare che l'ambiente sia completamente operativo.

---

## 4. Traguardo 2: miglioramenti della piattaforma dei componenti dell'interfaccia utente ("The Board")

I problemi della fase 2 (dal n. 51 al n. 62) tengono traccia della conformità all'accessibilità, del perfezionamento dell'interazione e della parità delle funzionalità tra le librerie dei componenti.

### 4.1 Monitoraggio dei problemi e stato del comitato

| Problema | Titolo | Traccia | Priorità | Complessità | Palcoscenico | Albero di lavoro / PR |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | Accessibilità | P0 - Critico | S | `In Review` | PR n.63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | Accessibilità | P0 - Critico | S | `In Review` | PR n. 63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | Accessibilità | P0 - Critico | M | `In Review` | PR n. 63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | Interazione e polacco | P1 - Alto | M | `In Review` | PR n.63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | Parità di visualizzazione dei dati | P1 - Alto | M | `In Review` | PR n.63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | Interazione e polacco | P1 - Alto | M | `In Review` | PR n. 63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | Sovrapponi e fluttua | P2 - Medio | L | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | Moduli e convalida | P2 - Medio | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | Selezione e casella combinata | P2 - Medio | L | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | Parità di visualizzazione dei dati | P2 - Medio | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | Sovrapponi e fluttua | P2 - Medio | L | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | Contenuto ed editore | P2 - Medio | XL | `Ready` | `_content` |

Tutti i problemi vengono assegnati direttamente a `@Cethric` su GitHub.

---

## 5. Pietra miliare 1: architettura e modernizzazione di Flint

I problemi della pietra miliare 1 (dal n. 41 al n. 50) tengono traccia del core del compilatore, SonIR 2.0, della libreria standard e dei sistemi runtime:

| Problema | Titolo | Traccia | Priorità | Complessità | Board Stage   |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | Nucleo del compilatore | P0 - Critico | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Utensili e LSP | P0 - Critico | L | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | Libreria standard | P1 - Alto | L | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm&SIMD | P1 - Alto | L | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR e ottimizzazione | P2 - Medio | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | Nucleo del compilatore | P2 - Medio | L | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | Documentazione | P3 - Basso | M | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | Sicurezza e limiti | P0 - Critico | L | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | Memoria e autonomia | P1 - Alto | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | Memoria e autonomia | P2 - Medio | XL | `Backlog` |

---

## 6. Pietra miliare 3: rebranding di Fabrica e modernizzazione multi-framework

I problemi della fase 3 (dal n. 109 al n. 118) tracciano la migrazione in 4 fasi all'architettura della piattaforma Fabrica (`Fabrica`, `Lathe`, `Scribe`):

| Problema | Titolo | Traccia | Priorità | Complessità | Palcoscenico |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | Fondazione e strumenti | P0 - Critico | M | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | Token di progettazione e interfaccia utente | P0 - Critico | M | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | Token di progettazione e interfaccia utente | P0 - Critico | M | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | Token di progettazione e interfaccia utente | P0 - Critico | L | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | Compilatore e adattatori | P1 - Alto | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | Scanner e runtime | P1 - Alto | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | Scanner e runtime | P2 - Medio | M | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | Applicazioni e MCP | P1 - Alto | L | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | Applicazioni e MCP | P1 - Alto | M | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | Documentazione | P2 - Medio | L | `Backlog` |

Le specifiche relative al problema del rebranding vengono mantenute nel progetto GitHub a cui fanno riferimento i comandi `project:*` di seguito;
questo documento non contiene una copia live di tale backlog.

---

## 7. Progetto GitHub e automazione CLI della scheda

La gestione del progetto è coordinata tramite `scripts/github-project-manager.ts` e gli script root `package.json`:

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

### 7.1 Impostazione dell'ambito di autenticazione GitHub

Per aggiornare le schede GitHub Projects v2 (`The Board`) tramite la CLI, il token GitHub OAuth deve includere l'ambito di autorizzazione `project` o `read:project`.

Esegui nel tuo terminale:

```bash
gh auth refresh -s project,read:project
```

In alternativa, imposta un token di accesso personale con le autorizzazioni del progetto:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

Una volta concesso, `pnpm project:board "The Board"` sincronizzerà automaticamente tutte le transizioni di colonna direttamente su GitHub Projects v2.
