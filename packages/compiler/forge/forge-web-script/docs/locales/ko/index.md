# @mission-platform/forge-web-script

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/compiler/forge/forge-web-script/docs/index.md: [packages/compiler/forge/forge-web-script/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Forge Web Script v1 언어 계약, 부트스트랩 파서 및 적합성 고정 장치.
이 패키지는 소비자와 사용자를 위한 언어 계약과 문서를 소유합니다.
기여자.

## 여기서 시작하세요

- [언어 및 ABI 참조](reference/language.md) — 문법, 유형, 기능,
  진단, 매니페스트 및 컴파일러 동작.
- [빌드 및 테스트 가이드](guides/development.md) — 로컬 검사, 고정 장치 및 생성됨
  유물.
- [`llms.txt`](../../../llms.txt) — 도구 및 보조자를 위한 간결한 API 및 사용 참고 사항입니다.

패키지는 예외 없는 `Option`/`Result` 일치, `iter fn` 내보내기,
명시적인 대상 기능 프로필 및 결정론적 최적화/최적화되지 않은 디버그
유물. 언어 버전은 `1.0`이고 논리 ABI 버전은 `1.2`입니다.
