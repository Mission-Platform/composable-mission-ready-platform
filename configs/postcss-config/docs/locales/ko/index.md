# @mission-platform/postcss-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> configs/postcss-config/docs/index.md: [configs/postcss-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Mission Platform 스타일시트에서 사용되는 공유 PostCSS 파이프라인.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

작업공간에서 패키지를 참조하세요. `postcss.config.mjs` 오히려
공유 플러그인 파이프라인을 복제합니다. 로컬 재정의가 해당 항목에 속합니다.
작업공간 구성.

## 기여하다

달리다 `pnpm --filter @mission-platform/postcss-config lint` 그리고
`pnpm --filter @mission-platform/postcss-config format`. 브라우저 유지
이 패키지의 호환성 동작을 방지하고 애플리케이션별 플러그인을 피하세요.
