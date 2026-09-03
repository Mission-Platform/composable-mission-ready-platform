# 패키지 API 디렉토리

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> 언어: 한국어 (ko)

이 프로젝트 전체 페이지는 패키지 기능 및 호환성 디렉터리입니다.
계약. 정식 설치, 사용법, 제한 사항 및 API 세부 정보
각 패키지는 `packages/*/docs/`, `configs/*/docs/` 아래 해당 패키지 옆에 있습니다.
및 `forge-plugins/*/docs/`. 생성된 API 참조를 소유 항목에 추가해야 합니다.
이 페이지보다는 패키지를 선택하세요.

> **가져오기는 항상 기본입니다.** 프레임워크 제공 `@mission-platform/*` 패키지는 단일 `.`를 노출합니다.
> `mp:vue`, `mp:react`, `mp:solid` 및 `mp:web-component` 내보내기로 보호되는 항목
> 조건. `resolve.conditions`를 통해 프레임워크 **한 번** 선택(`defineFrameworkAppConfig` / 참조)
> `@mission-platform/vite-config`의 `frameworkResolveConditions`) 및 `customConditions`(
> `@mission-platform/typescript-config/framework-<name>` 사전 설정) — 그런 다음 기본으로 모든 것을 가져옵니다.
> 패키지 지정자. [외부 소비자 설정](external-consumer-setup.md)을 참조하세요.

## 핵심 프레임워크

### @mission-platform/forge

프레임워크 중립적인 JSX 런타임 및 후크를 제공하는 "한 번 쓰기" 아키텍처의 기반입니다.

