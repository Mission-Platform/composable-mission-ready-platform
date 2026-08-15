# ワーカーの構成と開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> 言語: 日本語 (ja)

このドキュメントでは、Mission Platform モノリポジトリの Cloudflare Workers について説明します。 TypeScript エントリーポイントと、
それらを実行または展開するために使用される構成ファイル。

## 労働者のインベントリ

スタンドアロンのワーカー パッケージは以下に存在します `workers/`:

|労働者 |ハンドラー |構成 |目的 |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` |なし;バンドルパッケージとして消費 |制約付き読み取り専用 API プロキシ |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | MailPit を利用した電子メール ショーケース ワーカー |
| `forge-spa` | `workers/forge-spa/src/index.ts` |なし;バンドルパッケージとして消費 | `ASSETS`-binding SPA フォールバック ハンドラー |

デプロイ可能なアプリケーション ワーカーは次のとおりです。

|アプリケーション |ハンドラー |構成 |
| :---------- | :------ | :------------ |
|ウェブサイト | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
|私のケアノート | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
|サービスモニター | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` そして `forge-spa` スタンドアロンがない Wrangler 設定ファイル: 彼らの `src/index.ts` ハンドラーは
によってバンドルされる `tsdown` アプリケーションによって参照される Wrangler 構成または使用するデプロイメント。

## ビルドシステム

ワーカーパッケージは使用します `tsdown` 同梱用に。 Turborepo を通じてパッケージ タスクを使用するか、 pnpm したがって、ワークスペースの依存関係は
一貫して解決されました:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

ワーカーテストで使用するもの Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

使用 `@cloudflare/workers-types` ハンドラーとバインディングのタイプについて。電子メール送信者が生成したバインディング宣言は次のとおりです。
に書かれた `workers/email-sender/src/worker-configuration.d.ts` それによって `types` スクリプト。

## 構成とローカル開発

ワーカーは、 `env` オブジェクトとCloudflareバインディング。追跡対象にシークレットを入れないでください
`wrangler.jsonc` ファイル。使用 `wrangler secret put` 繊細な価値観のために。

スタンドアロンの電子メール送信者の場合は、設定されたメール送信者を実行します。 Wrangler ワークスペース パッケージからの開発サーバー:

```bash
pnpm --filter @mission-platform/email-sender dev
```

デプロイ可能なアプリケーションの場合は、各アプリ パッケージ内のスクリプトを使用します。たとえば、Web サイトや My Care Notes などです。 Wrangler
ファイルが提供する `staging` そして `production` Service Monitor は、 `staging` 環境：

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## 導入

アプリケーション パッケージからデプロイします。 `wrangler.jsonc` ルートと環境を所有します。

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

スタンドアロン ワーカー パッケージには、 Wrangler 構成は直接デプロイされません `wrangler deploy`;構築する
ハンドラーを作成し、使用するアプリケーション構成を通じてそれらをデプロイします。

## ベストプラクティス

- 予測可能なエッジ実行のために、依存関係をワーカー出力にバンドルします。
- を使用します。 `env` に渡されるオブジェクト `fetch` グローバルプロセス変数の代わりにハンドラーを使用します。
- 避ける NodeWorkers ランタイムでサポートされていない .js ビルトイン (次のようなもの) `fs` そして `child_process`、ワーカーハンドラー内。
- コールドスタートを最小限に抑え、Cloudflareのリソース制限内に収まるように、ワーカーバンドルを小さく保ちます。
