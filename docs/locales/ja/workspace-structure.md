# ワークスペースの構造

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/workspace-structure.md](../../workspace-structure.md)
> 言語: 日本語 (ja)

このドキュメントは、Mission Platform のモノリポジトリのレイアウト、ディレクトリの目的、および内部的なリポジトリに関する技術リファレンスを提供します。
パッケージの規約。

## モノリポジトリのレイアウト リファレンス

ミッションプラットフォームの用途 pnpm ワークスペースと Turborepo を使用してマルチパッケージ環境を管理します。リポジトリが整理されている
機能層に分割します。

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

## プライマリディレクトリ

### 1. `apps/` （申請）

アプリケーションは、機能を構成する展開可能なユニットです。 `packages/` ディレクトリ。彼らは通常プライベートです
レジストリに公開されることはありません。

- **`docs/`**: Vite + Vue Markdown コーパスのドキュメント サイト。
- **`my-care-notes/`**: 主力のケアノート アプリケーション。
- **`service-monitor/`**: Durable Object によってサポートされる RedwoodSDK サービス健全性ダッシュボード。
- **`website/`**: Mission Platform のマーケティングおよび製品 Web サイト。
- **`storybook/`**: コンポーネント ワークベンチとビジュアル テスト スイート。

### 2. `packages/` (積み木)

アプリによって使用される、再利用可能なバージョン管理されたライブラリ。これらは、可能な限りフレームワークに依存しないように設計されています。

- **`@mission-platform/forge`**: フレームワークに依存しない JSX ランタイムとアダプター。
- **`@mission-platform/components`**: マルチフレームワークコンポーネントライブラリ。
- **`@mission-platform/forms`** そして **`@mission-platform/forms-core`**: スキーマ駆動のフォーム プリミティブ。
- **`@mission-platform/content`** そして **`@mission-platform/email-renderer`**: コンテンツとレンダリング パイプライン。
- **`@mission-platform/tokens`**: 信頼できるトークンのソースを設計します。
- **`@mission-platform/router`** そして **`@mission-platform/i18n`**: フレームワークに依存しないルーティングとローカリゼーション。
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**、 そして
  **`@mission-platform/qr-code`**: Wasm ベースのスキャンおよびエンコード パッケージ。

### 3. `configs/` (ツーリング基盤)

すべてのワークスペース間で一貫性を確保する共有構成。このディレクトリ内のパッケージは通常、次のように使用されます。
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**、 そして **`stylelint-config/`**: リンティングとフォーマットのルール。
- **`typescript-config/`**: ベース `tsconfig.json` のファイル Node、DOM、ライブラリ、およびフレームワークのコンシューマ。
- **`tsdown-config/`** そして **`vite-config/`**: 共通ライブラリ、アプリ、 Vite、 そして Vitest パターンを構築します。
- **`i18n-config/`** そして **`storybook-framework/`**: 共有ロケール抽出とフレームワークワークベンチ設定。

### 4. `vite-plugins/` (拡張機能のビルド)

を拡張するカスタム プラグイン Vite ビルドプロセス。

- **`forge/`**: Forge コンポーネント用のマルチステージ コンパイラ。
- **`tokens/`**: DTCG トークン定義からコード アーティファクトを生成します。
- **`i18n/`**: ロケールの読み込みと静的抽出を処理します。

### 5. `workers/` (エッジサービス)

サーバー側ロジックと最適化されたアセット配信のための Cloudflare Workers。

- **`api-proxy/`**: 承認された API ルートへの制限付き読み取り専用アクセスを提供します。
- **`email-sender/`**: ローカルの MailPit 支援の電子メール ショーケース ワーカー。
- **`forge-spa/`**: 静的アセットを提供します。 `ASSETS`-バインディング SPA フォールバック。

デプロイ可能なアプリケーション ワーカーは次のように構成されます。 `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`、 そして `apps/service-monitor/wrangler.jsonc`。の
`api-proxy` そして `forge-spa` パッケージはスタンドアロンではなくバンドルされた依存関係です Wrangler 展開。

## パッケージの内部規約

予測可能な環境を維持するために、すべてのパッケージとアプリは標準の内部レイアウトに従います。

### 標準 `src/` 階層

ソース コードは機能タイプごとに編成されています。

- **`components/`**: UI ロジック (SFC または TSX)。
- **`composables/`**: リアクティブロジックとフック。
- **`utils/`**: 純粋な関数とフレームワークに依存しないヘルパー。
- **`locales/`**: JSON/YAML 翻訳ファイル。
- **`styles/`**: SCSS 部分と設計システムの統合。

### バレルエクスポートパターン

内のすべてのディレクトリ `src/` が含まれている必要があります `index.ts` (バレルファイル)。

- サブディレクトリは、ローカル経由で内部シンボルをエクスポートします。 `index.ts`。
- 根 `src/index.ts` ワークスペース メンバー全体のパブリック エントリ ポイントとして機能します。

## ルート構成レジストリ

リポジトリ ルートにあるキー ファイルは、モノリポジトリの動作を制御します。

|ファイル |目的 |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   |ワークスペース境界、メンバー グロブ、および依存関係カタログを定義します。 |
| `turbo.json`            |ビルド パイプラインとタスク キャッシュを調整します。                    |
| `package.json`          |ルートレベルのスクリプトとモノリポジトリ全体の devDependency。                |
| `commitlint.config.mjs` |従来のコミット仕様を強制します。                     |

## 依存関係とワークスペースの管理

ミッションプラットフォームは、 `workspace:*` 内部依存関係のプロトコル。これにより、パッケージは常に
開発中の他のワークスペース メンバーのローカル バージョン。

### PNPM カタログ

リポジトリは ** を利用しますpnpm カタログ** (定義: `pnpm-workspace.yaml`) 依存関係のバージョンを一元管理する
モノレポ。これにより、バージョンのドリフトが防止され、メンテナンスが簡素化されます。

### タスクの実行

クロスワークスペースタスクはルート経由で実行されます `package.json` ターボレポを使用して:

- `pnpm build`: すべてのワークスペースを正しい依存関係の順序で構築します。
- `pnpm test`: すべてのワークスペースに対してテスト スイートを実行します。 `test` タスク。使用 `pnpm exec turbo run test --affected` のために
  変更されたワークスペースの CI スコープ。
- `pnpm lint`： 走る ESLint ワークスペース全体で。
- `pnpm lint:style`： 走る Stylelint アプリとパッケージのスタイル用。
- `pnpm format`: でフォーマットを確認します Prettier.
- `pnpm i18n:extract`: カタログを所有するワークスペースの翻訳キーを抽出します。