| 수출 | 유형 | 설명 |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`, `Fragment` | 기능 | 구성요소 작성을 위한 JSX 팩토리 및 단편입니다.                                      |
| `useState` | 후크 | 프레임워크 중립적인 상태 후크.                                                           |
| `useEffect` | 후크 | 프레임워크 중립 효과 후크.                                                          |
| `useMemo` | 후크 | 프레임워크 중립적인 메모 후크.                                                     |
| `useRef` | 후크 | 프레임워크 중립적인 참조 후크.                                                       |
| `useContext` | 후크 | 프레임워크 중립적인 컨텍스트 후크.                                                         |
| `toVueComponent` | 어댑터 | 단조 구성 요소를 Vue 3 구성 요소(`@mission-platform/forge/vue`에서)로 변환합니다.   |
| `toReactComponent` | 어댑터 | 단조 구성 요소를 React 구성 요소(`@mission-platform/forge/react`에서)로 변환합니다. |

### @mission-platform/vite-plugin-forge

컴파일러 드라이버는 명시적인 `FrameworkOutputPlugin` 인스턴스를 허용합니다. 그렇죠
프레임워크 레지스트리를 제공하지 마세요. `defineViteForgeComponents` 및
`defineTsdownForgeComponents`(후크 및 CMS 도우미 포함)는 in-process를 공유합니다.
하나의 빌드 또는 감시 세션에 대한 `ForgeCompilerService`입니다.

| 능력 | 설명 |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 서비스 수명주기 | 빌드 전체에서 소스, 그래프, 구문 분석된 소스, 의미 체계 IR 및 대상 아티팩트 상태를 재사용합니다. 완료 후 일회성 서비스를 폐기하고 감시자 서비스를 종료합니다. |
| 캐시 키 | 소스/종속성/구성 지문, 컴파일러 및 라우터 옵션, `tsconfig` `baseUrl`/`paths`, 대상 ID, 플러그인 ID/버전 및 관련 조건.      |
| 무효화 보기 | 변경된 파일은 전이적 구성 요소 및 후크 항목을 포함한 역방향 그래프 종속 항목을 무효화합니다. 관련되지 않은 대상 스냅샷은 재사용 가능한 상태로 유지됩니다.                     |
| 진단/보고 | 단계 타이밍, 캐시 적중/실패 수, 영향을 받은 파일, 경고, 오류 및 방출된 아티팩트 수를 보고합니다. 오류로 인해 승격이 차단됩니다.                                 |
| 유물 매니페스트 | 원자성 승격 전에 대상 범위 항목, 모듈, 선언, 소스 맵, 자산 및 체크섬을 나열합니다.                                                     |
| 확장점 | 호출자가 소유한 `forge-plugin-*` 패키지에서 `FrameworkOutputPlugin`을 구현하고 전달합니다. 중립 드라이버에 대상 분기를 추가하지 마십시오.                        |

프로젝트 `tsconfig.json`(`baseUrl` 및
`paths`); Vite 및 tsdown 그래프 준비는 동일한 별칭 사실을 사용합니다. 라우터
선택, 라우터 플러그인 및 조건은 구성 요소를 통해 전달되고
후크 도우미. 미래의 작업자/데몬은 서비스 계약 뒤에 있을 수 있지만
지원되는 구현이 현재 진행 중입니다.

### @mission-platform/router

프레임워크 중립 경로 계약, 순수 일치 도우미 및 컴파일러 마커
공유 패키지. 애플리케이션은 경로 레코드와 기본 라우터 인스턴스를 소유합니다. 는
애플리케이션이 선택한 Forge 라우터 대상은 런타임 기능을 제공합니다.

| 수출/패키지 | 유형 | 설명 |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | 유형 | 경로 레코드, 매개변수, 쿼리/해시 상태, 메타데이터 및 탐색 대상.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | 기능 | DOM 또는 프레임워크 런타임 없이 경로 트리를 정의하고 경로를 확인하세요.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | 유형 | 탐색 결과/이벤트, 가드, 플러그형 기록 및 어댑터 계약.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | 컴파일러 마커 | 공유 패키지에서 사용되는 중립 링크, 경로 상태, 탐색, 확인 및 콘센트 기능입니다.                               |
| `@mission-platform/forge-router-*` | 위조 대상 | Vue 라우터, React 라우터, SolidJS 라우터, SvelteKit, RedwoodSDK 및 웹 구성 요소에 대해 독립적으로 선택된 기본 라우터 대상입니다. |

런타임 패키지는 자체 기록과 반응 상태를 가지고 있습니다. 중립 패키지는 UI 프레임워크를 가져오지 않습니다. 웹 구성요소의 경우,
요소를 한 번 등록하고 직렬화된 속성 대신 DOM 속성을 통해 복잡한 대상을 전달합니다.

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### 비동기 경로 보기 및 `Suspense`

Forge의 중립 컴파일러는 `Suspense`을 인식하고 이를 네이티브로 낮춥니다.
선택한 대상에 대한 비동기 경계. 공유 소스에 폴백 유지
따라서 모든 대상은 프레임워크를 가져오지 않고도 동일한 로딩 상태를 나타냅니다.
어댑터:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid 및 Svelte은 기본 일시 중단 경계를 받습니다. 에이
프레임워크가 없는 애플리케이션은 웹 구성 요소 라우터의 콘센트 폴백을 사용합니다.
대신 비동기 경로 보기의 경우:

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

라우터는 비동기 상태인 동안 `forge-router-outlet`에서 로딩 오버레이를 내보냅니다.
경로 보기가 해결됩니다. 현재 보기는 대상이 완료될 때까지 마운트된 상태로 유지됩니다.
준비가 완료되었으며 성공, 리디렉션, 취소 또는 완료 후에 오버레이가 제거됩니다.
실패.

## UI 및 디자인

### @mission-platform/tokens

색상, 타이포그래피, 간격을 위한 중앙 집중식 디자인 토큰입니다.

| 수출 | 설명 |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` | 모든 디자인 토큰을 포함하는 JS/TS 개체(예: `tokens.color.primary`) |
| `tokens.scss` | 스타일시트에 사용하기 위한 SCSS 변수입니다.                                    |

### @mission-platform/breakpoints

반응형 유틸리티 및 가시성 구성 요소.

