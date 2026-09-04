# ストアオーサリング

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> 言語: 日本語 (ja)

ストアは、パッケージ内のコンポーネント間の共有状態を管理するために使用されます。アプリケーションレベルのストア（Ponia や
Redux)、Mission Platform のパッケージ ストアは、**フレームワークに依存しない監視可能なモジュール**になるように設計されています。これにより、
ホスト フレームワークに関係なく、Forge フックを介してコンポーネントを消費するライトワンス コンポーネント。

## ディレクトリのレイアウト

各ストアは、内部の独自の名前付きサブディレクトリに存在する必要があります。 `src/stores/`、同じ場所に配置されたテスト ファイルと
地元の樽。

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## 観察可能なパターン

パッケージ ストアはフレームワーク固有の依存関係を回避します。代わりに、それらは単純な観察可能なパターンに従います。

1. **プライベート状態**: 状態をモジュールのスコープ内に保持します (プレーンな TypeScript 値)。
2. **スナップショット アクセス**: 現在の状態を取得するための `getSnapshot()` 関数を提供します。
3. **サブスクリプション**: リストにコールバックを追加し、サブスクライブ解除を返す `subscribe(listener)` 関数を提供します。
   機能。
4. **ミューテーター**: 状態を更新する関数を提供します。更新後にすべてのリスナーに通知しなければなりません。

## オーサリングルール

1. **フレームワークに依存しない**: ストア モジュール内の `vue`、`react`、または `@mission-platform/forge-jsx` フックからインポートしないでください。
   それ自体。
2. **明示的なタイプ**: 常にストアの状態のインターフェイスを定義してエクスポートします。
3. **SSR の安全性**: ブラウザ API (`localStorage` など) へのアクセスを保護し、Node.js でストアを初期化できるようにします。
   環境。
4. **必須テスト**: すべてのストアに `.spec.ts` ファイルが同じ場所に存在する必要があります。

## ストアの例

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## コンポーネント内のストアの使用

ライトワンスコンポーネント内でストアを使用するには、`@mission-platform/forge-jsx` から `useState` と `useEffect` を使用してストアをブリッジします。

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## 足場

Mission Platform Developer MCP ツールを使用して、新しいストア スケルトンを生成します。

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## 関連ガイド

- [パッケージ開発](package-development.md)
- [アトミックコンポーネント設計](atomic-component-design.md)
- [コンポーザブルオーサリング](composable-authoring.md)
- [ユーティリティオーサリング](util-authoring.md)
