# 공유 유틸리티 스크립트

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> 언어: 한국어 (ko)

이 가이드는 의도적으로 프로젝트 문서 계층: `scripts/`에 남아 있습니다.
저장소 오케스트레이션을 포함하는 개인 작업 공간 패키지입니다.
출판 가능한 라이브러리.
패키지 및 애플리케이션별 명령은 해당 명령 옆에 문서화되어 있습니다.
작업 공간을 소유하고 있습니다.

Mission Platform은 루트에 공유 유틸리티 스크립트 세트를 유지합니다.
`scripts/` 디렉토리. 해당 패키지 스크립트는 Turbo 작업으로 등록되어 있지만
루트 `package.json`는 Turbo에 위임하는 편의 래퍼를 노출합니다.

## 개요

이러한 스크립트는 로컬 개발 설정 및 빌드 확인과 같은 일반적인 단일 저장소 작업을 자동화합니다. 번역
추출은 각 앱 또는 패키지에 의해 정의되고 Turborepo를 사용하여 저장소 루트에서 조정됩니다.

## 사용 가능한 스크립트

### Turbo 작업 계열

아래 저장소 유틸리티에 대한 루트 래퍼를 사용하십시오. 각 명령은
별도의 작업이므로 Turbo은 독립적으로 해시하고 예약할 수 있습니다.

| 명령 | 목적 | 캐시 정책 |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Turbo를 통해 독립형 구성 요소 속성 정적 검사를 실행합니다. | 작업은 독립적으로 캐시됩니다.                           |
| `pnpm docs:generate` | 패키지 및 확장 참조 문서를 생성합니다.           | 생성된 참조 파일은 캐시됩니다.                       |
| `pnpm validate:exports` | 패키지 내보내기 맵과 빌드된 대상을 확인합니다.                     | 입력이 변경되지 않으면 캐시 가능합니다.                    |
| `pnpm validate:component-properties` | 소스 스타일과 비교하여 구성요소 속성 선언을 확인하세요.      | 캐시 가능하고 출력이 없습니다.                                  |
| `pnpm validate:inventory` | 런타임 검증 인벤토리를 생성합니다.                         | `.artifacts/runtime-validation/` 아래에 캐시 가능한 아티팩트가 있습니다. |
| `pnpm validate:framework` | 프레임워크 런타임 범위를 검증합니다.                              | `.artifacts/runtime-validation/` 아래에 캐시 가능한 아티팩트가 있습니다. |
| `pnpm validate:app` | 애플리케이션 런타임 범위를 검증합니다.                            | `.artifacts/runtime-validation/` 아래에 캐시 가능한 아티팩트가 있습니다. |
| `pnpm validate:target` | 구성된 Storybook 대상을 검증합니다.                            | `.artifacts/runtime-validation/` 아래에 캐시 가능한 아티팩트가 있습니다. |
| `pnpm validate:runtime` | 전체 런타임 유효성 검사 모음을 실행합니다.                            | 외부 런타임 프로세스를 시작하므로 캐시되지 않습니다.    |
| `pnpm visual:parity` | 프레임워크 전반에 걸쳐 렌더링된 Storybook 출력을 비교합니다.              | 개발 서버를 시작하기 때문에 캐시되지 않습니다.           |
| `pnpm test:runtime-validation` | 집중된 런타임 유효성 검사 단위 테스트를 실행합니다.                    | 테스트 작업 입력에 따라 캐시 가능합니다.                |

유틸리티 작업 입력은 `turbo.json`에 선언되어 있습니다. 저장소 전체 입력 사용
`$TURBO_ROOT| `pnpm test:runtime-validation` | 집중된 런타임 유효성 검사 단위 테스트를 실행합니다.                    | 테스트 작업 입력에 따라 캐시 가능합니다.                |

유틸리티 작업 입력은 `turbo.json`에 선언되어 있습니다. 저장소 전체 입력 사용
이므로 `scripts/`에서 작업이 실행될 때 올바른 상태로 유지됩니다.
작업 공간. 생성된 런타임 및 시각적 아티팩트는 아래에 기록됩니다.
`.artifacts/`이며 소스 입력으로 처리되지 않습니다.

`pnpm validate:exports`는 의도적으로 별도의 빌드 후 게이트입니다.
패키지 `dist/` 디렉터리의 파일을 확인합니다. 다음과 같이 `pnpm build` 이후에 실행하십시오.
Chromatic static-gates 작업이 수행됩니다.
 `$TURBO_ROOT$`
### i18n 추출(`i18n:extract`)

번역을 소유한 각 앱 또는 패키지는 `i18n:extract` 스크립트 및 `i18next.config.ts`을 제공합니다. 명령은 다음과 같습니다
각 작업공간의 `locales/<locale>/` 디렉터리 아래에 있는 네임스페이스 번들입니다. 구성된 모든 작업공간에 대해 추출을 실행합니다.
저장소 루트:

```bash
pnpm i18n:extract
```

### 개발 인증서 생성(`generate-dev-cert.ts`)

HTTPS 개발을 위한 로컬 SSL/TLS 인증서를 생성합니다. 이는 보안이 필요한 기능을 테스트하는 데 유용합니다.
컨텍스트(예: `@mission-platform/code-scanner`을 통한 카메라 액세스)

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### 프레임워크 해결 확인(`verify-framework-resolution.mjs`)

`@mission-platform/*` 패키지 내보내기가 의도한 프레임워크 빌드(Vue, React 등)로 올바르게 확인되는지 확인합니다.
환경의 수출 조건에 따라.

```bash
node scripts/verify-framework-resolution.mjs
```

### 문서 생성(`docs:generate`)

문서 생성은 `@mission-platform/scripts`이 소유한 Turbo 작업입니다.
문서 애플리케이션은 해당 작업에 명시적으로 의존하므로 개발 및 빌드
명령은 중첩된 Turbo 빌드를 시작하지 않습니다.

## 실행 방법

### 패키지 관리자를 통해

자주 사용되는 유틸리티는 다음에서 Turbo 지원 `pnpm` 스크립트로 제공됩니다.
루트 `package.json`:

```bash
pnpm run <script-name>
```

패키지 범위 호출의 경우 Turbo을 직접 사용합니다.

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### 직접 실행

개별 TypeScript 스크립트는 `tsx` 또는 `node --experimental-strip-types`을 사용하여 실행할 수 있습니다.

```bash
pnpm exec tsx scripts/<filename>.ts
```

## 기여 지침

새 공유 스크립트를 추가하는 경우:

- `scripts/` 디렉터리에 넣습니다.
- 가능하다면 TypeScript을 사용하세요.
- 스크립트가 외부 패키지에 의존하는 경우 소유 작업 공간의 `package.json`에 추가하세요.
- 이 파일에 스크립트의 목적과 사용법을 문서화하십시오.
- 자주 사용되는 유틸리티인 경우 `package.json` 루트에 해당 항목을 추가합니다.
