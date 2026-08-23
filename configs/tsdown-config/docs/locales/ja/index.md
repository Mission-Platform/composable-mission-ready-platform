# @mission-platform/tsdown-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> configs/tsdown-config/docs/index.md: [configs/tsdown-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

パブリッシュ可能なワークスペース用の共有 tsdown ライブラリ ビルド ヘルパー。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

ワークスペースからパッケージを使用する `tsdown.config.ts` エントリーポイントを維持し、
外部依存関係、およびビルド中のパッケージにローカルな出力制約。
生成された宣言とバンドルはそのパッケージに属します。 `dist/` ディレクトリ。

## 貢献する

走る `pnpm --filter @mission-platform/tsdown-config lint` そしてそのフォーマットチェック。
確定的な出力を保持し、フレームワーク固有のターゲット ブランチを追加しない
ニュートラルビルドヘルパーに。