| 수출 | 유형 | 설명 |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` | 후크 | 반응 중단점 상태를 반환합니다.                        |
| `ShowIf` | 구성요소 | 중단점 조건이 일치하는 경우에만 하위 항목을 렌더링합니다. |
| `HideIf` | 구성요소 | 중단점 조건이 일치하면 하위 항목을 숨깁니다.        |

### @mission-platform/components

공유 UI 구성요소는 한 번 작성되어 여러 프레임워크에 사용할 수 있습니다.

- **가져오기**: 항상 `@mission-platform/components`; 활성 `mp:<framework>` 조건에 따라
  Vue 3, React, Solid 또는 웹 구성 요소 빌드.
- **구성요소별 하위 경로**: `@mission-platform/components/<path>`(예:
  `@mission-platform/components/atoms/forge-badge/forge-badge`)도 조건을 인식하고 해당 구성 요소만 로드합니다.
  덩어리.
- **구성요소**: `ForgeButton`, `ForgeInput`, `ForgeModal` 등.

## 기능 패키지

### @mission-platform/i18n

i18next를 기반으로 한 국제화 시스템.

| 수출 | 설명 |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | 플랫폼 기본값을 사용하여 i18n 인스턴스를 초기화합니다.     |
| `useI18n` | 구성 요소의 번역 및 로케일 전환을 위한 후크입니다. |

### @mission-platform/seo

메타태그 및 SEO 관리.

| 수출 | 설명 |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` | 페이지 제목, 메타 태그, 오픈 그래프 데이터를 선언적으로 설정하는 후크입니다. |

### @mission-platform/map

MapLibre GL용 반응성 래퍼.

| 구성요소 | 설명 |
| :-------------- | :---------------------------------------- |
| `<MpMap>` | 기본 지도 컨테이너 구성요소입니다.             |
| `<MpMapMarker>` | 지도에 마커를 배치하기 위한 구성요소입니다. |

### @mission-platform/code-scanner

카메라 기반 바코드 및 QR 코드 스캐닝.

| 구성요소 | 설명 |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` | 카메라 스트림을 초기화하고 스캔 결과를 내보내는 구성요소입니다. |

## 통합

### @mission-platform/rxjs

RxJS Observable을 구성 요소 상태에 연결합니다.

| 후크 | 설명 |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` | Observable을 구독하고 최신 값을 반응 상태로 반환합니다. |

### @mission-platform/d3

프레임워크 중립적인 D3.js 통합.

| 후크 | 설명 |
| :------ | :----------------------------------------------------------------- |
| `useD3` | 수명주기 관리를 통해 D3 선택 항목을 구성 요소 참조에 바인딩합니다. |

### @mission-platform/hunspell

WebAssembly 기반 맞춤법 검사.

| 수출 | 설명 |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Hunspell WebAssembly 모듈을 로드하고 인스턴스화합니다. |
| `spell` | 단어의 철자가 올바른지 확인합니다.                  |
| `suggest` | 단어에 대한 맞춤법 제안을 제공합니다.               |

## 서비스 모니터링

### 서비스 모니터 API

서비스 모니터 애플리케이션은 서비스 상태를 모니터링하기 위한 공용 엔드포인트와 인증된 엔드포인트를 모두 제공합니다.

#### 공개 엔드포인트

공개 엔드포인트는 최소한의 상태 정보만 노출하며 인증이 필요하지 않습니다.

- **`GET /api/services`**: 모니터링되는 모든 서비스에 대한 롤업 상태를 반환합니다. 응답에는 각 서비스에 대한 `{ id, name, type }`과 `now` 및 `intervalSeconds`만 포함됩니다. 대상 구성, URL, 호스트, 쿼리, 헤더, 임계값 또는 토폴로지는 노출되지 않습니다.
- **`GET /api/metrics?service=<id>&since=<ms>`**: 한 서비스에 대한 원시 시계열 측정항목을 반환합니다. `since` 매개변수는 구성된 보존 기간으로 제한됩니다. 응답에는 `service`, `now`, `since` 및 `samples`만 포함됩니다.

#### 인증된 엔드포인트

인증된 엔드포인트에는 `MONITOR_API_TOKEN` 전달자 토큰이 필요하며 전체 모니터 구성을 노출합니다.

