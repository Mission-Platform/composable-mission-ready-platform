# 구성 요소 분해 맵

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> 언어: 한국어 (ko)

이 문서는 `ForgeTag`을 추출한 후의 잔여 재고를 기록합니다.
`@mission-platform/select`, `@mission-platform/float`에 대한 부동 및 알림 UI,
테마 UI/상태를 `@mission-platform/theme`으로 지정합니다. 중립 배럴
`src/components/index.ts`는 현재 **45** 구성요소를 내보냅니다. 아래 목록은
추가 패키지가 생성되지 않고 권장되는 차세대 소유권 경계
이번 마이그레이션으로

## 추천 차세대 패키지

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` 및 `ForgeVirtualTabs`.

이러한 구성 요소는 키보드 탐색, 이동 포커스, 메뉴/탭 상태 및
탐색 중심 상호 작용 계약. 중립적 구현은 다음과 같습니다.
`@mission-platform/forge`에; 메뉴 및 표와 같은 컨트롤도 사용됩니다.
`@mission-platform/icons`, 탐색경로/navbar 콘텐츠가 소유를 구성하는 동안
`@mission-platform/typography` 패키지. `ForgeNavbar`은 현재
잔여 `ForgeDrawer`이므로 탐색을 추출하려면 이를 유지하거나 유지해야 합니다.
종속성은 명시적이거나 먼저 서랍 경계를 결정합니다. 소개해서는 안 된다
`@mission-platform/components`의 종속성을 탐색으로 다시 전환합니다.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` 및 `ForgeStatusIcon`.

일반적인 관심사는 다음을 포함하여 구조화된 데이터 또는 대용량 데이터를 렌더링하는 것입니다.
윈도우화, 정렬, 트리 확장 및 상태 표시. 현재 소스
`@mission-platform/forge`을 사용하며 텍스트나 문자가 구성된 경우
`@mission-platform/typography` 및 `@mission-platform/icons`; 이것들은 남아있어야 해
향후 패키지의 하위 수준 종속성. 가상 구성요소는 다음과 같이 이동해야 합니다.
같은 위치에 있는 스타일/사양/스토리이므로 중립적인 후크 동작과 5가지
Forge 대상은 계속해서 함께 테스트됩니다.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator` 및
`ForgeCollapse`.

이는 추출된 플로트, 테마,
또는 패키지를 선택하세요. `ForgeCard` 및 간격 베어링 프리미티브는 현재 사용됩니다.
패키지 로컬 SCSS 유틸리티이므로 이동 시 해당 스타일을 전달하거나 승격해야 합니다.
안정적인 하위 레벨 패키지에 대한 유틸리티; 다른 곳에 닿아서는 안 된다
도메인 패키지의 소스 트리.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel` 및 `ForgeDeviceMock`.

처음 3개의 자체 미디어 로딩/렌더링 의미론, 캐러셀 및 장치
미디어 주변에 프레젠테이션을 추가합니다. 중립 소스는 현재 다음에 따라 달라집니다.
`@mission-platform/forge` 및 캐러셀 제어의 경우 `@mission-platform/icons`;
추출된 패키지에 대한 종속성은 없습니다. 움직임 감소를 보존하고
미디어 동작을 분할하는 대신 향후 움직임의 일부인 구성 요소별 CSS
그 스타일에서.

### `@mission-platform/communication`

`ForgeChatBubble` 및 `ForgeChatArea`.

이러한 구성 요소는 대화 의미, 라이브 영역 동작 및 메시지를 공유합니다.
레이아웃. `ForgeChatBubble`은 `ForgeAvatar` 및 `@mission-platform/typography`를 구성합니다.
따라서 미래의 패키지는 이에 대한 안정적인 공공 계약에 달려 있어야 합니다.
잔여물을 가져오는 대신 기본 요소(또는 기초 패키지에 유지)
별칭을 통한 구성 요소 소스 파일.

## 지금은 함께 남아 있는 구성 요소

이 작은 기초/컨텐츠/템플릿 세트를 `@mission-platform/components`에 유지하세요.
다른 경계를 정당화하기에 충분한 API 표면이 생길 때까지:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` 및 `ForgeHero`.

`ForgeInView`도 소규모 상호 작용 유틸리티로 유지됩니다. `ForgeTypography`
`@mission-platform/typography`의 소유이며 의도적으로
잔여 배럴.

## 지연된 오버레이/창 후보

`ForgeDrawer` 및 `ForgeWindowPopout`은 이 변경에서 의도적으로 이동되지 않습니다.
`ForgeDrawer`는 오버레이/창 인접이며 현재 다음으로 구성됩니다.
`ForgeNavbar`; `ForgeWindowPopout`는 브라우저 창 수명 주기를 소유하므로
별도의 SSR, 포커스, 크로스 윈도우 계약 결정이 필요합니다. 둘 다 평가
패키지를 만들기 전에 탐색 및 플로트 소유자와 함께하고 유지하지 마십시오.
호환성 바로 가기로 구현을 복제합니다.

## 경계 감사

추출된 패키지를 가져오기 위해 잔여 구성 요소 소스를 확인했습니다.
`@mission-platform/theme`, `@mission-platform/float` 가져오기가 없습니다.
`packages/ui/components/src` 아래의 `@mission-platform/select`. 중립 구성 요소
`@mission-platform/forge`, `@mission-platform/icons`에서 선택한 아이콘을 사용하고,
`@mission-platform/typography`의 타이포그래피 및 패키지 로컬 스타일/유틸리티.
스토리는 공개 표면을 행사하기 위해 패키지 배럴을 가져올 수 있습니다. 그건 아니다
구현 종속성 또는 패키지 주기.

모든 잔여 구성 요소는 함께 배치된 `index.ts`, 중립 소스, SCSS를 유지합니다.
스펙, 스토리북 스토리. 패키지 매니페스트는 `dist`, 구성 요소,
스타일 및 유틸리티만; 추출된 상점 트리는 더 이상 포함되지 않습니다.

## 공유 규모 유틸리티 계약

`.forge-size--2xs`부터 `.forge-size--2xl`까지의 클래스는 의도적으로
잔여물이 아닌 `@mission-platform/tokens/scss/tokens`에 의해 방출됩니다.
구성 요소 패키지. 잔여 성분과 추출된 `float` 및 `theme`
패키지는 모두 이러한 클래스를 사용하지만 독립형 Forge 패키지 출력은 사용할 수 없습니다.
`@mission-platform/components`가 소유한 CSS 모듈을 안정적으로 포함합니다.

토큰 배럴에는 `mp.tokens` 캐스케이드에 `scss/_size.scss`이 한 번 포함됩니다.
토큰 사용자 정의 속성 및 기본 재설정과 함께 레이어. 이는 보존합니다
기존 우선 계약: 계층화되지 않은 애플리케이션 스타일이
유틸리티 규칙 및 영향을 받는 모든 앱/스토리북 항목은 이미
토큰 배럴. 따라서 구성 요소는 안정적인 전역 클래스를 계속해서 방출합니다.
각 패키지의 크기 척도를 중복하지 않고 이름을 지정합니다.
