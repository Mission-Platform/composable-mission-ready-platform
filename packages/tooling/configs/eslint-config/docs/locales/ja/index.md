# @mission-platform/eslint-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

シェアアパート ESLint Mission Platform ワークスペースの構成。

## インストールして使用する

パッケージをワークスペースの開発依存関係に追加し、フラットを拡張します。
からの構成 `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

パッケージには以下が含まれます TypeScript, Vue 3、アクセシビリティ、インポート、 Turbo、そして
フォーマットの統合。以下の動作に対してのみワークスペース固有のルールを追加します。
共有することはできません。 [を参照してください。 ESLint 参照]（reference/eslint.md) のために
プラグインとコマンドが含まれていました。

## 貢献する

走る `pnpm --filter @mission-platform/eslint-config lint` そして
`pnpm --filter @mission-platform/eslint-config format` ルール変更後。
パッケージはフレームワークを認識しますが、ワークスペースには依存しません。アプリケーションは、
別のワークスペースからルールをインポートしないでください。
