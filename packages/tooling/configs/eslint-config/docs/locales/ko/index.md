# @mission-platform/eslint-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

공유아파트 ESLint Mission Platform 작업 공간에 대한 구성입니다.

## 설치 및 사용

작업공간의 개발 종속성에 패키지를 추가하고 플랫을 확장합니다.
구성 `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

패키지에는 다음이 포함됩니다. TypeScript, Vue 3, 접근성, 가져오기, Turbo, 그리고
형식화 통합. 다음과 같은 동작에 대해서만 작업공간별 규칙을 추가하세요.
공유할 수 없습니다. 참조 [ ESLint 참조](reference/eslint.md) 에 대한
플러그인과 명령이 포함되어 있습니다.

## 기여하다

달리다 `pnpm --filter @mission-platform/eslint-config lint` 그리고
`pnpm --filter @mission-platform/eslint-config format` 규칙을 바꾼 후.
패키지 프레임워크를 인식하되 작업 공간에 구애받지 않도록 유지하세요. 애플리케이션은
다른 작업공간에서 규칙을 가져오지 마세요.
