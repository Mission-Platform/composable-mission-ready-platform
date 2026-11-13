# 시스템 구축

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> 언어: 한국어 (ko)

이 문서는 Mission Platform 빌드 시스템의 아키텍처와 메커니즘을 설명합니다. 그것은 높은 것을 위해 설계되었습니다
성능, 증분 빌드 및 다중 프레임워크 패키지 배포.

## 핵심 아키텍처

Mission Platform은 작업 조정과 개별 작업 공간 컴파일을 분리하는 계층형 빌드 시스템을 사용합니다.

### 1. 작업 오케스트레이션(Turborepo)

**Turborepo**는 최상위 오케스트레이터입니다. 작업공간 간의 종속성 그래프를 관리하고 다음에 대한 캐싱을 제공합니다.
모든 작업.

- **`turbo.json`에 정의된 파이프라인**: `build`, `test` 및 `lint`과 같은 작업은 해당 종속성과 함께 정의됩니다.
  (예를 들어, `build`는 `^build`에 종속됩니다. 즉, 모든 종속성이 먼저 빌드되어야 함을 의미합니다.)
- **해싱**: Turborepo는 소스 파일, 환경 변수 및 전역 종속성을 해시하여 작업이
  캐시에서 출력을 다시 사용할 수 있습니다.
- **병렬성**: CPU 활용도를 극대화하기 위해 독립적인 작업이 동시에 실행됩니다.

### 2. 패키지 컴파일(tsdown)

`packages/`의 대부분의 라이브러리 패키지는 컴파일에 **tsdown**을 사용합니다.

- **속도**: **Rolldown**(Rust 기반 Rollup 후속 버전)을 기반으로 구축되어 거의 즉각적인 빌드를 제공합니다.
- **번들 해제**: 패키지는 `unbundle: true`로 빌드되어 `dist/`의 원래 모듈 구조를 유지합니다. 이
  소비자 애플리케이션에서 최적의 트리 쉐이킹과 더 나은 디버깅을 보장합니다.
- **CSS 스레딩**: 맞춤 플러그인은 추출된 스타일시트를 소유한 JS 모듈에 다시 연결하여 다음을 보장합니다.
  구성요소를 가져오면 자동으로 해당 스타일을 가져옵니다.

### 3. 애플리케이션 번들링(Vite)

`apps/`에서 배포 가능한 애플리케이션은 개발 및 프로덕션 번들링에 **Vite**를 사용합니다.

- **공유 구성**: 앱은 `@mission-platform/vite-config`을 확장하여 일관된 PostCSS 파이프라인과
  프레임워크에 구애받지 않는 해결.
- **SSR/SSG 지원**: `my-care-notes`와 같은 애플리케이션은 정적 사이트 생성을 위해 `vite-ssg`을 사용합니다.

### Forge 패키지 빌드

Forge 패키지 빌드는 일반 `tsdown` 또는 Vite 흐름에 중립 컴파일러 프런트 엔드를 추가합니다. 소비 패키지 가져오기
원하는 프레임워크 플러그인을 선택하고 명시적 인스턴스를 `tsdownForgeComponentPlugins`에 전달하거나
하나의 `defineTsdownLibrary` 호출 내 `tsdownForgeHookPlugins`입니다. 중립 드라이버는 의미론적 IR을 한 번 생성한 다음 선택한 플러그인이 대상 낮추기를 소유합니다.
소스 생성, 선언, 런타임 외부 및 기본 Vite/tsdown 어댑터.