- **`POST /api/check`**: 즉각적인 프로브 주기를 트리거합니다.
- **`GET /api/monitors`**: 전체 구성이 포함된 모든 모니터를 나열합니다.
- **`POST /api/monitors`**: 새 모니터를 만듭니다.
- **`PATCH /api/monitors/<id>`**: 기존 모니터를 업데이트합니다.
- **`DELETE /api/monitors/<id>`**: 모니터를 삭제하고 기록 카운터를 지웁니다.

#### 프로브 및 대상 정책

서비스 모니터는 프로브 동작에 엄격한 경계를 적용합니다.

- **허용된 체계**: 신뢰할 수 있는 개인 모드가 활성화되지 않은 경우 URL 프로브는 기본적으로 `https://`(및 포트 443)으로 설정됩니다. `http://`은 신뢰 모드에서 허용됩니다.
- **허용되는 포트**: URL 프로브는 포트 443을 허용합니다. 호스트 프로브는 포트 [53, 80, 123, 443, 1883, 8883]의 기준선을 허용합니다.
- **금지된 대상**: 명시적으로 신뢰할 수 없는 경우 개인/링크 로컬 주소(127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10).
- **요청/응답 범위**: 프로브 요청은 64KB로 제한됩니다. 응답은 256KB로 제한됩니다. 속도 테스트는 25MB로 제한됩니다.
- **리디렉션 정책**: 리디렉션은 동일한 원본 및 승인된 경로 접두사 내에 유지되어야 합니다. 교차 출처 또는 허용되지 않는 경로 리디렉션은 거부됩니다.
- **기록 보존**: 사고, 업데이트, 유지 관리 기록은 항목 수 한도(모니터당 최대 100개 항목)로 제한됩니다. 지표 데이터의 기본 보존 기간은 24시간입니다.

#### 서버 측 렌더링(SSR)

서비스 모니터 SSR 계층은 개인 모니터 구성을 클라이언트 소품으로 직렬화하기 전에 인증이 필요합니다. 인증되지 않은 요청은 공개 상태 DTO만 받습니다.

### 이메일 발신자

이메일 발신자 작업자는 이메일 렌더링 및 전달을 위한 로컬 개발 쇼케이스를 제공합니다.

#### 배포 모드

- **로컬 개발**(기본값): `localhost:1025`의 MailPit으로 보냅니다. 인증이 필요하지 않습니다.
- **비로컬 배포**: 명시적인 `EMAIL_DEPLOYMENT_TOKEN` 전달자 인증, `EMAIL_ALLOWED_ORIGINS` 허용 목록 및 `EMAIL_ALLOWED_RECIPIENTS` 허용 목록이 필요합니다. `EMAIL_RATE_LIMITER`를 통한 속도 제한이 시행됩니다.

#### 검증 요청

모든 이메일 요청은 다음을 충족해야 합니다.

- `Content-Type: application/json`을 사용하세요.
- 유효한 수신자 이메일 주소를 포함하세요(`to` 필드, 최대 254자).
- 수신자 이름을 포함합니다(`recipientName`, 1~100자).
- 완성된 이메일 HTML(`html`, 최대 240KB)을 포함합니다.
- `assertCompatibleEmailHtml`를 통해 HTML 호환성 검사를 통과합니다.

#### 페일클로즈 기본값

명시적인 구성이 없는 비로컬 배포는 모든 요청을 거부합니다. 개발 편의를 위해 로컬 배포는 제한되지 않습니다.

## Forge 웹 스크립트 아티팩트 검증

### 아티팩트 콘텐츠 아이덴티티

Forge 웹 스크립트 아티팩트는 `sha256-v1:<hex>` 형식의 버전이 지정된 SHA-256 콘텐츠 ID를 사용합니다. 이 다이제스트는 전체 아티팩트 바이너리에 대해 계산되며 아티팩트 매니페스트의 `contentHash` 필드에 저장됩니다.

#### 무결성 대 진정성

콘텐츠 해시는 신뢰할 수 있는 예상 값과 비교할 때 **우발적이거나 승인되지 않은 콘텐츠 변경을 감지**합니다. **하지 않습니다**:

