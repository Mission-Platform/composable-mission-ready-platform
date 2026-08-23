# @mission-platform/i18n

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/i18n` は、フレームワークに依存しない国際化 (i18n) ラッパーとして構築されています。
に [i18next](https://www.i18next.com/)。これは、Mission プラットフォーム全体で翻訳を処理するための統一された方法を提供します。
Vue 3 と React の両方に専用アダプターが付属します。

## エントリーポイント

パッケージには、`@mission-platform/i18n` という単一のエントリ ポイントがあります。どのアダプタに解決されるかは次によって決定されます。
アクティブな `mp:<framework>` エクスポート条件。プロジェクト全体に対して **1 回**選択します。
Vite の `resolve.conditions` (`defineFrameworkAppConfig` / `frameworkResolveConditions` を参照)
`@mission-platform/vite-config`) および TypeScript の `customConditions` (
`@mission-platform/typescript-config/framework-<name>` プリセット）。すべてのインポートは裸のままです。

|アクティブな状態 | | に解決されます。主要な輸出 |
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| _(なし)_ |フレームワーク中立のコア | `createForgeI18N`、`forgeNamespace`、`localeNamespaces`、`mergeLocales` |
| `mp:vue` | Vue 3 アダプター |ニュートラルコアと `createForgeI18NVue`、`useI18n` |
| `mp:react` | React アダプター |ニュートラルコアと `ForgeI18NProvider`、`useI18n` |

## 中心となる概念

### i18n インスタンス

コアは、同期的に初期化された i18next インスタンスを返す `createForgeI18N(options)` を提供します。

- **補間**: 単一中括弧区切り文字を使用します (例: `{name}`)。
- **HTML エスケープ**: フレームワークが以下に従ってエスケープを処理できるようにするため、デフォルトで無効になっています (`escapeValue: false`)。
  独自のセキュリティ モデル。

### 名前空間戦略

モノリポジトリでの衝突を避けるために、翻訳は `mp.<workspace>` 規則を使用して名前空間にグループ化されます。

- **パッケージ**: `forgeNamespace('<package_name>')` を使用します (例: `@mission-platform/breakpoints` は `mp.breakpoints` を使用します)。
- **アプリ**: `forgeNamespace('<app_name>')` を使用します。

#### 名前空間の階層とオーバーライド

1. **デフォルトの名前空間**: アプリは独自の名前空間をデフォルトとして定義します。
2. **フォールバック**: デフォルトの名前空間は他の名前空間にフォールバックし、コンポーネント コードが独自のキーを解決できるようにします。
3. **オーバーライド**: アプリは構成内に `overrides` オブジェクトを提供して、パッケージの特定の文字列のラベルを変更できます
   他人に影響を与えずに。

## 使用例

### 1. コア構成

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2. Vue 3 統合

**インストール:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**コンポーネントの使用法:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. React の統合

**プロバイダーのセットアップ:**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**コンポーネントの使用法:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## APIリファレンス

### `forgeNamespace(workspace: string)`

指定されたワークスペースの標準化された名前空間文字列を返します (例: `'breakpoints'` $\rightarrow$)
`'mp.breakpoints'`)。

### `localeNamespaces(locale: string, bundles: any)`

生の名前空間キー付き翻訳ファイル (通常は YAML からのもの) を、i18next が期待する形式に変換します。
