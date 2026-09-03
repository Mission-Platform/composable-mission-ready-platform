# @mission-platform/typescript-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

공유됨 TypeScript 모든 Mission Platform 작업 공간에 대한 사전 설정.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

다음에서 일치하는 사전 설정을 확장합니다. `tsconfig.json`: 사용 `app` ~을 위한 Vue 앱,
`react` ~을 위한 React 앱, `library` 패키지 선언의 경우 `node` 툴링을 위해,
그리고 `test` ~을 위한 Vitest 명세서. 프레임워크 소비자도 일치를 사용해야 합니다.
`framework-<name>` 사용자 정의 조건 사전 설정. 자세한 내용은 README 패키지를 참조하세요.
완전한 사전 설정 테이블 및 예제.

## 기여하다

사전 설정에 공유 컴파일러 플래그를 유지합니다. 달리다
`pnpm --filter @mission-platform/typescript-config build:check` 및 형식
변경 후 확인합니다.