- 유물의 생산자나 원산지를 인증하세요.
- 암호화 서명 또는 배포 액세스 제어를 대체합니다.
- 아티팩트를 실행해도 안전하다는 것을 보장합니다.

#### 검증 작업흐름

1. 신뢰할 수 있는 소스(예: 서명된 매니페스트, CI 빌드 로그 또는 보안 구성)에서 **예상 해시를 얻습니다**.
2. 검증기를 사용하여 **아티팩트 해시를 계산**합니다. `fws_verify_artifact(artifact)`은 `contentHash`을 반환합니다.
3. **해시 비교**: 일치하는 경우 예상 값이 기록된 이후 아티팩트가 실수로 또는 악의적으로 변경되지 않은 것입니다.
4. **매니페스트 확인**: `fws_inspect_manifest`를 사용하여 기능 가져오기, 내보내기, 메타데이터 및 정책 준수를 독립적으로 확인합니다.

#### 버전 관리

`sha256-v1` 접두사는 모호함 없이 향후 해시 알고리즘 업그레이드를 허용합니다. 호출자는 레거시(있는 경우) 및 현재 다이제스트 형식을 모두 적절하게 처리해야 합니다.

## 추가 자료

- [Vue 2에서 Vue 3으로 마이그레이션 가이드](migration-guides/vue2-to-vue3.md)
- [프로젝트 구성 개요](configs/index.md)
- [작업공간 구조](workspace-structure.md)

## 완전한 작업 공간 패키지 색인

다음 인덱스는 패키지 매니페스트에서 생성되어 여기에 보관되므로 공개 API 참조에서 모든 항목을 다룹니다.
형식화된 WebAssembly 외관을 포함하여 `packages/`의 패키지입니다.

### 코어와 UI

| 패키지 | 목적 |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge` | 프레임워크 중립적인 JSX 런타임 및 어댑터.                   |
| `@mission-platform/components` | 한 번만 쓸 수 있는 UI 구성 요소입니다.                                     |
| `@mission-platform/icons` | 한 번만 쓸 수 있는 SVG 아이콘 구성요소.                               |
| `@mission-platform/layouts` | 애플리케이션, 컨테이너, 반응형 레이아웃 구성요소.     |
| `@mission-platform/forms` | 스키마 양식 및 시각적 양식 작성기 구성 요소.              |
| `@mission-platform/forms-core` | 스키마 파생, 유효성 검사 및 양식 작성기 도메인 논리. |
| `@mission-platform/tokens` | CSS 사용자 정의 속성 및 SCSS 디자인 토큰.                 |

### 컴포저블 및 통합

| 패키지 | 목적 |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` | 반응형 중단점 상태 및 가시성 도우미.              |
| `@mission-platform/d3` | D3 선택 수명 주기 컴포저블 및 마진 유틸리티입니다.          |
| `@mission-platform/i18n` | i18next 상태 및 프레임워크 통합 도우미.                 |
| `@mission-platform/map` | MapLibre 지도 구성요소 및 컴포저블.                         |
| `@mission-platform/observers` | 교차, 변형, 성능 관찰자 컴포저블    |
| `@mission-platform/phone-number` | WebAssembly 전화번호 구문 분석 및 형식 지정.           |
| `@mission-platform/router` | 프레임워크 중립적인 경로 계약 및 컴파일러 기능.     |
| `@mission-platform/forge-router-web-components` | 웹 구성요소 라우터 대상 및 프레임워크가 없는 런타임.         |
| `@mission-platform/rxjs` | RxJS 관찰 가능 항목 및 구독 컴포저블                    |
| `@mission-platform/scheduler` | 스케줄러 UI, 반복 및 달력 레이아웃 도메인 논리.      |
| `@mission-platform/vcard` | RFC 6350 vCard 및 RFC 5545 iCalendar 데이터 및 구성 요소.       |
| `@mission-platform/content` | 콘텐츠 AST, 빌더, Monaco, Markdown 및 WYSIWYG 구성 요소. |
| `@mission-platform/seo` | 메타데이터, 오픈 그래프, 구조화된 데이터 컴포저블           |
| `@mission-platform/speech-audio` | 음성, 오디오, 웹 MIDI 컴포저블                         |
| `@mission-platform/three` | Three.js 캔버스 및 수명 주기 컴포저블                       |

