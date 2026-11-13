# Tableau de projet et guide de flux de travail Git Worktree

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> Langue: Français (fr)

**Version :** 2.0.0
**Dépôt :** `Mission-Platform/composable-mission-ready-platform`
**Jalons :**

- Jalon n°1 : Architecture Flint et améliorations du temps d'exécution
- Jalon n°2 : améliorations et polissage de la plate-forme de composants d'interface utilisateur
- Jalon n°3 : Rebranding de Fabrica et modernisation multi-cadre

Les tableaux de l'arbre de travail et du tableau ci-dessous sont un instantané du référentiel, et non un statut en direct. Vérifier la branche, le problème et la demande d'extraction
état dans GitHub avant de s’appuyer sur eux.

---

## 1. Motivation architecturale et modèle axé sur les utilités

Dans un monorepo TypeScript multi-framework à haut débit avec des outils de compilation étendus et plusieurs agents autonomes, maximiser la vitesse de développement et minimiser les frictions dépend de deux capacités opérationnelles principales :

1. **Arbres de travail Git isolés avec clones APFS sans copie et mise en cache partagée :**
   - **Isolement :** Les développeurs et les sous-agents autonomes exécutent des flux de travail parallèles sur des branches dédiées sans salir le répertoire de travail, échanger des branches ou perdre l'état de stockage.
   - **APFS Copy-on-Write :** Les modules Node sont clonés instantanément via macOS APFS (`cp -cR`), garantissant ainsi aucune allocation de disque supplémentaire et des temps de configuration inférieurs à une seconde.
   - **Cache Turbo partagé :** `.turbo/cache` est initialisé à la racine du référentiel et partagé entre toutes les arborescences de travail liées, éliminant ainsi les cycles de construction et de test en double.
   - **Parité du serveur de langue :** `agent-lsp.json` est automatiquement synchronisé dans chaque arbre de travail afin que l'intelligence du code et les outils IDE fonctionnent immédiatement.

2. **Orchestration déterministe du comité de projet :**
   - Suivi des jalons architecturaux, des problèmes, des priorités et des statuts tout au long d'un cycle de vie kanban en 5 étapes (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) sur **The Board**.
   - Un problème est strictement marqué **Terminé** une seule fois fusionné avec `main` via une pull request.

---

## 2. Topologie d'arbre de travail actif

