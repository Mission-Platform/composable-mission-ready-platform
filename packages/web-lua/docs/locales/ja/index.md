# @mission-platform/web-lua

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/web-lua/docs/index.md: [packages/web-lua/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Forge Web Script からコンパイルされたゲスト所有の Lua ランタイム基盤。このパッケージ
ランタイム互換性契約とそのホスト機能境界を所有します。

## ここから始めましょう

- [Lua 5.5.1 互換性リファレンス](reference/compatibility.md) — テスト済み、
  機能ゲート型の未解決の動作。
- [ビルドとテストのガイド](guides/development.md) — ランタイム フィクスチャと出力
  制約。
- パッケージの README と生成されたリファレンスには、簡潔なパッケージ API ノートが記載されています。

ブラウザのエントリは `@mission-platform/web-lua` です。 Node 消費者は
明示的な `@mission-platform/web-lua/node` エクスポート。宿主効果は次のように否定されます。
デフォルトであり、明示的な機能ポリシーが必要です。
