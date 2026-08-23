# API 프록시 작업자 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

저장소 루트에서 집중 검사를 실행합니다.

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

빌드는 `dist/index.js` 및 선언을 내보냅니다. 핸들러 호환성 유지
Cloudflare Workers 런타임 사용: 바인딩에 형식화된 `env` 개체를 사용합니다.
Node.js 내장 기능을 추가하지 마세요. 경로 허용 목록에 대한 테스트를 추가하고 정리했습니다.
핸들러 변경 시 헤더, 쿼리 전달 및 업스트림 오류가 발생합니다.
