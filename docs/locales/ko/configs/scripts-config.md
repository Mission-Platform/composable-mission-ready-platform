# 공유 유틸리티 스크립트

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> 언어: 한국어 (ko)

이 가이드는 의도적으로 프로젝트 문서 계층에 남아 있습니다. `scripts/`
게시 가능한 작업공간 패키지가 아닌 저장소 오케스트레이션을 포함합니다.
패키지 및 애플리케이션별 명령은 해당 명령 옆에 문서화되어 있습니다.
작업 공간을 소유하고 있습니다.

Mission Platform은 루트에 공유 유틸리티 스크립트 세트를 유지합니다.
`scripts/` 루트 작업공간 도구로 관리되는 디렉토리입니다.

## 개요

이러한 스크립트는 로컬 개발 설정 및 빌드 확인과 같은 일반적인 단일 저장소 작업을 자동화합니다. 번역
추출은 각 앱 또는 패키지에 의해 정의되고 Turborepo를 사용하여 저장소 루트에서 조정됩니다.

## 사용 가능한 스크립트

### i18n 추출(`i18n:extract`)

번역을 소유한 각 앱이나 패키지는 다음을 제공합니다. `i18n:extract` 스크립트와 `i18next.config.ts`. 명령은 다음과 같습니다
각 작업공간 아래의 네임스페이스 번들 `locales/<locale>/` 예배 규칙서. 다음에서 구성된 모든 작업 영역에 대해 추출을 실행합니다.
저장소 루트:

```bash
pnpm i18n:extract
```

### 개발 인증서 생성(`generate-dev-cert.ts`)

HTTPS 개발을 위한 로컬 SSL/TLS 인증서를 생성합니다. 이는 보안이 필요한 기능을 테스트하는 데 유용합니다.
컨텍스트(예: 다음을 통한 카메라 액세스 `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### 프레임워크 해상도 확인(`verify-framework-resolution.mjs`)

이를 확인합니다 `@mission-platform/*` 패키지 내보내기는 의도한 프레임워크 빌드로 올바르게 해석됩니다(Vue, React등)
환경의 수출 조건에 따라.

```bash
node scripts/verify-framework-resolution.mjs
```

## 실행 방법

### 패키지 관리자를 통해

대부분의 스크립트는 다음과 같이 사용할 수 있습니다. `pnpm` 루트의 스크립트 `package.json`:

```bash
pnpm run <script-name>
```

### 직접 실행

개인 TypeScript 스크립트는 다음을 사용하여 실행할 수 있습니다. `tsx` 또는 `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## 기여 지침

새 공유 스크립트를 추가하는 경우:

- 안에 넣으세요. `scripts/` 예배 규칙서.
- 사용 TypeScript 가능한 경우.
- 스크립트가 외부 패키지에 의존하는 경우 해당 패키지를 소유 작업 공간에 추가하세요. `package.json`.
- 이 파일에 스크립트의 목적과 사용법을 문서화하십시오.
- 루트에 해당 항목을 추가합니다. `package.json` 자주 사용되는 유틸리티라면.