| Chemin de l'arbre de travail | Branche | Concentration active et problèmes | État |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Espace de travail principal Monorepo, outils, orchestration CI | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | Composants de base de l'interface utilisateur : tableau, onglets, TreeView, SplitPane, Multiselect (#51–#56, #60 ; PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | Flottant et superposition : repli du positionnement de l'ancre CSS et unification des dialogues/modales (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | Forms : conteneur `ForgeForm` contextuel avec validation de schéma Zod/Valibot (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | Sélectionnez : liste déroulante de recherche asynchrone, anti-rebond et états de chargement (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | Contenu : Modernisation de `ForgeWysiwygEditor` pour éliminer `execCommand` obsolète (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Compilateur et runtime Flint : table suisse, SIMD, SonIR, regex linéaire (#43–#45, #48) | `LINKED` |

---

## 3. Commandes de gestion Git Worktree

Les outils automatisés de cycle de vie des arbres de travail sont fournis via les scripts `scripts/worktree-manager.ts` et racine `package.json` :

Les commandes `pnpm worktree:*` ci-dessous sont des alias pratiques pour le `scripts/worktree-manager.ts` correspondant.
commandes. La forme de script direct est la solution de secours canonique lorsqu'un alias de gestionnaire de packages n'est pas disponible.

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

### 3.1 Invariants et sauvegardes de l'arbre de travail

Lorsqu'un arbre de travail est provisionné ou configuré :

- **Référence de base :** Par défaut, les nouveaux arbres de travail se branchent proprement à partir de `origin/main` plutôt qu'à partir de `HEAD` local, empêchant ainsi la pollution des branches en cours.
- **Copie sur écriture APFS :** Sur macOS, `node_modules` est cloné via `cp -cR` avant d'exécuter `pnpm install --frozen-lockfile`, complétant ainsi la configuration en quelques secondes sans empreinte disque supplémentaire.
- **Partage de cache Turborepo :** Le répertoire `.turbo/cache` est initialisé et partagé entre les arbres de travail.
- **Configuration LSP :** `agent-lsp.json` est mis en miroir à partir du référentiel principal.
- **Amorçage de la construction en amont :** amorce automatiquement les dépendances de construction de l'espace de travail en amont (`turbo run build --filter <target>^...`) pour éliminer les échecs des tests d'état propre.
- **Build Sanity Verification :** Un test rapide est effectué pour vérifier que l'environnement est pleinement opérationnel.

---

## 4. Jalon 2 : améliorations de la plate-forme de composants d'interface utilisateur ("Le Conseil")

Les problèmes Milestone 2 (#51 à #62) suivent la conformité en matière d'accessibilité, le perfectionnement des interactions et la parité des fonctionnalités dans les bibliothèques de composants.

### 4.1 Suivi des problèmes et état de la carte

| Problème | Titre | Piste | Priorité | Complexité | Scène du conseil d'administration | Arbre de travail / RP |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | Accessibilité | P0 - Critique | S | `In Review` | RP #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | Accessibilité | P0 - Critique | S | `In Review` | RP #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | Accessibilité | P0 - Critique | M | `In Review` | RP #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | Interaction et polonais | P1 - Élevé | M | `In Review` | RP #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | Parité d'affichage des données | P1 - Élevé | M | `In Review` | RP #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | Interaction et polonais | P1 - Élevé | M | `In Review` | RP #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | Superposition et flottement | P2 - Moyen | L | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | Formulaires et validation | P2 - Moyen | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | Sélection et Combobox | P2 - Moyen | L | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | Parité d'affichage des données | P2 - Moyen | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | Superposition et flottement | P2 - Moyen | L | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | Contenu et éditeur | P2 - Moyen | XL | `Ready` | `_content` |

Tous les problèmes sont attribués directement à `@Cethric` sur GitHub.

---

## 5. Jalon 1 : Architecture et modernisation du silex

Les problèmes du jalon 1 (#41 à #50) suivent le cœur du compilateur, SonIR 2.0, la bibliothèque standard et les systèmes d'exécution :

| Problème | Titre | Piste | Priorité | Complexité | Scène du conseil d'administration |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | Noyau du compilateur | P0 - Critique | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Outillage & LSP | P0 - Critique | L | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | Bibliothèque standard | P1 - Élevé | L | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm et SIMD | P1 - Élevé | L | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR et optimisation | P2 - Moyen | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | Noyau du compilateur | P2 - Moyen | L | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | Documents | P3 - Faible | M | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | Sécurité et limites | P0 - Critique | L | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | Mémoire et durée d'exécution | P1 - Élevé | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | Mémoire et durée d'exécution | P2 - Moyen | XL | `Backlog` |

---

## 6. Jalon 3 : Rebranding de Fabrica et modernisation multi-cadre

Les problèmes Milestone 3 (#109 à #118) suivent la migration en 4 phases vers l'architecture de la plateforme Fabrica (`Fabrica`, `Lathe`, `Scribe`) :

| Problème | Titre | Piste | Priorité | Complexité | Scène du conseil d'administration |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | Fondation et outillage | P0 - Critique | M | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | Jetons de conception et interface utilisateur | P0 - Critique | M | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | Jetons de conception et interface utilisateur | P0 - Critique | M | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | Jetons de conception et interface utilisateur | P0 - Critique | L | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | Compilateur et adaptateurs | P1 - Élevé | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | Scanner et exécution | P1 - Élevé | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | Scanner et exécution | P2 - Moyen | M | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | Applications et MCP | P1 - Élevé | L | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | Applications et MCP | P1 - Élevé | M | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | Documents | P2 - Moyen | L | `Backlog` |

Les spécifications du problème de changement de marque sont conservées dans le projet GitHub référencé par les commandes `project:*` ci-dessous ;
ce document ne contient pas de copie dynamique de cet arriéré.

---

## 7. Automatisation du projet GitHub et de la CLI du tableau

La gestion du projet est coordonnée via les scripts `scripts/github-project-manager.ts` et racine `package.json` :

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

### 7.1 Configuration de la portée d'authentification GitHub

Pour mettre à jour les cartes GitHub Projects v2 (`The Board`) via la CLI, le jeton GitHub OAuth doit inclure l'étendue d'autorisation `project` ou `read:project`.

Exécutez dans votre terminal :

```bash
gh auth refresh -s project,read:project
```

Vous pouvez également définir un jeton d'accès personnel avec les autorisations du projet :

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

Une fois accordé, `pnpm project:board "The Board"` synchronisera automatiquement toutes les transitions de colonnes directement avec les projets GitHub v2.
