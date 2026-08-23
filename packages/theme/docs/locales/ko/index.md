# @mission-platform/theme

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/theme/docs/index.md: [packages/theme/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/theme`은 `@mission-platform/components`에서 추출한 1회 쓰기 테마 화면을 소유합니다.

## 공개 표면

- `ForgeThemeToggle`은 공유된 밝음, 어두움 및 자동 기본 설정을 순환합니다.
- `ForgeThemeProvider`은 지속성을 구성하고 범위가 지정된 렌더링 소품을 통해 테마 상태를 노출합니다.
- `ForgeThemeComposer`는 범위 또는 전역 `--mp-*` 토큰 재정의를 제어합니다.
- 테마 스토어 계약에는 `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme` 및
  `configureTheme`.
- 작성기 계약에는 구성 병합, 속성/토큰 변형, CSS 변수 변환 및 재설정 도우미가 포함됩니다.

모든 구성 요소와 저장소는 하나의 패키지 로컬 구현을 사용하므로 공급자, 토글 및 작성기 소비자는 이를 관찰합니다.
프레임워크별 Forge 컴파일 이후에도 동일한 런타임이 계약됩니다.
