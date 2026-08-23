# @mission-platform/forms-core

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/forms-core/docs/index.md: [packages/forms-core/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/forms-core` は、ビジネス ロジック、型定義、および
Mission Platform 全体のフォームの検証エンジン。このロジックを純粋な TypeScript パッケージに集中化することで、
Vue および React の実装は、構造上完全な同等性を維持します。

## 概要

このパッケージは、次の 3 つの主要領域に焦点を当てています。

1. **JSON スキーマ定義**: フォーム スキーマを定義するための型と構造。
2. **条件付き可視性**: 他のフォーム値に基づいてフィールドをレンダリングするかどうかを決定するロジック。
3. **検証とデフォルト**: JSON スキーマの検証とデフォルトの自動生成のための Ajv との統合
   価値観。

## 主要モジュール

### 1. フォーム定義とタイプ (`src/types.ts`)

フォームの構造的なコントラクトを定義します。

- `SchemaFormDefinition`: ルート定義。単一のオブジェクトは 1 ステップのフォームを表しますが、オブジェクトの配列は
  複数ステップのウィザードを定義します。
- `FormFieldSchema`: レンダリングの準備ができたフィールドの解決された形状。
- `FieldUiOptions`: プレゼンテーションのヒントを提供するための JSON スキーマの拡張 (`ui` 名前空間)。
- `FormValues` および `FormErrors`: 現在のフォーム データとそれに対応する検証エラーの型マップ。

### 2. 条件付き可視性 (`src/conditions.ts`)

現在の値に基づいてフィールドを表示するかどうかを評価するエンジンを提供します。

- `evaluateCondition(condition, values)`: JSON スキーマのようなコンビネータを使用して `FieldCondition` を評価します。
  - `allOf`: AND ロジック (すべての条件が true である必要があります)。
  - `anyOf`: OR ロジック (少なくとも 1 つの条件が true である必要があります)。
  - `oneOf`: XOR ロジック (1 つの条件だけが true でなければなりません)。
- `isFieldVisible(field, values)`: 特定のフィールドの `visibleWhen` プロパティが満たされているかどうかを判断するヘルパー。

### 3. JSON スキーマの統合 (`src/json-schema.ts`)

生の JSON スキーマとレンダリング可能なフォーム フィールド間の変換を処理します。

- `jsonSchemaToFields(schema)`: JSON スキーマを `FormFieldSchema` の順序付きリストに再帰的に変換します。
- `jsonSchemaDefaults(schema)`: スキーマの `default` キーワードまたは適切な型に基づいて初期値を生成します。
  ブランク。
- `createFormValidator(schema, translate?)`: Ajv を使用してフォーム値を検証する `FormValidator` を返します。それ
  非表示フィールドを検証から自動的に除外し、カスタム エラー メッセージをサポートします。

### 4. フォームビルダーロジック (`src/builder-types.ts`、`src/form-schema.ts`)

ビジュアル フォーム ビルダー ツールをサポートします。

- **変換**: `fieldsToSchema` や `schemaToFields` のような関数を使用すると、ビルダーは作業間を移動できます。
  表現 (フィールド ツリー) と最終的な `SchemaFormDefinition`。
- **フィールド パレット**: ビルダーのパレットで使用可能なウィジェットを定義する `DEFAULT_FIELD_TYPES` を提供します。

## 依存関係モデル

このパッケージは意図的に無駄がなく、フレームワークに依存しません。

- **フレームワークなし**: Vue または React への依存関係はありません。
- **主要な依存関係**:
  - `ajv` および `ajv-formats`: 高性能の JSON スキーマ検証用。
  - `nanoid`: ビルダー内で一意のフィールド識別子を生成します。

## 消費者

主要なコンシューマは `@mission-platform/forms` で、このコアを使用して以下に電力を供給します。

- **ForgeSchemaForm**: これらのユーティリティを使用してフィールドをレンダリングし、データを検証します。
- **ForgeFormBuilder**: 変換ロジックを使用して、ユーザーが視覚的にスキーマを作成できるようにします。
