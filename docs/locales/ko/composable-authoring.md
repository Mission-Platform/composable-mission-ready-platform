# 구성 가능한 저작

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> 언어: 한국어 (ko)

컴포저블은 미션 플랫폼 내에서 반응형 로직을 캡슐화하고 재사용하는 기본 방법입니다. 이를 보장하려면
로직 단위는 지원되는 모든 UI 프레임워크에서 이식 가능하며 다음을 사용하여 **한 번만 작성** 모듈로 작성됩니다.
프레임워크 중립 후크는 다음에서 제공됩니다. `@mission-platform/forge`.

## 디렉토리 레이아웃

각 컴포저블은 다음의 이름이 지정된 자체 하위 디렉터리에 있어야 합니다. `src/composables/`, 공동 배치 테스트를 동반함
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

1. **Forge Hooks 사용**: 반응성 프리미티브만 가져옵니다(예: `useState`, `useEffect`, `useMemo`, `useRef`) ~에서
   `@mission-platform/forge`. 절대 직접 수입하지 마세요. `vue` 또는 `react`.
2. **명명 규칙**: 구성 가능한 이름은 kebab-case를 사용해야 하며 접두사로 다음이 추가되어야 합니다. `use-` (e.g., `use-media-query`).
3. **SSR 안전**: 서버 측 렌더링에 대한 논리가 안전한지 확인합니다. 다음과 같은 브라우저 전용 API에 대한 액세스를 보호하세요. `window`,
   `document`, 또는 `localStorage`.
4. **UI 구성요소 없음**: 컴포저블은 로직에 중점을 두어야 합니다. UI 구성요소를 직접 반환하거나 조작하지 마세요. 대신에
   상태, 참조 또는 콜백을 반환합니다.
5. **필수 테스트**: 모든 컴포저블에는 같은 위치에 있어야 합니다. `.spec.ts` 사용하는 파일 Vitest.

## 기본 예

다음은 이벤트 리스너를 관리하는 일반적인 1회 쓰기 컴포저블입니다.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge';

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

새 컴포저블을 만드는 가장 빠른 방법은 Mission Platform Developer MCP 도구를 사용하는 것입니다.

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## 관련 가이드

- [패키지 개발](package-development.md)
- [원자 구성 요소 설계](atomic-component-design.md)
- [스토어 작성](store-authoring.md)
- [저작 활용](util-authoring.md)
