# アプリケーション開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> 言語: 日本語 (ja)

このハウツー ガイドでは、アプリケーションを実行、テスト、展開する方法について説明します。 `apps/`。アプリケーションは再利用可能に構成されます
パッケージ。共有コンポーネント、コンポーザブル、ユーティリティ、構成は、独立したワークスペースではなく、それぞれの所有ワークスペースに属します。
アプリにコピーされました。

## アプリケーションを選択してください

|アプリケーション |地域開発 |ビルド |導入 |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` |ホスティング ワーカーを介してプレビューまたはデプロイする |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` |設定された Storybook/Chromatic ワークフローを使用する |

アプリケーション パッケージは、 Vite または Wrangler 構成。走らないでください `wrangler deploy` 再利用可能なワーカーから
パッケージに独自のものがある場合を除き、パッケージ `wrangler.jsonc`.

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

共有パッケージの変更の場合は、次のように置き換えます。 `<app>` パッケージ名を付けて使用します `...` 依存するワークスペースが必要な場合
ビルドグラフに含まれます。

## 静的なドキュメントと Web サイトのビルド

ドキュメントと Web サイトのアプリケーションでは、 `vite-ssg`。実稼働ビルドでは、ソース コンテンツから静的ルートが生成され、
ロケールカタログ。生成された出力をパッケージで確認します。 `preview` スクリプト：

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

ドキュメントのマークダウンを下に置いておく `docs/` 所有するロケール カタログ内の Web サイト メッセージ。 2秒も追加しないでください
いずれかのソースのレンダリング時のコピー。

## Cloudflareの開発と展開

を備えたアプリケーション `wrangler.jsonc` 環境対応コマンドを公開します。

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

使用 `wrangler secret put` 秘密のために。バインディングと非シークレットのデフォルトを維持する `wrangler.jsonc`を確認し、
導入する前に選択した環境を選択してください。

## 関連ガイド

- [開発セットアップ](development-setup.md)
- [ワークスペースの構造](workspace-structure.md)
- [ビルドシステム](build-system.md)
- [ワーカーの構成](packages/tooling/configs/workers-config.md)
- [テスト](testing.md)
