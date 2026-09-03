# 구성 패키지

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/packages/tooling/configs/index.md: [docs/packages/tooling/configs/index.md](../../../packages/tooling/configs/index.md)
> 언어: 한국어 (ko)

Mission Platform은 중앙 집중식 구성 패키지를 사용합니다. `packages/tooling/configs/` 일관성을 보장하기 위한 디렉토리
모노레포.

## 개요

구성을 중앙 집중화하면 도구 규칙, 빌드 프로세스 및 코드 스타일에 대한 단일 정보 소스가 가능합니다.
패키지와 애플리케이션은 로컬 구성 파일에서 이러한 구성을 확장하여 사용합니다.

## 패키지 요약

구성 패키지 문서는 각 패키지의 소유입니다. 아래 링크
현재 저장소 파일 링크이며 다음에서 패키지 네임스페이스 경로가 됩니다.
문서 사이트:

| 패키지 | 목적 | 기본 구성 표면 |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/ko/index.md) | 평평한 ESLint JS/TS 규칙 및 Vue. | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/ko/index.md) | 저장소 형식 기본값. | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/ko/index.md) | TypeScript 컴파일러 사전 설정. | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/ko/index.md) | CSS 및 SCSS 린트. | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/ko/index.md) | Vite 그리고 Vitest 구성 도우미. | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/ko/index.md) | 라이브러리 번들링 도우미. | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/ko/index.md) | 공유 PostCSS 파이프라인. | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/ko/index.md) | 공유 로케일 및 추출 설정. | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/ko/index.md) | 환경이 선택한 Storybook 프레임워크 사전 설정. | `.storybook/main.ts` |
| [작업자 구성](workers-config.md) | 작업 공간 간 Cloudflare Worker 규칙. | `wrangler.jsonc` |

## 핵심 툴링

### ESLint (`@mission-platform/eslint-config`)

모든 작업 공간에서 코드 품질 규칙을 표준화합니다. Flat Config 형식을 사용하며 다음을 지원합니다.
TypeScript, Vue 3, 접근성.

### Prettier (`@mission-platform/prettier-config`)

전체 모노레포에서 일관된 코드 스타일(탭, 따옴표, 세미콜론)을 적용합니다.

### TypeScript (`@mission-platform/typescript-config`)

기반 제공 `tsconfig` 다양한 대상에 대한 사전 설정:

- `base`: 일반 기본값입니다.
- `vue`: 최적화됨 Vue SFC 3개.
- `node`: 최적화됨 Node.js 환경.
- `framework-<name>`: 매칭을 추가합니다 `mp:<framework>` 외부 소비자를 위한 수출 조건.

## 시스템 구축

### Vite (`@mission-platform/vite-config`)

생성할 수 있는 팩토리 기능을 제공합니다. Vite 애플리케이션과 라이브러리 모두에 대한 구성.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: 최상위 애플리케이션(SPA, 작업자)용입니다.
- `defineLibraryConfig`: 최적의 번들링 및 트리 쉐이킹을 갖춘 공유 패키지용입니다.

### 포스트CSS(`@mission-platform/postcss-config`)

PostCSS 플러그인 파이프라인(Autoprefixer 포함)을 공유하여 CSS가 위치에 관계없이 일관되게 처리되도록 합니다.
그것은 저작되었습니다.

## 사용 패턴

작업공간에서 구성을 사용하려면 다음 안내를 따르세요.

1. 구성 패키지를 다음과 같이 추가합니다. `devDependency` ~에 `package.json`.
2. 로컬 구성 파일(예: `eslint.config.js`).
3. 기본 구성을 가져오고 내보내고 확장합니다.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

Stylelint의 경우 `stylelint.config.mjs`에서 동일한 ESM 가져오기/spread 패턴을 사용합니다.

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

## 구성 선택

규칙을 작업 공간에 복사하는 대신 문제를 소유한 패키지를 사용하십시오. 애플리케이션 및 라이브러리 빌드 파일
로컬 재정의를 추가할 수 있지만 공유 기본값은 그대로 유지되어야 합니다. `packages/tooling/configs/`. 새 패키지의 경우 해당 패키지부터 시작하세요.
스캐폴드를 실행한 다음 작업 공간 검사를 실행합니다.

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
