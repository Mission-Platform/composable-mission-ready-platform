# アトミックコンポーネント設計

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/atomic-component-design.md](../../atomic-component-design.md)
> 言語: 日本語 (ja)

Mission Platform は **Atomic Design** システムを使用して、コンポーネントを複雑な階層レベルに編成します。毎
コンポーネントは、中立的な Forge JSX 方言 (`@mission-platform/forge`)、確保する
複数のフレームワークにわたる一貫性。

## 設計レベル

コンポーネントは、その範囲と責任に基づいて 5 つのレベルに分類されます。

|レベル |フォルダー |説明 |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **原子** | `src/components/atoms/`     |最小の UI プリミティブ (例: `ForgeButton`, `ForgeInput`, `ForgeBadge`)。これらは通常、目的を失わずにさらに分解することのできない機能単位です。 |
| **分子** | `src/components/molecules/` |原子の単純な組成 (例: `ForgeSearchInput`, `ForgeFieldSet`)。これらは 1 つのユニットとして一緒に機能します。                                                                    |
| **生物** | `src/components/organisms/` |原子、分子、その他の生物で構成される複雑な UI セクション (例: `ForgeNavbar`, `ForgeTable`, `ForgeModal`)。                                                       |
| **テンプレート** | `src/components/templates/` |コンテンツ構造を定義するページレベルのレイアウト (例: `ForgeHero`, `ForgeAppLayout`)。多くの場合、コンテンツを配置する場所を定義するためにスロットが使用されます。                     |
| **ページ** | `src/components/pages/`     |具体的なコンテンツとデータが入力されたテンプレートの特定のインスタンス (例: `AccountSettingsPage`).                                                                        |

## コンポーネントフォルダーのレイアウト

各コンポーネントは、適切なレベルのフォルダーの下の独自の名前付きサブディレクトリに存在します。このディレクトリには、
コンポーネントのソース、ストーリー、テスト、およびオプションのスタイル。

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## ストーリーの慣例

ストーリーブックのストーリーは、そのコンポーネントと同じ場所に配置し、クリーンな状態を維持するために厳格なタイトル規則に従う必要があります。
サイドバー構造。

### ファイル名

ストーリーでは、 `.stories.tsx` 拡大。

### タイトルの表記規則

の `title` ストーリーブックのフィールド `meta` オブジェクトは次のパターンに従う必要があります。

```text
<Level>/<Category>/<Component>
```

- **レベル**: 大文字の複数形 (例: `Atoms`, `Molecules`)。
- **カテゴリ**: 機能的なグループ化 (例: `Forms`, `Navigation`, `Display`, `Feedback`)。
- **コンポーネント**: PascalCase コンポーネント名 (例: `ForgeButton`).

**例 （`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## オーサリング標準

1. **フレームワークの中立性**: 決して別個に作成しない Vue そして React バージョン。使用 `@mission-platform/forge`。
2. **命名**: コンポーネントは `Base` プレフィックス (例: `ForgeCard`) 特定の実装でない限り。
3. **タイプ セーフティ**: エクスポート `*Properties` コンポーネントの小道具のインターフェース。
4. **テスト**: 同じ場所にある `.spec.ts` すべてのコンポーネントに必要です。
5. **足場**: `scaffold_component` MCP ツールは、正しいディレクトリ構造と定型文を確認します。

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## 関連ガイド

- [パッケージ開発](package-development.md)
- [コンポーザブルオーサリング](composable-authoring.md)
- [ストアオーサリング](store-authoring.md)
- [ユーティリティオーサリング](util-authoring.md)
