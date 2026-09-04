# 프레임워크 모범 사례

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> 언어: 한국어 (ko)

이 문서는 Mission Platform에서 지원하는 프레임워크에 대한 관용적 패턴, 반응성 모델 및 성능 최적화에 대한 지침을 제공합니다. 이는 다중 프레임워크 전략에 대한 **설명** 및 프레임워크별 개발에 대한 참고 자료 역할을 합니다.

## 다중 프레임워크 전략

Mission Platform의 핵심 철학은 한 번 구축하면 모든 곳에서 렌더링하는 것입니다. 이는 플랫폼의 기본 프레임워크인 **@mission-platform/forge-jsx**을 통해 달성됩니다. 즉, 모든 공유 구성 요소(앱을 제외한 모든 것)가 작성되고 Vue 3, React 및 기타 지원되는 환경에서 원활하게 렌더링되는 프레임워크 중립적인 JSX 런타임입니다.

### 포지 방언
공유 패키지를 구축할 때 Forge의 중립 기본 요소를 사용하여 구성 요소를 작성하세요.
- **JSX Factory**: `@mission-platform/forge-jsx`에서 `h` 및 `Fragment`을 사용합니다.
- **중립 후크**: `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` 및 `useId`을 사용합니다.
- **기본 요소**: 복잡한 UI 구조에는 `Slot`, `Teleport`, `Transition` 및 `Dynamic`를 사용합니다.

## Vue 3

Vue 3은 `apps/`의 애플리케이션이 구축된 프레임워크이자 Forge 구성 요소의 기본 기본 렌더링 대상입니다. 공유 구성 요소 자체는 Vue에서 직접 작성되지 않고 Forge JSX에서 작성되었습니다.

### 관용적 패턴
- **Composition API**: 모든 새 구성 요소에 `<script setup lang="ts">`을 사용합니다.
- **Forge Integration**: `@mission-platform/forge-adapters/vue`의 `toVueComponent`을 사용하여 중립 구성 요소를 래핑합니다.
- **컴포저블**: 상태 저장 논리를 `useXxx` 함수로 추출하여 재사용성을 높입니다.

### 성능 최적화
- **얕은 반응성**: 크고 복잡한 데이터 세트의 경우 `shallowRef` 또는 `shallowReactive`을 사용하여 프록시 오버헤드를 방지합니다.
- **v-memo**: 템플릿에서 `v-memo`를 사용하여 종속성 변경에 따른 비용이 많이 드는 하위 트리 업데이트를 건너뜁니다.
- **markRaw**: Vue가 반응형으로 만들려고 시도하는 것을 방지하기 위해 `markRaw`에 타사 라이브러리 인스턴스(예: Chart.js, Mapbox)를 래핑합니다.

## React

React은 주로 외부 통합 및 특정 내부 도구를 위해 Forge 런타임 어댑터를 통해 지원됩니다.

### 관용적 패턴
- **기능적 구성요소**: 후크가 있는 기능적 구성요소를 사용합니다.
- **Forge Integration**: `@mission-platform/forge-adapters/react`의 `toReactComponent`을 사용하여 중립 구성 요소를 래핑합니다.
- **후크 규율**: 예측 가능한 동작을 보장하려면 "후크 규칙"을 엄격히 따르십시오.

### 성능 최적화
- **메모이제이션**: `React.memo`, `useMemo` 및 `useCallback`를 사용하여 참조 ID를 유지하고 불필요한 재렌더링을 방지합니다.
- **동시 기능**: 긴급하지 않은 UI 업데이트에 `useTransition` 또는 `useDeferredValue`를 활용하여 메인 스레드의 응답성을 유지합니다.

## 기타 프레임워크

Mission Platform은 Forge 어댑터를 통해 다른 프레임워크에 대한 다양한 수준의 지원을 제공합니다.

- **SolidJS**: 신호를 통해 세분화된 반응성을 사용합니다. 반응성을 유지하기 위해 소품을 구조화하지 마세요.
- **Svelte 5**: 최신 반응성을 위해 룬(`$state`, `$derived`, `$effect`)을 활용합니다.
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
- [@mission-platform/forge-jsx 읽어보기](../../../packages/core/forge-jsx/README.md)
