# @mission-platform/postcss-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> configs/postcss-config/docs/index.md: [configs/postcss-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform スタイルシートで使用される共有 PostCSS パイプライン。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

ワークスペースからパッケージを参照します。 `postcss.config.mjs` むしろ
共有プラグイン パイプラインを複製します。ローカルオーバーライドはこれに属します
ワークスペースの構成。

## 貢献する

走る `pnpm --filter @mission-platform/postcss-config lint` そして
`pnpm --filter @mission-platform/postcss-config format`。ブラウザを維持する
このパッケージの互換性動作は、アプリケーション固有のプラグインを避けてください。