### 코드 및 웹어셈블리 패키지

| 패키지 | 목적 |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | 1D 바코드 인코딩/디코딩 외관 및 구성요소.   |
| `@mission-platform/code-scanner` | 카메라 및 이미지 코드 스캔 구성 요소.        |
| `@mission-platform/matrix-code` | 데이터 매트릭스 및 Aztec 인코딩/디코딩 외관.      |
| `@mission-platform/qr-code` | QR 인코딩/디코딩 파사드 및 구성요소.           |
| `@mission-platform/harper` | 모나코를 위한 Harper 문법 및 스타일 통합. |
| `@mission-platform/hunspell` | Emscripten Hunspell 철자 검사 래퍼.      |

### Forge 컴파일러 타겟

이는 `packages/`이 아닌 `forge-plugins/`에 있습니다. **프레임워크** 플러그인은 어떤 런타임이 중립 구성요소인지 결정합니다.
으로 낮아졌습니다; **CMS** 대상은 그것이 투영되는 콘텐츠 플랫폼을 결정합니다. 두 개의 축이 구성되므로 모든 CMS
대상은 모든 프레임워크 플러그인에 바인딩될 수 있습니다. [Forge 컴파일러 파이프라인](../../../vite-plugins/forge/docs/locales/ko/reference/compiler.md)을 참조하세요.

| 패키지 | 목적 |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | `FrameworkOutputPlugin` 계약, 의미 체계 IR 유형 및 빌드 어댑터 유형입니다.     |
| `@mission-platform/forge-plugin-react` | React 출력 대상입니다.                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 출력 대상.                                                              |
| `@mission-platform/forge-plugin-solid` | Solid 출력 대상입니다.                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 출력 대상.                                                           |
| `@mission-platform/forge-plugin-web-components` | 웹 구성 요소 출력 대상입니다.                                                     |
| `@mission-platform/forge-cms-plugin-api` | `CmsOutputPlugin` 계약, 중립 콘텐츠 모델, CMS 드라이버 및 빌드 도우미. |
| `@mission-platform/forge-cms-storyblok` | Storyblok 구성 요소 개체, 블록 래퍼 및 `components.json`.                |
| `@mission-platform/forge-cms-astro` | 정적 `.astro` 템플릿 및 `client:load` 프레임워크 아일랜드.                    |
| `@mission-platform/forge-cms-ghost` | Ghost Handlebars 부분 및 `config.custom` 테마 조각.                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid에는 `_data` 스키마와 `_config.yml` 조각이 포함되어 있습니다.             |
| `@mission-platform/forge-cms-webflow` | Webflow `declareComponent` 코드 구성 요소 및 `webflow.json` 라이브러리 조각. |

#### @mission-platform/forge-cms-plugin-api

| 수출 | 유형 | 설명 |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` | 기능 | 중립 구성 요소의 소품을 플랫폼 중립 콘텐츠 모델에 투영합니다.   |
| `ContentComponent` | 유형 | `ContentField`, 슬롯 및 `interactive` 플래그를 주문했습니다.                     |
| `ContentFieldKind` | 유형 | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin` | 유형 | 대상 계약: 바인딩된 프레임워크 플러그인과 4개의 이미터.           |
| `defineForgeCmsPlugin` | 기능 | 구성 시 CMS 대상의 유효성을 검사합니다.                                   |
| `generateCmsArtifacts` | 기능 | 일반 검색 → IR → 콘텐츠 모델 → 방출 → 드라이버 작성.                |
| `defineTsdownForgeCms` | 기능 | `dist/cms/<cms>/<framework>/**`을 내보내는 하나의 CMS 대상에 대한 tsdown 구성입니다.     |
| `defineTsdownForgeCmsAll` | 기능 | CMS 대상 목록에 대한 tsdown 구성.                                       |
