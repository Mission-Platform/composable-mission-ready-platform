# @mission-platform/stylelint-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Mission Platform의 CSS 및 SCSS에 대한 Stylelint 규칙을 공유했습니다.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

스타일 보유 작업공간은 ESM에서 작업공간-로컬 `stylelint.config.mjs`을 사용합니다.
형식. 공유 구성을 복제하는 대신 가져오고 확산시키세요.
`extends` 항목:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

공유 구성은 `stylelint-config-standard-scss`을 확장하고
`stylelint-config-recommended-vue`. 기본적으로 `postcss-html`를 사용합니다.
`**/*.scss`에는 `postcss-scss`, Vue SFC 스타일에는 `postcss-html`를 사용합니다.
블록. 이는 특정 작업공간 없이 CSS, SCSS 및 Vue 스타일을 지원합니다.
구문 구성.

위의 직접 지원 종속성을 작업공간에 추가하세요.
`catalog:stylelint` 버전을 사용하는 `devDependencies` 및
`workspace:*`을 사용하는 공유 구성 패키지. 다음을 다루는 스크립트를 추가하세요.
작업공간의 스타일 소스. 예:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

구성 요소 스타일을 해당 구성 요소와 가깝게 유지하고 로컬 재정의를 해당 구성 요소에만 사용하십시오.
문서화된 작업 공간 제약.

## 기여하다

`pnpm --filter @mission-platform/stylelint-config lint`을 실행하고
`pnpm --filter @mission-platform/stylelint-config format`. 테스트 규칙 변경
패키지 SCSS와 애플리케이션 스타일 모두에 대해.
