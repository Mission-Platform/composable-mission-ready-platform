# @mission-platform/email-sender

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

完成したHTMLを受け入れて送信するローカル専用のCloudflareワーカー
SMTP 経由の MailPit。このワークスペースは、`/api/email/send` コントラクトとそのコントラクトを所有しています。
MailPit 開発構成。

## ローカルで使用する

エンドポイントは `{ to, recipientName, html }` を検証し、安定した JSON を返します。
納車後の結果。 MailPit を起動し、ローカル Worker バインディングを生成してから実行します。
労働者:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

デフォルトの SMTP エンドポイントは `127.0.0.1:1025` で、MailPit UI は次のとおりです。
`http://localhost:8025`。別の変数を使用する場合は、ローカルの Wrangler 変数をオーバーライドします
ホスト。

このワーカーはローカル ショーケースであり、運用メール サービスではありません。決してしない
追跡対象の Wrangler 構成に資格情報またはシークレットを入れます。

- [開発ガイド](guides/development.md)
- [`README.md`](../../../README.md)
