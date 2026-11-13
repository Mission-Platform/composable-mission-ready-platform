# @mission-platform/vite-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform パッケージ用の共有 Vite および Vitest 構成ヘルパー
アプリケーション。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/vite-config
```

パッケージには `defineLibraryConfig` を使用し、アプリケーションには `defineAppConfig` を使用します。
`/vitest` サブパスからの `defineVitestConfig`。フレームワーク アプリケーションは、
`defineFrameworkAppConfig` 条件を 1 つ選択して、共有パッケージをインポートします
裸のパッケージ指定子を介して。

## 貢献する

`pnpm --filter @mission-platform/vite-config lint` とフォーマット チェックを実行します。キープする
ヘルパーのデフォルトは再利用可能で、共有の Vite、PostCSS、および
外部化の動作についてはパッケージの README に記載されています。
