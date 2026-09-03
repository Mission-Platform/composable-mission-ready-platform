# Forge Vite 플러그인 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/vite/forge/docs/guides/development.md: [packages/tooling/vite/forge/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

## 설치 및 확인

저장소 루트에서 집중 검사를 실행합니다.

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

`pnpm --filter @mission-platform/vite-plugin-forge build`으로 빌드하세요. 번들
and declarations are emitted to `dist/`; do not commit local build output.

## 컴파일러 변경

구문 분석, 정규화, 의미 체계 IR, 캐싱 및 진단을 중립으로 유지하세요.
타겟 하강 및 소스 생성은 선택된 항목에 속합니다.
`@mission-platform/forge-plugin-*` 패키지. 캐시에 대한 회귀 적용 범위 추가
신원, 무효화, 진단, 생성된 아티팩트 및 호출자 플러그인
드라이버 변경시 보존.

패키지는 Vite 및 tsdown 모두에서 계속 사용할 수 있어야 합니다. 대상을 추가하지 마세요.
테이블 또는 프레임워크 런타임 종속성을 중립 드라이버로 전환합니다. 업데이트
[컴파일러 파이프라인 참조](../reference/compiler.md) 공개 무대 또는
아티팩트 계약이 변경됩니다.
