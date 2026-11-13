# @mission-platform/tokens

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/tokens/docs/index.md: [packages/ui/tokens/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform の CSS デザイン トークンと SCSS テーマ定義。このパッケージ
プリミティブ、セマンティック、タイポグラフィー、構造、およびコンポーネントのトークンを所有します。
アプリケーションおよび共有コンポーネントによって消費されるコントラクト。

## ここから始めましょう

- [コンポーネントトークンリファレンス](reference/component-tokens.md) — インベントリ、
  DTCG パス、生成された出力、および Figma ハンドオフ コントラクト。
- [ビルドおよびテスト ガイド](guides/development.md) — トークン ソース、生成、および
  スタイルシートのチェック。
- [`README.md`](../../../README.md) — パッケージのエクスポートと基本セットアップ。

パッケージのパブリック `.` または SCSS サブパスを `package.json` からインポートします。しないでください
生成されたトークン ファイルをアプリケーションにコピーします。
