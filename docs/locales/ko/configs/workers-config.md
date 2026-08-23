# 작업자 배포 디렉터리

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> 언어: 한국어 (ko)

작업자 구현 문서는 게시 가능한 각 작업자 옆에 속합니다.

- [`@mission-platform/api-proxy`](../../../../workers/api-proxy/docs/locales/ko/index.md) — 제한된 읽기 전용 API 프록시.
- [`@mission-platform/email-sender`](../../../../workers/email-sender/docs/locales/ko/index.md) — 로컬 MailPit 지원 발신자.
- [`@mission-platform/forge-spa`](../../../../workers/forge-spa/docs/locales/ko/index.md) — 공유 `ASSETS` SPA 대체 처리기.

이 프로젝트 페이지는 교차 작업공간 배포 맵만 유지합니다. 노동자
패키지는 핸들러 계약, 예제, 테스트 및 빌드 지침을 소유합니다.
애플리케이션 패키지는 경로, 도메인, 바인딩 및 배포를 소유합니다.
환경.

## 애플리케이션 배포 맵

| 신청 | 핸들러 | 구성 | 자산 |
| :---------- | :------ | :------------ | :----- |
| 웹사이트 | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, 다음과 같이 바인딩됨 `ASSETS` |
| 나의 케어 노트 | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, 다음과 같이 바인딩됨 `ASSETS` |
| 서비스 모니터 | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, 다음과 같이 바인딩됨 `ASSETS` |
| 문서 | 정적 자산 | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

웹사이트와 My Care Notes는 공유 Forge SPA 작업자를 사용합니다. 서비스 모니터
Worker 진입점과 지속성 개체 바인딩을 소유합니다. 문서 사이트는
정적 Vite 배포되었으며 작업자 진입점이 없습니다. 스토리북은 아니다
배포 대상.

다음이 포함된 애플리케이션 패키지에서 배포 Wrangler 구성은
경로와 환경. 추적되는 구성 및 사용에서 비밀을 유지하세요.
민감한 값을 위한 Cloudflare 비밀 저장소입니다. 애플리케이션별 참조
구현을 위한 배포 스크립트 및 패키지 로컬 작업자 가이드
세부 사항.
