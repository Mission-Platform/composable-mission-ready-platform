# 项目板和 Git 工作树工作流程指南

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> 语言: 简体中文 (zh)

**版本：** 2.0.0
**存储库：** `Mission-Platform/composable-mission-ready-platform`
**里程碑：**

- 里程碑#1：Flint 架构和运行时增强
- 里程碑 #2：UI 组件平台改进和润色
- 里程碑 #3：Fabrica 品牌重塑和多框架现代化

下面的工作树和板表是存储库快照，而不是实时状态。验证分支、问题和拉取请求
在依赖它们之前先在 GitHub 中声明。

---

## 1. 架构动机和效用驱动模型

在具有广泛编译器工具和多个自主代理的高吞吐量、多框架 TypeScript monorepo 中，最大限度地提高开发速度并最大限度地减少摩擦取决于两个核心操作能力：

1. **具有零拷贝 APFS 克隆和共享缓存的隔离 Git 工作树：**
   - **隔离：** 开发人员和自治子代理在专用分支上执行并行工作流，而不会弄脏工作目录、交换分支或丢失存储状态。
   - **APFS 写入时复制：** Node 模块通过 macOS APFS (`cp -cR`) 即时克隆，确保零额外磁盘分配和亚秒级设置时间。
   - **共享 Turbo 缓存：** `.turbo/cache` 在存储库根初始化并在所有链接的工作树之间共享，从而消除了重复的构建和测试周期。
   - **语言服务器奇偶校验：** `agent-lsp.json` 自动同步到每个工作树中，以便代码智能和 IDE 工具立即运行。

2. **确定性项目委员会编排：**
   - 在 **The Board** 上跟踪 5 阶段看板生命周期中的架构里程碑、问题、优先级和状态 (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`)。
   - 只有在通过拉取请求合并到 `main` 后，问题才会被严格标记为 **完成**。

---

## 2. 活动工作树拓扑

|工作树路径 |分公司|主动关注和问题 |状态|
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Monorepo 主工作区、工具、CI 编排 | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` |核心 UI 组件：表格、选项卡、TreeView、SplitPane、多选（#51–#56、#60；PR #63）| `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` |浮动和叠加：CSS 锚点定位回退和对话框/模态统一（#57、#61）| `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` |表单：具有 Zod/Valibot 模式验证的上下文驱动 `ForgeForm` 容器 (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` |选择：异步搜索组合框、去抖和加载状态 (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` |内容：现代化 `ForgeWysiwygEditor` 以消除已弃用的 `execCommand` (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Flint 编译器和运行时：瑞士表、SIMD、SonIR、线性正则表达式（#43–#45、#48）| `LINKED` |

---

## 3.Git工作树管理命令

自动化工作树生命周期工具通过 `scripts/worktree-manager.ts` 和根 `package.json` 脚本提供：

下面的 `pnpm worktree:*` 命令是相应 `scripts/worktree-manager.ts` 的方便别名
命令。当包管理器别名不可用时，直接脚本形式是规范的后备方案。

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

### 3.1 工作树不变量和保障措施

当供应或配置工作树时：

- **基本参考：** 默认情况下，新工作树从 `origin/main` 而不是本地 `HEAD` 干净地分支，从而防止正在进行的分支污染。
- **APFS 写入时复制：** 在 macOS 上，在运行 `pnpm install --frozen-lockfile` 之前通过 `cp -cR` 克隆 `node_modules`，在几秒钟内完成设置，且额外磁盘占用空间为零。
- **Turborepo 缓存共享：** `.turbo/cache` 目录已初始化并在工作树之间共享。
- **LSP 配置：** `agent-lsp.json` 从主存储库镜像。
- **上游构建启动：** 自动启动上游工作区构建依赖项 (`turbo run build --filter <target>^...`) 以消除干净状态测试失败。
- **构建健全性验证：** 运行快速测试检查以验证环境是否完全运行。

---

## 4. 里程碑 2：UI 组件平台改进（“董事会”）

里程碑 2 问题（#51 到 #62）跟踪组件库中的可访问性合规性、交互改进和功能奇偶校验。

### 4.1 问题跟踪和董事会状态

|问题 |标题 |轨道 |优先|复杂性 |董事会舞台|工作树/公关 |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` |无障碍 | P0 - 严重 | S | `In Review` | PR #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` |无障碍 | P0 - 严重 | S | `In Review` | PR #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` |无障碍 | P0 - 严重 |中号 | `In Review` | PR #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` |互动与润色| P1 - 高 |中号 | `In Review` | PR #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` |数据显示奇偶校验| P1 - 高 |中号 | `In Review` | PR #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` |互动与润色| P1 - 高 |中号 | `In Review` | PR #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` |叠加和浮动| P2 - 中 |左 | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` |表格和验证| P2 - 中 | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` |选择和组合框 | P2 - 中 |左 | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` |数据显示奇偶校验| P2 - 中 | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` |叠加和浮动| P2 - 中 |左 | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` |内容与编辑| P2 - 中 | XL | `Ready` | `_content` |

所有问题都直接分配给 GitHub 上的 `@Cethric`。

---

## 5. 里程碑 1：Flint 架构与现代化

里程碑 1 期（#41 到 #50）跟踪编译器核心、SonIR 2.0、标准库和运行时系统：

|问题 |标题 |轨道 |优先|复杂性 |董事会舞台|
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` |编译器核心 | P0 - 严重 | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` |模具和 LSP | P0 - 严重 |左 | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` |标准库| P1 - 高 |左 | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm 和 SIMD | P1 - 高 |左 | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR 与优化 | P2 - 中 | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` |编译器核心| P2 - 中 |左 | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` |文档 | P3 - 低 |中号 | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` |安全与界限| P0 - 严重 |左 | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` |内存和运行时 | P1 - 高 | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` |内存和运行时 | P2 - 中 | XL | `Backlog` |

---

## 6. 里程碑 3：Fabrica 品牌重塑和多框架现代化

里程碑 3 期（#109 到 #118）跟踪到 Fabrica 平台架构的 4 阶段迁移（`Fabrica`、`Lathe`、`Scribe`）：

|问题 |标题 |轨道 |优先|复杂性 |董事会舞台|
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` |基础和工具| P0 - 严重 |中号 | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` |设计代币和 UI | P0 - 严重 |中号 | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` |设计代币和 UI | P0 - 严重 |中号 | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` |设计代币和 UI | P0 - 严重 |左 | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` |编译器和适配器| P1 - 高 | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` |扫描仪和运行时 | P1 - 高 | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` |扫描仪和运行时 | P2 - 中 |中号 | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` |应用和 MCP | P1 - 高 |左 | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` |应用和 MCP | P1 - 高 |中号 | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` |文档 | P2 - 中 |左 | `Backlog` |

品牌重塑问题规范在下面的 `project:*` 命令引用的 GitHub 项目中维护；
本文档不包含该待办事项的实时副本。

---

## 7. GitHub 项目和板 CLI 自动化

项目管理通过 `scripts/github-project-manager.ts` 和根 `package.json` 脚本进行协调：

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

### 7.1 GitHub 身份验证范围设置

要通过 CLI 更新 GitHub Projects v2 板 (`The Board`)，GitHub OAuth 令牌必须包含 `project` 或 `read:project` 权限范围。

在你的终端中执行：

```bash
gh auth refresh -s project,read:project
```

或者，设置具有项目权限的个人访问令牌：

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

授予后，`pnpm project:board "The Board"` 将自动将所有列转换直接同步到 GitHub Projects v2。
