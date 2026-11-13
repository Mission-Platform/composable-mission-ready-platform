# プロジェクト ボードと Git ワークツリー ワークフロー ガイド

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> 言語: 日本語 (ja)

**バージョン:** 2.0.0
**リポジトリ:** `Mission-Platform/composable-mission-ready-platform`
**マイルストーン:**

- マイルストーン #1: Flint アーキテクチャとランタイムの機能強化
- マイルストーン #2: UI コンポーネント プラットフォームの改善と洗練
- マイルストーン #3: Fabrica のブランド変更とマルチフレームワークの最新化

以下のワークツリーとボードのテーブルはリポジトリのスナップショットであり、ライブ ステータスではありません。ブランチ、発行、プルリクエストを確認する
依存する前に GitHub で状態を確認してください。

---

## 1. 建築上の動機と実用性主導のモデル

広範なコンパイラ ツールと複数の自律エージェントを備えた高スループットのマルチフレームワーク TypeScript モノリポジトリでは、開発速度の最大化と摩擦の最小化は、次の 2 つのコアとなる運用機能に依存します。

1. **ゼロコピー APFS クローンと共有キャッシュを備えた分離された Git ワークツリー:**
   - **分離:** 開発者と自律サブエージェントは、作業ディレクトリを汚したり、ブランチを交換したり、スタッシュ状態を失ったりすることなく、専用ブランチ上で並列ワークストリームを実行します。
   - **APFS コピーオンライト:** Node モジュールは macOS APFS (`cp -cR`) 経由で即座にクローン作成され、余分なディスク割り当てがゼロで、セットアップ時間が 1 秒未満であることが保証されます。
   - **共有 Turbo キャッシュ:** `.turbo/cache` はリポジトリ ルートで初期化され、リンクされたすべてのワークツリー間で共有されるため、重複したビルド サイクルとテスト サイクルが排除されます。
   - **言語サーバー パリティ:** `agent-lsp.json` は各ワークツリーに自動的に同期されるため、コード インテリジェンスと IDE ツールが即座に動作します。

2. **決定的なプロジェクト委員会のオーケストレーション:**
   - **The Board** で、5 段階のかんばんライフサイクル (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) 全体にわたるアーキテクチャのマイルストーン、問題、優先順位、ステータスを追跡します。
   - 問題は、プル リクエストを通じて `main` にマージされた場合のみ、厳密に **Done** とマークされます。

---

## 2. アクティブなワークツリー トポロジ

