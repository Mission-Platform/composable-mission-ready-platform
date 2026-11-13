# @mission-platform/forge-adapters

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

중립 `@mission-platform/forge-jsx` 런타임용 프레임워크 어댑터입니다.
구성 요소는 Forge JSX에 대해 한 번 작성되고 어댑터를 통해 렌더링됩니다.
대상 프레임워크에 대한 것입니다.

## 수출

| 입장 | 목적 |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` 및 `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` 및 `renderToVue` |
| `@mission-platform/forge-adapters/solid` | SolidJS 마커 및 구조 기본 요소 |
| `@mission-platform/forge-adapters/svelte` | Svelte 렌더링 도우미 |
| `@mission-platform/forge-adapters/web-components` | 네이티브 사용자 정의 요소 및 직접 DOM 런타임 |

프레임워크 패키지는 선택적 피어 종속성입니다. 사용된 프레임워크 설치
선택한 어댑터별로 해당 하위 경로만 가져옵니다.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
