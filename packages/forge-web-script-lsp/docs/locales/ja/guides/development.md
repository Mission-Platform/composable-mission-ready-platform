# Forge Web Script 言語サーバーを開発する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

## インストールして確認する

リポジトリ ルートからフォーカスされたパッケージ チェックを実行します。

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

`pnpm --filter @mission-platform/forge-web-script-lsp build` でビルドします。の
結果は `dist/` に出力されます。ローカル出力はソースアーティファクトではありません。

## プロトコルの変更

診断、UTF-16 範囲、シンボル、補完、ホバー、およびセマンティック トークンを保持します
言語サービス パッケージに合わせた動作。プロトコル回帰を追加する
あらゆる新しいリクエストや機能に対応するフィクスチャ。 LSP は現在提供していません
定義へ移動、参照、名前変更、書式設定、コードアクション、ファイル間
言語インポート、またはブラウザーでホストされるトランスポート。

サーバーは標準入出力ベースで、Node のみです。ブラウザエディタの統合は以下に属します
このサーバーではなく、言語サービス パッケージのローカル アダプター。
