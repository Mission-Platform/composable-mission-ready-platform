# 토큰 패키지 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

## 설치 및 확인

저장소 루트에서 패키지 검사를 실행합니다.

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

빌드는 `dist/`에 JavaScript 및 선언 출력을 생성합니다. 생성됨
`src/generated/` 아래의 SCSS 및 TypeScript 소스는 파생된 아티팩트이며
결정론적으로 남아 있어야 합니다.

## 토큰 변경

`tokens/`에서 소스 JSON을 편집하고 DTCG 경로를 안정적으로 유지합니다.
변경은 의도적이며 문서화되어 있습니다. 구성 요소 계약은 다음과 같습니다.
`tokens/component/<atomic-level>/`; 구성요소 소스는 중복되어서는 안 됩니다.
공유 토큰 경로. 기존 토큰 생성 스크립트를 사용하고 두 가지 모두 검토
게시하기 전 SCSS 및 TypeScript 출력입니다.

패키지는 프레임워크 중립적입니다. 테마 동작은 소비에 의해 선택됩니다.
내보낸 SCSS 진입점을 통한 스타일시트 이 패키지는 소유하지 않습니다
애플리케이션 테마 상태 또는 구성요소 마크업.
