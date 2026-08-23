# @mission-platform/tsdown-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> configs/tsdown-config/docs/index.md: [configs/tsdown-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

게시 가능한 작업 공간을 위한 공유 tsdown 라이브러리 빌드 도우미입니다.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

작업 영역에서 패키지 사용 `tsdown.config.ts` 진입점을 유지하고
외부 종속성 및 빌드 중인 패키지에 대한 로컬 출력 제약 조건입니다.
생성된 선언과 번들은 해당 패키지의 `dist/` 예배 규칙서.

## 기여하다

달리다 `pnpm --filter @mission-platform/tsdown-config lint` 그리고 그 형식을 확인합니다.
결정적 출력을 유지하고 프레임워크별 대상 분기를 추가하지 않습니다.
중립 빌드 도우미에게.
