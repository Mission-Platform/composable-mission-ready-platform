# @mission-platform/stylelint-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform の CSS および SCSS の共有 Stylelint ルール。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

スタイルを持つワークスペースは、ESM でワークスペース ローカルの `stylelint.config.mjs` を使用します。
形式。共有構成を複製するのではなく、インポートして配布します。
`extends` エントリ:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

共有構成は `stylelint-config-standard-scss` を拡張し、
`stylelint-config-recommended-vue`。デフォルトでは `postcss-html` を使用します。
`**/*.scss` には `postcss-scss`、Vue には `postcss-html` を使用 SFC スタイル
ブロック。これは、ワークスペース固有のスタイルを使用せずに、CSS、SCSS、および Vue スタイルをサポートします。
構文構成。

上記の直接サポートの依存関係をワークスペースのに追加します。
`devDependencies` は `catalog:stylelint` バージョンを使用し、
`workspace:*` を使用した共有構成パッケージ。をカバーするスクリプトを追加します。
ワークスペースのスタイル ソース、例:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

コンポーネント スタイルをコンポーネントの近くに保持し、ローカル オーバーライドのみを使用します。
文書化されたワークスペースの制約。

## 貢献する

`pnpm --filter @mission-platform/stylelint-config lint` を実行し、
`pnpm --filter @mission-platform/stylelint-config format`。テストルールの変更
パッケージ SCSS とアプリケーション スタイルの両方に対して。
