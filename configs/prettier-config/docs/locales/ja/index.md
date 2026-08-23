# @mission-platform/prettier-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> configs/prettier-config/docs/index.md: [configs/prettier-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

リポジトリのフォーマットのデフォルトは、パッケージとアプリケーションによって共有されます。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

ワークスペースの共有設定をエクスポートします。 `prettier.config.js`。
ローカルオーバーライドは控えめに使用してください。 TypeScript, Vue、および構成
ファイルはモノリポジトリ全体で一貫性を保ちます。

## 貢献する

走る `pnpm --filter @mission-platform/prettier-config format` を変更した後、
構成。変更は、を使用するすべてのワークスペースに一貫して適用される必要があります。
パッケージ。
