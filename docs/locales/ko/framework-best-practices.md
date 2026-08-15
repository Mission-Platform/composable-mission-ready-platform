# 프레임워크 모범 사례

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/framework-best-practices.md](../../framework-best-practices.md)
> 언어: 한국어 (ko)

이 문서는 Mission Platform에서 지원하는 프레임워크에 대한 관용적 패턴, 반응성 모델 및 성능 최적화에 대한 지침을 제공합니다. 이는 다중 프레임워크 전략에 대한 **설명** 및 프레임워크별 개발에 대한 참고 자료 역할을 합니다.

## 다중 프레임워크 전략

Mission Platform의 핵심 철학은 한 번 구축하면 모든 곳에서 렌더링하는 것입니다. 이는 **를 통해 달성됩니다.@mission-platform/forge**, 플랫폼의 기본 프레임워크: 모든 공유 구성 요소(앱을 제외한 모든 것)가 작성되고 원활하게 렌더링되는 프레임워크 중립적인 JSX 런타임입니다. Vue 3, React및 기타 지원되는 환경.

### 포지 방언
공유 패키지를 구축할 때 Forge의 중립 기본 요소를 사용하여 구성 요소를 작성하세요.
- **JSX 팩토리**: 사용 `h` 그리고 `Fragment` ~에서 `@mission-platform/forge`.
- **중립 후크**: 사용 `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, 그리고 `useId`.
- **기본 요소**: 사용 `Slot`, `Teleport`, `Transition`, 그리고 `Dynamic` 복잡한 UI 구조의 경우.

## Vue 3

Vue 3은 애플리케이션이 포함된 프레임워크입니다. `apps/` Forge 구성 요소의 기본 기본 렌더링 대상으로 구축되었습니다. 공유 구성 요소 자체는 Forge JSX에서 직접 작성되지 않고 Forge JSX에서 작성됩니다. Vue.

### 관용적 패턴
- **컴포지션 API**: 사용 `<script setup lang="ts">` 모든 새로운 구성 요소에 대해.
- **Forge Integration**: 다음을 사용하여 중립 구성 요소를 래핑합니다. `toVueComponent` ~에서 `@mission-platform/forge/vue`.
- **컴포저블**: 상태 저장 로직을 `useXxx` 재사용성을 높이는 기능.

### 성능 최적화
- **얕은 반응성**: 사용 `shallowRef` 또는 `shallowReactive` 크고 복잡한 데이터 세트의 경우 프록시 오버헤드를 방지합니다.
- **v-memo**: 사용 `v-memo` 템플릿에서 종속성 변경에 따라 비용이 많이 드는 하위 트리 업데이트를 건너뛸 수 있습니다.
- **markRaw**: 타사 라이브러리 인스턴스(예: Chart.js, Mapbox)를 `markRaw` 방지하기 위해 Vue 반응적으로 만들려고 시도하지 마세요.

## React

React 주로 외부 통합 및 특정 내부 도구를 위해 Forge 런타임 어댑터를 통해 지원됩니다.

### 관용적 패턴
- **기능적 구성요소**: 후크가 있는 기능적 구성요소를 사용합니다.
- **Forge Integration**: 다음을 사용하여 중립 구성 요소를 래핑합니다. `toReactComponent` ~에서 `@mission-platform/forge/react`.
- **후크 규율**: 예측 가능한 동작을 보장하려면 "후크 규칙"을 엄격히 따르십시오.

### 성능 최적화
- **메모이제이션**: 사용 `React.memo`, `useMemo`, 그리고 `useCallback` 참조 정체성을 유지하고 불필요한 재렌더링을 방지합니다.
- **동시 기능**: 활용 `useTransition` 또는 `useDeferredValue` 긴급하지 않은 UI 업데이트를 위해 메인 스레드의 응답성을 유지합니다.

## 기타 프레임워크

Mission Platform은 Forge 어댑터를 통해 다른 프레임워크에 대한 다양한 수준의 지원을 제공합니다.

- **SolidJS**: 신호를 통해 세분화된 반응성을 사용합니다. 반응성을 유지하기 위해 소품을 구조화하지 마세요.
- **Svelte 5**: 룬을 활용합니다(`$state`, `$derived`, `$effect`) 현대적인 반응성을 위해.
- **웹 구성 요소(Lit)**: 레거시 환경에서 또는 프레임워크 없이 실행해야 하는 이식성이 뛰어난 구성 요소를 구축하는 데 유용합니다.

## 성능 및 반응성 모델

| 프레임워크 | 반응성 모델 | 업데이트 전략 |
| :--- | :--- | :--- |
| **Vue 3** | 프록시 기반 | 컴파일러 최적화를 갖춘 가상 DOM. |
| **React** | 불변 상태 | 가상 DOM 조정. |
| **SolidJS** | 세분화된 신호 | 직접 DOM 업데이트(VDOM 없음). |
| **Svelte 5** | 룬/신호 | 컴파일러를 통해 DOM을 직접 업데이트합니다. |
| **점등** | 반응성 속성 | 비동기 Shadow DOM 업데이트. |

## 관련 자료
- [모범 사례](best-practices.md)
- [테스트 가이드](testing.md)
- [@mission-platform/forge 읽어보기](../../../packages/forge/README.md)
