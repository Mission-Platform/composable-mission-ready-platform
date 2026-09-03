# ワーカー展開ディレクトリ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/packages/tooling/configs/workers-config.md: [docs/packages/tooling/configs/workers-config.md](../../../packages/tooling/configs/workers-config.md)
> 言語: 日本語 (ja)

ワーカー実装ドキュメントは、公開可能な各ワーカーの横にあります。

- [`@mission-platform/api-proxy`](../../../../packages/edge/workers/api-proxy/docs/locales/ja/index.md) — 制約付き読み取り専用 API プロキシ。
- [`@mission-platform/email-sender`](../../../../packages/edge/workers/email-sender/docs/locales/ja/index.md) — MailPit を利用したローカルの送信者。
- [`@mission-platform/forge-spa`](../../../../packages/edge/workers/forge-spa/docs/locales/ja/index.md) — 共有 `ASSETS` SPA フォールバック ハンドラー。

このプロジェクト ページには、クロスワークスペース展開マップのみが保持されます。労働者
パッケージは、ハンドラー コントラクト、サンプル、テスト、ビルド手順を所有します。
アプリケーション パッケージ独自のルート、ドメイン、バインディング、およびデプロイメント
環境。

## アプリケーション展開マップ

|アプリケーション |ハンドラー |構成 |資産 |
| :---------- | :------ | :------------ | :----- |
|ウェブサイト | `packages/edge/workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`、次のようにバインドされます `ASSETS` |
|私のケアノート | `packages/edge/workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`、次のようにバインドされます `ASSETS` |
|サービスモニター | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`、次のようにバインドされます `ASSETS` |
|ドキュメント |静的資産 | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

Web サイトと My Care Notes は、共有された Forge SPA ワーカーを消費します。サービスモニター
は、その Worker エントリポイントと Durable Object バインディングを所有します。ドキュメント サイトは、
静的 Vite デプロイメントにワーカー エントリポイントがありません。ストーリーブックは
導入対象。

アプリケーション パッケージからデプロイします。 Wrangler 構成が所有する
ルートも環境も。秘密を追跡対象の構成から除外して使用する
機密性の高い値を保存する Cloudflare シークレット ストレージ。アプリケーション固有のセクションを参照してください
デプロイメントスクリプトと実装用のパッケージローカルワーカーガイド
詳細。
