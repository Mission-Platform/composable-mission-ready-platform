# 저작 활용

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/util-authoring.md](../../util-authoring.md)
> 언어: 한국어 (ko)

유틸리티(utils)는 순수하고 프레임워크에 구애받지 않는 도우미 함수입니다. UI 프레임워크 가져오기가 없어야 하며, 그렇지 않은 경우
명시적으로 필요하고 문서화되어 있으며 DOM API가 없습니다. 이를 통해 다음을 포함한 모든 상황에서 사용할 수 있습니다.
서버 측 로직 및 작업자.

## 디렉토리 레이아웃

각 유틸리티는 다음의 자체 명명된 하위 디렉터리에 있어야 합니다. `src/utils/`, 함께 배치된 테스트 파일 및
지역 배럴.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## 저작 규칙

1. **순도**: 부작용이 없는 순수한 함수를 선호합니다. 동일한 입력이 주어지면 항상 다음을 반환해야 합니다.
   동일한 출력.
2. **UI 후크 없음**: 가져오지 않음 `vue`, `react`, 또는 `@mission-platform/forge` 유틸리티에 후크가 있습니다. 필요한 논리
   반응성이 속한다 [컴포저블](composable-authoring.md).
3. **명시적 입력**: 전체 제공 TypeScript 모든 인수 및 반환 값에 대한 유형입니다.
4. **필수 테스트**: 모든 유틸리티는 같은 위치에 있어야 합니다. `.spec.ts` 파일.
5. **단일 책임**: 각 util 폴더는 구체적이고 좁은 작업에 중점을 두어야 합니다.

## 기본 예

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## 발판

Mission Platform Developer MCP 도구를 사용하여 새로운 유틸리티 뼈대를 생성하십시오.

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## 관련 가이드

- [패키지 개발](package-development.md)
- [원자 구성 요소 설계](atomic-component-design.md)
- [구성 가능한 저작](composable-authoring.md)
- [스토어 작성](store-authoring.md)
