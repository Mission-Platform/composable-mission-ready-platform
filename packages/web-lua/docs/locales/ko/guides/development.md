# WebLua 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

## 설치 및 확인

저장소 루트에서 집중 검사를 실행합니다.

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

`pnpm --filter @mission-platform/web-lua build`으로 빌드하세요. 브라우저 출력,
Node 출력 및 선언이 `dist/` 및 `dist-node/`로 내보내집니다.

## 호환성 변경

호환성 행을 변경하기 전에 결정론적 게스트 수준 증거를 추가하세요.
`src/compatibility.ts`, 해당 테스트 및 참조 테이블을 함께 업데이트합니다.
결정적 고정 장치에서 다루는 동작에만 `matched`을 사용하세요.
명시적인 호스트 정책 요구 사항에 대한 `capability-gated`; 및 `unresolved`
합격으로 간주되어서는 안 되는 행동.

런타임 게스트 소유 및 기본적으로 기능 거부를 유지합니다. Node 전용 어댑터
`./node` 내보내기 뒤에 속하며 브라우저 항목으로 누출되어서는 안 됩니다.
