# Vue 2～ Vue 3 移行ガイド

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> 言語: 日本語 (ja)

このガイドでは、既存のファイルを移行する方法について説明します。 Vue 2つのコードベースへ Vue 3 Mission Platform モノレポ内。

## 概要

ミッションプラットフォームが使用するのは、 Vue 3 コンポジション API を使用し、 `<script setup>` 構文。移住には引っ越しが伴います
オプション API から取得し、コンポーネントのライフサイクルと反応性パターンを更新します。

## 前提条件

移行する前に、パッケージがプラットフォームの依存関係ルールに従っていることを確認してください。

- からの輸入はありません `apps/`。
- すべての共有ロジックは次の場所に存在する必要があります。 `packages/`。
- 構成は次のものから取得する必要があります `configs/`.

## ステップ 1: ビルド構成を更新する

あなたの `package.json` そして `vite.config.ts` ターゲットにしている Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## ステップ 2: オプション API を構成 API に変換する

交換してください Vue 2 オプション API (`data`, `methods`, `computed`) と Vue 3 合成 API。

### 参照へのデータ

で Vue 2、状態は `data()` 関数。で Vue 3、使用 `ref()` または `reactive()`.

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

メソッドは、 `<script setup>` ブロック。

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

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` |使用 `setup()` / `<script setup>` 直接 |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

例：

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## ステップ 4: 導入する `<script setup>`

Mission Platform 内のすべての新規および移行されたコンポーネントは、 `<script setup>` を使用した構文 TypeScript.

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

で Vue 3、デフォルトのプロップ名 `v-model` は `modelValue` そしてイベントは `update:modelValue`.

### 参照アクセス

`this.$refs` はもう使用されていません。と同じ名前の ref を定義します。 `ref` 要素の属性。

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
