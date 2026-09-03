# Forge SPA 작업자 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/edge/workers/forge-spa/docs/guides/development.md: [packages/edge/workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

저장소 루트에서 패키지 검사를 실행합니다.

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

빌드는 `dist/index.js` 및 선언을 내보냅니다. 핸들러를 다음으로 제한하십시오.
입력된 `ASSETS.fetch(request)` 위임 및 테스트 요청 전달. 테스트
소비 앱에서 애플리케이션 경로를 배포합니다. 응용 프로그램을 추가하지 마십시오
이 공유 작업자에 대한 구성 또는 자산입니다.
