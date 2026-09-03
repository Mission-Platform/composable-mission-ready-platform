# @mission-platform/vite-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

共有 Vite そして Vitest Mission Platform パッケージの構成ヘルパーと
アプリケーション。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/vite-config
```

使用 `defineLibraryConfig` パッケージの場合、 `defineAppConfig` アプリケーション用、および
`defineVitestConfig` からの `/vitest` サブパス。フレームワーク アプリケーションは、
1つ選択してください `defineFrameworkAppConfig` 条件を設定してから共有パッケージをインポートします
裸のパッケージ指定子を介して。

## 貢献する

走る `pnpm --filter @mission-platform/vite-config lint` そしてフォーマットチェック。キープする
ヘルパーのデフォルトは再利用可能であり、共有されたものは保持されます。 Vite、PostCSS、および
外部化の動作についてはパッケージの README に記載されています。
