# パッケージ開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> 言語: 日本語 (ja)

このガイドでは、Mission Platform モノリポジトリ内で再利用可能なパッケージを作成、開発、公開する方法について説明します。
パッケージはプラットフォームの基本的な構成要素であり、`packages/` ディレクトリに存在し、次の方法で管理されます。
pnpm workspaces and Turborepo.

## 新しいパッケージの作成

パッケージを作成する推奨方法は、Mission Platform Developer MCP ツールを使用することです。
構成、スクリプト、フォルダー構造はプラットフォームの標準に従います。

### パッケージビルドをフォージする

Forge コンポーネント、フック、および CMS パッケージは 1 つの `defineTsdownLibrary` 呼び出しを使用します。追加
`tsdownForgeComponentPlugins` によって返されたネイティブ プラグイン、
`tsdownForgeHookPlugins`、または `tsdownForgeCmsPlugins` からその `plugins` オプション。
これらのプラグインは、tsdown ライフサイクル フックからターゲットを準備して公開します。
構成の評価中にグラフ検出を実行します。フレームワークを維持し、
CMS 出力プラグインは呼び出し元が所有し明示的であるため、ターゲットの選択はそのまま残ります
構成可能かつ分離されています。

### 1. MCPを使用した足場

接続された Mission Platform Developer MCP サーバーを通じて `scaffold_package` ツールを使用して、スケルトンを生成します。
以下は MCP ツール呼び出しの例であり、シェル コマンドではありません。 MCP が使用できない場合は、手動セットアップ セクションを使用してください。

```text
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

これにより、以下を含む規則に準拠した `packages/date-utils/` ディレクトリが生成されます。

- ワークスペース対応スクリプトと共有構成を備えた `package.json`。
- `tsconfig.json` プラットフォームのデフォルトを拡張します。
- 最適化されたビルドの場合は `vite.config.ts`。
- `src/index.ts` バレル ファイル。
- AI 支援ドキュメントの `llms.txt`。

### 2. 手動セットアップ (オプション)

MCP ツールを使用していない場合は、`package.json` が [pnpm カタログ](https://pnpm.io/catalogs) を使用していることを確認してください。
依存関係を管理し、スコープ指定された命名規則に従います。

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "publishConfig": {
    "access": "public"
  },
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## パッケージ構造

各パッケージは厳密な内部レイアウトに従います。コードの単位 (コンポーネント、コンポーザブル、ストア、またはユーティリティ) は、次の場所に存在する必要があります。
独自の名前付きサブディレクトリと同じ場所にテストが配置されます。

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stylelint (スタイルを持つパッケージの場合)

CSS、SCSS、または Vue スタイル ブロックを含むパッケージは、検出可能な Stylelint 構成と lint スクリプトを保持する必要があります。

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

共有構成とその直接の構文/構成の依存関係を `devDependencies` に追加します。

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

`extends` エントリを複製する代わりに、`stylelint.config.mjs` の共有設定を使用します。

```js
// stylelint.config.mjs
import baseConfig from "@mission-platform/stylelint-config";

