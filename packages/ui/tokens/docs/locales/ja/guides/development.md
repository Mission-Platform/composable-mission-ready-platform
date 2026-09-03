# トークンパッケージを開発する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/tokens/docs/guides/development.md: [packages/ui/tokens/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

## インストールして確認する

リポジトリ ルートからパッケージ チェックを実行します。

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

このビルドでは、`dist/` に JavaScript と宣言出力が生成されます。生成された
`src/generated/` の SCSS および TypeScript ソースは派生アーティファクトであり、
決定性を保たなければなりません。

## トークンを変更する

`tokens/` の下のソース JSON を編集し、DTCG パスを安定した状態に保ちます。
変更は意図的であり、文書化されています。コンポーネント契約は以下に基づいて存続します
`tokens/component/<atomic-level>/`;コンポーネントソースは重複しないでください
共有トークンパス。既存のトークン生成スクリプトを使用し、両方を確認します。
発行前の SCSS および TypeScript 出力。

パッケージはフレームワークに依存しません。テーマの動作は消費者によって選択されます
エクスポートされた SCSS エントリ ポイントを介したスタイルシート。このパッケージは所有していません
アプリケーションのテーマの状態またはコンポーネントのマークアップ。
