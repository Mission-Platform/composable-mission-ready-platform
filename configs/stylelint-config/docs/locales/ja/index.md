# @mission-platform/stylelint-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

共有 Stylelint Mission Platform の CSS および SCSS のルール。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

ワークスペースからパッケージを拡張します。 `stylelint.config.mjs`。コンポーネントを保持する
スタイルはコンポーネントに近く、文書化されたものに対してのみローカル オーバーライドを使用します。
ワークスペースの制約。

## 貢献する

走る `pnpm --filter @mission-platform/stylelint-config lint` そして
`pnpm --filter @mission-platform/stylelint-config format`。テストルールの変更
パッケージ SCSS とアプリケーション スタイルの両方に対して。
