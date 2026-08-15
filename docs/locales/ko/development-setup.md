# 개발 설정

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/development-setup.md](../../development-setup.md)
> 언어: 한국어 (ko)

이 가이드는 미션 플랫폼에 기여하기 위해 로컬 환경을 설정하기 위한 단계별 튜토리얼을 제공합니다.
이 가이드가 끝나면 작동하는 단일 저장소를 갖게 되고 개발 도구를 실행할 수 있게 됩니다.

## 전제조건

리포지토리를 복제하기 전에 시스템이 다음 요구 사항을 충족하는지 확인하세요.

### 시스템 요구 사항

| 도구 | 필요한 버전 | 목적 |
| :------------ | :---------------- | :---------------------------------------------------- |
| **Node.js** | `24.19.0`         | 런타임 환경(활성 LTS) |
| **pnpm**      | `11.21.0`         | 패키지 관리자 및 작업 공간 조정자 |
| **힘내** | 최신 안정 | 버전 관리 |
| **러스트** | 안정적인 툴체인 | 기본 테스트 및 Rust/WASM 크레이트 개발 |
| **wasm-팩** | `0.15.0` ~을 통해 pnpm | Rust 상자를 형식화된 WebAssembly 작업 공간으로 패키징 |
| **도커** | 최신 안정 | Emscripten Hunspell 빌드에만 필요 |

### 버전 관리(권장)

**nvm** 사용을 권장합니다(Node 버전 관리자) 올바른 버전을 사용하고 있는지 확인하세요. Node.js 버전은
뿌리 `.nvmrc` 파일.

```bash
nvm install
nvm use
```

할 수 있게 하다 **pnpm** 코어팩 사용:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

Rust 상자 작업 시 Rust 타겟을 설치하세요. WebAssembly 패키저는 pinned에서 제공됩니다. `wasm-pack` npm
의존성 `pnpm install`:

```bash
rustup target add wasm32-unknown-unknown
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

### 3. 설치 확인

스모크 테스트를 실행하여 빌드 시스템과 환경이 올바르게 구성되었는지 확인하세요.

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

그만큼 `...` 또한 패키지에 필요한 Forge 종속성을 빌드합니다. Rust 디코더 및 인코더 상자가 테스트되었습니다.
기본적으로 `cargo test`; 그들의
`wasm-pack` 출력은 해당 항목에 기록됩니다. `packages/*-wasm/`
Turborepo에서 사용하는 체크인 패키지/빌드 계약인 크레이트의 패키지 작업에 의한 작업 공간입니다.

## 개발 워크플로우

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

위조 지원 패키지 게시 일치 `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`, 그리고 `mp:web-component` 정황. 활성 조건은 다음과 같아야 합니다.
소비 번들러에 의해 구성됩니다. 보다 [컴파일러 참조](forge-compiler.md)
대상 플러그인 및 선언 파이프라인용.

### 애플리케이션 개발

개발 모드에서 특정 애플리케이션을 시작하려면 다음 안내를 따르세요.

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

신청서는 일반적으로 다음에서 구할 수 있습니다. `http://localhost:5173`.

### 공통 명령

| 작업 | 명령 | 설명 |
| :--------- | :------------ | :----------------------------- |
| **빌드** | `pnpm build`  | 모든 앱 및 패키지 빌드 |
| **테스트** | `pnpm test`   | 모두 실행 Vitest 스위트 |
| **린트** | `pnpm lint`   | 달리다 ESLint 모노레포 건너편 |
| **형식** | `pnpm format` | 다음으로 형식을 확인하세요. Prettier |

## 문제 해결

### 캐시 지우기

예상치 못한 빌드 오류가 발생하면 Turborepo를 지우고 Node 캐시:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM 빌드 실패

Rust/WASM 패키지가 빌드되지 않으면 안정적인 Rust 툴체인과
`wasm32-unknown-unknown` 대상이 설치된 후 실행됩니다. `pnpm install` 고정된 것을 복원하려면 `wasm-pack` npm 의존.
그만큼
`@mission-platform/hunspell` Emscripten 빌드에는 추가로 Docker가 실행되어야 합니다. 다른 Rust 상자 빌드
로컬 Rust 툴체인을 사용합니다.
