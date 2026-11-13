# コンポーザブルオーサリング

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> 言語: 日本語 (ja)

コンポーザブルは、Mission Platform 内でリアクティブ ロジックをカプセル化して再利用するための主な方法です。これらを確実にするために
ロジックのユニットは、サポートされているすべての UI フレームワーク間で移植可能であり、
`@mission-platform/forge-jsx` によって提供されるフレームワークに依存しないフック。

## ディレクトリのレイアウト

各コンポーザブルは、同じ場所に配置されたテストを伴って、`src/composables/` 内の独自の名前付きサブディレクトリに存在する必要があります。
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

1. **Forge フックを使用**: リアクティブ プリミティブ (`useState`、`useEffect`、`useMemo`、`useRef` など) のみをインポートします。
   `@mission-platform/forge-jsx`。 `vue` または `react` から直接インポートしないでください。
2. **命名規則**: コンポーザブル名にはケバブケースを使用し、接頭辞として `use-` を付ける必要があります (例: `use-media-query`)。
3. **SSR の安全性**: ロジックがサーバーサイド レンダリングに対して安全であることを確認します。 `window` などのブラウザ専用 API へのアクセスを保護します。
   `document`、または `localStorage`。
4. **UI コンポーネントなし**: コンポーザブルはロジックに重点を置く必要があります。 UI コンポーネントを直接返したり操作したりしないでください。代わりに、
   状態、参照、またはコールバックを返します。
5. **必須テスト**: すべてのコンポーザブルには、Vitest を使用して同じ場所に `.spec.ts` ファイルが存在する必要があります。

## 基本的な例

以下は、イベント リスナーを管理する一般的な追記型コンポーザブルです。

```ts
import { type MpRef, useEffect } from "@mission-platform/forge-jsx";

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

新しいコンポーザブルを作成する最も速い方法は、接続された Mission Platform 上の `scaffold_composable` ツールを使用することです。
開発者向け MCP サーバー。これは MCP ツール呼び出しの例であり、シェル コマンドではありません。

```text
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## 関連ガイド

- [パッケージ開発](package-development.md)
- [原子コンポーネント設計](atomic-component-design.md)
- [ストアオーサリング](store-authoring.md)
- [利用オーサリング](util-authoring.md)
