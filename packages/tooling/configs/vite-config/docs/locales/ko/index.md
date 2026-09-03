# @mission-platform/vite-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

공유됨 Vite 그리고 Vitest Mission Platform 패키지를 위한 구성 도우미 및
응용 프로그램.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/vite-config
```

사용 `defineLibraryConfig` 패키지의 경우, `defineAppConfig` 응용 프로그램에 대한
`defineVitestConfig` 에서 `/vitest` 하위 경로. 프레임워크 애플리케이션은 다음과 같아야 합니다.
하나를 선택하세요 `defineFrameworkAppConfig` 조건을 지정한 다음 공유 패키지를 가져옵니다.
베어 패키지 지정자를 통해.

## 기여하다

달리다 `pnpm --filter @mission-platform/vite-config lint` 및 형식 확인. 유지하다
도우미의 기본값은 재사용 가능하고 공유된 내용은 유지됩니다. Vite, PostCSS 및
README 패키지에 설명된 외부화 동작입니다.
