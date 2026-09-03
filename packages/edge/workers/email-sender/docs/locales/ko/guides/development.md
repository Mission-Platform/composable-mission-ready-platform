# 이메일 발신자 작업자 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/edge/workers/email-sender/docs/guides/development.md: [packages/edge/workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

저장소 루트에서 패키지 검사를 실행합니다.

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

변경 후 `pnpm --filter @mission-platform/email-sender types` 실행
바인딩. 엔드포인트 검증, SMTP 실패 및 안정적인 응답 테스트를 추가합니다.
계약 변경. 작업자 핸들러를 Cloudflare와 호환되게 유지하고 유지하세요.
로컬 개발 구성 뒤에 있는 MailPit 전용 동작입니다.
