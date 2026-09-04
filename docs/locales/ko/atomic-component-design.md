# 원자 구성 요소 설계

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> 언어: 한국어 (ko)

Mission Platform은 **Atomic Design** 시스템을 사용하여 구성 요소를 계층적 복잡성 수준으로 구성합니다. 매
구성 요소는 중립 Forge JSX 방언(`@mission-platform/forge-jsx`), 보장
여러 프레임워크에 걸쳐 일관성을 유지합니다.

## 디자인 수준

구성 요소는 범위와 책임에 따라 5가지 수준으로 분류됩니다.

| 레벨 | 폴더 | 설명 |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **원자** | `src/components/atoms/`     | 가장 작은 UI 기본 요소(예: `ForgeButton`, `ForgeInput`, `ForgeBadge`). 이들은 일반적으로 목적을 잃지 않고서는 더 이상 분해할 수 없는 기능적 단위입니다. |
| **분자** | `src/components/molecules/` | 단순한 원자 구성(예: `ForgeSearchInput`, `ForgeFieldSet`). 그들은 하나의 단위로 함께 기능합니다.                                                                    |
| **유기체** | `src/components/organisms/` | 원자, 분자 및 기타 유기체로 구성된 복잡한 UI 섹션(예: `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **템플릿** | `src/components/templates/` | 콘텐츠 구조를 정의하는 페이지 수준 레이아웃(예: `ForgeHero`, `ForgeAppLayout`). 콘텐츠를 배치할 위치를 정의하기 위해 슬롯을 사용하는 경우가 많습니다.                     |
| **페이지** | `src/components/pages/`     | 구체적인 콘텐츠와 데이터로 채워진 템플릿의 특정 인스턴스(예: `AccountSettingsPage`).                                                                        |

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

스토리는 다음을 사용해야 합니다. `.stories.tsx` 확대.

### 타이틀 컨벤션

그만큼 `title` 스토리북의 필드 `meta` 객체는 다음 패턴을 따라야 합니다.

```text
<Level>/<Category>/<Component>
```

- **수준**: 대문자로 표시된 복수형(예: `Atoms`, `Molecules`).
- **카테고리**: 기능별 분류(예: `Forms`, `Navigation`, `Display`, `Feedback`).
- **구성요소**: PascalCase 구성요소 이름(예: `ForgeButton`).

**예 (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## 저작 표준

1. **프레임워크 중립성**: 별도의 저작물을 작성하지 마세요. Vue 그리고 React 버전. 사용 `@mission-platform/forge-jsx`.
2. **이름 지정**: 구성 요소는 다음을 사용해야 합니다. `Base` 접두사(예: `ForgeCard`) 특정 구현이 아닌 한.
3. **유형 안전성**: `*Properties` 구성 요소의 소품에 대한 인터페이스입니다.
4. **테스트**: 같은 위치에 있는 `.spec.ts` 모든 구성 요소에 필요합니다.
5. **비계**: `scaffold_component` 올바른 디렉토리 구조와 상용구를 보장하는 MCP 도구입니다.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## 관련 가이드

- [패키지 개발](package-development.md)
- [구성 가능한 저작](composable-authoring.md)
- [스토어 작성](store-authoring.md)
- [저작 활용](util-authoring.md)
