# 構成パッケージ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/configs/index.md: [docs/configs/index.md](../../../configs/index.md)
> 言語: 日本語 (ja)

Mission Platform は、集中管理された構成パッケージを使用します。 `configs/` ディレクトリ間で一貫性を確保する
モノレポ。

## 概要

構成を一元化することで、ツール ルール、ビルド プロセス、コード スタイルに関する信頼できる単一の情報源が可能になります。
パッケージとアプリケーションは、ローカル構成ファイル内でこれらの構成を拡張することによって、これらの構成を使用します。

## パッケージの概要

構成パッケージのドキュメントは各パッケージによって所有されています。以下のリンク
現在はリポジトリ ファイル リンクであり、パッケージ名前空間ルートになります。
ドキュメントサイト:

|パッケージ |目的 |一次構成面 |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](../../../../configs/eslint-config/docs/locales/ja/index.md) |フラット ESLint JS/TS のルールと Vue. | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../configs/prettier-config/docs/locales/ja/index.md) |リポジトリのフォーマットのデフォルト。 | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../configs/typescript-config/docs/locales/ja/index.md) | TypeScript コンパイラのプリセット。 | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../configs/stylelint-config/docs/locales/ja/index.md) | CSS および SCSS リンティング。 | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../configs/vite-config/docs/locales/ja/index.md) | Vite そして Vitest 構成ヘルパー。 | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../configs/tsdown-config/docs/locales/ja/index.md) |ライブラリのバンドル ヘルパー。 | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../configs/postcss-config/docs/locales/ja/index.md) |共有PostCSSパイプライン。 | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../configs/i18n-config/docs/locales/ja/index.md) |共有ロケールと抽出設定。 | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../configs/storybook-framework/docs/locales/ja/index.md) |環境によって選択された Storybook フレームワークのプリセット。 | `.storybook/main.ts` |
| [ワーカーの構成](workers-config.md) |クロスワークスペースの Cloudflare Worker 規約。 | `wrangler.jsonc` |

## コアツーリング

### ESLint (`@mission-platform/eslint-config`)

すべてのワークスペースにわたってコード品質ルールを標準化します。 Flat Config 形式を使用しており、次のサポートが含まれています。
TypeScript, Vue 3、そしてアクセシビリティ。

### Prettier (`@mission-platform/prettier-config`)

モノリポジトリ全体にわたって一貫したコード スタイル (タブ、引用符、セミコロン) を強制します。

### TypeScript (`@mission-platform/typescript-config`)

ベースを提供します `tsconfig` さまざまなターゲットのプリセット:

- `base`: 一般的なデフォルト。
- `vue`: に最適化 Vue SFCは3つ。
- `node`: に最適化 Node.js 環境。
- `framework-<name>`: マッチングを追加します `mp:<framework>` 外部消費者向けの輸出条件。

## ビルドシステム

### Vite (`@mission-platform/vite-config`)

作成するためのファクトリー関数を提供します Vite アプリケーションとライブラリの両方の構成。

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: 最上位アプリケーション (SPA、ワーカー) 用。
- `defineLibraryConfig`: 最適なバンドルとツリーシェイキングを備えた共有パッケージ用。

### PostCSS (`@mission-platform/postcss-config`)

PostCSS プラグイン パイプライン (Autoprefixer を含む) を共有して、場所に関係なく CSS が一貫して処理されるようにします。
それは著者です。

## 使用パターン

ワークスペースで構成を使用するには:

1. 構成パッケージを `devDependency` で `package.json`。
2. ローカル構成ファイルを作成します (例: `eslint.config.js`)。
3. 基本構成をインポートおよびエクスポート/拡張します。

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## 構成の選択

ルールをワークスペースにコピーするのではなく、懸念事項を所有するパッケージを使用します。アプリケーションとライブラリのビルド ファイル
ローカルオーバーライドを追加することはできますが、共有デフォルトはそのままにしておく必要があります。 `configs/`。新しいパッケージの場合は、パッケージから開始します
scaffold を作成してから、ワークスペース チェックを実行します。

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
