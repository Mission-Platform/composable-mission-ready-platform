# @mission-platform/typescript-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

すべての Mission Platform ワークスペースで TypeScript プリセットを共有。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

`tsconfig.json` から一致するプリセットを拡張します。Vue アプリには `app` を使用します。
React アプリの場合は `react`、パッケージ宣言の場合は `library`、ツールの場合は `node`、
Vitest 仕様の場合は `test`。フレームワークの利用者もマッチングを使用する必要があります
`framework-<name>` カスタム条件プリセット。詳細については、パッケージの README を参照してください。
完全なプリセットテーブルと例。

## 貢献する

共有コンパイラ フラグをプリセットに保持します。走る
`pnpm --filter @mission-platform/typescript-config build:check` と形式
変更後のチェック。
