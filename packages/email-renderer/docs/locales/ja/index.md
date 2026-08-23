# @mission-platform/email-renderer

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/email-renderer` は、Mission Platform 電子メール ツリーのフレームワーク中立のレンダリング境界を所有します。そのルート エントリは、サーバー側の電子メール生成に対して安全です。ブラウザ アダプタは明示的なサブパスの背後に分離されます。

## サーバーレンダリングとマークダウン

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown は共有 Forge ツリーに変換されるため、リンク、画像、テキスト、HTML はシリアル化前にエスケープまたは検証されます。出力には決定的な属性/スタイルの順序があり、スクリプト URL、イベント属性、CSS 変数、フレックス/グリッド値、およびフレームワーク マーカーは拒否されます。

## ブラウザアダプタ

ブラウザーのプレビューまたはアプリケーションで必要なアダプターのサブパスのみを使用します。

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`、`toEmailVueComponent`。
- `@mission-platform/email-renderer/react` → `renderToEmailReact`、`toEmailReactComponent`。
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` (Svelte 5 `{@render ...}`)。
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`、`toEmailSolidComponent`。
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`。

5 つのブラウザー アダプターすべてを公開する単一のオプションのインポートの場合は、次を使用します。
`@mission-platform/email-renderer/adapters`。このエントリは、
ルートエントリなので、サーバーのみの電子メール生成はフレームワークランタイムをロードしません。

これらのオプションのエントリ ポイントは、同じ Forge ツリーを再利用します。これらはルート電子メール シリアライザーによってインポートされず、サーバーのみの電子メール展開では必要ありません。
