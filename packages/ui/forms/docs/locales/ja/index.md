# @mission-platform/forms

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/forms/docs/index.md: [packages/ui/forms/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/forms` は、Mission Platform がレンダリングできる高レベルのフォーム オーケストレーション コンポーネントを提供します。
複雑なフォームとウィザードは完全に JSON スキーマ定義から作成されます。

他の共有パッケージと同様に、「一度だけ書き込む」アプローチに従い、中立的な JSX でコンポーネントを作成してコンパイルします。
ネイティブ Vue 3 および React コンポーネントに変換されます。

すべてのインポートでは、裸の `@mission-platform/forms` 指定子が使用されます。フレームワークはアプリ全体に対して 1 回選択されます。
`mp:<framework>` エクスポート条件 — `resolve.conditions` (`defineFrameworkAppConfig` / を参照)
`frameworkResolveConditions` (`@mission-platform/vite-config` から) および `customConditions` (
`@mission-platform/typescript-config/framework-<name>` プリセット）。

## コアコンポーネント

### `ForgeSchemaForm`

データ駆動型フォームをレンダリングするための主要なコンポーネント。 JSON スキーマ定義を受け取り、自動的に
対応する UI ウィジェットと検証ロジック。

#### 主な特徴:

- **スキーマ駆動**: JSON スキーマを介して完全に構成されます。単一のオブジェクトが 1 ステップのフォームをレンダリングします。オブジェクトの配列
  複数ステップのウィザードを作成します。
- **一貫した検証**: `@mission-platform/forms-core` (Ajv) を使用して、Vue アプリと React アプリが
  同じデータを全く同じに。
- **条件付き可視性**: `ui.visibleWhen` をサポートし、他の入力値に基づいてフィールドを動的に表示または非表示にします。
- **ネストされた構造**: 複雑なデータ モデルのネストされたフィールド セットを処理します。

#### 使用法：

**Vue** (`mp:vue` アクティブ):

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React** (`mp:react` がアクティブです。指定子が同じであることに注意してください):

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

開発者以外でも、JSON を手動で記述せずにフォーム スキーマを作成できるビジュアル オーサリング ツール。

#### 主な特徴:

- **Visual Canvas**: フィールドを配置し、そのプロパティを定義するためのドラッグ アンド ドロップ スタイル エディター。
- **ウィザード構成**: ウィザードの複数ステップのフローを管理するための専用の「ステップ」タブ。
- **ライブ プレビュー**: 構築中のフォームをリアルタイムでレンダリングします。
- **スキーマ エクスポート**: データベースに保存したり、直接使用したりできる `SchemaFormDefinition` を生成します。
  `ForgeSchemaForm`。

#### レイアウト:

ビルダーは、`ForgeVerticalLayout` を使用した 3 列のレイアウトとして構造化されています。

1. **フィールド パレット**: フォームに追加できる使用可能なウィジェット (入力、選択、日付など) のリスト。
2. **エディタ キャンバス**: フィールドが構成および整理される中央領域。
3. **インスペクター**: 現在選択されているフィールドの詳細プロパティ エディター。

## アーキテクチャと依存関係

フレームワークの同等性を維持しながら依存関係の循環を回避するには:

- `@mission-platform/forms` は `@mission-platform/components` に依存します (`ForgeInput` のような個々の入力ウィジェットの場合)
  `ForgeCheckbox`) および `@mission-platform/layouts`。
- 検証、スキーマ解析、条件ロジックなどの重労働をすべてフレームワークに依存しないものに委任します。
  `@mission-platform/forms-core`。

## スタイル

このパッケージは、以下を介して共有アクセシビリティ ヘルパーを提供します。

```ts
import '@mission-platform/forms/styles';
```

各コンポーネントは、特定のスタイル設定のために、同じ場所に配置された独自の CSS モジュールも利用します。
