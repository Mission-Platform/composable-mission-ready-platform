# Vue 2 から Vue 3 への移行ガイド

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/migration-guides/vue2-to-vue3.md: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> 言語: 日本語 (ja)

このガイドでは、Mission Platform モノリポジトリ内の既存の Vue 2 コードベースを Vue 3 に移行する方法について説明します。

## 概要

Mission Platform は、Composition API および `<script setup>` 構文で Vue 3 を使用します。移住には引っ越しが伴います
オプション API から取得し、コンポーネントのライフサイクルと反応性パターンを更新します。

## 前提条件

移行する前に、パッケージがプラットフォームの依存関係ルールに従っていることを確認してください。

- `apps/` からのインポートはありません。
- すべての共有ロジックは `packages/` に存在する必要があります。
- 構成は `packages/tooling/configs/` から取得する必要があります。

## ステップ 1: ビルド構成を更新する

`package.json` と `vite.config.ts` が Vue をターゲットにしていることを確認します。

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## ステップ 2: オプション API を構成 API に変換する

Vue 2 オプション API (`data`、`methods`、`computed`) を Vue 3 構成 API に置き換えます。

### 参照へのデータ

Vue 2 では、`data()` 関数で状態が定義されました。 Vue 3 では、`ref()` または `reactive()` を使用します。

**Vue 2:**

```js
export default {
  data() {
    return {
      count: 0
    }
  }
}
```

**Vue 3:**

```ts
import { ref } from 'vue';

const count = ref(0);
```

### メソッドから関数へ

メソッドは、`<script setup>` ブロック内のプレーン関数になります。

**Vue 2:**

```js
methods: {
  increment() {
    this.count++;
  }
}
```

**Vue 3:**

```ts
const increment = () => {
  count.value++;
};
```

## ステップ 3: ライフサイクル フックを更新する

ライフサイクル フックの名前が変更されたため、インポートする必要があります。

| Vue 2 | Vue 3 |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | `setup()` / `<script setup>` を直接使用する |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

例：

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## ステップ 4: `<script setup>` を採用する

Mission Platform 内のすべての新規および移行されたコンポーネントは、TypeScript を含む `<script setup>` 構文を使用する必要があります。

```vue
<template>
  <button @click="increment">{{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>
```

## ステップ 5: 重大な変更を処理する

### Vモデル

Vue 3 では、`v-model` のデフォルトのプロップ名は `modelValue` で、イベントは `update:modelValue` です。

### 参照アクセス

`this.$refs` は使用されなくなりました。要素の `ref` 属性と同じ名前の ref を定義します。

```vue
<template>
  <div ref="root"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const root = ref<HTMLElement | null>(null);

onMounted(() => {
  console.log(root.value);
});
</script>
```

## ステップ 6: 検証

次のコマンドを実行して、移行が成功し、プラットフォーム標準に準拠していることを確認します。

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
