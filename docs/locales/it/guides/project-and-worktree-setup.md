# Project Board & Git Worktree Workflow Guide

**Version:** 2.0.0  
**Repository:** `Mission-Platform/composable-mission-ready-platform`  
**Milestones:**

- Milestone #1: Flint Architecture & Runtime Enhancements
- Milestone #2: UI Component Platform Improvements & Polish

---

## 1. Architectural Motivation & Utility-Driven Model

In a high-throughput, multi-framework TypeScript monorepo with extensive compiler tooling and multiple autonomous agents, maximizing development velocity and minimizing friction depends on two core operational capabilities:

1. **Isolated Git Worktrees with Zero-Copy APFS Clones & Shared Caching:**
   - **Isolation:** Developers and autonomous sub-agents execute parallel workstreams on dedicated branches without dirtying the working directory, swapping branches, or losing stash state.
   - **APFS Copy-on-Write:** Node modules are cloned instantaneously via macOS APFS (`cp -cR`), ensuring zero extra disk allocation and sub-second setup times.
   - **Shared Turbo Cache:** `.turbo/cache` is initialized at the repository root and shared across all linked worktrees, eliminating duplicate build and test cycles.
   - **Language Server Parity:** `agent-lsp.json` is automatically synchronized into each worktree so code intelligence and IDE tooling operate immediately.

2. **Deterministic Project Board Orchestration:**
   - Tracking architectural milestones, issues, priorities, and statuses across a 5-stage kanban lifecycle (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) on **The Board**.
   - An issue is strictly marked **Done** only once merged to `main` via a pull request.

---

## 2. Active Worktree Topology

