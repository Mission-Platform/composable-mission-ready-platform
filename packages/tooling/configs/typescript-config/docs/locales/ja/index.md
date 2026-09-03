# @mission-platform/typescript-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

共有 TypeScript すべての Mission Platform ワークスペースのプリセット。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

一致するプリセットを拡張します `tsconfig.json`： 使用 `app` のために Vue アプリ、
`react` のために React アプリ、 `library` パッケージ宣言の場合、 `node` ツーリング用、
そして `test` のために Vitest スペック。フレームワークの利用者もマッチングを使用する必要があります
`framework-<name>` カスタム条件のプリセット。詳細については、パッケージの README を参照してください。
完全なプリセットテーブルと例。

## 貢献する

共有コンパイラ フラグをプリセットに保持します。走る
`pnpm --filter @mission-platform/typescript-config build:check` そしてフォーマットする
変更後のチェック。