export default { ...baseConfig };
```

ワークスペースの実際のスタイル ソースをカバーするスクリプトを追加し、公開する前にチェックを実行します。

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## 開発ワークフロー

### オーサリングルール

1. **TypeScript どこでも**: すべてのソース コードは `.ts` または `.tsx` (`@mission-platform/forge-jsx` を使用) に存在する必要があります。
2. **フレームワークの中立性**: フレームワークに依存しないロジックを優先します。コンポーネントは、ターゲットに合わせて Forge JSX で一度作成する必要があります
   複数のフレームワーク。
3. **分離**: パッケージは `apps/` からインポートしてはなりません。
4. **テスト**: すべてのユニット (コンポーザブル、ストア、ユーティリティ、コンポーネント) には、同じ場所に `.spec.ts` ファイルが必要です。

詳しいオーサリング手順については、以下を参照してください。

- [原子コンポーネント設計](atomic-component-design.md)
- [コンポーザブル オーサリング](composable-authoring.md)
- [ストアオーサリング](store-authoring.md)
- [利用オーサリング](util-authoring.md)

### 建物

Turbo を使用してパッケージをビルドし、依存関係が正しい順序でビルドされていることを確認します。

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### テスト

Vitest を使用してテストを実行します。

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### ルーター パッケージと Web コンポーネント ターゲット

構造化ルート ターゲット、純粋な URL ヘルパー、およびニュートラル コンパイラ マーカーには `@mission-platform/router` を使用します。共有
パッケージはアプリケーション ルートを定義または登録してはなりません。アプリケーションは、次から独立して 1 つの Forge ルーター ターゲットを選択します。
UI ターゲット、ネイティブ ルート レコードとルーター インスタンスの所有権を保持し、ターゲット固有のランタイムをバインドします。
ブートストラップ中のコンテキスト。初期ターゲットは `@mission-platform/forge-router-vue`、`-react`、`-solid`、`-svelte`、
`-redwood`、および `-web-components`。サポートされていない機能の組み合わせはコンパイラ診断のままにする必要があります。

フレームワークフリーのパッケージまたはアプリの場合は、ビルド構成と TypeScript 構成の両方で Forge Web Components 条件を選択します。

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

Web コンポーネント アプリケーションの場合は、`@mission-platform/forge-router-web-components/runtime` からランタイムをインポートし、次のコマンドを呼び出します。
`registerRouterElements()` を 1 回、アプリ所有のルーターを作成した後に `setForgeRouter(appRouter)` を呼び出し、構造化されたパスを渡します
`to` 値を DOM プロパティとして使用し、事前レンダリング/テストで `MpMemoryHistory` を使用します。再利用可能なルーターを追加するパッケージ
要素または Web コンポーネントの動作を変更するには、`src/**/*.stories.ts` の下に中立的なストーリーを追加し、ターゲットを
Web コンポーネント Storybook ワークベンチ。

## ドキュメント (`llms.txt`)

すべてのパッケージには、ルートに `llms.txt` ファイルが含まれています。このファイルには、
パッケージの API、コンポーネント、動作を統合し、AI アシスタントがパッケージをよりよく理解して使用できるようにします。

- **タイトル**: スコープ指定されたパッケージ名を使用します。
- **コンポーネント/API**: 使用可能なシンボルとそのプロパティおよび役割の表またはリスト。
- **例**: 一般的な使用例の短いコード スニペット。

## パッケージドキュメントの所有権

パッケージ固有のインストール、使用法、制限事項、寄稿者ワークフロー、および API リファレンス ページは、
パッケージの `docs/` ディレクトリではなく、リポジトリ全体の `docs/` ツリー内にありません。ドキュメント サイトはこれらのファイルを直接取り込み、
`/packages/integrations/barcode/index` や `/packages/tooling/configs/eslint-config/index` などの安定したパッケージ名前空間でそれらを公開します。
プロジェクト全体の概念、アーキテクチャ、ワークスペースのワークフロー、およびパッケージ間のトラブルシューティングは、ルート `docs/` に残ります。

生成された API ページは `docs/reference/generated/` の下に存在し、パッケージ `prebuild` フックによって更新されます。編集しないでください
これらのファイルを手動で実行します。サイトを通じてパッケージのドキュメントをプレビューするには、ドキュメント アプリのビルドを実行するか、all-workspace を使用します。
エクストラクターはドキュメント アプリの README に記載されています。

## 出版

Mission Platform は、バージョン管理と公開に [Changesets](https://github.com/changesets/changesets) を使用します。

1. **変更セットの追加**: 変更を加えた後、以下を実行します。
   ```bash
   pnpm changeset
   ```
   パッケージと変更の種類 (パッチ、マイナー、メジャー) を選択します。
2. **変更セットをコミット**: 生成された `.changeset/*.md` ファイルをコミットします。
3. **バージョンと公開**: CI/CD が実際の公開を処理しますが、次の方法でバージョンをローカルでプレビューできます。
   ```bash
   pnpm changeset version
   ```
