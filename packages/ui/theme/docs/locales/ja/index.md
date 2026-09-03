# @mission-platform/theme

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/theme/docs/index.md: [packages/ui/theme/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/theme` は、`@mission-platform/components` から抽出された追記型テーマ サーフェスを所有します。

## 公共の面

- `ForgeThemeToggle` は、共有の明るい、暗い、自動設定を循環させます。
- `ForgeThemeProvider` は永続性を設定し、そのスコープ付きレンダー プロップを通じてテーマの状態を公開します。
- `ForgeThemeComposer` は、スコープまたはグローバルの `--mp-*` トークンのオーバーライドを制御します。
- テーマ ストアの契約には、`getThemeSnapshot`、`subscribeTheme`、`setTheme`、`toggleTheme`、`cycleTheme`、および
  `configureTheme`。
- Composer コントラクトには、構成のマージ、属性/トークンの変更、CSS 変数の変換、およびリセット ヘルパーが含まれます。

すべてのコンポーネントとストアは 1 つのパッケージローカル実装を使用するため、プロバイダー、トグル、およびコンポーザーのコンシューマーは次のことを監視します。
フレームワーク固有の Forge コンパイル後に同じランタイム コントラクトが作成されます。
