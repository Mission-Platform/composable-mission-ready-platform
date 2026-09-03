# @mission-platform/forge-router-web-components

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/compiler/plugins/forge-router-web-components/docs/index.md: [packages/compiler/plugins/forge-router-web-components/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

フレームワークフリーの Web コンポーネント用の Forge ルーター ターゲット。

## 非同期ルートの読み込み

非同期ルート ビューの解決中にスピナーを表示するには、`loadingFallback` を使用します。
`forge-router-outlet` はフォールバックをオーバーレイとしてレンダリングし、現在の状態を維持します。
宛先の準備ができるまでビューはマウントされます。

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

アウトレットは、成功、リダイレクト、キャンセル、または
失敗。ルートビューの約束はナビゲーションとコンセントの取り付けの間で共有され、
そのため、遅延ファクトリーが 2 回呼び出されることはありません。時代遅れによる遅れた結果
ナビゲーションは新しいビューを置き換えることはできません。

`forge-router-link` は、スコープ付き SPA エントリ ポイントです。履歴を更新します
デフォルトでは `push`、`replace` プロパティ/属性が設定されている場合は `replace`、
`active` および `exact-active` の状態を更新し、変更されたクリックを残します。
プライマリ以外のクリック、ダウンロード、外部 URL、およびネイティブへのターゲット リンク
ブラウザ。

## フレームワーク中立の `Suspense`

共有 Forge ソースは中立境界を使用し、各コンパイラーが境界を下げることができます
ターゲットネイティブ実装へ:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

Web コンポーネントの場合は、ルーター アウトレットの `loadingFallback` コントラクトを使用します。
ルートの移行。フレームワーク ランタイムやグローバル アンカー インターセプトはありません。
必須です。
