# WebLuaの開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

## インストールして確認する

リポジトリ ルートから重点的なチェックを実行します。

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

`pnpm --filter @mission-platform/web-lua build` でビルドします。ブラウザ出力、
Node 出力、および宣言は `dist/` および `dist-node/` に出力されます。

## 互換性の変更

互換性行を変更する前に、決定的なゲストレベルの証拠を追加してください。
`src/compatibility.ts`、そのテスト、および参照テーブルを一緒に更新します。
`matched` は、決定論的フィクスチャの対象となる動作にのみ使用してください。
明示的なホスト ポリシー要件の場合は `capability-gated`。および `unresolved` 用
通過行為として扱ってはいけない行為。

ランタイムはゲスト所有であり、機能はデフォルトで拒否されます。 Node 専用アダプター
`./node` エクスポートの背後に属しており、ブラウザーのエントリに漏洩してはなりません。
