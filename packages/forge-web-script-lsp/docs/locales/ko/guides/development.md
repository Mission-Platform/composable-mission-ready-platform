# Forge 웹 스크립트 언어 서버 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

## 설치 및 확인

저장소 루트에서 집중된 패키지 검사를 실행합니다.

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

`pnpm --filter @mission-platform/forge-web-script-lsp build`으로 빌드하세요. 는
결과는 `dist/`로 내보내집니다. 로컬 출력은 소스 아티팩트가 아닙니다.

## 프로토콜 변경

진단, UTF-16 범위, 기호, 완성, 호버 및 의미 토큰 유지
언어 서비스 패키지와 일치하는 동작. 프로토콜 회귀 추가
모든 새로운 요청이나 기능에 대한 고정 장치입니다. LSP는 현재 제공하지 않습니다.
정의로 이동, 참조, 이름 바꾸기, 서식 지정, 코드 작업, 파일 간
언어 가져오기 또는 브라우저 호스팅 전송.

서버는 stdio 기반이며 Node 전용입니다. 브라우저 편집기 통합은 다음에 속합니다.
이 서버가 아닌 언어 서비스 패키지의 로컬 어댑터입니다.
