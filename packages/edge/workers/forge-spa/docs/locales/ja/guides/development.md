# Forge SPA ワーカーを開発する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/edge/workers/forge-spa/docs/guides/development.md: [packages/edge/workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

リポジトリ ルートからパッケージ チェックを実行します。

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

ビルドは `dist/index.js` と宣言を発行します。ハンドラーを以下に限定してください
型指定された `ASSETS.fetch(request)` 委任とテスト要求の転送。テスト
使用するアプリからアプリケーション ルートをデプロイします。アプリケーションを追加しないでください
構成または資産をこの共有ワーカーに追加します。