|ワークツリーのパス |支店 |アクティブな焦点と問題 |状態 |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Monorepo のメイン ワークスペース、ツール、CI オーケストレーション | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` |コア UI コンポーネント: テーブル、タブ、ツリービュー、SplitPane、複数選択 (#51 ～ #56、#60; PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` |フロートとオーバーレイ: CSS アンカー位置のフォールバックとダイアログ/モーダルの統合 (#57、#61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` |フォーム: Zod/Valibot スキーマ検証を備えたコンテキスト駆動型 `ForgeForm` コンテナー (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` |選択: 非同期検索コンボボックス、デバウンス、および読み込み状態 (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` |内容: `ForgeWysiwygEditor` を最新化し、非推奨の `execCommand` を削除 (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Flint コンパイラーとランタイム: スイス テーブル、SIMD、SonIR、線形正規表現 (#43 ～ #45、#48) | `LINKED` |

---

## 3. Git Worktree 管理コマンド

自動化されたワークツリー ライフサイクル ツールは、`scripts/worktree-manager.ts` およびルート `package.json` スクリプトによって提供されます。

以下の `pnpm worktree:*` コマンドは、対応する `scripts/worktree-manager.ts` の便利なエイリアスです。
コマンド。直接スクリプト形式は、パッケージ マネージャーのエイリアスが使用できない場合の正規のフォールバックです。

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

### 3.1 ワークツリーの不変条件と安全対策

ワークツリーがプロビジョニングまたは構成されている場合:

- **基本リファレンス:** デフォルトでは、新しいワークツリーはローカルの `HEAD` ではなく `origin/main` からきれいに分岐し、進行中のブランチ汚染を防ぎます。
- **APFS コピーオンライト:** macOS では、`pnpm install --frozen-lockfile` を実行する前に `node_modules` が `cp -cR` 経由でクローン化され、余分なディスク フットプリントがゼロでセットアップが数秒で完了します。
- **Turborepo キャッシュ共有:** `.turbo/cache` ディレクトリが初期化され、ワー​​クツリー全体で共有されます。
- **LSP 構成:** `agent-lsp.json` はメイン リポジトリからミラーリングされます。
- **アップストリーム ビルド プライミング:** アップストリーム ワークスペースのビルド依存関係 (`turbo run build --filter <target>^...`) を自動的にプライミングし、クリーンな状態のテストの失敗を排除します。
- **ビルド健全性検証:** 環境が完全に動作していることを確認するために、簡単なテスト チェックが実行されます。

---

## 4. マイルストーン 2: UI コンポーネント プラットフォームの改善 (「ボード」)

マイルストーン 2 の問題 (#51 から #62) は、アクセシビリティのコンプライアンス、インタラクションの洗練、およびコンポーネント ライブラリ全体にわたる機能の同等性を追跡します。

### 4.1 問題の追跡と取締役会の状態

|問題 |タイトル |トラック |優先順位 |複雑さ |ボードステージ |ワークツリー / PR |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` |アクセシビリティ | P0 - クリティカル | S | `In Review` | PR #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` |アクセシビリティ | P0 - クリティカル | S | `In Review` | PR #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` |アクセシビリティ | P0 - クリティカル | M | `In Review` | PR #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` |インタラクションと磨き | P1 - 高 | M | `In Review` | PR #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` |データ表示パリティ | P1 - 高 | M | `In Review` | PR #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` |インタラクションと磨き | P1 - 高 | M | `In Review` | PR #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` |オーバーレイとフロート | P2 - 中 | Ｌ | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` |フォームと検証 | P2 - 中 | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` |選択とコンボボックス | P2 - 中 | Ｌ | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` |データ表示パリティ | P2 - 中 | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` |オーバーレイとフロート | P2 - 中 | Ｌ | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` |コンテンツと編集者 | P2 - 中 | XL | `Ready` | `_content` |

すべての問題は、GitHub 上の `@Cethric` に直接割り当てられます。

---

## 5. マイルストーン 1: フリント アーキテクチャと近代化

マイルストーン 1 の問題 (#41 ～ #50) は、コンパイラ コア、SonIR 2.0、標準ライブラリ、およびランタイム システムを追跡します。

|問題 |タイトル |トラック |優先順位 |複雑さ |ボードステージ |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` |コンパイラコア | P0 - クリティカル | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` |ツールとLSP | P0 - クリティカル | Ｌ | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` |標準ライブラリ | P1 - 高 | Ｌ | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm と SIMD | P1 - 高 | Ｌ | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR と最適化 | P2 - 中 | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` |コンパイラコア | P2 - 中 | Ｌ | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` |ドキュメント | P3 - 低 | M | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` |セキュリティと境界 | P0 - クリティカル | Ｌ | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` |メモリとランタイム | P1 - 高 | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` |メモリとランタイム | P2 - 中 | XL | `Backlog` |

---

## 6. マイルストーン 3: Fabrica のブランド変更とマルチフレームワークの最新化

マイルストーン 3 の問題 (#109 ～ #118) は、 Fabrica プラットフォーム アーキテクチャ (`Fabrica`、`Lathe`、`Scribe`) への 4 段階の移行を追跡します。

|問題 |タイトル |トラック |優先順位 |複雑さ |ボードステージ |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` |基礎と工具 | P0 - クリティカル | M | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` |デザイントークンとUI | P0 - クリティカル | M | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` |デザイントークンとUI | P0 - クリティカル | M | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` |デザイントークンとUI | P0 - クリティカル | Ｌ | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` |コンパイラーとアダプター | P1 - 高 | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` |スキャナーとランタイム | P1 - 高 | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` |スキャナーとランタイム | P2 - 中 | M | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` |アプリケーションと MCP | P1 - 高 | Ｌ | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` |アプリケーションと MCP | P1 - 高 | M | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` |ドキュメント | P2 - 中 | Ｌ | `Backlog` |

ブランド変更の問題の仕様は、以下の `project:*` コマンドによって参照される GitHub プロジェクトで維持されます。
このドキュメントには、そのバックログのライブ コピーは含まれていません。

---

## 7. GitHub プロジェクトとボード CLI の自動化

プロジェクト管理は、`scripts/github-project-manager.ts` およびルート `package.json` スクリプトを介して調整されます。

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

### 7.1 GitHub 認証スコープの設定

CLI 経由で GitHub プロジェクト v2 ボード (`The Board`) を更新するには、GitHub OAuth トークンに `project` または `read:project` 権限スコープが含まれている必要があります。

ターミナルで実行します。

```bash
gh auth refresh -s project,read:project
```

または、プロジェクト権限を使用して個人アクセス トークンを設定します。

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

付与されると、`pnpm project:board "The Board"` はすべての列遷移を GitHub プロジェクト v2 に直接自動的に同期します。
