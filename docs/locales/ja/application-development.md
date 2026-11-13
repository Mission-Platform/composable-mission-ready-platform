# アプリケーション開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> 言語: 日本語 (ja)

このハウツー ガイドでは、`apps/` でアプリケーションを実行、テスト、展開する方法を説明します。アプリケーションは再利用可能に構成されます
パッケージ。共有コンポーネント、コンポーザブル、ユーティリティ、および構成は、独立したワークスペースではなく、それぞれの所有ワークスペースに属します。
アプリにコピーされました。

## アプリケーションを選択してください

|アプリケーション |地域開発 |ビルド |導入 |
| :---------------------------------- | :---------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` |ホスティング ワーカーを介してプレビューまたはデプロイする |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` |設定された Storybook/Chromatic ワークフローを使用する |

アプリケーション パッケージは、Vite または Wrangler 構成を所有します。再利用可能なワーカーから `wrangler deploy` を実行しないでください
ただし、そのパッケージに独自の `wrangler.jsonc` がある場合を除きます。

## 変化を起こす

1. ターゲットアプリケーションをそのパッケージとともに起動します `dev` スクリプト。
2. 再利用可能な変更を加える `packages/` およびアプリ固有の構成の変更 `apps/<name>/`。
3. 変更したアプリケーションとその依存関係をビルドします。

   ```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. 影響を受けるワークスペースのテスト、lint、スタイル チェック、および書式設定を実行します。

   ```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

共有パッケージを変更する場合は、`<app>` をパッケージ名に置き換え、依存ワークスペースが必要な場合は `...` を使用します。
ビルドグラフに含まれます。

## 静的なドキュメントと Web サイトのビルド

ドキュメントと Web サイトのアプリケーションは `vite-ssg` を使用します。実稼働ビルドでは、ソース コンテンツから静的ルートが生成され、
ロケールカタログ。パッケージの `preview` スクリプトを使用して、生成された出力を確認します。

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

ドキュメントのマークダウンを `docs/` の下に保存し、Web サイトのメッセージを所有するロケール カタログに保存します。 2秒も追加しないでください
いずれかのソースのレンダリング時のコピー。

## Cloudflareの開発と展開

`wrangler.jsonc` を持つアプリケーションは、環境認識コマンドを公開します。

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

シークレットには `wrangler secret put` を使用します。 `wrangler.jsonc` のバインディングと非シークレットのデフォルトを保持し、
導入する前に選択した環境を選択してください。

## 関連ガイド

- [開発セットアップ](development-setup.md)
- [ワークスペース構造](workspace-structure.md)
- [システムのビルド](build-system.md)
- [ワーカー構成](configs/workers-config.md)
- [テスト](testing.md)
