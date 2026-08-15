# ユーティリティオーサリング

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/util-authoring.md](../../util-authoring.md)
> 言語: 日本語 (ja)

ユーティリティ (utils) は、純粋なフレームワークに依存しないヘルパー関数です。 UI フレームワークのインポートがないようにする必要があります。
明示的に要求され文書化されており、DOM API は含まれていません。これにより、次のようなあらゆるコンテキストで使用できるようになります。
サーバー側のロジックとワーカー。

## ディレクトリのレイアウト

各ユーティリティは、以下の独自の名前付きサブディレクトリに存在する必要があります。 `src/utils/`、同じ場所に配置されたテスト ファイルを伴い、
地元の樽。

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## オーサリングルール

1. **純度**: 副作用のない純粋な関数を優先します。同じ入力が与えられた場合、常に次の値を返す必要があります。
   同じ出力です。
2. **UI フックなし**: インポートしないでください `vue`, `react`、 または `@mission-platform/forge` ユーティリティ内のフック。ロジックが必要
   反応性は以下に属します [コンポーザブル](composable-authoring.md)。
3. **明示的な入力**: 完全なものを提供します TypeScript すべての引数と戻り値の型。
4. **必須テスト**: すべてのユーティリティには、同じ場所に `.spec.ts` ファイル。
5. **単一の責任**: 各ユーティリティ フォルダーは、特定の狭いタスクに焦点を当てる必要があります。

## 基本的な例

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## 足場

Mission Platform Developer MCP ツールを使用して、新しいユーティリティ スケルトンを生成します。

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## 関連ガイド

- [パッケージ開発](package-development.md)
- [アトミックコンポーネント設計](atomic-component-design.md)
- [コンポーザブルオーサリング](composable-authoring.md)
- [ストアオーサリング](store-authoring.md)
