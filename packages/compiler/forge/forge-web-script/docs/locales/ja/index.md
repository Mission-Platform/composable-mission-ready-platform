# @mission-platform/forge-web-script

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/compiler/forge/forge-web-script/docs/index.md: [packages/compiler/forge/forge-web-script/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Forge Web Script v1 言語コントラクト、ブートストラップ パーサー、および適合フィクスチャ。
このパッケージには、言語契約と消費者向けのドキュメントが含まれています。
貢献者。

## ここから始めましょう

- [言語と ABI のリファレンス](reference/language.md) — 文法、型、機能、
  診断、マニフェスト、コンパイラの動作。
- [ビルドとテストのガイド](guides/development.md) — ローカル チェック、フィクスチャ、および生成された
  人工物。
- [`llms.txt`](../../../llms.txt) — ツールとアシスタントに関する簡潔な API と使用上の注意事項。

このパッケージは、例外のない `Option`/`Result` マッチング、`iter fn` エクスポート、
明示的なターゲット機能プロファイル、および決定論的な最適化/非最適化デバッグ
人工物。言語バージョンは `1.0`、論理 ABI バージョンは `1.2` です。
