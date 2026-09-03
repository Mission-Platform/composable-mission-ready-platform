# @mission-platform/forge-web-script-lsp

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Forge Web Script v1용 stdio 언어 서버 프로토콜 서버입니다. 패키지
편집자용 전송 및 작업 공간 동작을 소유합니다. 언어 의미론은 그대로 유지됩니다.
`@mission-platform/forge-web-script` 소유.

## 여기서 시작하세요

- [언어 도구 참조](reference/language-service.md) — 진단,
  완성, 호버, 의미론적 토큰 및 지원되는 경계.
- [빌드 및 테스트 가이드](guides/development.md) — 로컬 서버 확인 및
  프로토콜 설비.
- [언어 패키지의 `llms.txt`](../../../../forge-web-script/llms.txt) — 코어
  언어 API 노트.

서버에는 Node.js `>=24.0.0`이 필요하며 `forge-web-script-lsp`을 노출합니다.
`server` 및 `workspace` 모듈 하위 경로와 함께 바이너리입니다.
