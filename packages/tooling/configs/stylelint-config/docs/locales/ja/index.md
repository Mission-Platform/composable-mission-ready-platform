# @mission-platform/stylelint-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

共有 Stylelint Mission Platform の CSS および SCSS のルール。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

スタイルを含むワークスペースでは、ESM 形式のローカルファイル `stylelint.config.mjs` を使用します。`extends` エントリを複製せず、共有設定を import して spread します。

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

共有設定は `stylelint-config-standard-scss` と `stylelint-config-recommended-vue` を拡張します。デフォルトでは `postcss-html`、`**/*.scss` には `postcss-scss`、Vue のスタイルブロックには `postcss-html` を使用します。`catalog:stylelint` バージョンの直接サポート依存関係と、`workspace:*` の共有設定パッケージを `devDependencies` に追加します。

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

ワークスペースからパッケージを拡張します。 `stylelint.config.mjs`。コンポーネントを保持する
スタイルはコンポーネントに近く、文書化されたものに対してのみローカル オーバーライドを使用します。
ワークスペースの制約。

## 貢献する

走る `pnpm --filter @mission-platform/stylelint-config lint` そして
`pnpm --filter @mission-platform/stylelint-config format`。テストルールの変更
パッケージ SCSS とアプリケーション スタイルの両方に対して。
