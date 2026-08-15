# 작업공간 구조

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/workspace-structure.md](../../workspace-structure.md)
> 언어: 한국어 (ko)

이 문서는 Mission Platform 모노레포 레이아웃, 디렉터리 목적 및 내부에 대한 기술 참조를 제공합니다.
패키지 규칙.

## 모노레포 레이아웃 참조

미션 플랫폼 사용 pnpm 다중 패키지 환경을 관리하기 위한 작업 공간 및 Turborepo. 저장소가 정리되어 있습니다.
기능적 계층으로:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## 기본 디렉터리

### 1. `apps/` (응용프로그램)

애플리케이션은 다음과 같은 기능을 구성하는 배포 가능한 단위입니다. `packages/` 예배 규칙서. 그들은 대개 비공개입니다
레지스트리에 게시되지 않았습니다.

- **`docs/`**: Vite + Vue Markdown 코퍼스에 대한 문서 사이트입니다.
- **`my-care-notes/`**: 주력 케어 노트 애플리케이션입니다.
- **`service-monitor/`**: 지속성 개체로 지원되는 RedwoodSDK 서비스 상태 대시보드입니다.
- **`website/`**: Mission Platform 마케팅 및 제품 웹사이트.
- **`storybook/`**: 구성 요소 작업대 및 시각적 테스트 모음입니다.

### 2. `packages/` (빌딩 블록)

앱에서 사용하는 재사용 가능하고 버전이 지정된 라이브러리입니다. 이는 가능한 경우 프레임워크에 구애받지 않도록 의도되었습니다.

- **`@mission-platform/forge`**: 프레임워크 중립적인 JSX 런타임 및 어댑터.
- **`@mission-platform/components`**: 다중 프레임워크 구성 요소 라이브러리.
- **`@mission-platform/forms`** 그리고 **`@mission-platform/forms-core`**: 스키마 기반 양식 기본 요소.
- **`@mission-platform/content`** 그리고 **`@mission-platform/email-renderer`**: 콘텐츠 및 렌더링 파이프라인.
- **`@mission-platform/tokens`**: 디자인 토큰 정보 소스.
- **`@mission-platform/router`** 그리고 **`@mission-platform/i18n`**: 프레임워크 중립적인 라우팅 및 지역화.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, 그리고
  **`@mission-platform/qr-code`**: Wasm 기반 스캐닝 및 인코딩 패키지.

### 3. `configs/` (툴링재단)

모든 작업 공간에서 일관성을 보장하는 공유 구성입니다. 이 디렉터리의 패키지는 일반적으로 다음과 같이 사용됩니다.
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, 그리고 **`stylelint-config/`**: 린팅 및 서식 지정 규칙.
- **`typescript-config/`**: 베이스 `tsconfig.json` 파일 Node, DOM, 라이브러리 및 프레임워크 소비자.
- **`tsdown-config/`** 그리고 **`vite-config/`**: 공용 라이브러리, 앱, Vite, 그리고 Vitest 패턴을 구축합니다.
- **`i18n-config/`** 그리고 **`storybook-framework/`**: 공유 로케일 추출 및 프레임워크 워크벤치 설정.

### 4. `vite-plugins/` (빌드 확장)

확장하는 맞춤형 플러그인 Vite 빌드 프로세스.

- **`forge/`**: Forge 구성 요소를 위한 다단계 컴파일러입니다.
- **`tokens/`**: DTCG 토큰 정의에서 코드 아티팩트를 생성합니다.
- **`i18n/`**: 로케일 로딩 및 정적 추출을 처리합니다.

### 5. `workers/` (엣지 서비스)

서버 측 논리 및 최적화된 자산 전달을 위한 Cloudflare Workers.

- **`api-proxy/`**: 승인된 API 경로에 대한 제한된 읽기 전용 액세스를 제공합니다.
- **`email-sender/`**: 로컬 MailPit 지원 이메일 쇼케이스 작업자.
- **`forge-spa/`**: 정적 자산을 제공합니다. `ASSETS`-바인딩 SPA 대체.

배포 가능한 애플리케이션 작업자는 다음에 의해 구성됩니다. `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, 그리고 `apps/service-monitor/wrangler.jsonc`. 그만큼
`api-proxy` 그리고 `forge-spa` 패키지는 독립형이 아닌 번들 종속성입니다. Wrangler 배포.

## 내부 패키지 규칙

예측 가능한 환경을 유지하기 위해 모든 패키지와 앱은 표준 내부 레이아웃을 따릅니다.

### 기준 `src/` 계층

소스 코드는 기능 유형별로 구성됩니다.

- **`components/`**: UI 로직(SFC 또는 TSX).
- **`composables/`**: 반응형 논리 및 후크.
- **`utils/`**: 순수 기능 및 프레임워크에 구애받지 않는 도우미.
- **`locales/`**: JSON/YAML 번역 파일.
- **`styles/`**: SCSS 부분 및 설계 시스템 통합.

### 배럴 수출 패턴

내의 모든 디렉토리 `src/` 다음을 포함해야 합니다. `index.ts` (배럴 파일).

- 하위 디렉토리는 로컬을 통해 내부 기호를 내보냅니다. `index.ts`.
- 루트 `src/index.ts` 전체 작업공간 멤버에 대한 공개 진입점 역할을 합니다.

## 루트 구성 레지스트리

저장소 루트의 키 파일은 모노레포의 동작을 제어합니다.

| 파일 | 목적 |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | 작업 영역 경계, 멤버 글로브 및 종속성 카탈로그를 정의합니다. |
| `turbo.json`            | 빌드 파이프라인과 작업 캐싱을 조정합니다.                    |
| `package.json`          | 루트 수준 스크립트 및 단일 저장소 전체 devDependency.                |
| `commitlint.config.mjs` | 기존 커밋 사양을 적용합니다.                     |

## 종속성 및 작업 공간 관리

미션 플랫폼은 `workspace:*` 내부 종속성을 위한 프로토콜입니다. 이렇게 하면 패키지가 항상
개발 중 다른 작업공간 멤버의 로컬 버전.

### PNPM 카탈로그

저장소는 **를 활용합니다.pnpm 카탈로그**(에 정의됨 `pnpm-workspace.yaml`) 종속성 버전을 중앙 집중화하기 위해
모노레포. 이는 버전 드리프트를 방지하고 유지 관리를 단순화합니다.

### 작업 실행

교차 작업공간 작업은 루트를 통해 실행됩니다. `package.json` 터보레포(Turborepo) 사용:

- `pnpm build`: 올바른 종속성 순서로 모든 작업공간을 빌드합니다.
- `pnpm test`: 모든 작업공간에 대해 테스트 스위트를 실행합니다. `test` 일. 사용 `pnpm exec turbo run test --affected` 에 대한
  변경된 작업공간 CI 범위.
- `pnpm lint`: 달리다 ESLint 작업 공간 전반에 걸쳐.
- `pnpm lint:style`: 달리다 Stylelint 앱 및 패키지 스타일의 경우.
- `pnpm format`: 서식을 확인하세요. Prettier.
- `pnpm i18n:extract`: 카탈로그를 소유한 작업공간에 대한 번역 키를 추출합니다.
