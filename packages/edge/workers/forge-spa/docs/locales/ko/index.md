# @mission-platform/forge-spa

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Mission Platform SPA 및 SSG를 위한 공유 Cloudflare Worker 진입점
배포. 요청을 `ASSETS` 바인딩에 위임하고 다음에 의해 사용됩니다.
독립적으로 배포되는 것이 아닌 애플리케이션.

## 작업자 통합

패키지를 빌드한 다음 소비하는 앱의 컴파일된 핸들러를 참조합니다.
Wrangler 구성:

```bash
pnpm --filter @mission-platform/forge-spa build
```

소비자 구성은 `main`을 다음으로 설정해야 합니다.
`packages/edge/workers/forge-spa/dist/index.js` 및 해당 응용 프로그램 `dist/` 디렉터리를 다음과 같이 바인딩합니다.
SPA 대체 처리 기능이 있는 `ASSETS`입니다. 웹사이트와 My Care Notes가 최신 상태입니다.
소비자.

작업자는 애플리케이션 경로, 자산, 도메인 또는 환경을 소유하지 않습니다.
비밀. 이는 소비 애플리케이션 패키지에 남아 있습니다.

- [개발 가이드](guides/development.md)
- [`README.md`](../../../README.md)
