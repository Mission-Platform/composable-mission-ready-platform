# @mission-platform/forge-spa

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform SPA および SSG の共有 Cloudflare Worker エントリポイント
展開。これはリクエストを `ASSETS` バインディングに委任し、次によって消費されます。
アプリケーションを個別にデプロイするのではなく、

## 労働者を統合する

パッケージをビルドし、コンパイルされたハンドラーを使用するアプリから参照します。
Wrangler 構成:

```bash
pnpm --filter @mission-platform/forge-spa build
```

コンシューマ構成では、`main` を次のように設定する必要があります。
`packages/edge/workers/forge-spa/dist/index.js` を作成し、そのアプリケーション `dist/` ディレクトリを次のようにバインドします
SPA フォールバック処理を備えた `ASSETS`。ウェブサイトとMy Care Notesは最新のものです
消費者。

ワーカーはアプリケーション ルート、資産、ドメイン、環境を所有しません。
秘密。これらは、使用するアプリケーション パッケージ内に残ります。

- [開発ガイド](guides/development.md)
- [`README.md`](../../../README.md)
