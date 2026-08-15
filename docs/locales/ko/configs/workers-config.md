# 작업자 구성 및 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> 언어: 한국어 (ko)

이 문서에서는 Mission Platform 모노레포의 Cloudflare Worker에 대해 설명합니다. TypeScript 진입점 및
실행하거나 배포하는 데 사용되는 구성 파일입니다.

## 작업자 재고

독립형 작업자 패키지는 `workers/`:

| 노동자 | 핸들러 | 구성 | 목적 |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | 없음; 번들 패키지로 소비됨 | 제한된 읽기 전용 API 프록시 |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | MailPit 지원 이메일 쇼케이스 작업자 |
| `forge-spa` | `workers/forge-spa/src/index.ts` | 없음; 번들 패키지로 소비됨 | `ASSETS`바인딩 SPA 대체 핸들러 |

배포 가능한 애플리케이션 작업자는 다음과 같습니다.

| 신청 | 핸들러 | 구성 |
| :---------- | :------ | :------------ |
| 웹사이트 | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| 나의 케어 노트 | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| 서비스 모니터 | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` 그리고 `forge-spa` 독립형이 없습니다 Wrangler 구성 파일: 해당 `src/index.ts` 핸들러는
번들로 제공 `tsdown` 그리고 애플리케이션에서 참조됨 Wrangler 구성 또는 소모적인 배포.

## 시스템 구축

작업자 패키지 사용 `tsdown` 묶음용. Turborepo를 통해 패키지 작업을 사용하거나 pnpm 따라서 작업공간 종속성은
일관되게 해결됨:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

작업자 테스트 사용 Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

사용 `@cloudflare/workers-types` 핸들러 및 바인딩 유형의 경우. 이메일 발신자가 생성한 바인딩 선언은 다음과 같습니다.
에 쓴 `workers/email-sender/src/worker-configuration.d.ts` 그것으로 `types` 스크립트.

## 구성 및 로컬 개발

작업자는 다음을 통해 런타임 값을 받습니다. `env` 개체와 Cloudflare 바인딩. 추적에 비밀을 넣지 마세요
`wrangler.jsonc` 파일; 사용 `wrangler secret put` 민감한 값의 경우.

독립형 이메일 발신자의 경우 구성된 실행 Wrangler 작업 공간 패키지의 개발 서버:

```bash
pnpm --filter @mission-platform/email-sender dev
```

배포 가능한 애플리케이션의 경우 각 앱 패키지의 스크립트를 사용하세요. 예를 들어, 웹사이트 및 My Care Notes Wrangler
파일 제공 `staging` 그리고 `production` Service Monitor는 다음을 제공합니다. `staging` 환경:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## 전개

다음이 포함된 애플리케이션 패키지에서 배포 `wrangler.jsonc` 경로와 환경을 소유합니다.

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

독립 실행형 작업자 패키지는 Wrangler 구성은 직접 배포되지 않습니다. `wrangler deploy`; 빌드
처리기를 사용하고 소비 애플리케이션 구성을 통해 배포합니다.

## 모범 사례

- 예측 가능한 에지 실행을 위해 종속성을 작업자 출력에 묶습니다.
- 사용 `env` 개체가 전달되었습니다. `fetch` 전역 프로세스 변수 대신 처리기.
- 피하다 NodeWorkers 런타임에서 지원되지 않는 .js 내장 기능(예: `fs` 그리고 `child_process`, 작업자 핸들러에서.
- 콜드 스타트를 최소화하고 Cloudflare 리소스 제한 내에서 유지하려면 작업자 번들을 작게 유지하세요.