콘텐츠 플랫폼 출력은 `@mission-platform/forge-cms-plugin-api`를 통해 구성된 두 번째 직교 축입니다. 에이
소비자는 `tsdownForgeCmsPlugins`에 `CmsOutputPlugin` 인스턴스 목록을 전달합니다.
이는 프레임워크 플러그인을 _구성_합니다 — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })` 등 Ghost, Jekyll 및 Webflow에 대한 것입니다. 왜냐하면 플랫폼과
프레임워크는 독립적으로 선택되며 `storyblok × vue` 및 `astro × solid`은 새 코드가 아닌 구성입니다.

CMS 빌드는 매니페스트 및 기타 플랫폼 사이드카를 미러링하여 `dist/cms/<cms>/<framework>/**`로 내보냅니다.
`dist/cms/<cms>/`. 수화 런타임이 필요한 대상(Astro, Webflow)은 경계에서 아일랜드 트리를 공동 생성합니다.
프레임워크 플러그인을 동일한 빌드에 추가합니다. 완전한 책임 분할 및 단계 경계는 다음에 설명되어 있습니다.
[Forge 컴파일러 파이프라인](../../../packages/tooling/vite/forge/docs/locales/ko/reference/compiler.md).

## 계약 구축

`pnpm build`은 정식 집계 빌드입니다. 설정하지 않고 Turbo의 패키지 수준 `build` 작업에 위임합니다.
프레임워크 선택기이므로 모든 Forge 패키지는 중립 출력과 이에 의해 구성된 모든 프레임워크 대상을 내보냅니다.
패키지. CMS 프로젝션이 포함된 패키지는 동일한 단계적 빌드에서 해당 프로젝션과 공유 사이드카를 내보냅니다.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Forge 패키지는 하나의 대상을 다시 빌드하기 위한 씬 호환성 별칭도 유지합니다.

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

별칭은 `build`과 동일한 유형의 실행기를 사용합니다. 여기에는 독립적인 `tsdown` 구현이 포함되어 있지 않습니다. `build:forge`
중립 대상을 선택하고 프레임워크 별칭은 해당 프레임워크 디렉터리를 선택합니다. 패키지별
공유 Storyblok 자산 명령 및
프레임워크별 Storyblok 래퍼 명령.

### 준비 및 프로모션

모든 Forge 호출은 `node_modules/.cache/forge-build/` 아래의 고유한 패키지 로컬 단계에 기록됩니다. 무대는
Turbo의 입력에 의해 무시되며 게시되지 않습니다. 승격하기 전에 성공적인 빌드의 출력을 확인합니다.

- **집계 모드**는 전체 Forge 소유 `dist` 트리를 원자적으로 대체합니다. 오래된 중립, 프레임워크 및 CMS 파일
  따라서 실수로 내보내기를 만족시키는 대신 제거됩니다.
- **대상 모드**는 선택한 프레임워크 하위 트리(및 일치하는 CMS 래퍼 하위 트리)만 원자적으로 대체합니다.
  관련 없는 중립, 프레임워크, 이메일 및 CMS 출력을 이미 `dist`에 보존합니다. 실행자는 CMS 선택기의 범위를 지정합니다.
  (예: `FORGE_CMS_STORYBLOK_TARGET`)을 `FORGE_FRAMEWORK_TARGET`와 함께 요청된 프레임워크에 추가하므로 패키지의 CMS
  배선(`forgeStoryblokCmsTargets` 등)은 실제로 동일한 단계에서 일치하는 래퍼를 다시 빌드하는 대신
  조용히 승진에서 탈락했다. 승격은 단계에서 다시 생성된 CMS 래퍼 하위 트리만 지웁니다. 그것은 결코
  현재 빌드가 다시 빌드되지 않은 형제 CMS 래퍼를 삭제합니다.
- Storyblok 스키마 및 `components.json`과 같은 CMS 공유 자산에는 공유 대상이 있으며 삭제되지 않습니다.
  나중에 프레임워크 승격.
- 컴파일러 오류, 빈 단계 또는 승격 실패로 인해 이전에 게시된 트리는 그대로 유지되고
  임시 무대 및 프로모션 디렉토리.

게시된 출력은 기존 `dist` 계약(중립 모듈 및 선언, 프레임워크 디렉터리)에 따라 유지됩니다.
(`vue`, `react`, `svelte`, `solid`, `web-components`) 및 `cms/<cms>/<framework>` 아래의 CMS 예측. 패키지 내보내기
`mp:*` 조건 및 CMS 하위 경로를 포함한 맵은 이러한 승격된 경로에 대해 계속 확인됩니다.

### 패키지 작업

| 작업 | 설명 |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` | 공유 Forge 실행기를 통해 중립, 프레임워크, 선언, 이메일 및 구성된 CMS 출력을 집계합니다. |
| `build:forge` | 대상 중립 Forge 출력 호환성 별칭입니다.                                                           |
| `build:react`, `build:vue`, `build:svelte` | 대상 프레임워크 호환성 별칭입니다.                                                                    |
| `build:solid`, `build:web-components` | 대상 프레임워크 호환성 별칭입니다.                                                                    |
| `build:check` | 출력을 게시하지 않고 작업공간의 유형을 검증합니다.                                                   |
| `build:watch` | 작업공간에 대해 감시 모드에서 증분 빌드를 시작합니다.                                                   |

Turbo은 대상 선택기(`FORGE_BUILD_TARGET` 및 레거시 Forge/CMS 선택기)를 공유된 항목과 함께 해시합니다.
러너 및 스테이징 소스. 결과적으로 집계 빌드와 대상 빌드는 서로의 캐시된 결과를 재사용할 수 없습니다. 최종
`dist/**` 출력이 캐시됩니다. 임시 준비 및 승격 디렉터리는 명시적으로 제외됩니다.

### 애플리케이션 구축 단계

독립적으로 의미 있는 빌드 단계가 있는 애플리케이션은 해당 단계를 체인이 아닌 Turbo 작업으로 노출합니다.
`build` 내부:

- `@mission-platform/docs`은 `build:check`, `build:bundle`, `build:prerender`, `build:verify`를 순서대로 실행합니다.
- `@mission-platform/figma-forge-plugin`은 집계 `build` 작업을 통해 `build:check`, `build:ui` 및 `build:main`를 실행합니다.
- `@mission-platform/icons`은 집계 `build` 작업을 통해 `build:check`, `build:generate` 및 `build:sprite`를 실행합니다.

집계 스크립트는 작업 소유 출력이 존재하는지 확인만 합니다. Turbo은 스케줄링, 종속성 순서 지정 및
캐시 복원. 이렇게 하면 개별 단계를 관찰 가능하게 유지하고 중첩된 Turbo 호출 또는 셸 수준 빌드를 방지합니다.
오케스트레이션.

### 캐싱 전략

Turborepo는 다음 아티팩트를 캐시합니다.

- `dist/**`: JS/CSS 아티팩트를 구축했습니다.
- `.vite/**`: Vite의 내부 캐시입니다.
- `coverage/**`: 테스트 범위 보고서.

캐시를 우회하고 새로운 빌드를 강제하려면 `--force` 플래그를 사용하십시오.

```bash
pnpm build:force
```

선언 전용 작업도 캐시 가능합니다. `build:types`은 `dist/**/*.d.ts` 및 선언 맵을 출력으로 기록합니다.
대상 유형 빌드는 다운스트림 패키지에 필요한 파일을 복원합니다.

호환성 별칭 및 CMS 아티팩트 모드 작업은 패키지 작업이므로 Turbo은 여전히 종속성 그래프를 적용하고
대상별 캐시 입력. 임시 단계는 캐시 출력이 아닙니다. 승격된 `dist` 트리만 게시되거나
캐시에서 복원되었습니다.

## 공유 구성

빌드 구성은 `packages/tooling/configs/` 디렉터리에 중앙 집중화되어 모노레포 전체에서 일관성을 유지합니다.

| 패키지 | 목적 |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` | 앱 및 Vue 관련 빌드에 대한 공유 Vite 논리.          |
| `@mission-platform/tsdown-config` | 라이브러리 패키지에 대한 공유 tsdown 논리.                    |
| `@mission-platform/typescript-config` | 앱, 라이브러리 및 테스트를 위한 기본 `tsconfig.json` 사전 설정입니다. |
| `@mission-platform/postcss-config` | 표준화된 CSS 처리(Autoprefixer 등).            |

