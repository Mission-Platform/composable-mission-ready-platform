# 構成パッケージ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/configs/index.md: [docs/configs/index.md](../../../configs/index.md)
> 言語: 日本語 (ja)

Mission Platform は、`packages/tooling/configs/` ディレクトリ内の集中構成パッケージを使用して、複数のシステム間の一貫性を確保します。
モノレポ。

## 概要

構成を一元化することで、ツール ルール、ビルド プロセス、コード スタイルに関する信頼できる単一の情報源が可能になります。
パッケージとアプリケーションは、ローカル構成ファイル内でこれらの構成を拡張することによって、これらの構成を使用します。

## パッケージの概要

構成パッケージのドキュメントは各パッケージによって所有されています。以下のリンク
現在はリポジトリ ファイル リンクであり、パッケージ名前空間ルートになります。
ドキュメントサイト:

|パッケージ |目的 |一次構成面 |
| :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :---------------------------- |
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/ja/index.md) | JS/TS および Vue のフラットな ESLint ルール。             | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/ja/index.md) |リポジトリのフォーマットのデフォルト。                  | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/ja/index.md) | TypeScript コンパイラ プリセット。                     | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/ja/index.md) | CSS および SCSS リンティング。                            | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/ja/index.md) | Vite および Vitest 構成ヘルパー。           | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/ja/index.md) |ライブラリのバンドル ヘルパー。                        | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/ja/index.md) |共有PostCSSパイプライン。                         | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/ja/index.md) |共有ロケールと抽出設定。           | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/ja/index.md) |環境によって選択された Storybook フレームワークのプリセット。 | `.storybook/main.ts` |
| [ワーカー構成](workers-config.md) |クロスワークスペースの Cloudflare Worker 規約。   | `wrangler.jsonc` |

## コアツール

### ESLint (`@mission-platform/eslint-config`)

すべてのワークスペースにわたってコード品質ルールを標準化します。 Flat Config 形式を使用しており、次のサポートが含まれています。
TypeScript、Vue 3、およびアクセシビリティ。

### Prettier (`@mission-platform/prettier-config`)

モノリポジトリ全体にわたって一貫したコード スタイル (タブ、引用符、セミコロン) を強制します。

### TypeScript (`@mission-platform/typescript-config`)

さまざまなターゲットにベースの `tsconfig` プリセットを提供します。

- `base`: 一般的なデフォルト。
- `vue`: Vue 3 SFC 用に最適化されています。
- `node`: Node.js 環境用に最適化されています。
- `framework-<name>`: 外部コンシューマー向けに一致する `mp:<framework>` エクスポート条件を追加します。

## ビルドシステム

### Vite (`@mission-platform/vite-config`)

アプリケーションとライブラリの両方に Vite 構成を作成するためのファクトリ関数を提供します。

```ts
import {
  defineAppConfig,
  defineLibraryConfig,
} from "@mission-platform/vite-config";
```

- `defineAppConfig`: 最上位アプリケーション (SPA、ワーカー) 用。
- `defineLibraryConfig`: 最適なバンドルとツリーシェーキングを備えた共有パッケージ用。

### PostCSS (`@mission-platform/postcss-config`)

PostCSS プラグイン パイプライン (Autoprefixer を含む) を共有して、場所に関係なく CSS が一貫して処理されるようにします。
それは著者です。

## 使用パターン

ワークスペースで構成を使用するには:

1. 構成パッケージを `devDependency` として `package.json` に追加します。
2. ローカル構成ファイルを作成します (Stylelint、`stylelint.config.mjs` 用)。
3. 基本構成をインポートおよびエクスポート/拡張します。

```js
// Example: eslint.config.js
import baseConfig from "@mission-platform/eslint-config";

export default [
  ...baseConfig,
  // local overrides
];
```

Stylelint の場合、`stylelint.config.mjs` と同じ ESM インポート/スプレッド パターンを使用します。

```js
// stylelint.config.mjs
import baseConfig from "@mission-platform/stylelint-config";

export default { ...baseConfig };
```

## 構成の選択

ルールをワークスペースにコピーするのではなく、懸念事項を所有するパッケージを使用します。アプリケーションとライブラリのビルド ファイル
ローカルオーバーライドを追加できますが、共有デフォルトは `packages/tooling/configs/` のままにする必要があります。新しいパッケージの場合は、パッケージから開始します
scaffold を作成してから、ワークスペース チェックを実行します。

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
