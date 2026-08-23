# 외부 소비자 설정

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> 언어: 한국어 (ko)

이 가이드에서는 기본 모노레포 외부에 있는 프로젝트에서 Mission Platform 패키지를 사용하는 방법을 설명합니다. 프레임워크별 빌드 사용 및 디자인 토큰 관리에 중점을 둡니다.

## 조건을 통한 프레임워크 선택

Mission Platform 구성 요소는 다음을 사용하여 한 번 작성됩니다. `@mission-platform/forge` 여러 프레임워크별 번들로 배포됩니다(Vue 3, React, Solid및 웹 구성 요소)를 단일 패키지 내에 포함합니다.

올바른 번들을 선택하려면 빌드 도구를 구성하고 TypeScript **사용자 정의 내보내기 조건**을 사용합니다.

### 지원되는 프레임워크 조건

| 프레임워크 | 수출조건 |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **웹 구성요소** | `mp:web-component` |

## 프로젝트 구성

### 1. Vite 구성

당신이 사용하는 경우 Vite, 다음의 도우미 기능을 사용할 수 있습니다. `@mission-platform/vite-config` 올바른 해결 조건을 자동으로 설정합니다. 프레임워크가 없는 앱은 다음을 선택해야 합니다. `mp:web-component`; 설치하거나 구성하지 마십시오. Vue 해당 대상에 대한 플러그인입니다.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript 구성

보장하기 위해 TypeScript LSP(Language Service)는 올바른 프레임워크에 대한 유형을 확인합니다. `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## 패키지 설치

레지스트리에서 필수 패키지를 설치합니다.

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### 피어 종속성

대부분의 Mission Platform 패키지는 런타임 종속성을 외부화합니다. 프로젝트에 해당 프레임워크와 공유 라이브러리가 설치되어 있는지 확인하세요.

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

중립 라우터 패키지에는 프레임워크 또는 라우터 라이브러리 런타임 종속성이 없습니다. 선택한 기본 라우터를 설치합니다.
귀하의 애플리케이션과 일치하는 Forge 대상(`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, 또는 `-web-components`). 애플리케이션은 경로 정의, 공급자, 가드, 로더 및 네이티브를 소유합니다.
라우터 인스턴스; 재사용 가능한 패키지는 다음에서 기능만 가져옵니다. `@mission-platform/router`.

## 구성요소 사용법

조건이 올바르게 구성되면 패키지 루트에서 구성 요소를 가져올 수 있습니다. 빌드 도구는 귀하의 요구사항과 일치하는 번들을 자동으로 선택합니다. `mp:*` 상태.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### 프레임워크 없는 라우팅

테스트 및 사전 렌더링에 메모리 기록을 사용하거나 생략 `history` 브라우저에서 브라우저 기록을 사용합니다. 라우터 등록
요소를 한 번; 매개변수, 쿼리 값 또는 해시가 포함된 경우 경로 대상을 속성으로 할당합니다.

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
```

## 디자인 토큰 사용자 정의

Mission Platform은 디자인 토큰에 CSS 사용자 정의 속성(변수)을 사용합니다. 애플리케이션의 루트 스타일시트에서 전역적으로 이러한 토큰을 재정의할 수 있습니다.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

모든 Mission Platform 구성 요소는 이러한 변수를 사용하므로 `:root` 레벨은 전체 UI에 전파됩니다.
