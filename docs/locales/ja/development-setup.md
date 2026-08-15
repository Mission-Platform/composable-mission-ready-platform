# 開発セットアップ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/development-setup.md](../../development-setup.md)
> 言語: 日本語 (ja)

このガイドでは、Mission Platform に貢献するためにローカル環境をセットアップするためのステップバイステップのチュートリアルを提供します。
このガイドを終えると、モノリポジトリが動作し、開発ツールを実行できるようになります。

## 前提条件

リポジトリのクローンを作成する前に、システムが次の要件を満たしていることを確認してください。

### システム要件

|ツール |必要なバージョン |目的 |
| :------------ | :---------------- | :---------------------------------------------------- |
| **Node.js** | `24.19.0`         |ランタイム環境 (アクティブ LTS) |
| **pnpm**      | `11.21.0`         |パッケージ マネージャーとワークスペース オーケストレーター |
| **Git** |最新の安定版 |バージョン管理 |
| **錆** |安定したツールチェーン |ネイティブ テストと Rust/WASM クレート開発 |
| **wasm-pack** | `0.15.0` 経由 pnpm | Rust クレートを型指定された WebAssembly ワークスペースとしてパッケージ化する |
| **ドッカー** |最新の安定版 | Emscripten Hunspell ビルドにのみ必要 |

### バージョン管理 (推奨)

**nvm** (Node バージョン マネージャー) を使用して、正しいものを使用していることを確認します。 Nodeで指定された .js バージョン
ルート `.nvmrc` ファイル。

```bash
nvm install
nvm use
```

有効にする **pnpm** コアパックを使用:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

Rust クレートで作業する場合は、Rust ターゲットをインストールします。 WebAssembly パッケージャーは、固定された `wasm-pack` npm
間の依存関係 `pnpm install`:

```bash
rustup target add wasm32-unknown-unknown
```

## 初期セットアップ

次の手順に従って、マシン上のモノリポジトリを初期化します。

### 1. リポジトリのクローンを作成する

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. 依存関係をインストールする

すべてのワークスペースの依存関係をインストールし、git フックをセットアップします。

```bash
pnpm install
```

このコマンドは、 `prepare` スクリプト。**Husky** をコミット lint 用に初期化し、すべての内部動作を保証します。
パッケージのリンクが正しく確立されています。

### 3. インストールの確認

スモーク テストを実行して、ビルド システムと環境が正しく構成されていることを確認します。

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

の `...` また、パッケージに必要な Forge の依存関係も構築します。 Rustのデコーダとエンコーダのクレートがテストされています
ネイティブに `cargo test`;彼らの
`wasm-pack` 出力は対応するファイルに書き込まれます。 `packages/*-wasm/`
クレートのパッケージ タスクによるワークスペース。これは、Turborepo によって使用されるチェックインされたパッケージ/ビルド コントラクトです。

## 開発ワークフロー

Mission Platform は **Turborepo** を使用して、アプリケーションやパッケージ全体でタスクを調整します。

### コンポーネント開発 (ストーリーブック)

Storybook は、コンポーネントを個別に構築およびテストするための主要なワークベンチです。特定のフレームワークをターゲットにすることができます
環境変数を使用する:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

5 つのモードはすべて、同じニュートラル ストーリー インベントリを使用します。すべての静的値を検証するには
ワークベンチは 1 パスで構築されます。

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Forge-backed パッケージがマッチングを公開 `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`、 そして `mp:web-component` 条件。アクティブな条件は次のとおりです。
使用するバンドラーによって構成されます。見る [コンパイラリファレンス](forge-compiler.md)
ターゲットプラグインと宣言パイプライン用。

### アプリケーション開発

特定のアプリケーションを開発モードで起動するには:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

アプリケーションは通常、次の場所で入手できます。 `http://localhost:5173`.

### 共通コマンド

|タスク |コマンド |説明 |
| :--------- | :------------ | :----------------------------- |
| **ビルド** | `pnpm build`  |すべてのアプリとパッケージをビルドする |
| **テスト** | `pnpm test`   |すべて実行 Vitest スイート |
| **糸くず** | `pnpm lint`   |走る ESLint モノレポ全体 |
| **形式** | `pnpm format` |書式設定をチェックする Prettier |

## トラブルシューティング

### キャッシュのクリア

予期しないビルド エラーが発生した場合は、Turborepo をクリアして、 Node キャッシュ:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM ビルドの失敗

Rust/WASM パッケージのビルドに失敗した場合は、安定した Rust ツールチェーンと
`wasm32-unknown-unknown` ターゲットがインストールされてから実行します `pnpm install` 固定されたものを復元するには `wasm-pack` npm 依存。
の
`@mission-platform/hunspell` Emscripten ビルドでは、さらに Docker が実行されている必要があります。他の Rust クレートはビルドします
ローカルの Rust ツールチェーンを使用します。
