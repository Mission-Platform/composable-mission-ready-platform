# @mission-platform/components

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/ui/components/docs/index.md: [packages/ui/components/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/components`은 Mission Platform을 위한 잔여 Write-Once 구성 요소 라이브러리입니다. 모든 구성 요소
이 라이브러리는 프레임워크 중립적인 JSX 방언(`@mission-platform/forge`을 통해)을 사용하여 한 번 작성된 다음 다음에서 컴파일됩니다.
기본 **Vue 3**, **React**, **Svelte**, **Solid** 및 **웹 구성 요소** 출력에 시간을 빌드합니다.

`ForgeTypography`은 전용 `@mission-platform/typography` 패키지가 소유합니다. 오히려 해당 패키지에서 가져옵니다.
`@mission-platform/components`보다.

## 아키텍처: "한 번 작성하면 어디서나 실행 가능"

이 패키지는 고효율 크로스 프레임워크 아키텍처를 보여줍니다.

- **중립 소스**: 구성 요소는 `@mission-platform/forge`을 사용하여 `.tsx` 파일에 작성됩니다.
- **2단계 컴파일**: `@mission-platform/vite-plugin-forge`를 사용하여 중립 소스를 다음으로 변환합니다.
  프레임워크별 소스 코드(Vue SFC 및 React TSX)를 생성한 다음 해당 네이티브 툴체인으로 컴파일합니다.
- **제로 런타임 오버헤드**: 런타임 어댑터가 없습니다. 소비자는 기본 구성 요소를 기본 구성 요소로 가져옵니다.
  `@mission-platform/components` 지정자; 프레임워크는 `mp:<framework>` 내보내기를 통해 **한 번** 선택됩니다.
  조건 - `resolve.conditions`(`defineFrameworkAppConfig` / `frameworkResolveConditions` 참조)
  `@mission-platform/vite-config`) 및 `customConditions`(를 통해)
  `@mission-platform/typescript-config/framework-<name>` 사전 설정).
- **Storyblok 통합**: 빌드 프로세스는 또한 Storyblok 블록 구성 및 래퍼를 생성하여 다음을 가능하게 합니다.
  동일한 구성 요소를 사용하는 CMS 기반 레이아웃.

## 범용 크기 척도

라이브러리의 모든 구성 요소는 표준 티셔츠 스케일을 따르는 `size` 소품을 지원합니다. 이는 일관성을 보장합니다.
모든 UI 요소에 걸쳐 확장됩니다.

| 가치  | 라벨         |
| :---- | :----------- |
| `2xs` | 초초소형     |
| `xs`  | 초소형       |
| `sm`  | 작은         |
| `md`  | 중간(기본값) |
| `lg`  | 대형         |
| `xl`  | 특대형       |
| `2xl` | 특대형       |

대부분의 구성 요소는 설계 토큰을 기반으로 `font-size`을 조정하는 공유 크기 조정 유틸리티를 적용합니다. 일부 복잡한
구성 요소(예: `ForgeButton` 또는 `ForgeHero`)에는 패딩, 여백 및 레이아웃에 대한 맞춤형 크기별 스타일이 있습니다.

## 부품 카탈로그

### 레이아웃 및 구조

페이지의 콘텐츠를 정렬하기 위한 기본 요소입니다.

| 구성요소         | 설명                                               | 주요 소품                                           |
| :--------------- | :------------------------------------------------- | :-------------------------------------------------- |
| `ForgeStack`     | 간격을 구성할 수 있는 Flexbox 스택(행/열)입니다.   | `direction`, `gap`(`2xs-2xl`), `justify`, `align`   |
| `ForgeGrid`      | CSS 그리드 레이아웃 프리미티브.                    | `rows`, `cols`, `gap`, `justify`, `align`           |
| `ForgeSeparator` | 선택적 라벨이 있는 시각적 구분선(수평/수직)입니다. | `orientation`, `variant`(`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | 다중 기둥 벽돌 레이아웃.                           | `columns`, `minColumnWidth`, `gap`                  |

### 애플리케이션 셸 및 탐색

앱 구조 및 라우팅을 위한 상위 수준 구성요소입니다.

| 구성요소                     | 설명                                                        | 주요 소품                                       |
| :--------------------------- | :---------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar`                | 브랜드 및 햄버거 메뉴가 포함된 반응형 상단 탐색 모음입니다. | `brand`, `sticky`, `mobileTitle`                |
| `ForgeDrawer`                | 슬라이딩 패널(고정 또는 인라인 반응형).                     | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination`            | 제어된 페이지 탐색 제어.                                    | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `ForgeTabs`                  | 로빙 tabindex 및 패널이 포함된 ARIA 테이블 목록입니다.      | `tabs`, `modelValue`, `variant`(`line`/`pill`)  |
| `ForgeMenu` / `ForgeMenubar` | 하위 메뉴가 포함된 접근 가능한 재귀 메뉴/메뉴바.            | `items`, `orientation`, `ariaLabel`             |
| `ForgeBreadcrumb`            | 링크의 계층적 추적.                                         | `items`, `separator`                            |

### 타이포그래피 및 콘텐츠

텍스트 스타일 지정 및 의미론적 콘텐츠 블록.

| 구성요소     | 설명                                                        | 주요 소품                               |
| :----------- | :---------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | 제목, 부제, 미디어 배경 및 작업이 포함된 페이지 배너입니다. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | 귀속이 포함된 의미적 인용문입니다.                          | `variant`, `tone`, `author`, `source`   |
| `ForgeList`  | 일반 목록(순서 있음/순서 없음/설명)                         | `items`, `variant`, `tone`, `divided`   |

### 양식 및 입력

데이터 입력을 위한 대화형 요소입니다.

| 구성요소                                 | 설명                                                   | 주요 소품                                    |
| :--------------------------------------- | :----------------------------------------------------- | :------------------------------------------- |
| `ForgeButton`                            | 변형 및 로드 상태가 포함된 기본 버튼입니다.            | `variant`, `size`, `loading`, `disabled`     |
| `ForgeIconButton`                        | 컴팩트 아이콘 전용 버튼.                               | `label`(필수), `variant`, `size`             |
| `ForgeInput` / `ForgeTextarea`           | 레이블, 힌트 및 오류 상태가 포함된 텍스트 필드입니다.  | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio`           | 부울 또는 그룹 선택 입력.                              | `modelValue`, `value`, `label`               |
| `ForgeSwitch`                            | 부울 설정을 위한 토글 스위치입니다.                    | `modelValue`, `label`, `size`                |
| `ForgeNumberStepper`                     | 증가/감소 버튼으로 숫자를 입력합니다.                  | `modelValue`, `min`/`max`, `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | 단일 또는 이중 엄지 범위 선택기.                       | `modelValue`, `min`/`max`, `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | 팝오버 캘린더가 포함된 날짜 및 날짜 범위 선택기입니다. | `modelValue`, `min`/`max`, `size`            |
| `ForgeColorInput`                        | 16진수 텍스트 필드가 있는 색상 선택기입니다.           | `modelValue`, `size`, `label`                |

### 데이터 디스플레이 및 가상화

대규모 데이터 세트를 효율적으로 처리하기 위한 구성 요소입니다.

| 구성요소               | 설명                                                      | 주요 소품                                     |
| :--------------------- | :-------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable`           | 로드 및 비어 있는 상태로 정렬 가능한 데이터 테이블입니다. | `columns`, `rows`, `onSort`, `loading`        |
| `ForgeVirtualList`     | 대규모 배열에 대한 창 표시 목록(표시되는 행만 렌더링)     | `items`, `itemHeight`, `height`               |
| `ForgeVirtualTable`    | 고정 헤더가 있는 가상화된 정렬 가능한 테이블입니다.       | `columns`, `rows`, `rowHeight`, `onSort`      |
| `ForgeVirtualTreeView` | 확장/축소 논리가 포함된 창 트리 보기입니다.               | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView`        | 재귀적으로 액세스 가능한 트리(가상화되지 않음)            | `nodes`, `defaultOpen`, `onSelect`            |
| `ForgeTimeline`        | 수직 또는 수평 이벤트 목록.                               | `items`, `orientation`, `align`               |

### 피드백 및 오버레이

알림 및 로딩 표시기.

| 구성요소           | 설명                                           | 주요 소품                                           |
| :----------------- | :--------------------------------------------- | :-------------------------------------------------- |
| `ForgeSpinner`     | 불확실한 로딩 링.                              | `size`, `variant`, `label`                          |
| `ForgeSkeleton`    | 콘텐츠 로드를 위한 반짝이는 자리 표시자입니다. | `shape`(`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | 확정적이거나 불확실한 진행 경로.               | `value`, `max`, `variant`, `indeterminate`          |
| `ForgeStatusIcon`  | 작은 톤의 상태 표시 문자 모양.                 | `status`, `size`, `label`                           |

### 메디아

이미지, 비디오 및 플랫폼의 모양과 느낌을 처리합니다.

| 구성요소               | 설명                                                            | 주요 소품                              |
| :--------------------- | :-------------------------------------------------------------- | :------------------------------------- |
| `ForgeResponsiveImage` | 기본 srcset/sizes가 포함된 예술 감독 `<picture>`.               | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | 고정된 화면 비율을 갖춘 반응형 비디오 플레이어입니다.           | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | 모션 감소를 지원하는 풀 블리드 배경 비디오.                     | `src`, `overlay`, `minHeight`          |
| `ForgeDeviceMock`      | 화면 주변의 기기 프레임(모바일/태블릿/데스크톱/브라우저)입니다. | `device`, `orientation`, `url`, `size` |

## 구현 세부정보

### 슬롯 대 소품

중립적인 JSX 방언으로 인해 일부 구성 요소는 **명명된 슬롯**(React의 하위/소품으로 컴파일되고 Vue의 이름이 지정된 슬롯)을 사용합니다.
슬롯) 다른 곳에서는 고성능 가상화를 위해 **Scoped Render-Props**를 사용합니다.

### 테마 통합

테마 관련 구성요소는 `@mission-platform/theme`이 소유합니다. `ForgeThemeToggle`, `ForgeThemeProvider`, 가져오기
해당 패키지의 `ForgeThemeComposer`; 싱글톤 저장소는 문서 루트의 `data-theme` 속성을 관리합니다.
모든 앱에 전역 상태 제공자가 필요하지 않은 디자인 토큰 CSS 변수입니다.

전체 잔여 재고와 종속성을 인식하는 향후 패키지 분할은 다음 항목에 문서화되어 있습니다.
[분해 지도](decomposition-map.md). `ForgeDrawer` 및 `ForgeWindowPopout`은 보류 중인 이 패키지에 남아 있습니다.
여기에 설명된 별도의 오버레이/창 경계 결정이 있습니다.
