# @mission-platform/forge

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forge/docs/index.md: [packages/forge/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Mission Platform을 위한 작고 종속성이 없는 "한 번 작성하면 Vue 3 및 React에서 실행" 계층입니다. 구성 요소는 한 번만 작성됩니다.
JSX이며 작은 어댑터를 통해 두 프레임워크 중 하나에서 렌더링됩니다. 빌드 시 코드 생성도 없고 외부 컴파일러도 없습니다(이것은
Mitosis와 같은 도구에 대한 손으로 굴린 대안).

## 작동 방식

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. 구성 요소는 **클래식** JSX 변환(`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)`는 React/Vue 요소 대신 프레임워크 중립적이고 직렬화 가능한 `MpElement` 트리를 구축합니다.
3. 프레임워크별 어댑터는 해당 트리를 탐색하고 렌더링 시 모든 node을 `React.createElement` 또는 Vue의 `h`에 매핑합니다.

## 특징

- **프레임워크 중립적 JSX 런타임**: 직렬화 가능한 `MpElement` 트리를 구축하는 작고 종속성이 없는 런타임
- **Vue 3 어댑터**: 중성 구성 요소를 적절한 반응성을 갖춘 기본 Vue 3 SFC로 변환합니다.
- **React 어댑터**: 중립 구성 요소를 기본 React 구성 요소로 변환합니다.
- **후크 지원**: 프레임워크 중립 React 스타일 후크(`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  해당 프레임워크로 컴파일되는
- **빌드 타임 코드 생성 없음**: Mitosis 또는 유사한 도구와 달리 이 접근 방식은 빌드 타임 대신 런타임 어댑터를 사용합니다.
  변형
- **TypeScript 첫 번째**: 적절한 유형 추론을 통해 완전한 TypeScript 지원

## 설치

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## 기본 사용법

### 1. 프레임워크 중립적인 구성 요소 작성

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge';
import { useState } from '@mission-platform/forge';

export function MyComponent({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 2. Vue 3에서 사용

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. React에서 사용

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## API 참조

### 핵심 기능

#### `h(type, props?, ...children)`

프레임워크 중립적인 JSX 팩토리 함수입니다.

**매개변수:**

- `type`: React 요소 유형 또는 문자열 태그 이름
- `props`: 소품/속성의 객체
- `children`: 하위 요소

**반환:** `MpElement` - 프레임워크 중립 요소 트리

#### `Fragment(props, ...children)`

조각을 만듭니다(래퍼 요소 없음).

### 후크

#### `useState(initialValue)`

프레임워크 중립적인 상태 후크.

**매개변수:**

- `initialValue`: 초기 상태 값

**반환:** `[state, setState]` - 상태 값 및 설정 기능

#### `useRef(initialValue)`

변경 가능한 참조 개체를 만듭니다.

**매개변수:**

- `initialValue`(옵션): 초기 참조 값

**반환:** `ref` - `.current` 속성이 있는 변경 가능한 참조 객체

#### `useEffect(effect, dependencies?)`

프레임워크 중립적인 부작용 후크.

**매개변수:**

- `effect`: 마운트/업데이트/마운트 해제 시 실행되는 함수
- `dependencies` (선택): 메모용 의존성 배열

#### `useMemo(value, dependencies)`

계산된 값을 기억합니다.

**매개변수:**

- `value`: 메모할 값
- `dependencies`: 종속성 배열

**반품:** 메모된 값

#### `useCallback(fn, dependencies)`

기능을 메모합니다.

**매개변수:**

- `fn`: 메모 기능
- `dependencies`: 종속성 배열

**반환:** 메모 기능

### 어댑터

#### `toVueComponent(component)`

프레임워크 중립 구성 요소를 Vue 3 구성 요소로 변환합니다.

**매개변수:**

- `component`: 프레임워크 중립적인 구성 요소 기능

**반환:** Vue 구성요소 정의

#### `toReactComponent(component)`

프레임워크 중립 구성 요소를 React 구성 요소로 변환합니다.

**매개변수:**

- `component`: 프레임워크 중립적인 구성 요소 기능

**반환:** React 구성요소 기능

## TypeScript 지원

패키지에는 전체 TypeScript 선언이 포함되어 있습니다. 적절한 유형 검사와 함께 JSX를 사용할 수 있습니다.

```tsx
import { h } from '@mission-platform/forge';

type Props = {
  title: string;
  count?: number;
};

function MyComponent({ title, count = 0 }: Props) {
  return (
    <div>
      {title}: {count}
    </div>
  );
}
```

## 고급 사용법

### Vite과 함께 사용

클래식 JSX 변환을 사용하도록 `vite.config.ts`을 구성합니다.

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge'],
  },
});
```

### 전역 JSX 구성

TypeScript 프로젝트의 경우 전역 JSX 설정을 구성할 수 있습니다.

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

이는 `MpElement`을 사용하도록 전역 `JSX` 네임스페이스를 구성합니다.

## 다른 프레임워크에서 마이그레이션

React 또는 Vue 구성 요소에서 마이그레이션하는 경우 변환은 간단합니다.

### React에서

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### Vue에서

```vue
<!-- Before (Vue) -->
<script setup>
  import { ref } from 'vue';
  const count = ref(0);
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

// After (Framework-neutral) export function Button() { const [count, setCount] = useState(0) return (
<button onClick="{()" =""> setCount(count + 1)}>
      Count: {count}
    </button>
) }
```

## 성능 고려 사항

- 프레임워크 중립 레이어는 최소한의 오버헤드를 추가합니다(렌더링 시 나무 걷기만)
- 최적의 성능을 위해 후크는 기본 프레임워크로 컴파일됩니다.
- 런타임 구문 분석이나 코드 생성이 수행되지 않습니다.
- 메모리 공간은 별도의 React 및 Vue 구성 요소를 작성하는 것과 비슷합니다.

## 특허

BSD-4-절
