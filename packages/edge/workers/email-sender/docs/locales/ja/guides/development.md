# 電子メール送信ワーカーを開発する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/edge/workers/email-sender/docs/guides/development.md: [packages/edge/workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

リポジトリ ルートからパッケージ チェックを実行します。

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

変更後に `pnpm --filter @mission-platform/email-sender types` を実行します
バインディング。エンドポイント検証、SMTP エラー、安定応答テストを追加します。
契約変更。ワーカーハンドラーをCloudflareと互換性のある状態に維持し、
ローカル開発構成の背後での MailPit のみの動作。
