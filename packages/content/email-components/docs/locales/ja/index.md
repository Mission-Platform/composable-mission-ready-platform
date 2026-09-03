# @mission-platform/email-components

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/email-components` には、電子メールで安全なツリーを生成するための、型付きのフレームワーク中立の Forge JSX コンポーネントが含まれています。 `@mission-platform/email-renderer` を使用して、サーバー上でこれらのツリーをシリアル化します。電子メール パスには、Vue、React、Svelte、Solid、Web コンポーネント ランタイム、ブラウザ DOM、または JavaScript は必要ありません。

## 使用法

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## ブラウザのプレビュー

コンポーネントは、フレームワークに依存しない Forge ツリーを返します。
標準ブラウザパイプライン。プレビューするには、そのツリーをオプションの
ホスト フレームワークに必要なアダプター エントリ ポイント:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React、Svelte、Solid、および Web コンポーネントは、対応するレンダラーを使用します
サブパス、または 5 つすべてを以下からインポートできます
`@mission-platform/email-renderer/adapters`。ブラウザのプレビュー パスと
`renderEmail` サーバー パスは同じコンポーネント ツリーを使用します。後者だけ
完全な電子メールドキュメントラッパーを追加します。

## コンポーネント

- アトム: `EmailTypography`、`EmailButton`、`EmailImage`、`EmailDivider`、`EmailSpacer`。
- 分子: `EmailRow`、`EmailColumn`、`EmailCard`、`EmailList`、`EmailSocialLinks`。
- 生物: `EmailPreheader`、`EmailHeader`、`EmailFooter`。
- テンプレート: `EmailDocument`、`EmailContainer`、`EmailSection`。

`EmailTypography` は、Web `ForgeTypography` ボキャブラリをミラーリングする単一のテキスト アトムです。`as` はレンダリングされた要素を選択します (デフォルトでは `p`、`href` が設定されている場合は `a`)、`variant` はタイプ スケール (`as` が設定されている場合は一致する見出しスケール) を選択します。 `h1` ～ `h6`、それ以外の場合は `body-md`)、`color`、`align`、`target`、および `underline` はインライン宣言を調整します。

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

すべてのレイアウトは、`table`、`tbody`、`tr`、および `td` に基づいています。ボタンはテーブル内の通常のリンクであり、画像には空ではない `alt` テキストが必要で、URL は検証され、スタイルは `@mission-platform/tokens` からのリテラル宣言に解決されます。

## 互換性ポリシー

ベースラインは次のとおりです [機能カタログを電子メールで送信できますか](https://www.caniemail.com/features)、`2026-08-08` でレビュー済み。実装は以下に依存します [HTML テーブル](https://www.caniemail.com/features/html-tables)、 [インラインスタイル](https://www.caniemail.com/features/css-inline-styles)、 [最大幅](https://www.caniemail.com/features/css-max-width)、およびオプション [メディアクエリ](https://www.caniemail.com/features/css-at-media)。静的出力は、フレックスボックス、グリッド、CSS カスタム プロパティ、論理プロパティ、スクリプト、イベント ハンドラー、またはフレームワーク ハイドレーション マーカーに依存しません。

レスポンシブ CSS はプログレッシブ拡張のみです。`<style>` ブロックが削除または無視されても、インライン テーブル レイアウトは引き続き使用できます。カスタム ノードを追加するときは、アプリケーション テストで `assertCompatibleEmailHtml` を使用します。
