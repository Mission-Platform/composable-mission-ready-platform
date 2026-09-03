# @mission-platform/stylelint-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

공유됨 Stylelint Mission Platform의 CSS 및 SCSS 규칙.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

스타일이 있는 작업 공간은 ESM 형식의 로컬 `stylelint.config.mjs` 파일을 사용합니다. `extends` 항목을 복제하지 말고 공유 구성을 가져와 spread합니다.

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

공유 구성은 `stylelint-config-standard-scss`와 `stylelint-config-recommended-vue`를 확장합니다. 기본적으로 `postcss-html`, `**/*.scss`에는 `postcss-scss`, Vue 스타일 블록에는 `postcss-html`을 사용합니다. `catalog:stylelint` 버전의 직접 지원 종속성과 `workspace:*` 공유 구성 패키지를 `devDependencies`에 추가합니다.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

작업공간에서 패키지 확장 `stylelint.config.mjs`. 구성요소 유지
해당 구성 요소에 가까운 스타일을 사용하고 문서화된 경우에만 로컬 재정의를 사용합니다.
작업 공간 제약.

## 기여하다

달리다 `pnpm --filter @mission-platform/stylelint-config lint` 그리고
`pnpm --filter @mission-platform/stylelint-config format`. 테스트 규칙 변경
패키지 SCSS와 애플리케이션 스타일 모두에 대해.
