# @mission-platform/api-proxy

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/edge/workers/api-proxy/docs/index.md: [packages/edge/workers/api-proxy/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

承認された読み取り専用 API ルートをプロキシする Cloudflare Worker の例
アップストリームサービスを修正しました。このワークスペースはリクエスト ポリシー、ヘッダーを所有します。
サニタイズ、およびプロキシ ハンドラーのエラー境界。

## 労働者を利用する

パッケージは、バンドルされたハンドラーを `@mission-platform/api-proxy` からエクスポートします。
Wrangler 構成から `dist/index.js` を参照する前に、これをビルドします。

```bash
pnpm --filter @mission-platform/api-proxy build
```

`/users` および `/v1` に対する `GET` および `HEAD` リクエストのみが受け入れられます。クエリ
文字列が転送されます。資格情報、元の `Host`、およびホップバイホップ
ヘッダーが削除されます。アップストリームまたはリクエストの構築に失敗すると、`502` が返されます。

## 制限事項

パッケージにはチェックインされた Wrangler デプロイメント構成がなく、パッケージではありません。
汎用リバース プロキシ。明示的な展開構成を追加し、
公開する前に、認証、アップストリーム、キャッシュの変更を確認してください。

- [開発ガイド](guides/development.md)
- [`README.md`](../../../README.md)