## TypeScript 7 툴체인

작업공간 카탈로그는 컴파일러를 안정적인 TypeScript `7.0.2`에 고정합니다. 작업공간 검사 및 선언 빌드에서는
기본 `tsc` 실행 파일이고 편집기 통합은 TypeScript의 기본 언어 서버를 사용합니다.

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

`@mission-platform/typescript-config`의 공유 사전 설정은 대상, 모듈 해상도,
주변 유형, 엄격성, 프로젝트 참조 및 선언 출력. Forge 및 CMS 도구는 제거된 도구를 사용하지 않습니다.
TypeScript 컴파일러 API; 대신 저장소 소유 파서 중립/OXC 계약을 사용합니다. 이 경계는 또한 힘을 실어준다.
패키지 문서 스캐너를 사용하고 컴파일러 API 내부와 별도로 생성된 Forge 출력을 유지합니다.

컴파일된 JavaScript 및 선언 파일은 소유 패키지의 `dist` 디렉터리로만 내보내집니다. Forge가 생성됨
프레임워크 소스 트리는 임시 빌드 입력이며 번들이 완료된 후 제거됩니다. `*.js`를 떠나서는 안 됩니다.
`src` 또는 패키지 수준 캐시 디렉터리 아래의 `*.d.ts` 파일.

