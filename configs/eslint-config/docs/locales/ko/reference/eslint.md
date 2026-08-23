# ESLint 구성

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> configs/eslint-config/docs/reference/eslint.md: [configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> 언어: 한국어 (ko)

그만큼 `@mission-platform/eslint-config` 패키지는 중앙 집중식 플랫을 제공합니다. ESLint 전체 모노레포에 대한 구성입니다.

## 개요

미션 플랫폼은 ESLint 플랫 구성 형식(`eslint.config.js`). 공유 구성은 일관성을 적용합니다.
모든 패키지, 애플리케이션 및 작업자 전반에 걸친 코드 품질, 접근성 및 아키텍처 규칙.

## 주요 특징

- **TypeScript 지원**: 유형 인식 Linting 제공 `typescript-eslint`.
- **Vue 3 SFC**: 시행 `<script setup>` 모범 사례를 통해 `eslint-plugin-vue`.
- **접근성**: 내장된 접근성 검사 Vue 템플릿 `eslint-plugin-vuejs-accessibility`.
- **수입 조직**: 다음을 통한 수입품 자동 분류 및 검증 `eslint-plugin-import-x`.
- **모노레포 인식**: `eslint-config-turbo` 환경 변수가 올바르게 선언되었는지 확인합니다.

## 내장 플러그인

구성에는 다음 플러그인과 규칙 세트가 포함됩니다.

| 플러그인 | 목적 |
|:-------------------------|:-------------------------------------------------------|
| `typescript-eslint`      | 기준 TypeScript 규칙 및 유형 인식 린팅.      |
| `eslint-plugin-vue`      | Vue 3 SFC 린팅 및 템플릿 검증.             |
| `eslint-plugin-sonarjs`  | 코드 냄새 및 버그 위험을 감지합니다.                |
| `eslint-plugin-unicorn`  | 수십 개의 작고 유용한 커뮤니티 규칙.               |
| `eslint-plugin-i18next`  | 번역 키가 올바르게 사용되는지 확인합니다.           |
| `eslint-config-prettier` | 다음과 충돌하는 규칙을 비활성화합니다. Prettier 서식 지정. |

## 용법

작업공간에 공유 구성을 적용하려면 `eslint.config.js` 작업공간 루트에 있는 파일:

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
