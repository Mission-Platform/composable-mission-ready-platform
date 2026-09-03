# Vue 2에서 Vue 3으로 마이그레이션 가이드

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/migration-guides/vue2-to-vue3.md: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> 언어: 한국어 (ko)

이 가이드에서는 Mission Platform monorepo 내에서 기존 Vue 2 코드베이스를 Vue 3으로 마이그레이션하는 방법을 설명합니다.

## 개요

미션 플랫폼은 Composition API 및 `<script setup>` 구문과 함께 Vue 3을 사용합니다. 마이그레이션에는 다른 곳으로 이사하는 것도 포함됩니다
옵션 API에서 구성 요소 수명 주기 및 반응성 패턴을 업데이트합니다.

## 전제 조건

마이그레이션하기 전에 패키지가 플랫폼의 종속성 규칙을 따르는지 확인하세요.

- `apps/`에서 가져오기가 없습니다.
- 모든 공유 로직은 `packages/`에 있어야 합니다.
- 구성은 `packages/tooling/configs/`에서 이루어져야 합니다.

## 1단계: 빌드 구성 업데이트

`package.json` 및 `vite.config.ts`이 Vue를 대상으로 하는지 확인하세요. 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## 2단계: 옵션 API를 컴포지션 API로 변환

Vue 2 옵션 API(`data`, `methods`, `computed`)를 Vue 3 구성 API로 바꿉니다.

### 참조할 데이터

Vue 2에서는 상태가 `data()` 함수에 정의되었습니다. Vue 3에서는 `ref()` 또는 `reactive()`를 사용합니다.

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

### 함수에 대한 방법

메소드는 `<script setup>` 블록에서 일반 함수가 됩니다.

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

## 3단계: 수명 주기 후크 업데이트

수명 주기 후크의 이름이 바뀌었으므로 가져와야 합니다.

| Vue 2 | Vue 3 |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | `setup()` / `<script setup>` 직접 사용 |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

예:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## 4단계: `<script setup>` 채택

Mission Platform의 모든 신규 및 마이그레이션 구성 요소는 TypeScript과 함께 `<script setup>` 구문을 사용해야 합니다.

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

## 5단계: 주요 변경 사항 처리

### V-모델

Vue 3에서 `v-model`의 기본 소품 이름은 `modelValue`이고 이벤트는 `update:modelValue`입니다.

### 참조 액세스

`this.$refs`은 더 이상 사용되지 않습니다. 요소의 `ref` 속성과 동일한 이름으로 참조를 정의합니다.

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

## 6단계: 확인

마이그레이션이 성공하고 플랫폼 표준을 준수하는지 확인하려면 다음 명령을 실행하십시오.

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
