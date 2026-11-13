# 원자 구성 요소 설계

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> 언어: 한국어 (ko)

Mission Platform은 **Atomic Design** 시스템을 사용하여 구성 요소를 계층적 복잡성 수준으로 구성합니다. 매
구성 요소는 중립 Forge JSX 방언(`@mission-platform/forge-jsx`)으로 작성된 "한 번 쓰기" 단위입니다.
여러 프레임워크에 걸쳐 일관성을 유지합니다.

## 디자인 수준

구성 요소는 범위와 책임에 따라 5가지 수준으로 분류됩니다.

| 레벨 | 폴더 | 설명 |
| :------------ | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **원자** | `src/components/atoms/` | 가장 작은 UI 기본 요소(예: `ForgeButton`, `ForgeInput`, `ForgeBadge`). 이들은 일반적으로 목적을 잃지 않고는 더 이상 분해할 수 없는 기능 단위입니다. |
| **분자** | `src/components/molecules/` | 단순한 원자 구성(예: `ForgeSearchInput`, `ForgeFieldSet`) 그들은 하나의 단위로 함께 기능합니다.                                                                    |
| **유기체** | `src/components/organisms/` | 원자, 분자 및 기타 유기체로 구성된 복잡한 UI 섹션(예: `ForgeNavbar`, `ForgeTable`, `ForgeModal`)                                                       |
| **템플릿** | `src/components/templates/` | 콘텐츠 구조를 정의하는 페이지 수준 레이아웃(예: `ForgeHero`, `ForgeAppLayout`) 콘텐츠를 배치할 위치를 정의하기 위해 슬롯을 사용하는 경우가 많습니다.                     |
| **페이지** | `src/components/pages/` | 구체적인 콘텐츠와 데이터로 채워진 템플릿의 특정 인스턴스(예: `AccountSettingsPage`)                                                                        |

## 구성 요소 폴더 레이아웃

각 구성 요소는 해당 수준 폴더 아래의 자체 명명된 하위 디렉터리에 있습니다. 이 디렉토리에는
구성 요소 소스, 스토리, 테스트 및 선택적 스타일.

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## 스토리 규칙

스토리북 스토리는 해당 구성 요소와 같은 위치에 있어야 하며 깔끔한 제목을 유지하기 위해 엄격한 제목 규칙을 따라야 합니다.
사이드바 구조.

### 파일 이름

스토리는 `.stories.tsx` 확장을 사용해야 합니다.

### 타이틀 컨벤션

Storybook `meta` 개체의 `title` 필드는 다음 패턴을 따라야 합니다.

```text
<Level>/<Category>/<Component>
```

- **수준**: 대문자로 표시된 복수형(예: `Atoms`, `Molecules`).
- **카테고리**: 기능별 그룹화(예: `Forms`, `Navigation`, `Display`, `Feedback`).
- **구성요소**: PascalCase 구성요소 이름(예: `ForgeButton`).

**예(`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: "Atoms/Display/ForgeButton",
  component: Button,
  // ...
};
```

## 저작 표준

1. **프레임워크 중립성**: 별도의 Vue 및 React 버전을 작성하지 마십시오. `@mission-platform/forge-jsx`을 사용하세요.
2. **이름 지정**: 구성 요소는 특정 구현이 아닌 한 `Base` 접두사(예: `ForgeCard`)를 사용해야 합니다.
3. **유형 안전성**: 구성요소의 소품에 대한 `*Properties` 인터페이스를 내보냅니다.
4. **테스트**: 모든 구성 요소에 공동 배치된 `.spec.ts`가 필요합니다.
5. **스캐폴딩**: 연결된 Mission Platform Developer MCP 서버를 통해 `scaffold_component` MCP 도구를 사용하여
   올바른 디렉토리 구조와 상용구를 확인하세요.

```text
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## 관련 가이드

- [패키지 개발](package-development.md)
- [구성 가능한 저작](composable-authoring.md)
- [스토어 저작](store-authoring.md)
- [유틸 저작](util-authoring.md)
