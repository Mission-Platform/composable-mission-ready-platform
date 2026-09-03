# Forge 구성 요소 토큰 참조

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/ui/tokens/docs/reference/component-tokens.md: [packages/ui/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> 언어: 한국어 (ko)

이는 Forge에서 작성한 구성 요소에 대한 표준 인벤토리 및 Figma 핸드오프입니다. 의도적으로 독립되어 있습니다.
생성된 프레임워크 어댑터: 동일한 항목이 Vue, React, Solid, Svelte 및 웹 구성 요소에 적용됩니다.

## 계약서 읽기

진실의 근원은 아래의 재귀 구성 요소 소스 트리입니다.
[`tokens/component/`](../../../../tokens/component), 원자 수준별로 그룹화됨
(`atoms/`, `molecules/`, `organisms/` 및 `templates/`). 각 소스는 독립적으로 생성되지만 모든 소스는
동일한 안정적인 `component.*` DTCG 계약을 유지합니다.

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

DTCG 경로는 Figma 및 런타임 재정의 경로이기도 합니다. 생성된 CSS 이름만 `component` 래퍼를 삭제합니다.
예를 들어 `component.button.primary.background.hover`은 `--mp-button-primary-background-hover`로 내보내집니다. 에이
`component/atoms/button`과 같은 소스 ID는 새 DTCG 경로가 아닌 계약을 소유한 파일을 식별합니다.

구성 요소 값은 기존 기본 및 의미 테마 문서의 별칭을 지정합니다. 결과적으로 Figma 컬렉션은
**Light** 및 **Dark** 모드는 구성 요소 토큰을 복제하지 않습니다. 런타임 밝음/어두움 동작이 계속 사용됩니다.
`color-scheme`, `light-dark()`, `[data-theme]` 및 `.theme-*` 하위 트리 핀. 소비자와 스토리북은 무엇이든 재정의할 수 있습니다.
`overrides.tokens.json`의 `component` 아래 리프; 생성된 토큰 스타일시트 뒤에 재정의가 적용됩니다. 재정의
CSS 사용자 정의 속성이 레이어 네임스페이스를 사용하더라도 `component.*` 키를 계속 사용합니다.

## 소스 및 생성된 출력 레이아웃

모든 시각적 계약에는 원자 소스 트리 아래에 하나의 소유자가 있습니다. 생성기는 재귀적으로 새 파일을 발견하므로
새 소스에는 설명자 등록이 필요하지 않습니다.

```text
packages/ui/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/ui/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

생성된 SCSS 및 TypeScript 배럴에는 결정론적 소스 ID 순서로 모든 구성 요소 소스가 포함됩니다. 구성 요소
파일은 `button`, `field`, `input`, `navigation` 및 `overlay`와 같은 공유 계약을 재사용할 수 있습니다. 구성된 구성요소
해당 토큰 경로를 복제해서는 안 됩니다. 동작 전용 구성 요소, 상속 전용 문자 모양 및 레이아웃/DOM 수식은 그대로 유지됩니다.
인벤토리 항목이 시각적 소유권을 할당하지 않는 한 시각적 토큰 계약 외부에 있습니다.

### 의미론적 슬롯과 상태 어휘

| 슬롯 제품군                                  | 피그마 역할                                         | 일반적인 상태                                                                          |
| -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | 채우기 또는 제어 표면                               | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | 타이포그래피 색상 ​​또는 명명된 타이포그래피 스타일 | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | 스트로크 및 키보드 표시                             | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | 기하학과 고도                                       | 기본값 또는 크기별                                                                     |
| `opacity` / `transition`                     | 디엠퍼시스 및 모션                                  | `disabled`, `loading`, `hover`, `active`                                               |

구성 요소에서 지원하는 상태만 아래에 나열되어 있습니다. `expanded`은 표면 공개/선택에 사용되며 `selected`은
선택/탭/탐색의 경우, 양식 유효성 검사의 경우 `invalid`입니다. 사용되지 않은 상태 변수는 필요하지 않습니다.

## 재고 요약

리포지토리 인벤토리는 다음과 같은 좁은 소스 경로를 기반으로 합니다.

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| 유물                  | 카운트 | 의미                                                                          |
| --------------------- | -----: | ----------------------------------------------------------------------------- |
| 구성요소 TSX 소스     |    249 | Non-story Forge 및 이메일 구성 요소 소스                                      |
| 함께 위치한 이야기 ​​ |    246 | 3개의 재귀 마크다운/트리 도우미 소스에는 의도적으로 독립형 스토리가 없습니다. |
| CSS 모듈              |    219 | 로컬 비주얼 스타일 모듈 인라인 이메일 및 상속된 계약도 문서화됨               |
| 패키지                |     20 | 구성 요소 소스를 포함하는 모든 패키지                                         |

감사 후 생성된 표면에는 **2,841개의 토큰 리프**가 포함되어 있습니다. 즉, 활성 132개, 보호 2,161개, 모호 548개입니다.
남은 후보가 없습니다. 정리 작업으로 총 189개의 접근할 수 없는 나뭇잎이 제거되었습니다.
검토 보고서와 별칭 폐쇄 후 노출된 순 2차 팔레트 리프 4개(6개는 제거되고 2개는 도달 가능한 `.500` 리프로 복원됨). 이 감소는 생성된 영향에 영향을 미칩니다.
기본, 의미, 타이포그래피 및 구조적 내보내기만 가능합니다. 유지된 `component.*` 경로 및 해당 경로
`--mp-<layer>-*` 이름은 변경되지 않습니다. 해결되지 않은 세 가지 별칭(`color.surface.raised`, `radius.2xs` 및
`font.weight.light`)는 이번 감사 이전부터 변경되지 않았습니다.

분류는 패키지가 아닌 소스별로 이루어집니다.

- **시각적** — CSS 모듈 또는 인라인 시각적 출력을 소유하고 패키지 테이블에 표시된 계약에 매핑됩니다.
- **상속된 시각적** — 독립적인 스타일의 호스트를 렌더링하지 않습니다. 그 모습은 자식, 부모 `currentColor`에서 나옵니다.
  타사 호스트/캔버스 또는 구성된 구성 요소의 계약.
- **동작 전용** — 렌더링 또는 뷰포트 동작을 제어하고 자체적으로 시각적 결정을 내리지 않습니다.

아래의 모든 글머리 기호는 하나의 인벤토리 항목입니다. 스토리가 `story: missing`으로 표시되지 않는 한 구성 요소는 일치하는 항목을 갖습니다.
소스 옆에 `<component>.stories.tsx`이 있습니다. 패키지/레벨 제목은 안정적인 소스 경로 접두사를 제공합니다.

## `@mission-platform/components`

### 원자 — `packages/ui/components/src/components/atoms/`

| 구성요소                 | 분류   | 계약                                            | 외관 소품/상태                                                                   |
| ------------------------ | ------ | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `forge-avatar`           | 시각적 | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; 기본/비활성화 상태 색상 |
| `forge-background-video` | 시각적 | `component.media`                               | 소스, 자동 재생/음소거/루프; 기본/오버레이                                       |
| `forge-badge`            | 시각적 | `component.feedback`                            | `variant`, `size`; 기본값/비활성화                                               |
| `forge-button`           | 시각적 | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; 기본/호버/활성/초점 표시/비활성화/로딩   |
| `forge-icon-button`      | 시각적 | `component.button.<variant>` + `component.icon` | 라벨, `variant`, `size`; 기본/호버/활성/초점 표시/비활성화/로딩                  |
| `forge-progress-bar`     | 시각적 | `component.feedback`                            | 값, 변형; 기본값/로딩/비활성화                                                   |
| `forge-quote`            | 시각적 | `component.typography` + `component.surface`    | 인용, 변형; 기본값                                                               |
| `forge-responsive-image` | 시각적 | `component.media`                               | 소스, 측면/맞춤; 기본값/자리 표시자                                              |
| `forge-responsive-video` | 시각적 | `component.media`                               | 소스, 컨트롤/자동 재생; 기본/오버레이                                            |
| `forge-separator`        | 시각적 | `component.surface`                             | 정위; 기본값                                                                     |
| `forge-skeleton`         | 시각적 | `component.feedback`                            | 모양/크기; 로딩                                                                  |
| `forge-spinner`          | 시각적 | `component.feedback`                            | 크기, 변형; 로딩                                                                 |
| `forge-stack`            | 시각적 | `component.layout`                              | 방향, `gap`, 정렬; 기본값                                                        |
| `forge-status-icon`      | 시각적 | `component.feedback.<status>`                   | 상태, 크기; 기본값/비활성화                                                      |
| `forge-tag`              | 시각적 | `component.feedback`                            | 변형, 크기, 제거 가능; 기본/호버/비활성화                                        |
| `forge-theme-toggle`     | 시각적 | `component.button` + `component.icon`           | 테마, 크기; 기본/호버/활성/선택됨                                                |
| `forge-typography`       | 시각적 | `component.typography`                          | `as`, 타이포그래피 변형, 색상; 기본/링크/비활성화                                |

### 분자 — `packages/ui/components/src/components/molecules/`

| 구성요소                  | 분류          | 계약                                         | 외관 소품/상태                                                         |
| ------------------------- | ------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `forge-accordion`         | 시각적        | `component.surface` + `component.navigation` | 항목, 확장됨; 기본/호버/초점 표시/확장/비활성화                        |
| `forge-alert-banner`      | 시각적        | `component.feedback` + `component.overlay`   | 상태, 해고 가능; 기본/호버/포커스 표시                                 |
| `forge-breadcrumb`        | 시각적        | `component.navigation`                       | 품목; 기본/호버/선택/초점 표시                                         |
| `forge-button-group`      | 시각적        | `component.button-group`                     | 방향, 부착, 변형, 간격; 기본/초점 표시/비활성화                        |
| `forge-card`              | 시각적        | `component.surface`                          | 변형, 패딩; 기본/호버/선택됨                                           |
| `forge-chat-bubble`       | 시각적        | `component.media` + `component.surface`      | 작성자, 방향/상태; 기본값/선택됨                                       |
| `forge-collapse`          | 시각적        | `component.collapse`                         | 개방형, 변형, 비활성화됨; 기본/호버/초점 표시/확장/비활성화            |
| `forge-device-mock`       | 시각적        | `component.media.device`                     | 장치, 방향, 크기; 기본값                                               |
| `forge-dropdown`          | 시각적        | `component.overlay` + `component.navigation` | 개방, 배치; 기본/확장/포커스 표시                                      |
| `forge-grid`              | 시각적        | `component.layout.grid`                      | 열, 간격, 패딩; 기본값                                                 |
| `forge-in-view`           | 시각적        | `component.layout`                           | 한계점; 상속자 계약                                                    |
| `forge-language-switcher` | 상속된 시각적 | `component.navigation` + 아동 선택 계약      | 장소; 기본/확장/선택됨                                                 |
| `forge-list`              | 시각적        | `component.surface`                          | 변형, 간격; 기본값/선택됨                                              |
| `forge-masonry`           | 시각적        | `component.layout.masonry`                   | 열, 간격, 패딩; 기본값                                                 |
| `forge-menu-item`         | 시각적        | `component.navigation`                       | 활성/비활성화; 기본/호버/초점 표시/선택/비활성화                       |
| `forge-menu`              | 시각적        | `component.navigation`                       | 개방/방향; 기본/확장                                                   |
| `forge-navbar-item`       | 시각적        | `component.navigation.navbar-item`           | 활성, 드롭다운, 변형, 비활성화; 기본/호버/초점 표시/선택/확장/비활성화 |
| `forge-pagination`        | 시각적        | `component.navigation`                       | 페이지, 크기; 기본/호버/초점 표시/선택/비활성화                        |
| `forge-popover`           | 시각적        | `component.overlay`                          | 개방, 배치; 기본/확장/포커스 표시                                      |
| `forge-tabs`              | 시각적        | `component.navigation`                       | 방향, 활성 탭; 기본/호버/초점 표시/선택/비활성화                       |
| `forge-timeline`          | 시각적        | `component.timeline`                         | 상태, 방향, 윤곽선 표시; 기본값/선택됨                                 |
| `forge-toast`             | 시각적        | `component.overlay` + `component.feedback`   | 상태, 기간; 기본값/로딩                                                |
| `forge-tooltip`           | 시각적        | `component.overlay`                          | 개방, 배치; 기본/확장                                                  |
| `forge-window-popout`     | 시각적        | `component.overlay.window-popout`            | 개방형, 크기; 기본/호버/초점 표시/선택됨                               |

### 유기체 및 템플릿 — `packages/ui/components/src/components/{organisms,templates}/`

| 구성요소                   | 분류          | 계약                                                    | 외관 소품/상태                                                                           |
| -------------------------- | ------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `forge-carousel`           | 시각적        | `component.navigation.carousel`                         | 슬라이드, 컨트롤, 자동 재생, 톤; 기본/호버/초점 표시/선택/비활성화                       |
| `forge-chat-area`          | 시각적        | `component.media.chat-area`                             | 크기, 머리글/바닥글 슬롯, 자동 스크롤; 기본값/로딩                                       |
| `forge-dialog`             | 시각적        | `component.overlay`                                     | 열기, 제목/바닥글; 기본/확장/포커스 표시                                                 |
| `forge-drawer`             | 시각적        | `component.overlay.drawer`                              | 열기, 배치/크기, 크기 조정; 기본/호버/활성/확장                                          |
| `forge-menubar`            | 시각적        | `component.navigation.menubar`                          | 항목, 테두리, 크기; 기본/호버/초점 표시/확장/비활성화                                    |
| `forge-modal`              | 시각적        | `component.overlay`                                     | 열기, 크기, 머리글/바닥글; 기본/확장/포커스 표시                                         |
| `forge-navbar`             | 시각적        | `component.navigation.navbar`                           | 항목, 반응형 모드; 기본/호버/초점 표시/선택됨                                            |
| `forge-table`              | 시각적        | `component.data.table`                                  | 열, 크기, 캡션, 줄무늬/테두리/호버 가능, 톤, 로딩; 기본/호버/초점 표시/로딩              |
| `forge-theme-composer`     | 시각적        | `component.surface` + `component.field`                 | 테마 값; 기본값/잘못됨                                                                   |
| `forge-theme-provider`     | 시각적        | `component.layout`                                      | 테마 모드; 기본/밝음/어두움                                                              |
| `forge-toast-container`    | 시각적        | `component.overlay`                                     | 놓기; 기본값/로딩                                                                        |
| `forge-tree-view-item`     | 상속된 시각적 | `component.navigation` + `component.surface`            | 확장, 선택, 비활성화; 기본/호버/초점 표시/확장/선택/비활성화                             |
| `forge-tree-view`          | 시각적        | `component.data.tree`                                   | 노드, 크기, defaultOpen, 라벨 렌더러; 기본/호버/초점 표시/확장/선택                      |
| `forge-virtual-list`       | 시각적        | `component.data.virtual-list`                           | 항목, 크기, itemHeight, 높이, 오버스캔, 행 렌더러; 기본값/선택됨                         |
| `forge-virtual-log-viewer` | 시각적        | `component.code.virtual-log-viewer`                     | 레벨/필터, 열, 후속 꼬리; 기본/호버/초점 표시/경고/오류/치명                             |
| `forge-virtual-table`      | 시각적        | `component.data.virtual-table` + `component.data.table` | 열, 크기, rowHeight, 높이, 오버스캔, 줄무늬/테두리, 정렬; 기본/호버/포커스 표시          |
| `forge-virtual-tabs`       | 시각적        | `component.navigation.tabs`                             | 변형, 활성 탭, 닫기/추가 가능; 기본/호버/초점 표시/선택/비활성화                         |
| `forge-virtual-tree-view`  | 시각적        | `component.data.virtual-tree`                           | 노드, 크기, itemHeight, 높이, 오버스캔, defaultOpen, 행 렌더러; 기본/호버/초점 표시/확장 |
| `forge-hero`               | 시각적        | `component.layout.hero`                                 | 미디어, 정렬, 크기, 오버레이; 기본값                                                     |

## 전문 Forge 패키지

| 패키지/레벨              | 구성요소                       | 분류          | 계약                                                   | 외관 소품/상태                                           |
| ------------------------ | ------------------------------ | ------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | 시각적        | `component.code.barcode`                               | 값, 형식, 크기; 기본값/로딩/잘못됨                       |
| `breakpoints/atoms`      | `forge-hide-at`                | 행동 전용     | 없음                                                   | `min`, `max`; 뷰포트 가시성만                            |
| `breakpoints/atoms`      | `forge-show-at`                | 행동 전용     | 없음                                                   | `min`, `max`; 뷰포트 가시성만                            |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | 시각적        | `component.debug.breakpoint`                           | 중단점 표시; 기본값                                      |
| `code-scanner/organisms` | `forge-code-scanner`           | 시각적        | `component.code.scanner`                               | 카메라/포맷, 스캐닝; 기본값/로딩/잘못됨                  |
| `content/atoms`          | `forge-code-block`             | 시각적        | `component.code`                                       | 언어, 사본; 기본값/선택됨                                |
| `content/atoms`          | `forge-mermaid`                | 시각적        | `component.code`                                       | 다이어그램 소스, 로드/오류; 기본값/로딩/잘못됨           |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | 시각적        | `component.button` + `component.icon`                  | 명령, 활성; 기본/호버/활성/초점 표시/비활성화/선택됨     |
| `content/molecules`      | `forge-markdown`               | 시각적        | `component.typography` + `component.code`              | 크기, 링크; 기본값/잘못됨                                |
| `content/molecules`      | `markdown-block`               | 상속된 시각적 | `component.typography` + 하위 계약                     | 토큰, 크기; 상속                                         |
| `content/molecules`      | `markdown-inline`              | 상속된 시각적 | `component.typography`                                 | 토큰, 링크; 상속됨/호버/선택됨                           |
| `content/molecules`      | `forge-wysiwyg-block-controls` | 시각적        | `component.editor.block-controls` + `component.button` | 블록 선택; 기본/호버/초점 표시/선택됨                    |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | 시각적        | `component.editor.block-menu` + `component.overlay`    | 열려 있는; 기본/확장/선택됨                              |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | 시각적        | `component.editor.status-bar`                          | 상태; 기본값/잘못됨/로딩                                 |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | 시각적        | `component.editor.toolbar` + `component.button`        | 명령; 기본값/비활성화                                    |
| `content/organisms`      | `forge-monaco-editor`          | 시각적        | `component.editor.monaco` + `component.code`           | 언어, 읽기 전용; 기본값/비활성화/잘못됨                  |
| `content/organisms`      | `forge-wysiwyg-editor`         | 시각적        | `component.editor.wysiwyg` + `component.code`          | 편집 가능, 유효하지 않음; 기본/포커스 표시/잘못/비활성화 |
| `float/molecules`        | `forge-alert-banner`           | 시각적        | `component.feedback` + `component.overlay`             | 상태, 해고 가능; 기본/포커스 표시                        |
| `float/molecules`        | `forge-dropdown`               | 시각적        | `component.overlay` + `component.navigation`           | 열려 있는; 기본/확장/선택됨                              |
| `float/molecules`        | `forge-popover`                | 시각적        | `component.overlay`                                    | 열려 있는; 기본/확장                                     |
| `float/molecules`        | `forge-toast`                  | 시각적        | `component.overlay` + `component.feedback`             | 상태; 기본값/로딩                                        |
| `float/molecules`        | `forge-tooltip`                | 시각적        | `component.overlay`                                    | 열려 있는; 기본/확장                                     |
| `float/organisms`        | `forge-dialog`                 | 시각적        | `component.overlay`                                    | 열기, 제목/바닥글; 기본/확장/포커스 표시                 |
| `float/organisms`        | `forge-modal`                  | 시각적        | `component.overlay`                                    | 열기, 크기, 머리글/바닥글; 기본/확장/포커스 표시         |
| `float/organisms`        | `forge-toast-container`        | 시각적        | `component.overlay`                                    | 놓기; 기본값/로딩                                        |

### 양식 — `packages/ui/forms/src/components/`

모든 양식 항목은 아래 계약 외에도 공유된 `component.field` 레이블/도우미/오류 역할을 사용합니다. 네이티브
컨트롤 상태는 컨트롤이 지원하는 경우에만 표시됩니다.

| 레벨   | 구성 요소(쉼표로 구분된 이름당 하나의 항목)                                                                                                                                                                                                                                                                                                                               | 분류/계약                                                                                                                | 공유 모양 소품 및 상태                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 원자   | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | 확인란/라디오/등급/슬라이더/스위치에 대한 시각적 / `component.checkable`; 입력/범위 입력/텍스트 영역용 `component.input` | `size`, 라벨/값 소품; 기본/호버/활성/초점 표시/비활성화/무효/지원되는 경우 선택됨 |
| 분자   | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | 구성된 컨트롤에 따라 시각적 / `component.input`, `component.select`, `component.checkable` 또는 `component.field`        | `size`, `disabled`, 검증 및 선택 소품; 기본/포커스 표시/비활성화/확장/선택/무효   |
| 유기체 | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | 시각적 / `component.field` + 구성된 입력/선택/오버레이 계약                                                              | 스키마, 단계, 유효성 검사; 기본/포커스 표시/비활성화/확장/선택/무효               |

### 아이콘 - `packages/ui/icons/src/components/`

106개의 아이콘 항목은 모두 **상속된 시각적**입니다. 글리프는 `currentColor`을 사용합니다. 크기는 소비자가 제어하거나 다음에 매핑됩니다.
`component.icon.size`. 문자 모양별 변수를 받지 않습니다. 각각은 같은 위치에 있는 이야기를 갖고 있으며 동일한 내용을 따릅니다.
부모가 해당 상태를 노출하는 기본/선택/비활성화 색상 역할입니다.

| 아이콘 카테고리     | 구성요소                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 커뮤니케이션/메시징 | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 소통/나눔           | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 내용/편집           | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| 콘텐츠/파일         | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 데이터/필터링       | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 데이터/테이블       | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| 그리기/변형         | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| 지도/국가           | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 지도/지리           | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 맵/레이어           | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 지도/마커           | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 미디어/캡처         | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 미디어/재생         | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 네비게이션/컨트롤   | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| 탐색/링크           | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 탐색/검색           | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 객체/시스템         | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| 라우팅/방향         | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 보안/액세스         | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 상태/피드백         | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| 텍스트/서식         | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| 시간/캘린더         | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### 기타 시각적 패키지

| 패키지/레벨                  | 구성요소                                                                                                                                           | 분류          | 계약                                                         | 외관 소품/상태                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `layout/atoms`               | `forge-container`                                                                                                                                  | 시각적        | `component.layout`                                           | 최대 너비, 패딩; 기본값                                                  |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | 시각적        | `component.layout`                                           | 레이아웃 구성 및 격차; 기본값                                            |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | 상속된 시각적 | `component.map`                                              | 지도 소스/레이어/마커/팝업 옵션; 팝업 기본/포커스 표시, 기타 호스트 상속 |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | 시각적        | `component.map`                                              | 컨트롤, 스타일, 팝업; 기본/로딩/선택됨                                   |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | 시각적        | `component.code`                                             | 가치, 크기; 기본값/잘못됨/로딩                                           |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | 시각적        | `component.code`                                             | 가치, 크기; 기본값/잘못됨/로딩                                           |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | 시각적        | `component.resource-planner`                                 | 자원, 범위, 선택; 기본/호버/선택/초점 표시/충돌/사용할 수 없음           |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | 시각적        | `component.scheduler`                                        | 범위, 이벤트, 선택; 기본/초점 표시/오늘/외부/바쁨                        |
| `select/atoms`               | `forge-tag`                                                                                                                                        | 시각적        | `component.feedback`                                         | 변형, 크기, 제거 가능; 기본/호버/비활성화                                |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | 상속된 시각적 | `component.select` + `component.navigation`                  | 장소; 기본/확장/선택됨                                                   |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | 시각적        | `component.select` + `component.input` + `component.field`   | 크기, 옵션, 모델, 검증; 기본/호버/초점 표시/비활성화/확장/선택/무효      |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | 시각적        | `component.button` + `component.icon`                        | 방법; 기본/호버/활성/선택됨                                              |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | 시각적        | `component.surface` + `component.field` / `component.layout` | 테마 값/모드; 기본값/밝음/어두움/잘못됨                                  |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | 상속된 시각적 | `component.media`                                            | 캔버스 호스트 크기는 구조적입니다. 상속된 표면                           |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | 시각적        | `component.typography`                                       | 변형, 색상, `as`; 기본/링크/비활성화                                     |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | 행동 전용     | 없음                                                         | 달력 데이터를 직렬화합니다. 시각적 호스트 없음                           |
| `vcard`                      | `forge-vcard`                                                                                                                                      | 행동 전용     | 없음                                                         | 연락처 데이터를 직렬화합니다. 시각적 호스트 없음                         |

## 이메일 구성요소

`@mission-platform/email-components`은 TSX 소스가 Forge에서 작성되었기 때문에 포함되었습니다. 이메일 클라이언트는 그렇지 않습니다
런타임 사용자 정의 속성 사용: 렌더러는 동일한 의미 체계 역할을 인라인 값으로 확인합니다. 아래의 모든 항목
시각적이며 명시된 경우 `component.button`, `component.typography` 또는 `component.media`와 함께 `component.email`을 사용합니다.

| 레벨   | 구성요소                                                                      | 계약                                                                                                                             |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 원자   | `email-button`                                                                | `component.email` + `component.button.<variant>`; 변형 중립/기본/보조/3차/성공/경고/정보/오류/중요/유령; 기본/호버/활성/비활성화 |
| 원자   | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; 기본값                                         |
| 분자   | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; 링크가 대화형인 경우 기본/선택됨                                                                              |
| 유기체 | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; 기본값                                                                               |
| 템플릿 | `email-container`, `email-document`, `email-section`                          | `component.email`; 기본/밝은/어두운 소스 모드                                                                                    |

## 스토리 및 오버라이드 적용 범위

249개의 구성 요소 소스에 대해 246개의 동일한 위치에 있는 스토리가 있습니다. 독립된 이야기가 없는 유일한 출처는
재귀 도우미 `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block` 및 `content/molecules/forge-markdown/markdown-inline`; 그들의
시각적 상태는 상위 스토리에 의해 실행되며 위에 상속된 시각적 상태로 문서화되어 있습니다.

공유 Storybook 미리보기는 `@mission-platform/tokens/scss/tokens`, Storybook 재정의 플러그인 및
`theme` 글로벌. 계약을 검사하려면 전역 테마를 밝거나 어둡게 설정하고 구성 요소 스토리의 컨트롤을 사용하세요.
소비자 재정의를 테스트하려면 다음을 사용하여 `component` 아래의 `apps/storybook/design-tokens/overrides.tokens.json`를 편집하세요.
`{ "light": "...", "dark": "..." }` 값입니다. 재정의 스키마는 다음과 같습니다.
[`packages/tooling/vite/token-overrides/schema/token-overrides.schema.json`](../../../../../../packages/tooling/vite/token-overrides/schema/token-overrides.schema.json).

다음 리프는 의도적으로 구성 요소 범위이며 개별 구성 요소 호스트에서 재정의될 수도 있습니다.
생성된 CSS 사용자 정의 속성을 사용합니다. 구성된 구성 요소의 대체 값은 호스트가
재정의를 정의하지 않습니다.

| 구성요소             | DTCG 재정의 경로                                   | 생성된 CSS 변수 패턴                                   |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Figma 핸드오프 체크리스트

1. 밝은 모드와 어두운 모드를 사용하여 `Mission Platform / Component` 변수 컬렉션을 만듭니다.
2. 구성 요소, 변형, 슬롯을 유지하면서 `component/<atomic-level>/` 소스 트리에서 구성 요소 경로를 가져옵니다.
   및 상태 세그먼트.
3. 원시 색상이나 스케일 값을 복사하는 대신 구성 요소 변수를 해당 기본/의미 변수에 바인딩합니다.
4. 문서화된 변형 및 크기에 대한 구성요소 속성을 생성합니다. 인벤토리에 나열된 상태에 대해서만 상태 변형을 만듭니다.
5. 시각적 변수 컬렉션 외부에 레이아웃 수식, 뷰포트 중단점, 캔버스 동작 및 DOM/접근성 동작을 유지합니다.
