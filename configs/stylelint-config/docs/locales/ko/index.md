# @mission-platform/stylelint-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

공유됨 Stylelint Mission Platform의 CSS 및 SCSS 규칙.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

작업공간에서 패키지 확장 `stylelint.config.mjs`. 구성요소 유지
해당 구성 요소에 가까운 스타일을 사용하고 문서화된 경우에만 로컬 재정의를 사용합니다.
작업 공간 제약.

## 기여하다

달리다 `pnpm --filter @mission-platform/stylelint-config lint` 그리고
`pnpm --filter @mission-platform/stylelint-config format`. 테스트 규칙 변경
패키지 SCSS와 애플리케이션 스타일 모두에 대해.
