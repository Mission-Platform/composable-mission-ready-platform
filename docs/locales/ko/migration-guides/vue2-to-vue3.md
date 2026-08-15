# Vue 2 ~ Vue 3 마이그레이션 가이드

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> 언어: 한국어 (ko)

이 가이드에서는 기존 마이그레이션 방법을 설명합니다. Vue 2개의 코드베이스 Vue 미션 플랫폼 모노레포 내 3개.

## 개요

미션 플랫폼은 Vue 3은 Composition API를 사용하고 `<script setup>` 통사론. 마이그레이션에는 다른 곳으로 이사하는 것도 포함됩니다
옵션 API에서 구성 요소 수명 주기 및 반응성 패턴을 업데이트합니다.

## 전제조건

마이그레이션하기 전에 패키지가 플랫폼의 종속성 규칙을 따르는지 확인하세요.

- 수입품 없음 `apps/`.
- 모든 공유 로직은 다음 위치에 있어야 합니다. `packages/`.
- 구성은 다음에서 제공되어야 합니다. `configs/`.

## 1단계: 빌드 구성 업데이트

귀하의 `package.json` 그리고 `vite.config.ts` 타겟팅하고 있습니다 Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## 2단계: 옵션 API를 컴포지션 API로 변환

교체 Vue 2 옵션 API(`data`, `methods`, `computed`) 와 함께 Vue 3 컴포지션 API.

### 참조할 데이터

~ 안에 Vue 2, 상태는 `data()` 기능. ~ 안에 Vue 3, 사용 `ref()` 또는 `reactive()`.

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

메소드는 일반 함수가 됩니다. `<script setup>` 차단하다.

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

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | 사용 `setup()` / `<script setup>` 직접 |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

예:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## 4단계: 채택 `<script setup>`

Mission Platform의 모든 신규 및 마이그레이션 구성 요소는 다음을 사용해야 합니다. `<script setup>` 구문 TypeScript.

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

~ 안에 Vue 3, 기본 소품 이름 `v-model` ~이다 `modelValue` 그리고 이벤트는 `update:modelValue`.

### 참조 액세스

`this.$refs` 더 이상 사용되지 않습니다. ref와 동일한 이름으로 ref를 정의합니다. `ref` 요소의 속성입니다.

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
