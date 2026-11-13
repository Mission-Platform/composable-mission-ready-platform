# 구성 가능한 저작

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> 언어: 한국어 (ko)

컴포저블은 미션 플랫폼 내에서 반응형 로직을 캡슐화하고 재사용하는 기본 방법입니다. 이를 보장하려면
로직 단위는 지원되는 모든 UI 프레임워크에서 이식 가능하며 다음을 사용하여 **한 번만 작성** 모듈로 작성됩니다.
`@mission-platform/forge-jsx`에서 제공하는 프레임워크 중립 후크입니다.

## 디렉토리 레이아웃

각 컴포저블은 공동 배치된 테스트와 함께 `src/composables/` 내의 자체 이름이 지정된 하위 디렉터리에 있어야 합니다(MUST).
파일 및 로컬 배럴.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## 저작 규칙

1. **Forge Hooks 사용**: 다음에서 반응형 기본 요소(예: `useState`, `useEffect`, `useMemo`, `useRef`)만 가져옵니다.
   `@mission-platform/forge-jsx`. `vue` 또는 `react`에서 직접 가져오지 마십시오.
2. **명명 규칙**: 구성 가능한 이름은 kebab-case를 사용해야 하며 `use-`이라는 접두사가 붙어야 합니다(예: `use-media-query`).
3. **SSR 안전성**: 서버 측 렌더링에 대한 로직이 안전한지 확인합니다. `window`와 같은 브라우저 전용 API에 대한 모든 액세스를 보호하세요.
   `document` 또는 `localStorage`.
4. **UI 구성요소 없음**: 컴포저블은 로직에 중점을 두어야 합니다. UI 구성요소를 직접 반환하거나 조작하지 마세요. 대신에
   상태, 참조 또는 콜백을 반환합니다.
5. **필수 테스트**: 모든 컴포저블에는 Vitest을 사용하여 공동 배치된 `.spec.ts` 파일이 있어야 합니다.

## 기본 예

다음은 이벤트 리스너를 관리하는 일반적인 1회 쓰기 컴포저블입니다.

```ts
import { type MpRef, useEffect } from "@mission-platform/forge-jsx";

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);

    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## 발판

새 컴포저블을 만드는 가장 빠른 방법은 연결된 Mission Platform의 `scaffold_composable` 도구를 사용하는 것입니다.
개발자 MCP 서버. 이것은 쉘 명령이 아닌 MCP 도구 호출 예입니다.

```text
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## 관련 가이드

- [패키지 개발](package-development.md)
- [원자부품설계](atomic-component-design.md)
- [스토어 저작](store-authoring.md)
- [유틸 저작](util-authoring.md)
