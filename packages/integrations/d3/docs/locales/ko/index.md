# @mission-platform/d3

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/integrations/d3/docs/index.md: [packages/integrations/d3/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/d3`은 D3와 Mission Platform write-once 구성 요소 간의 프레임워크 중립적 통합을 제공합니다.
시스템.

## 건축학

이 패키지는 선언적 반응형 UI 트리를 사용하여 필수 D3 선택 기반 렌더링을 연결합니다.

- **중립적 구현**: `@mission-platform/forge-jsx` 후크(`useRef`, `useEffect`) 위에 구축되었습니다.
- **이중 프레임워크 대상**: `@mission-platform/vite-plugin-forge`에 의해 기본 React(`./react`) 및 Vue로 변환됨 3
  (`./vue`) 컴포저블.
- **선택적 종속성**: 클라이언트 번들 크기를 최소로 유지하기 위해 `d3-selection`을 직접 가져옵니다.

## 주요 API

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

DOM/SVG 요소 참조에 연결하고 다음과 같은 경우 D3 선택(`D3Selection<E>`)을 전달하는 `draw` 함수를 실행합니다.
마운트 및 종속성이 변경될 때. `draw`는 선택적으로 해체 정리 기능을 반환할 수 있습니다.

### 마진 유틸리티

#### `resolveMargin(input?: MarginInput): Margin`

부분 또는 누락된 여백 개체를 전체 `{ top, right, bottom, left }` 픽셀 값으로 정규화합니다.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

SVG 뷰박스 계산을 위해 `innerWidth`, `innerHeight` 및 해결된 `margin`를 계산합니다.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
