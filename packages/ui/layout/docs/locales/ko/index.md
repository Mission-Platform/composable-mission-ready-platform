# `@mission-platform/layouts`

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/ui/layout/docs/index.md: [packages/ui/layout/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Forge JSX 방언으로 작성되고 스타일이 지정된 Vue 3 및 React에 대한 프레임워크 중립적 애플리케이션 및 패턴 레이아웃
Mission Platform 디자인 토큰으로

## 개요

`@mission-platform/layouts` 패키지에는 애플리케이션 셸, 컨테이너, 수직 레이아웃 및 재사용 가능한 4가지 레이아웃이 포함되어 있습니다.
반응형 패턴 템플릿. 해당 구성 요소는 기존 프레임워크 조건 패키지 빌드를 통해 내보내지므로
동일한 소스가 Vue 3, React, Solid, Svelte 및 웹 구성 요소에서 작동합니다.

## 특징

- **애플리케이션 셸**: `ForgeApplicationLayout`, `ForgeContainer` 및 `ForgeVerticalLayout`
- **도시락 구성**: 특징과 지원 지역을 갖춘 지배적인 영웅
- **일반 그리드**: 메트릭 및 상태 카드 컬렉션에 대한 순서가 지정된 명명된 셀
- **F 패턴 구성**: 문서 스타일 헤더, 소개, 기사, 보조 및 바닥글 영역
- **Z 패턴 구성**: 상단, 중간, 하단 콘텐츠 영역을 교대로 사용
- **CSS 전용 응답성**: `window`, `matchMedia` 또는 클라이언트 상태가 없는 모바일 우선 리플로우
- **디자인 토큰 통합**: 간격, 패딩 및 여백은 Mission Platform 간격 토큰을 사용합니다.

## 설치

```bash
pnpm add @mission-platform/layouts
```

## 용법

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## API 참조

### 공유 컨트롤

네 가지 패턴 템플릿 모두 다음을 허용합니다.

- `tag`: `div`, `section`, `article`, `main` 또는 `aside`
- `gap`, `margin` 및 `padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl` 또는 `2xl`
- `breakpoint`: `xs`, `sm`, `md`, `lg` 또는 `xl`

구성요소는 1열 또는 스택형 레이아웃으로 시작됩니다. 선택한 중단점에서 패턴별 적용
그리드 영역. 지역 래퍼에는 예측 가능한 BEM 스타일 클래스가 있으며 명명된 슬롯이 있는 경우에만 내보내집니다.

### 지역 계약

| 구성요소              | 명명된 지역                                                | 작곡 소스                                      |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `ForgeBentoLayout`    | `hero`, `feature`, `supporting`                            | 웹사이트 마케팅 영웅 및 기능 섹션              |
| `ForgeGridLayout`     | `cell1` - `cell12`                                         | 서비스 모니터 대시보드 카드 및 상태 요약       |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer`        | 문서 탐색바/컨텍스트, 기사, 사이드바 및 바닥글 |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | 랜딩 페이지 콘텐츠와 작업을 번갈아 사용        |

`ForgeGridLayout`은 `rows` 및 `columns`를 허용하고 둘 다 1 이상으로 고정하고 렌더링 가능 영역을 12개로 제한합니다.
중단점 아래에서 단일 열 대체를 사용합니다. 명명된 셀은 항상 소스 순서대로 렌더링됩니다.

## 상품 구성 안내

템플릿은 애플리케이션 동작이 아닌 구조를 추출합니다. 웹사이트 패키지 카드 및 FAQ 콘텐츠, 문서 탐색 및
라우팅, 서비스 모니터 폴링, 양식 및 사고 상태는 해당 애플리케이션의 소유로 유지됩니다. 해당 애플리케이션
`apps/`에서 `packages/layout`로 가져오기를 도입하지 않고도 기존 콘텐츠를 명명된 영역으로 전달할 수 있습니다.

접근성을 위해 제공된 콘텐츠를 의미론적 읽기 순서로 유지하고 CSS 그리드 영역을 시각적 배치로만 처리합니다.
긴 콘텐츠는 `min-width: 0` 및 `overflow-wrap: anywhere`로 보호됩니다. SSR에는 `window`가 필요하지 않습니다.
`matchMedia`.

## 특허

BSD-4-절
