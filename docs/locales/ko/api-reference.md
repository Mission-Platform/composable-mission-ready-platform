# API 참조

Mission Platform 핵심 패키지 및 프레임워크 어댑터에 대한 기술 참조입니다.

> **가져오기는 항상 베어입니다.** 프레임워크 배송 `@mission-platform/*` 패키지는 단일을 노출합니다. `.`
> 출입문은 다음과 같이 보호됩니다. `mp:vue`, `mp:react`, `mp:solid`, 그리고 `mp:web-component` 수출
> 조건. 프레임워크를 **한 번** 선택 — 다음을 통해 `resolve.conditions` (보다 `defineFrameworkAppConfig` /
> `frameworkResolveConditions` ~에서 `@mission-platform/vite-config`) 그리고 `customConditions` (를 통해
> `@mission-platform/typescript-config/framework-<name>` 사전 설정) — 그런 다음 맨손으로 모든 것을 가져옵니다. 패키지 지정자. 보다 [외부 소비자 설정](external-consumer-setup.md).

## 핵심 프레임워크

### @mission-platform/forge

프레임워크 중립적인 JSX 런타임 및 후크를 제공하는 "한 번 쓰기" 아키텍처의 기반입니다.

| 수출                 | 유형  | 설명                                                                                           |
| :----------------- | :-- | :------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | 기능  | 구성요소 작성을 위한 JSX 팩토리 및 단편입니다.                                                 |
| `useState`         | 후크  | 프레임워크 중립적 상태 후크.                                                             |
| `useEffect`        | 후크  | 프레임워크 중립 효과 후크.                                                              |
| `useMemo`          | 후크  | 프레임워크 중립적인 메모 후크.                                                            |
| `useRef`           | 후크  | 프레임워크 중립적인 참조 후크.                                                            |
| `useContext`       | 후크  | 프레임워크 중립적인 컨텍스트 후크.                                                          |
| `toVueComponent`   | 어댑터 | 단조 구성요소를 Vue 3개 구성요소(에서 `@mission-platform/forge/vue`).   |
| `toReactComponent` | 어댑터 | 단조 구성요소를 React 구성 요소(에서 `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| 후크                 | 설명                                                                                                                                                                                  |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| 수출                                                                   | 유형               | 설명                                                                                                                                                    |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | 유형               | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | 기능               | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | 어댑터              | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | 추가 자료            | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## UI 및 디자인

### @mission-platform/tokens

색상, 타이포그래피, 간격을 위한 중앙 집중식 디자인 토큰입니다.

| 수출            | 설명                                                                                                      |
| :------------ | :------------------------------------------------------------------------------------------------------ |
| `tokens`      | 모든 디자인 토큰을 포함하는 JS/TS 객체(예: `tokens.color.primary`). |
| `tokens.scss` | 스타일시트에 사용하기 위한 SCSS 변수입니다.                                                              |

### @mission-platform/breakpoints

반응형 유틸리티 및 가시성 구성 요소.

| 수출               | 유형   | 설명                                               |
| :--------------- | :--- | :----------------------------------------------- |
| `useBreakpoints` | 후크   | 반응 중단점 상태를 반환합니다.                |
| `ShowIf`         | 구성요소 | 중단점 조건이 일치하는 경우에만 하위 항목을 렌더링합니다. |
| `HideIf`         | 구성요소 | 중단점 조건이 일치하면 하위 항목을 숨깁니다.        |

### @mission-platform/components

공유 UI 구성요소는 한 번 작성되어 여러 프레임워크에 사용할 수 있습니다.

- **가져오기**: 항상 `@mission-platform/components`; 활동적인 `mp:<framework>` 조건에 따라 귀하가 혜택을 받을지 여부가 결정됩니다. Vue 3, React, Solid, 또는 웹 구성 요소 빌드.
- **구성요소별 하위 경로**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) 상태도 인식하고 해당 구성 요소만 로드합니다. 덩어리.
- **구성요소**: `ForgeButton`, `ForgeInput`, `ForgeModal`, 그리고 더.

## 기능 패키지

### @mission-platform/i18n

i18next를 기반으로 한 국제화 시스템.

| 수출                | 설명                                               |
| :---------------- | :----------------------------------------------- |
| `createForgeI18N` | 플랫폼 기본값을 사용하여 i18n 인스턴스를 초기화합니다. |
| `useI18n`         | 구성 요소의 번역 및 로케일 전환을 위한 후크입니다.    |

### @mission-platform/seo

메타태그 및 SEO 관리.

| 수출       | 설명                                                           |
| :------- | :----------------------------------------------------------- |
| `useSeo` | 페이지 제목, 메타 태그, 오픈 그래프 데이터를 선언적으로 설정하는 후크입니다. |

### @mission-platform/map

MapLibre GL용 반응성 래퍼.

| 구성요소            | 설명                                       |
| :-------------- | :--------------------------------------- |
| `<MpMap>`       | 기본 지도 컨테이너 구성요소입니다.      |
| `<MpMapMarker>` | 지도에 마커를 배치하기 위한 구성요소입니다. |

### @mission-platform/code-scanner

카메라 기반 바코드 및 QR 코드 스캐닝.

| 구성요소              | 설명                                                  |
| :---------------- | :-------------------------------------------------- |
| `<MpCodeScanner>` | 카메라 스트림을 초기화하고 스캔 결과를 내보내는 구성요소입니다. |

## 통합

### @mission-platform/rxjs

RxJS Observable을 구성 요소 상태에 연결합니다.

| 후크              | 설명                                                   |
| :-------------- | :--------------------------------------------------- |
| `useObservable` | Observable을 구독하고 최신 값을 반응 상태로 반환합니다. |

### @mission-platform/d3

프레임워크 중립적인 D3.js 통합.

| 후크      | 설명                                                      |
| :------ | :------------------------------------------------------ |
| `useD3` | 수명주기 관리를 통해 D3 선택 항목을 구성 요소 참조에 바인딩합니다. |

### @mission-platform/hunspell

WebAssembly 기반 맞춤법 검사.

| 수출             | `createMpRouter`                                        |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Hunspell WebAssembly 모듈을 로드하고 인스턴스화합니다. |
| `spell`        | 단어의 철자가 올바른지 확인합니다.                     |
| `suggest`      | 단어에 대한 맞춤법 제안을 제공합니다.                   |

## Further Reading

- [Vue 2 ~ Vue 3 마이그레이션 가이드](migration-guides/vue2-to-vue3.md)
- [프로젝트 구성 개요](configs/index.md)
- [작업공간 구조](workspace-structure.md)

## 완전한 작업 공간 패키지 색인

다음 인덱스는 패키지 매니페스트에서 생성되어 여기에 보관되므로 공개 API 참조에서 모든 내용을 다룹니다. 패키지 `packages/`, 형식화된 WebAssembly 외관을 포함합니다.

### 코어와 UI

| 패키지                            | 목적                                              |
| :----------------------------- | :---------------------------------------------- |
| `@mission-platform/forge`      | 프레임워크 중립적인 JSX 런타임 및 어댑터.       |
| `@mission-platform/components` | 한 번만 쓸 수 있는 UI 구성 요소입니다.        |
| `@mission-platform/icons`      | 한 번만 쓸 수 있는 SVG 아이콘 구성요소.       |
| `@mission-platform/layouts`    | 애플리케이션, 컨테이너, 반응형 레이아웃 구성요소.    |
| `@mission-platform/forms`      | 스키마 양식 및 시각적 양식 작성기 구성 요소.      |
| `@mission-platform/forms-core` | 스키마 파생, 유효성 검사 및 양식 작성기 도메인 논리. |
| `@mission-platform/tokens`     | CSS 사용자 정의 속성 및 SCSS 디자인 토큰.    |

### 컴포저블 및 통합

| 패키지                                             | 목적                                                                           |
| :---------------------------------------------- | :--------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | 반응형 중단점 상태 및 가시성 도우미.                                        |
| `@mission-platform/d3`                          | D3 선택 수명 주기 컴포저블 및 마진 유틸리티입니다.                               |
| `@mission-platform/i18n`                        | i18next 상태 및 프레임워크 통합 도우미.                                   |
| `@mission-platform/map`                         | MapLibre 지도 구성요소 및 컴포저블.                                     |
| `@mission-platform/observers`                   | 교차, 변형, 성능 관찰자 컴포저블                                                          |
| `@mission-platform/phone-number`                | WebAssembly 전화번호 구문 분석 및 형식 지정.                              |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities. |
| `@mission-platform/forge-router-web-components` | 프레임워크에 구애받지 않는 라우팅 기본 요소 및 어댑터.                              |
| `@mission-platform/rxjs`                        | RxJS 관찰 가능 항목 및 구독 컴포저블                                                      |
| `@mission-platform/scheduler`                   | 스케줄러 UI, 반복 및 달력 레이아웃 도메인 논리.                                |
| `@mission-platform/vcard`                       | RFC 6350 vCard 및 RFC 5545 iCalendar 데이터 및 구성 요소.             |
| `@mission-platform/content`                     | 콘텐츠 AST, 빌더, Monaco, Markdown 및 WYSIWYG 구성 요소.               |
| `@mission-platform/seo`                         | 메타데이터, 오픈 그래프, 구조화된 데이터 컴포저블                                                 |
| `@mission-platform/speech-audio`                | 음성, 오디오, 웹 MIDI 컴포저블                                                         |
| `@mission-platform/three`                       | Three.js 캔버스 및 수명 주기 컴포저블                                    |

### 코드 및 웹어셈블리 패키지

| 패키지                                         | 목적                                              |
| :------------------------------------------ | :---------------------------------------------- |
| `@mission-platform/barcode`                 | 1D 바코드 인코딩/디코딩 외관 및 구성요소.       |
| `@mission-platform/code-scan-wasm`          | 생성된 이미지 스캐너 WebAssembly 모듈.     |
| `@mission-platform/code-scanner`            | 카메라 및 이미지 코드 스캔 구성 요소.          |
| `@mission-platform/matrix-code`             | 데이터 매트릭스 및 Aztec 인코딩/디코딩 외관.    |
| `@mission-platform/matrix-code-decode-wasm` | 생성된 매트릭스 코드 디코더 WebAssembly 모듈. |
| `@mission-platform/matrix-code-encode-wasm` | 생성된 매트릭스 코드 인코더 WebAssembly 모듈. |
| `@mission-platform/qr-code`                 | QR 인코딩/디코딩 파사드 및 구성요소.          |
| `@mission-platform/qr-code-decode-wasm`     | QR 디코더 WebAssembly 모듈이 생성되었습니다. |
| `@mission-platform/qr-code-encode-wasm`     | QR 인코더 WebAssembly 모듈이 생성되었습니다. |
| `@mission-platform/harper`                  | 모나코를 위한 Harper 문법 및 스타일 통합.     |
| `@mission-platform/hunspell`                | Emscripten Hunspell 철자 검사 래퍼.   |

### Forge 컴파일러 타겟

이들은 `forge-plugins/` 오히려 `packages/`. **프레임워크** 플러그인은 어떤 런타임이 중립 구성 요소인지 결정합니다. 으로 낮아졌습니다; **CMS** 대상은 그것이 투영되는 콘텐츠 플랫폼을 결정합니다. 두 개의 축이 구성되므로 모든 CMS
대상은 모든 프레임워크 플러그인에 바인딩될 수 있습니다. 보다 [Forge 컴파일러 파이프라인](forge-compiler.md).

| 패키지                                             | 목적                                                                                  |
| :---------------------------------------------- | :---------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` 계약, 의미론적 IR 유형, 빌드 어댑터 유형 등이 있습니다.          |
| `@mission-platform/forge-plugin-react`          | React 출력 대상.                                                        |
| `@mission-platform/forge-plugin-vue`            | Vue 3 출력 대상.                                                        |
| `@mission-platform/forge-plugin-solid`          | Solid 출력 대상.                                                        |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 출력 목표.                                                     |
| `@mission-platform/forge-plugin-web-components` | 웹 구성 요소 출력 대상입니다.                                                   |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` 계약, 중립 콘텐츠 모델, CMS 드라이버 및 빌드 도우미.                 |
| `@mission-platform/forge-cms-storyblok`         | Storyblok 구성 요소 개체, 블록 래퍼 및 `components.json`.                      |
| `@mission-platform/forge-cms-astro`             | 공전 `.astro` 템플릿과 `client:load` 프레임워크 섬.                             |
| `@mission-platform/forge-cms-ghost`             | 고스트 핸들바 부분 및 `config.custom` 테마 조각.                                 |
| `@mission-platform/forge-cms-jekyll`            | 지킬 리퀴드에는 다음이 포함됩니다. `_data` 스키마 및 `_config.yml` 파편. |
| `@mission-platform/forge-cms-webflow`           | 웹플로우 `declareComponent` 코드 구성 요소 및 `webflow.json` 라이브러리 조각.         |

#### @mission-platform/forge-cms-plugin-api

| 수출                        | 유형 | 설명                                                                                              |
| :------------------------ | :- | :---------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | 기능 | 중립 구성 요소의 소품을 플랫폼 중립 콘텐츠 모델에 투영합니다.                                             |
| `ContentComponent`        | 유형 | 주문하다 `ContentField`s, 슬롯 및 `interactive` 깃발.                                    |
| `ContentFieldKind`        | 유형 | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`         | 유형 | 대상 계약: 바인딩된 프레임워크 플러그인과 4개의 이미터.                                |
| `defineForgeCmsPlugin`    | 기능 | 구성 시 CMS 대상의 유효성을 검사합니다.                                                        |
| `generateCmsArtifacts`    | 기능 | 일반 검색 → IR → 콘텐츠 모델 → 방출 → 드라이버 작성.                                             |
| `defineTsdownForgeCms`    | 기능 | 하나의 CMS 대상에 대한 tsdown 구성, 방출 `dist/cms/<cms>/<framework>/**`.                   |
| `defineTsdownForgeCmsAll` | 기능 | CMS 대상 목록에 대한 tsdown 구성.                                                        |
