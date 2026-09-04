# コンポーザブルオーサリング

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> 言語: 日本語 (ja)

コンポーザブルは、Mission Platform 内でリアクティブ ロジックをカプセル化して再利用するための主な方法です。これらを確実にするために
ロジックのユニットは、サポートされているすべての UI フレームワーク間で移植可能であり、
によって提供されるフレームワークに依存しないフック `@mission-platform/forge-jsx`.

## ディレクトリのレイアウト

各コンポーザブルは、コンポーザブル内の独自の名前付きサブディレクトリに存在する必要があります。 `src/composables/`、同じ場所でのテストを伴う
ファイルとローカルバレル。

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## オーサリングルール

1. **Forge フックを使用**: リアクティブ プリミティブのみをインポートします (例: `useState`, `useEffect`, `useMemo`, `useRef`) から
   `@mission-platform/forge-jsx`。 ～から直接輸入しないでください `vue` または `react`。
2. **命名規則**: コンポーザブル名にはケバブケースを使用し、接頭辞を付ける必要があります。 `use-` (e.g., `use-media-query`)。
3. **SSR の安全性**: ロジックがサーバーサイド レンダリングに対して安全であることを確認します。次のようなブラウザ専用 API へのアクセスを保護します。 `window`,
   `document`、 または `localStorage`。
4. **UI コンポーネントなし**: コンポーザブルはロジックに重点を置く必要があります。 UI コンポーネントを直接返したり操作したりしないでください。代わりに、
   状態、参照、またはコールバックを返します。
5. **必須テスト**: すべてのコンポーザブルには、同じ場所に `.spec.ts` ファイルを使用して Vitest.

## 基本的な例

以下は、イベント リスナーを管理する一般的な追記型コンポーザブルです。

```ts
import { type MpRef, useEffect } from '@mission-platform/forge-jsx';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## 足場

新しいコンポーザブルを作成する最も速い方法は、Mission Platform Developer MCP ツールを使用することです。

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## 関連ガイド

- [パッケージ開発](package-development.md)
- [アトミックコンポーネント設計](atomic-component-design.md)
- [ストアオーサリング](store-authoring.md)
- [ユーティリティオーサリング](util-authoring.md)
