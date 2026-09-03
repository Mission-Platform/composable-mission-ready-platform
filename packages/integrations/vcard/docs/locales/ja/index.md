# `@mission-platform/vcard`

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/integrations/vcard/docs/index.md: [packages/integrations/vcard/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform 用の共有 RFC 6350 vCard および RFC 5545 iCalendar データ API。

このパッケージは、ロスレスのコンポーネント/プロパティの解析と書き込みを提供します。
`readICalendar`/`writeICalendar` および `readVCard`/`writeVCard`、および Forge
`ForgeVCard` および `ForgeICalendar` という名前のレンダラー。 `ForgeICalendar` は、
`calendarEvents(readICalendar(source))` の結果が正規化されたため、生成された
フレームワーク コンポーネントはパーサー ランタイム モジュールから独立したままになります。

パブリック API と使用例については、`llms.txt` を参照してください。
