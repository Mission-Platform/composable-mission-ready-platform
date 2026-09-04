# ワークスペースの構造

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> 言語: 日本語 (ja)

このドキュメントは、Mission Platform モノリポジトリのレイアウト、ディレクトリの目的、および内部的なリポジトリに関する技術リファレンスを提供します。
パッケージの規約。

## モノリポジトリのレイアウト リファレンス

Mission Platform は、pnpm ワークスペースと Turborepo を使用してマルチパッケージ環境を管理します。リポジトリが整理されている
機能層に分割します。

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/tooling/configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── packages/tooling/vite/           # Build-time extensions and compilers
├── packages/edge/workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## プライマリディレクトリ

### 1. `apps/` (アプリケーション)

アプリケーションは、`packages/` ディレクトリから機能を構成する展開可能な単位です。彼らは通常プライベートです
レジストリに公開されることはありません。

- **`docs/`**: Markdown コーパスの Vite + Vue ドキュメント サイト。
- **`my-care-notes/`**: 主力のケアノート アプリケーション。
- **`service-monitor/`**: Durable Object によってサポートされる RedwoodSDK サービス健全性ダッシュボード。
- **`website/`**: Mission Platform のマーケティングおよび製品 Web サイト。
- **`storybook/`**: コンポーネント ワークベンチおよびビジュアル テスト スイート。

### 2. `packages/` (ビルディングブロック)

アプリによって使用される、再利用可能なバージョン管理されたライブラリ。これらは、可能な限りフレームワークに依存しないように設計されています。

- **`@mission-platform/forge-jsx`**: フレームワークに依存しない JSX ランタイムとアダプター。
- **`@mission-platform/components`**: マルチフレームワーク コンポーネント ライブラリ。
- **`@mission-platform/forms`** および **`@mission-platform/forms-core`**: スキーマ駆動のフォーム プリミティブ。
- **`@mission-platform/content`** および **`@mission-platform/email-renderer`**: コンテンツとレンダリング パイプライン。
- **`@mission-platform/tokens`**: 信頼できるデザイン トークン ソース。
- **`@mission-platform/router`** および **`@mission-platform/i18n`**: フレームワークに依存しないルーティングとローカリゼーション。
- **`@mission-platform/barcode`**、**`@mission-platform/code-scanner`**、**`@mission-platform/matrix-code`**、および
  **`@mission-platform/qr-code`**: Wasm 支援のスキャンおよびエンコード パッケージ。

### 3. `packages/tooling/configs/` (ツール財団)

すべてのワークスペース間で一貫性を確保する共有構成。このディレクトリ内のパッケージは通常、次のように使用されます。
`devDependencies`。

- **`eslint-config/`**、**`prettier-config/`**、**`stylelint-config/`**: リンティングとフォーマットのルール。
- **`typescript-config/`**: Node、DOM、ライブラリ、およびフレームワーク コンシューマ用のベース `tsconfig.json` ファイル。
- **`tsdown-config/`** および **`vite-config/`**: 共通ライブラリ、アプリ、Vite、および Vitest ビルド パターン。
- **`i18n-config/`** および **`storybook-framework/`**: 共有ロケール抽出およびフレームワーク ワークベンチ設定。

### 4. `packages/tooling/vite/` (ビルド拡張機能)

Vite ビルド プロセスを拡張するカスタム プラグイン。

- **`forge/`**: Forge コンポーネント用のマルチステージ コンパイラ。
- **`tokens/`**: DTCG トークン定義からコード アーティファクトを生成します。
- **`i18n/`**: ロケールの読み込みと静的抽出を処理します。

### 5. `packages/edge/workers/` (エッジサービス)

サーバー側ロジックと最適化されたアセット配信のための Cloudflare Workers。

- **`api-proxy/`**: 承認された API ルートへの制限付き読み取り専用アクセスを提供します。
- **`email-sender/`**: ローカルの MailPit を利用した電子メール ショーケース ワーカー。
- **`forge-spa/`**: `ASSETS` バインディング SPA フォールバックを使用して静的アセットを提供します。

デプロイ可能なアプリケーション ワーカーは `apps/website/wrangler.jsonc` によって構成されます。
`apps/my-care-notes/wrangler.jsonc`、`apps/service-monitor/wrangler.jsonc`。の
`api-proxy` および `forge-spa` パッケージは、スタンドアロンの Wrangler 展開ではなく、バンドルされた依存関係です。

## パッケージの内部規約

予測可能な環境を維持するために、すべてのパッケージとアプリは標準の内部レイアウトに従います。

### 標準 `src/` 階層

ソース コードは機能タイプごとに編成されています。

- **`components/`**: UI ロジック (SFC または TSX)。
- **`composables/`**: リアクティブ ロジックとフック。
- **`utils/`**: 純粋な関数とフレームワークに依存しないヘルパー。
- **`locales/`**: JSON/YAML 翻訳ファイル。
- **`styles/`**: SCSS 部分と設計システムの統合。

### バレルエクスポートパターン

`src/` 内のすべてのディレクトリには `index.ts` (バレル ファイル) が含まれている必要があります。

- サブディレクトリは、ローカルの `index.ts` を介して内部シンボルをエクスポートします。
- ルート `src/index.ts` は、ワークスペース メンバー全体のパブリック エントリ ポイントとして機能します。

## ルート構成レジストリ

リポジトリ ルートにあるキー ファイルは、モノリポジトリの動作を制御します。

|ファイル |目的 |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` |ワークスペース境界、メンバー グロブ、および依存関係カタログを定義します。 |
| `turbo.json` |ビルド パイプラインとタスク キャッシュを調整します。                    |
| `package.json` |ルートレベルのスクリプトとモノリポジトリ全体の devDependency。                |
| `commitlint.config.mjs` |従来のコミット仕様を強制します。                     |

## 依存関係とワークスペースの管理

Mission Platform は、内部依存関係に `workspace:*` プロトコルを使用します。これにより、パッケージは常に
開発中の他のワークスペース メンバーのローカル バージョン。

### PNPM カタログ

リポジトリは **pnpm カタログ** (`pnpm-workspace.yaml` で定義) を利用して、依存関係のバージョンを一元管理します。
モノレポ。これにより、バージョンのドリフトが防止され、メンテナンスが簡素化されます。

### タスクの実行

クロスワークスペース タスクは、Turborepo を使用してルート `package.json` 経由で実行されます。

- `pnpm build`: すべてのワークスペースを正しい依存関係の順序で構築します。
- `pnpm test`: `test` タスクを使用して、すべてのワークスペースのテスト スイートを実行します。 `pnpm exec turbo run test --affected` を使用して、
  変更されたワークスペースの CI スコープ。
- `pnpm lint`: ワークスペース全体で ESLint を実行します。
- `pnpm lint:style`: アプリとパッケージのスタイルに対して Stylelint を実行します。
- `pnpm format`: Prettier でフォーマットをチェックします。
- `pnpm i18n:extract`: カタログを所有するワークスペースの翻訳キーを抽出します。
