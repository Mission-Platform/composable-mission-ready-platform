# @mission-platform/email-sender

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

완성된 HTML을 수락하고 이를 전송하는 로컬 전용 Cloudflare 작업자
SMTP를 통한 MailPit. 이 작업공간은 `/api/email/send` 계약과 해당 계약을 소유합니다.
MailPit 개발 구성.

## 로컬에서 사용

엔드포인트는 `{ to, recipientName, html }`의 유효성을 검사하고 안정적인 JSON을 반환합니다.
배송 후 결과입니다. MailPit을 시작하고 로컬 작업자 바인딩을 생성한 다음 실행합니다.
노동자:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

기본 SMTP 끝점은 `127.0.0.1:1025`이며 MailPit UI는 다음과 같습니다.
`http://localhost:8025`. 다른 변수를 사용할 때 로컬 Wrangler 변수를 재정의합니다.
호스트.

본 작업자는 지역 쇼케이스이며 제작 메일 서비스가 아닙니다. 절대로
추적된 Wrangler 구성에 자격 증명이나 비밀을 입력합니다.

- [개발 가이드](guides/development.md)
- [`README.md`](../../../README.md)
