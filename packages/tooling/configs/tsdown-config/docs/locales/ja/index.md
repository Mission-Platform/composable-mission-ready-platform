# @mission-platform/tsdown-config

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/tsdown-config/docs/index.md: [packages/tooling/configs/tsdown-config/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

パブリッシュ可能なワークスペース用の共有 tsdown ライブラリ ビルド ヘルパー。

## インストールして使用する

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

ワークスペース `tsdown.config.ts` のパッケージを使用し、エントリ ポイントを保持します。
外部依存関係、およびビルド中のパッケージにローカルな出力制約。
生成された宣言とバンドルは、そのパッケージの `dist/` ディレクトリに属します。

## 貢献する

`pnpm --filter @mission-platform/tsdown-config lint` とその形式チェックを実行します。
確定的な出力を保持し、フレームワーク固有のターゲット ブランチを追加しない
ニュートラルビルドヘルパーに。
