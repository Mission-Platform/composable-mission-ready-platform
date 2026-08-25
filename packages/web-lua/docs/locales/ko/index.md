# @mission-platform/web-lua

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/web-lua/docs/index.md: [packages/web-lua/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Forge 웹 스크립트에서 컴파일된 게스트 소유 Lua 런타임 기반입니다. 이 패키지
런타임 호환성 계약과 해당 호스트 기능 경계를 소유합니다.

## 여기서 시작하세요

- [Lua 5.5.1 호환성 참조](reference/compatibility.md) — 테스트됨,
  능력에 따라 결정되고 해결되지 않은 행동.
- [빌드 및 테스트 가이드](guides/development.md) — 런타임 픽스처 및 출력
  제약.
- 패키지 README 및 생성된 참조는 간결한 패키지 API 노트를 제공합니다.

브라우저 항목은 `@mission-platform/web-lua`입니다. Node 소비자는
명시적인 `@mission-platform/web-lua/node` 내보내기. 숙주 효과는 다음에 의해 거부됩니다.
기본값이며 명시적인 기능 정책이 필요합니다.
