# ESLint 구성

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> 언어: 한국어 (ko)

`@mission-platform/eslint-config` 패키지는 전체 모노레포에 대해 중앙 집중식 플랫 ESLint 구성을 제공합니다.

## 개요

Mission Platform은 ESLint Flat Config 형식(`eslint.config.js`)을 사용합니다. 공유 구성은 일관성을 적용합니다.
모든 패키지, 애플리케이션 및 작업자 전반에 걸친 코드 품질, 접근성 및 아키텍처 규칙.

## 주요 특징

- **TypeScript 지원**: `typescript-eslint`으로 구동되는 유형 인식 린팅입니다.
- **Vue 3 SFC**: `<script setup>` 및 `eslint-plugin-vue`를 통해 모범 사례를 적용합니다.
- **접근성**: `eslint-plugin-vuejs-accessibility`이 포함된 Vue 템플릿에 대한 접근성 검사가 내장되어 있습니다.
- **수입 조직**: `eslint-plugin-import-x`를 통해 수입품의 자동 정렬 및 검증.
- **Monorepo Awareness**: `eslint-config-turbo`와 통합되어 환경 변수가 올바르게 선언되었는지 확인합니다.

## 내장 플러그인

구성에는 다음 플러그인과 규칙 세트가 포함됩니다.

| 플러그인 | 목적 |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | 표준 TypeScript 규칙 및 유형 인식 린팅.      |
| `eslint-plugin-vue` | Vue 3 SFC 린팅 및 템플릿 유효성 검사.             |
| `eslint-plugin-sonarjs` | 코드 냄새 및 버그 위험을 감지합니다.                |
| `eslint-plugin-unicorn` | 수십 개의 작고 유용한 커뮤니티 규칙.               |
| `eslint-plugin-i18next` | 번역 키가 올바르게 사용되는지 확인합니다.           |
| `eslint-config-prettier` | Prettier 형식과 충돌하는 규칙을 비활성화합니다. |

## 엄격한 타이핑 및 규칙 충족

맞춤형 `missionTypeScriptPlugin`은 Mission Platform의 엄격한 입력 표준을 시행하는 빠른 AST 구문 검사를 제공합니다.

| 규칙 | 심각도 | 목적 |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error`(`**/*.vue`의 경우 `warn`) | Vue SFC 템플릿에 `warn`이 적용된 TypeScript 코드(`error`)에서 `any` 키워드를 금지합니다. |
| `@typescript-eslint/prefer-satisfies` | `warn` | 좁은 리터럴을 보존하기 위해 `as` 어설션보다 `satisfies`를 권장하고 `as any`을 엄격히 금지합니다.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | `extends` 제약 조건을 선언하려면 모든 일반 유형 매개 변수가 필요합니다.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | 내보낸 API 경계에서 검증되지 않은 `unknown`의 유출을 허용하지 않습니다.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | 유형 전용 가져오기에 대해 최상위 `import type` 선언을 요구합니다.                                     |

## 용법

공유 구성을 작업공간에 적용하려면 작업공간 루트에 `eslint.config.js` 파일을 생성합니다.

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## 린터 실행

Turborepo를 사용하여 하나 이상의 작업공간에서 Linting을 실행합니다.

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
