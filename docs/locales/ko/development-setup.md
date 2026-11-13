# 개발 설정

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> 언어: 한국어 (ko)

이 가이드는 미션 플랫폼에 기여하기 위해 로컬 환경을 설정하기 위한 단계별 튜토리얼을 제공합니다.
이 가이드가 끝나면 작동하는 단일 저장소를 갖게 되고 개발 도구를 실행할 수 있게 됩니다.

## 전제조건

리포지토리를 복제하기 전에 시스템이 다음 요구 사항을 충족하는지 확인하세요.

### 시스템 요구 사항

| 도구 | 필요한 버전 | 목적 |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0` | 런타임 환경(활성 LTS) |
| **pnpm** | `12.4.2` | 패키지 관리자 및 작업 공간 조정자 |
| **힘내** | 최신 안정 | 버전 관리 |
| **러스트** | 안정적인 툴체인 | 선택적 독립형 Rust 벤치마크 개발 |
| **도커** | 최신 안정 | Emscripten Hunspell 빌드에만 필요 |

### 버전 관리(권장)

다음에 지정된 올바른 Node.js 버전을 사용하고 있는지 확인하려면 **nvm**(Node 버전 관리자)을 사용하는 것이 좋습니다.
루트 `.nvmrc` 파일.

```bash
nvm install
nvm use
```

Corepack을 사용하여 **pnpm**을 활성화합니다.

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
```

## 초기 설정

머신에서 모노레포를 초기화하려면 다음 단계를 따르세요.

### 1. 리포지토리 복제

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. 종속성 설치

모든 작업공간 종속 항목을 설치하고 git 후크를 설정합니다.

```bash
pnpm install
```

이 명령은 `prepare` 커밋 린팅을 위해 **Husky**를 초기화하고 모든 내부
패키지 링크가 올바르게 설정되었습니다.

### SonarLint 언어 서버

저장소의 `agent-lsp.json`에는 JavaScript 및 TypeScript용 공식 SonarLint 언어 서버가 포함되어 있습니다. 는
서버는 npm 패키지가 아닌 Java 아카이브로 배포되므로 Java를 설치하고 빌드하거나 다운로드하십시오.
[SonarSource](https://github.com/SonarSource/sonarlint-language-server)의 `sonarlint-language-server` 아카이브.

LSP를 시작하기 전에 서버 아카이브와 JavaScript 분석기를 설정하십시오.

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

선택적 `SONARLINT_JAVA` 변수는 Java 실행 파일을 선택할 수 있습니다. 저장소 실행 프로그램은 구성된 유효성을 검사합니다.
전역적으로 설치된 명령이 필요 없이 서버의 stdio 프로토콜을 경로 지정하고 전달합니다.

### 3. 설치 확인

스모크 테스트를 실행하여 빌드 시스템과 환경이 올바르게 구성되었는지 확인하세요.

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

`...` 필터는 또한 패키지에 필요한 Forge 종속성을 구축합니다. 는
중립 코드 스캐너는 Flint 그래프에서 컴파일됩니다. 그렇지 않다
Rust 또는 `wasm-pack` 빌드 단계가 필요합니다.

## 개발 워크플로

Mission Platform은 **Turborepo**를 사용하여 애플리케이션과 패키지 전반에 걸쳐 작업을 조정합니다.

### 컴포넌트 개발(스토리북)

Storybook은 구성요소를 독립적으로 구축하고 테스트하기 위한 기본 워크벤치입니다. 특정 프레임워크를 대상으로 할 수 있습니다.
환경 변수 사용:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

다섯 가지 모드 모두 동일한 중립 스토리 인벤토리를 사용합니다. 모든 정적을 검증하려면
한 번에 워크벤치 빌드:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

위조 지원 패키지는 일치하는 `mp:vue`, `mp:react`, `mp:svelte`를 게시합니다.
`mp:solid` 및 `mp:web-component` 조건입니다. 활성 조건은 다음과 같아야 합니다.
소비 번들러에 의해 구성됩니다. [컴파일러 참조](../../../packages/tooling/vite/forge/docs/locales/ko/reference/compiler.md)를 참조하세요.
대상 플러그인 및 선언 파이프라인용.

### 애플리케이션 개발

개발 모드에서 특정 애플리케이션을 시작하려면 다음 안내를 따르세요.

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

응용 프로그램은 일반적으로 `http://localhost:5173`에서 사용할 수 있습니다.

### 공통 명령

| 작업 | 명령 | 설명 |
| :--------- | :------------ | :----------------------------- |
| **빌드** | `pnpm build` | 모든 앱 및 패키지 빌드 |
| **테스트** | `pnpm test` | 모든 Vitest 제품군 실행 |
| **린트** | `pnpm lint` | 모노레포에서 ESLint 실행 |
| **형식** | `pnpm format` | Prettier으로 형식 확인 |

## 문제 해결

### 캐시 지우기

예기치 않은 빌드 오류가 발생하면 Turborepo 및 Node 캐시를 지우십시오.

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM 빌드 실패

Flint 아티팩트 빌드에 실패하면 컴파일러 진단을 검사하세요.
선택한 정적 또는 동적 링크 프로필을 확인합니다. 는
`@mission-platform/hunspell` Emscripten 빌드에는 Docker가 추가로 필요합니다.
달려라.
