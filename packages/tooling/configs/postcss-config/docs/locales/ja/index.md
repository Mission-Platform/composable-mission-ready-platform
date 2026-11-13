# @mission-platform/postcss-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/postcss-config/docs/index.md: [packages/tooling/configs/postcss-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform スタイルシートで使用される共有 PostCSS パイプライン。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

ではなく、ワークスペースの `postcss.config.mjs` からパッケージを参照します。
共有プラグイン パイプラインを複製します。ローカルオーバーライドはこれに属します
ワークスペースの構成。

## 貢献する

`pnpm --filter @mission-platform/postcss-config lint` を実行し、
`pnpm --filter @mission-platform/postcss-config format`。ブラウザを維持する
このパッケージの互換性動作を考慮し、アプリケーション固有のプラグインを避けてください。
