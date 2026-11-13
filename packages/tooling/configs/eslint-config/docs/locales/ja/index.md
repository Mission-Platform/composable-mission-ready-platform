# @mission-platform/eslint-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform ワークスペースの共有フラット ESLint 構成。

## インストールして使用する

パッケージをワークスペースの開発依存関係に追加し、フラットを拡張します。
`eslint.config.js` からの構成:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

パッケージには、TypeScript、Vue 3、アクセシビリティ、インポート、Turbo、および
フォーマットの統合。以下の動作に対してのみワークスペース固有のルールを追加します。
共有することはできません。詳細については、[ESLint リファレンス](reference/eslint.md) を参照してください。
プラグインとコマンドが含まれていました。

## 貢献する

`pnpm --filter @mission-platform/eslint-config lint` を実行し、
ルール変更後は `pnpm --filter @mission-platform/eslint-config format`。
パッケージはフレームワークを認識しますが、ワークスペースには依存しません。アプリケーションは、
別のワークスペースからルールをインポートしないでください。
