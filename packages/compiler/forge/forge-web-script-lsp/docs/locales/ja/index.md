# @mission-platform/forge-web-script-lsp

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Forge Web Script v1 の stdio 言語サーバー プロトコル サーバー。パッケージ
エディター側のトランスポートとワークスペースの動作を所有します。言語意味論は残る
`@mission-platform/forge-web-script` が所有。

## ここから始めましょう

- [言語ツールのリファレンス](reference/language-service.md) — 診断、
  補完、ホバー、セマンティック トークン、およびサポートされる境界。
- [ビルドとテストのガイド](guides/development.md) — ローカルサーバーのチェックと
  プロトコルフィクスチャ。
- [言語パッケージの `llms.txt`](../../../../forge-web-script/llms.txt) — コア
  言語 API のメモ。

サーバーは Node.js `>=24.0.0` を必要とし、`forge-web-script-lsp` を公開します
バイナリと `server` および `workspace` モジュール サブパス。