| Worktree Path                                  | Branch                            | Active Focus & Issues                                                                                                                         | State    |
| :--------------------------------------------- | :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform`            | `chore/full-build-and-tooling`    | Monorepo main workspace, tooling, CI orchestration                                                                                                                | `MAIN`   |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | Core UI Components: Table, Tabs, TreeView, SplitPane, Multiselect (#51–#56, #60; PR #63)                                       | `LINKED` |
| `composable_mission_ready_platform_float`      | `feat/ui-float-modernization`     | Float & Overlay: CSS Anchor Positioning fallback & Dialog/Modal unification (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms`      | `feat/ui-forms-context`           | Forms: Context-driven `ForgeForm` container with Zod/Valibot schema validation (#58)                                           | `LINKED` |
| `composable_mission_ready_platform_select`     | `feat/ui-select-combobox`         | Select: Async search combobox, debounce, and loading states (#59)                                                              | `LINKED` |
| `composable_mission_ready_platform_content`    | `feat/ui-content-editor`          | Content: Modernizing `ForgeWysiwygEditor` to eliminate deprecated `execCommand` (#62)                                          | `LINKED` |
| `composable_mission_ready_platform_flint`      | `feat/flint-architecture`         | Flint Compiler & Runtime: Swiss table, SIMD, SonIR, Linear regex (#43–#45, #48)                            | `LINKED` |

---

## 3. Git Worktree Management Commands

Automated worktree lifecycle tooling is provided via `scripts/worktree-manager.ts` and root `package.json` scripts:

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

### 3.1 Worktree Invariants & Safeguards

When a worktree is provisioned or configured:

- **Base Reference:** By default, new worktrees branch cleanly from `origin/main` rather than local `HEAD`, preventing in-progress branch pollution.
- **APFS Copy-on-Write:** On macOS, `node_modules` is cloned via `cp -cR` before running `pnpm install --frozen-lockfile`, completing setup in seconds with zero extra disk footprint.
- **Turborepo Cache Sharing:** The `.turbo/cache` directory is initialized and shared across worktrees.
- **LSP Configuration:** `agent-lsp.json` is mirrored from the main repository.
- **Upstream Build Priming:** Automatically primes upstream workspace build dependencies (`turbo run build --filter <target>^...`) to eliminate clean-state test failures.
- **Build Sanity Verification:** A quick test check runs to verify that the environment is fully operational.

---

## 4. Milestone 2: UI Component Platform Improvements ("The Board")

Milestone 2 issues (#51 through #62) track accessibility compliance, interaction polish, and feature parity across the component libraries.

### 4.1 Issue Tracking & Board State

| Issue   | Title                                                                                          | Track                                    | Priority      | Complexity | Board Stage | Worktree / PR                             |
| :------ | :--------------------------------------------------------------------------------------------- | :--------------------------------------- | :------------ | :--------- | :---------- | :---------------------------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation`                       | Accessibility                            | P0 - Critical | S          | `In Review` | PR #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button`               | Accessibility                            | P0 - Critical | S          | `In Review` | PR #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)`  | Accessibility                            | P0 - Critical | M          | `In Review` | PR #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing`                     | Interaction & Polish | P1 - High     | M          | `In Review` | PR #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable`                        | Data Display Parity                      | P1 - High     | M          | `In Review` | PR #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)`                      | Interaction & Polish | P1 - High     | M          | `In Review` | PR #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported`             | Overlay & Float      | P2 - Medium   | L          | `Ready`     | `_float`                                  |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation`                       | Forms & Validation   | P2 - Medium   | XL         | `Ready`     | `_forms`                                  |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox`  | Selection & Combobox | P2 - Medium   | L          | `Ready`     | `_select`                                 |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable`                  | Data Display Parity                      | P2 - Medium   | XL         | `Ready`     | `_components`                             |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive`        | Overlay & Float      | P2 - Medium   | L          | `Ready`     | `_float`                                  |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | Content & Editor     | P2 - Medium   | XL         | `Ready`     | `_content`                                |

All issues are assigned directly to `@Cethric` on GitHub.

---

## 5. Milestone 1: Flint Architecture & Modernization

Milestone 1 issues (#41 through #50) track the compiler core, SonIR 2.0, standard library, and runtime systems:

| Issue   | Title                                                                                 | Track                                    | Priority      | Complexity | Board Stage   |
| :------ | :------------------------------------------------------------------------------------ | :--------------------------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization`               | Compiler Core                            | P0 - Critical | XL         | `Ready`       |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Tooling & LSP        | P0 - Critical | L          | `Ready`       |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration`               | Standard Library                         | P1 - High     | L          | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations`      | Wasm & SIMD          | P1 - High     | L          | `Ready`       |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP`               | SonIR & Optimization | P2 - Medium   | XL         | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator`       | Compiler Core                            | P2 - Medium   | L          | `Backlog`     |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs`    | Documentation                            | P3 - Low      | M          | `In Review`   |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | Security & Bounds    | P0 - Critical | L          | `In Review`   |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator`         | Memory & Runtime     | P1 - High     | XL         | `Backlog`     |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync`   | Memory & Runtime     | P2 - Medium   | XL         | `Backlog`     |

---

## 6. GitHub Project & Board CLI Automation

Project management is coordinated via `scripts/github-project-manager.ts` and root `package.json` scripts:

```bash
# 1. View current project status and board stage mapping
pnpm project:status [components|flint|all]

# 2. Export deterministic project plans (docs/ui-components-project-plan.json & docs/flint-project-plan.json)
pnpm project:plan

# 3. Synchronize items and column transitions on "The Board"
pnpm project:board "The Board"

# 4. Provision or configure GitHub Project v2 via GraphQL
pnpm project:setup [components|flint]
```

### 6.1 GitHub Authentication Scope Setup

To update GitHub Projects v2 boards (`The Board`) via the CLI, the GitHub OAuth token must include the `project` or `read:project` permission scope.

Execute in your terminal:

```bash
gh auth refresh -s project,read:project
```

Alternatively, set a personal access token with project permissions:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

Once granted, `pnpm project:board "The Board"` will automatically sync all column transitions directly to GitHub Projects v2.
