# @mission-platform/breakpoints

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/breakpoints/docs/index.md: [packages/breakpoints/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/breakpoints`은 반응형 중단점 유틸리티와 **한 번 쓰기** 뷰포트 구성 요소를 제공합니다.
미션 플랫폼. 구성요소(`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`)는 중립에서 한 번 작성됩니다.
`@mission-platform/forge` 방언으로 `@mission-platform/vite-plugin-forge`에 의해 **Vue 3 및 React**로 컴파일되었습니다.

## 수출

- `@mission-platform/breakpoints` — 단일 진입점. 어떤 빌드를 얻을지는 활성 빌드에 따라 결정됩니다.
  `mp:<framework>` 내보내기 조건(`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); 조건이 설정되지 않은 경우 중립 JSX 소스 배럴로 확인됩니다(한 번 쓸 수 있는 구성 요소의 경우).
  `@mission-platform/vite-plugin-forge`에 의해 컴파일됨).
- `@mission-platform/breakpoints/core` — 프레임워크에 구애받지 않는 유틸리티 및 유형.

프레임워크 **한 번** 선택 — `defineFrameworkAppConfig`을 통해 `resolve.conditions` /
`@mission-platform/vite-config`의 `frameworkResolveConditions` 및 `customConditions`를 통해
`@mission-platform/typescript-config/framework-<name>` 사전 설정 — 그런 다음 베어 패키지 지정자를 사용하여 모든 것을 가져옵니다.

## 중단점 규모

플랫폼은 뷰포트 너비 임계값을 기반으로 7단계 반응 배율을 사용합니다.

| 열쇠 | 라벨 | 임계값 | 일반 장치/사용 사례 |
| :---- | :---------------- | :------------ | :------------------------------ |
| `2xs` | 초초소형 | $\ge 0$ px | 모든 장치 |
| `xs` | 초소형 | $\ge480$ px | 대형 전화기 |
| `sm` | 작은 | $\ge 768$ px | 태블릿 초상화 |
| `md` | 중간 | $\ge 1024$ px | 태블릿 가로/소형 노트북 |
| `lg` | 대형 | $\ge 1920$ px | 풀 HD/1080p |
| `xl` | 특대형 | $\ge 2560$ px | QHD |
| `2xl` | 특대형 | $\ge 3840$ px | 4K UHD |

## 핵심 유틸리티(`/core`)

프레임워크에 구애받지 않는 도우미, 모든 프레임워크에서 사용하기에 안전합니다(또는 프레임워크 없음):

- `breakpointKeys` — 중단점 키의 정렬된 배열입니다.
- `breakpoints` — 최소 너비 픽셀 임계값에 대한 키 맵입니다.
- `getBreakpointValue(key)` — 중단점의 픽셀 임계값입니다.
- `mediaQuery(key)` - `min-width` 미디어 쿼리 문자열(`'(min-width: 1920px)'`) 또는 `2xs`의 경우 `'all'`입니다.
- `maxMediaQuery(key)` - `max-width` 상한 미디어 쿼리 문자열 또는 `2xs`의 경우 `'not all'`입니다.
- `resolveBreakpoint(width)` — 주어진 픽셀 너비, 활성 중단점 키.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

Vue 전용 `useBreakpoints` 컴포저블이 삭제되었습니다. 사용자 정의 반응형 뷰포트 로직의 경우 `/core`을 기반으로 빌드하세요.
프레임워크 자체 후크가 있는 도우미(예: `apps/service-monitor`의 React `useCompactViewport` 후크 참조)
`maxMediaQuery`를 기반으로 구축됨).

## 구성요소

### `<ForgeShowAt>`

뷰포트가 지정된 중단점 기준을 충족할 때 슬롯/하위 콘텐츠를 조건부로 렌더링합니다.

#### 용법

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### 소품

- `min?: BreakpointKey`: 뷰포트가 이 중단점 이상일 때 콘텐츠를 표시합니다.
- `max?: BreakpointKey`: 뷰포트가 이 중단점 아래에 있을 때 콘텐츠를 표시합니다.

### `<ForgeHideAt>`

`<ForgeShowAt>`의 반대: 뷰포트가 지정된 조건을 충족할 때 조건에 따라 슬롯/하위 콘텐츠를 숨깁니다.
중단점 기준.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### 소품

`<ForgeShowAt>`과 동일합니다.

### `<ForgeBreakpointDebug>`

현재 활성 중단점을 표시하고 오른쪽 하단에 고정된 개발 전용 오버레이입니다.
중단점이 활성화되어 있습니다. 해당 레이블은 i18next(`mp.breakpoints` 네임스페이스)를 통해 영어 기본값으로 지역화됩니다.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## SCSS 유틸리티

중단점 SCSS 레이어는 `@mission-platform/tokens`에 있습니다.

### 믹스인

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### 가시성 유틸리티 클래스

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
