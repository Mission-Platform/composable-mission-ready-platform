# 開発セットアップ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> 言語: 日本語 (ja)

このガイドでは、Mission Platform に貢献するためにローカル環境をセットアップするためのステップバイステップのチュートリアルを提供します。
このガイドを終えると、モノリポジトリが動作し、開発ツールを実行できるようになります。

## 前提条件

リポジトリのクローンを作成する前に、システムが次の要件を満たしていることを確認してください。

### システム要件

|ツール |必要なバージョン |目的 |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0` |ランタイム環境 (アクティブ LTS) |
| **pnpm** | `12.4.2` |パッケージ マネージャーとワークスペース オーケストレーター |
| **Git** |最新の安定版 |バージョン管理 |
| **錆** |安定したツールチェーン |オプションのスタンドアロン Rust ベンチマーク開発 |
| **ドッカー** |最新の安定版 | Emscripten Hunspell ビルドにのみ必要 |

### バージョン管理 (推奨)

**nvm** (Node バージョン マネージャー) を使用して、正しいものを使用していることを確認します。 Nodeで指定された .js バージョン
ルート `.nvmrc` ファイル。

```bash
nvm install
nvm use
```

Corepack を使用して **pnpm** を有効にします。

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
```

## 初期設定

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

このコマンドは `prepare` スクリプトをトリガーします。これにより、**Husky** がコミット lint 用に初期化され、すべての内部セキュリティが保証されます。
パッケージのリンクが正しく確立されています。

### SonarLint 言語サーバー

リポジトリの `agent-lsp.json` には、JavaScript 用の公式 SonarLint 言語サーバーと TypeScript が含まれています。の
サーバーは npm パッケージではなく Java アーカイブとして配布されるため、Java をインストールし、
[SonarSource](https://github.com/SonarSource/sonarlint-language-server) の `sonarlint-language-server` アーカイブ。

LSP を開始する前に、サーバー アーカイブと JavaScript アナライザーを設定します。

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

オプションの `SONARLINT_JAVA` 変数では、Java 実行可能ファイルを選択できます。リポジトリ ランチャーは、設定された内容を検証します。
グローバルにインストールされたコマンドを必要とせずに、サーバーの標準入出力プロトコルにパスを設定して転送します。

### 3. インストールの確認

スモーク テストを実行して、ビルド システムと環境が正しく構成されていることを確認します。

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

`...` フィルターは、パッケージに必要な Forge 依存関係も構築します。の
ニュートラル コード スキャナーは Flint グラフからコンパイルされます。そうではありません
Rust または `wasm-pack` ビルド ステップが必要です。

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

Forge-backed パッケージは、一致する `mp:vue`、`mp:react`、`mp:svelte`、
`mp:solid` および `mp:web-component` 条件。アクティブな条件は次のとおりです。
使用するバンドラーによって構成されます。 [コンパイラ リファレンス](../../../packages/tooling/vite/forge/docs/locales/ja/reference/compiler.md) を参照してください。
ターゲットプラグインと宣言パイプライン用。

### アプリケーション開発

特定のアプリケーションを開発モードで起動するには:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

アプリケーションは通常、`http://localhost:5173` で入手できます。

### 共通コマンド

|タスク |コマンド |説明 |
| :--------- | :------------ | :----------------------------- |
| **ビルド** | `pnpm build` |すべてのアプリとパッケージをビルドする |
| **テスト** | `pnpm test` |すべての Vitest スイートを実行する |
| **糸くず** | `pnpm lint` |モノリポジトリ全体で ESLint を実行します。
| **形式** | `pnpm format` | Prettier でフォーマットを確認する |

## トラブルシューティング

### キャッシュのクリア

予期しないビルド エラーが発生した場合は、Turborepo キャッシュと Node キャッシュをクリアします。

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM ビルドの失敗

Flint アーティファクトのビルドに失敗した場合は、コンパイラ診断を検査してください
選択した静的リンク プロファイルまたは動的リンク プロファイルを確認します。の
`@mission-platform/hunspell` Emscripten ビルドには、さらに Docker が必要です。
走ってください。
