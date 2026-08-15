# 미션 플랫폼에서 테스트

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/testing.md](../../testing.md)
> 언어: 한국어 (ko)

이 문서에서는 Mission Platform 모노레포에 대한 테스트 전략과 도구에 대해 설명합니다. **How-to 역할을 합니다.
일반적인 테스트 작업에 대한 가이드** 및 기본 구성에 대한 **기술 참조**입니다.

## 테스트 스택

Mission Platform은 다음을 기반으로 하는 현대적인 통합 테스트 스택을 사용합니다. Vitest:

- **Vitest**: 단위, 구성 요소 및 브라우저 기반 테스트를 위한 기본 테스트 실행기입니다.
- **@vue/test-utils**: 테스트용 표준 라이브러리 Vue 구성 요소.
- **Vitest 브라우저 모드(극작가)**: 구성된 경우 상호 작용 및 시각적 테스트를 위한 실제 브라우저 실행입니다.
- **Storybook Test Runner**: 스토리북 스토리와 Vitest 자동화된 상호작용 테스트를 위해.

## 방법: 테스트 실행

캐싱 및 작업 공간 인식 실행을 활용하기 위해 Turborepo를 통해 테스트가 실행됩니다.

### 모든 테스트 실행

전체 모노 저장소에서 모든 단위 및 구성 요소 테스트를 실행하려면 다음 안내를 따르세요.

```bash
pnpm test
```

### 특정 작업공간에 대한 테스트 실행

단일 패키지 또는 애플리케이션에 대한 테스트를 실행하려면 다음 안내를 따르세요.

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### 영향을 받는 테스트 실행(CI 스타일)
CI와 일치하는 더 빠른 로컬 피드백을 위해 `--affected` 행동:

```bash
pnpm exec turbo run test --affected
```

`--affected` 저장소의 기본 개정과 관련하여 변경된 작업공간에 대한 테스트 작업을 선택합니다. 매일 실행하려면 생략하세요.
작업 공간 테스트 작업. 적용 범위는 패키지마다 다릅니다. 예를 들어 구성 요소 패키지는 다음을 제공합니다.

```bash
pnpm --filter @mission-platform/components test:coverage
```

### 시계 모드
개발의 경우 감시 모드를 사용하여 파일 변경 사항에 대한 테스트를 다시 실행하세요.

```bash
pnpm --filter @mission-platform/components test:watch
```

### 적용 범위 보고서

다음을 사용하여 적용 범위 보고서를 생성하려면 `v8` 공급자:

```bash
pnpm --filter @mission-platform/components test:coverage
```

보고서는 다음으로 출력됩니다. `coverage/` 각 작업 공간 내의 디렉터리입니다.

## 방법: 테스트 작성

### 단위 및 구성 요소 테스트

테스트는 소스 코드와 함께 배치되며 `.spec.ts` (또는 `.spec.tsx`) 확대.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### 브라우저 테스트

미션 플랫폼을 활용한 Vitest실제 DOM 환경이나 크로스 브라우저가 필요한 테스트를 위한 브라우저 모드
확인.

1. 평소대로 테스트 파일을 작성합니다.
2. 패키지를 확인하세요 `vitest.config.ts` 브라우저 모드를 활성화합니다(아래 참조 참조).
3. 다음으로 실행 `pnpm test`.

## 기술 참조

### 공유 구성

대부분의 작업 공간에서는 다음을 사용합니다. `defineVitestConfig` 유틸리티 `@mission-platform/vite-config`. 이는 표준화된
환경:

- **환경**: `jsdom` 기본적으로.
- **전역**: 활성화됨(가져올 필요 없음) `describe`, `it`, `expect` 원하지 않는 한).
- **플러그인**: 포함 `@vitejs/plugin-vue` i18n 블록은 무시됩니다.
- **범위**: 사전 구성됨 `v8` 공급자.

**예 `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### 디렉토리 구조

- `src/**/*.spec.ts`: 단위 테스트 및 구성 요소 테스트.
- `src/**/*.stories.tsx`: 스토리북 스토리(상호작용 테스트 정의로도 사용됨)
- `apps/storybook/vitest.config.ts`: 브라우저 기반 상호작용 테스트를 위한 기본 구성입니다.

### 스크립트 요약

| 스크립트 | 명령 | 목적 |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | 모든 작업 영역 테스트 작업을 실행합니다.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | 감시 모드에서 구성 요소 테스트를 실행합니다.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | 구성 요소 적용 범위 보고서를 생성합니다. |
| 러스트/WASM | `cargo test --workspace` | 기본 Rust 상자 테스트를 실행하세요. |

Wasm 래퍼 패키지는 자체 패키지 작업을 통해 테스트됩니다. 예를 들어, scanner 패키지와 해당 패키지를 실행합니다.
스캐너 동작을 변경할 때 함께 래퍼:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## 관련 문서

- [개발 설정](development-setup.md)
- [모범 사례](best-practices.md)
- [패키지 개발](package-development.md)
