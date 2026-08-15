# 스토어 작성

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/store-authoring.md](../../store-authoring.md)
> 언어: 한국어 (ko)

저장소는 패키지 내의 공유된 구성 요소 간 상태를 관리하는 데 사용됩니다. 애플리케이션 수준 저장소(예: Pinia 또는
Redux), Mission Platform의 패키지 저장소는 **프레임워크 중립적인 관찰 가능한 모듈**로 설계되었습니다. 이를 통해
호스트 프레임워크에 관계없이 Forge 후크를 통해 이를 소비하는 Write-Once 구성 요소입니다.

## 디렉토리 레이아웃

각 상점은 다음의 자체 명명된 하위 디렉터리에 있어야 합니다. `src/stores/`, 함께 배치된 테스트 파일 및
지역 배럴.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## 관찰 가능한 패턴

패키지 저장소는 프레임워크별 종속성을 방지합니다. 대신, 관찰 가능한 간단한 패턴을 따릅니다.

1. **비공개 상태**: 모듈 범위 내에서 상태를 유지합니다(일반 TypeScript 값).
2. **스냅샷 액세스**: `getSnapshot()` 현재 상태를 검색하는 함수입니다.
3. **구독**: `subscribe(listener)` 목록에 콜백을 추가하고 구독 취소를 반환하는 함수
   기능.
4. **변경자**: 상태를 업데이트하는 기능을 제공합니다. 이 기능은 업데이트 후 모든 리스너에게 알려야 합니다.

## 저작 규칙

1. **프레임워크 불가지론**: 다음에서 가져오지 마세요. `vue`, `react`, 또는 `@mission-platform/forge` 저장소 모듈 내부의 후크
   그 자체.
2. **명시적 유형**: 항상 저장소 상태에 대한 인터페이스를 정의하고 내보내십시오.
3. **SSR 안전**: 브라우저 API에 대한 액세스를 보호합니다(예: `localStorage`) 따라서 저장소는 다음과 같이 초기화될 수 있습니다. Node.js
   환경.
4. **필수 테스트**: 모든 매장에는 같은 위치에 있어야 합니다. `.spec.ts` 파일.

## 예시 매장

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## 구성 요소의 저장소 소비

한 번 쓰기 구성 요소 내에서 저장소를 사용하려면 다음을 사용하여 연결하세요. `useState` 그리고 `useEffect` ~에서 `@mission-platform/forge`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## 발판

Mission Platform Developer MCP 도구를 사용하여 새 매장 뼈대를 생성합니다.

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## 관련 가이드

- [패키지 개발](package-development.md)
- [원자 구성 요소 설계](atomic-component-design.md)
- [구성 가능한 저작](composable-authoring.md)
- [저작 활용](util-authoring.md)
