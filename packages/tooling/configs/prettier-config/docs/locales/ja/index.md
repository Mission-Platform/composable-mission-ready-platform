# @mission-platform/prettier-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

リポジトリのフォーマットのデフォルトは、パッケージとアプリケーションによって共有されます。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

ワークスペースの `prettier.config.js` から共有構成をエクスポートします。
Markdown、TypeScript、Vue、および設定を変更できるように、ローカル オーバーライドは控えめに使用してください。
ファイルはモノリポジトリ全体で一貫性を保ちます。

## 貢献する

を変更した後、`pnpm --filter @mission-platform/prettier-config format` を実行します。
構成。変更は、を使用するすべてのワークスペースに一貫して適用される必要があります。
パッケージ。
