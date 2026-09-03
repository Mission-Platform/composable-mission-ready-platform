# Forge Vite プラグインを開発する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/vite/forge/docs/guides/development.md: [packages/tooling/vite/forge/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

## インストールして確認する

リポジトリ ルートから重点的なチェックを実行します。

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

`pnpm --filter @mission-platform/vite-plugin-forge build` でビルドします。バンドル
宣言は `dist/` に出力されます。ローカルのビルド出力をコミットしないでください。

## コンパイラを変更する

解析、正規化、セマンティック IR、キャッシュ、診断を中立的な状態に保ちます。
ターゲットの低下とソースの生成は選択されたものに属します
`@mission-platform/forge-plugin-*` パッケージ。キャッシュの回帰カバレッジを追加する
ID、無効化、診断、生成されたアーティファクト、および呼び出し側プラグイン
ドライバー変更時の保存。

パッケージは、Vite と tsdown の両方から使用可能な状態を維持する必要があります。ターゲットを追加しないでください
テーブルまたはフレームワークのランタイム依存関係をニュートラルドライバーに切り替えます。を更新します
[コンパイラパイプラインリファレンス](../reference/compiler.md) 公共のステージまたは
アーティファクトの契約が変更されます。
