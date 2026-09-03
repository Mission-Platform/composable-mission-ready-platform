# API プロキシ ワーカーを開発する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/edge/workers/api-proxy/docs/guides/development.md: [packages/edge/workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

リポジトリ ルートから重点的なチェックを実行します。

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

ビルドは `dist/index.js` と宣言を発行します。ハンドラーの互換性を維持する
Cloudflare Workers ランタイムの場合: バインディングに型指定された `env` オブジェクトを使用します
また、Node.js ビルトインは追加しないでください。サニタイズされたルート許可リストのテストを追加する
ヘッダー、クエリ転送、ハンドラー変更時のアップストリームのエラー。