Vue-대상 패키지 선언은 Forge `tsdown` 선언 플러그인에 의해 합성됩니다. 이 경로는 패키지를 내보냅니다.
`vue-tsc`을 호출하지 않고 선언합니다. 임의의 애플리케이션 SFC 템플릿에 대한 유형 검사를 제공하지 않습니다.
애플리케이션 SFC 확인은 명시적인 승인 게이트로 남아 있으며 현재 업스트림 TypeScript 7 호환이 필요합니다.
`vue-tsc` 릴리스. 사용 가능한 `vue-tsc@3.3.11`은 TypeScript `7.0.2`에 대해 실패합니다.
`typescript/lib/tsc`에 대한 `ERR_PACKAGE_PATH_NOT_EXPORTED`, 기본 `tsc`는 의도적으로 `.vue` 유형을 확인하지 않습니다.
파일. 이 경계를 해결하기 위해 TypeScript 6 호환성 별칭을 추가하지 마십시오.

공유 ESLint 구성은 TypeScript, TSX 및 Vue 구문에 대해 `@babel/eslint-parser`를 사용하고 작은
보유된 `@typescript-eslint/no-explicit-any`에 대한 저장소 소유 호환성 플러그인 및
`@typescript-eslint/consistent-type-imports` 규칙 ID입니다. 이는 의도적으로 구문 전용입니다. 현재
`typescript-eslint` 릴리스는 TypeScript 7을 거부하므로 유형 인식 린트 규칙이 공유 TypeScript로 대체됩니다.
`noUnusedLocals` 및 `noUnusedParameters`는 호환되는 업스트림 릴리스를 사용할 수 있을 때까지 확인합니다.

## 지역 개발과 생산

### 개발(`dev` 과제)

Vite의 개발 서버는 핫 모듈 교체(HMR)를 제공합니다. 앱의 `dev` 작업이 시작되면 Turborepo도 실행됩니다.
(작업의 `with` 키를 통해) 구성 요소 라이브러리의 `build:watch` 작업이 함께 있으므로 다음을 편집합니다.
`@mission-platform/components`은 수동으로 다시 빌드하지 않고도 자동으로 다시 컴파일되고 실행 중인 앱에서 선택됩니다.

### 생산(`build` 작업)

Turborepo는 토폴로지 순서로 빌드를 실행합니다. 패키지는 모든 내부 종속성이 완료된 후에만 빌드됩니다.
성공적으로 구축되었습니다. `dist/`의 출력은 최종적으로 게시되거나 배포되는 것입니다.

## 고급: WASM 통합

특정 패키지(예: `@mission-platform/hunspell`, 바코드 스캐너)에는 WebAssembly로 컴파일된 Rust 코드가 포함되어 있습니다. 이것들
환경 일관성과 최적의 상태를 보장하기 위해 `wasm-pack`을 사용하는 특수 작업을 통해 빌드가 조정됩니다.
성능.
