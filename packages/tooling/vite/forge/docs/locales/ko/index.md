# @mission-platform/vite-plugin-forge

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/vite/forge/docs/index.md: [packages/tooling/vite/forge/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Vite 및 tsdown용 프레임워크 중립적 Forge 컴파일러 드라이버입니다. 이 패키지
구문 분석, 정규화, 의미 분석, 중립 최적화, 캐싱,
타겟 디스패치 및 일반 빌드 오케스트레이션; 프레임워크 및 CMS 출력
패키지는 대상별 하향 및 생성을 소유합니다.

## 여기서 시작하세요

- [컴파일러 파이프라인 참조](reference/compiler.md) — 단계 계약,
  대상 소유권, 캐싱, 진단 및 생성된 아티팩트.
- [빌드 및 테스트 가이드](guides/development.md) — 로컬 개발 및
  통합 확인.
- [`README.md`](../../../README.md) — 소비자 구성 및 대표
  Vite/tsdown 예시.
- [`llms.txt`](../../../llms.txt) — 간결한 패키지 API 및 파이프라인 참고 사항.

드라이버에는 명시적인 `FrameworkOutputPlugin`이 필요합니다. 결코 선택하지 않습니다
문자열에서 프레임워크를 가져오거나 모든 대상 패키지를 가져옵니다. 생성된 모듈은
중간 아티팩트이며 선택한 대상의 네이티브로 컴파일되어야 합니다.
어댑터.
