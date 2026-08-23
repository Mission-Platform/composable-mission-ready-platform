# 미션 플랫폼에서 테스트

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/testing.md: [docs/testing.md](../../testing.md)
> 언어: 한국어 (ko)

이 문서에서는 Mission Platform 모노레포에 대한 테스트 전략과 도구에 대해 설명합니다. **How-to 역할을 합니다.
일반적인 테스트 작업에 대한 가이드** 및 기본 구성에 대한 **기술 참조**입니다.

## 테스트 스택

Mission Platform은 Vitest을 기반으로 하는 최신 통합 테스트 스택을 사용합니다.

- **Vitest**: 단위, 구성 요소 및 브라우저 기반 테스트를 위한 기본 테스트 실행기입니다.
- **@vue/test-utils**: Vue 구성 요소를 테스트하기 위한 표준 라이브러리입니다.
- **Vitest 브라우저 모드(극작가)**: 구성된 경우 상호 작용 및 시각적 테스트를 위한 실제 브라우저 실행.
- **Storybook Test Runner**: 자동화된 상호 작용 테스트를 위해 Storybook 스토리와 Vitest를 통합합니다.

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

CI `--affected` 동작과 일치하는 더 빠른 로컬 피드백을 위해:

```bash
pnpm exec turbo run test --affected
```

`--affected`은 저장소의 기본 개정판과 관련하여 변경된 작업공간에 대한 테스트 작업을 선택합니다. 매일 실행하려면 생략하세요.
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

`v8` 공급자를 사용하여 적용 범위 보고서를 생성하려면:

```bash
pnpm --filter @mission-platform/components test:coverage
```

보고서는 각 작업공간 내의 `coverage/` 디렉토리로 출력됩니다.

## 방법: 테스트 작성

### 단위 및 구성 요소 테스트

테스트는 소스 코드와 함께 배치되며 `.spec.ts`(또는 `.spec.tsx`) 확장을 사용합니다.

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### 브라우저 테스트

Mission Platform은 실제 DOM 환경이나 크로스 브라우저가 필요한 테스트를 위해 Vitest의 브라우저 모드를 활용합니다.
확인.

1. 평소대로 테스트 파일을 작성합니다.
2. `vitest.config.ts` 패키지가 브라우저 모드를 활성화하는지 확인합니다(아래 참조 참조).
3. `pnpm test`로 실행합니다.

### Forge 웹 스크립트 테스트

결정론적 컴파일러, 아티팩트, Wasm 및 자체 호스팅 패리티에 `@mission-platform/forge-web-script-vitest`을 사용합니다.
수표. 프로덕션에서 사용되는 것과 동일한 컴파일러 서비스 및 Vite 플러그인에 컴파일을 위임합니다. 그것은 생성하지 않습니다
두 번째 모듈 시스템.

`.fws` 모듈을 테스트하는 작업공간에 패키지를 설치한 후 표준 Vitest 구성으로 해당 어댑터를 구성합니다.

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

직접 컴파일러 및 런타임 어설션의 경우 제품군당 하나의 하네스를 생성하거나 테스트하여 `afterEach`에 폐기합니다.

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` 및 `loadSync`은 테스트에서 제공하는 기능 가져오기만 허용합니다. 신고된 수입품 및 공급품이 누락되었습니다.
선언되지 않은 가져오기는 명시적으로 실패합니다. 브라우저나 Node API는 암시적으로 삽입되지 않습니다. 소스 가져오기에 `compileGraph` 사용
링크 구성을 테스트할 때 그래프를 작성하고 `graphHash`, 링크된 모듈, 선언 및 콘텐츠 해시를 비교합니다.

어댑터 경로는 생성된 ESM 계약을 Vitest에서 확인하는 대로 테스트합니다.

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

FWS 값의 경우 두 계층을 모두 명시적으로 테스트하세요. 원시 WASM 테스트는 다음을 주장해야 합니다.
포인터 길이 ABI 및 소유권 호출 생성된 ESM 테스트는 다음을 주장해야 합니다.
자바스크립트 프로젝션:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

생성된 로더 경계 테스트는 ASCII, 빈 다중 바이트 UTF-8,
반환된 연결, 문자열 기능 가져오기, 원시 `bytes` 튜플 및
노출된 `memory`. 치명적인 UTF-8 픽스처를 사용하고 임시
성공적인 반환, 게스트 트랩, 호스트 예외 시 `fws_dealloc` 호출이 발생합니다.
그리고 실패를 디코딩합니다. 이전에 생성된 `artifact.esmSource`을 계측합니다.
가져오기; 로드 후 내보내기 패치는 래퍼를 관찰하지 않습니다.
원래 할당자와 할당 해제를 닫습니다.

생성된 어댑터는 한 호출에 대한 모든 문자열 인수를 하나로 압축합니다.
손님 배정. 다음을 사용하는 함수에 대해 할당 횟수 어설션을 유지합니다.
여러 문자열 매개변수를 사용하고 스칼라 전용 테스트를 유지하여 문자열 매개변수가 없음을 확인합니다.
문자열 마샬링 작업은 숫자 전용 함수에 대해 생성됩니다. 바이트 테스트
다음을 기대하는 대신 `[pointer, length]` 튜플을 계속 전달해야 합니다.
자동 `Uint8Array` 변환.

벤치마크 작업 공간은 원시 포인터 길이 어댑터를
ESM 어댑터를 별도의 FWS 모드로 생성:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

보고서에는 빌드, 초기화 및 정상 상태 실행 단계가 포함됩니다. 는
FWS 원시 `wasm` 행은 새로운 인스턴스와 3개의 문자열 입력 할당을 사용합니다.
벤치마크 커널; `wasm-generated`은 생성된 `loadSync` 계약을 사용합니다.
하나의 압축 문자열 입력 할당. 현재 게스트 할당 해제자는
범프 할당기 공간, 생성된 문자열/바이트를 재활용하지 않고 범위를 검증합니다.
샘플은 호출당 새로운 로더 인스턴스를 사용합니다. 스칼라 샘플은 로드된 샘플을 재사용합니다.
인스턴스. 이는 할당량이 많은 각 샘플을 분리하고 의도적으로
영구 인스턴스 클레임이 아닌 로더 경계 오버헤드로 보고됩니다.
각 아티팩트는 원시 Wasm 바이트, 생성된 ESM 소스 바이트, 콘텐츠 해시,
비교에 사용된 정적 할당 개수입니다. 행만 비교
코퍼스 해시, 호스트 런타임 및 벤치마크 스키마가 일치하는 경우.

예를 들어, 위의 Node만 실행하면 336개의 측정된 위상 결과가 생성됩니다.
제로 실패 및 코퍼스 해시 `ad092f7c552cc914`. 두 FWS 행 모두 원시 Wasm을 가졌습니다.
해시 `0ac58f11`, 원시 Wasm 크기 1,625바이트 및 생성된 ESM 소스 크기 18,490
바이트; 원시 및 생성된 문자열 입력 할당 횟수는 3과 1이었습니다.
유니코드 작은 문자열의 경우, 평균 초기화는 원시 대비 0.00024ms였습니다.
0.00188ms가 생성되었으며 평균 실행 시간은 원시 0.0236ms 대 0.1070ms였습니다.
기록된 Node 실행에서 생성되었습니다. 이 수치는 대표적인 증거이며,
기계 간 성능을 보장하지 않습니다. 보고서의 사례별 샘플을 사용하세요.
비교를 위해.

플러그인은 또한 `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm` 및 `?forge-web-script-source-map`. TypeScript에서 해당 주변 모듈을 검색할 수 있도록 하려면,
테스트 프로젝트 유형에 제공된 선언 하위 경로를 추가합니다.

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

또는 테스트 전용에 `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />`을 추가하세요.
프로젝트에 포함된 진입점을 입력하세요. 선언 하위 경로는 유형 전용이며 런타임 가져오기를 추가하지 않습니다.

패키지 간 언어 및 ABI 준수를 위해 `packages/forge-web-script-vitest/fixtures/`의 공유 픽스처를 사용합니다.
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` 및 `self-hosted/`는 의도적으로 안정적입니다. 옆에 고정 장치를 두십시오
개인 구현 세부 사항을 다루는 경우 컴파일러, 런타임 또는 플러그인 사양 작은 파서에는 인라인 소스를 사용하거나
VM 유닛 케이스. 이는 하네스를 통해 낮은 수준의 테스트를 강제하지 않고도 고정 장치 이름과 정리 결정성을 유지합니다.

`checkVmParity(file, mode)`은 `interpret`, `jit` 및 `aot`을 지원하지만 해당 보고서는 기존의 제한된 자체 호스팅 보고서입니다.
lex 단계 패리티 계약. `parity`, 지문, 단계 및 AOT 재현성 메타데이터를 주장합니다. 보고서를 처리하지 마십시오
임의 컴파일된 FWS VM 실행 또는 Wasm 동작 테스트를 대체합니다.

일반적인 작업 공간 작업으로 집중된 FWS 매트릭스를 실행합니다.

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## 기술 참조

### 공유 구성

대부분의 작업공간은 `@mission-platform/vite-config`의 `defineVitestConfig` 유틸리티를 사용합니다. 이는 표준화된
환경:

- **환경**: 기본적으로 `jsdom`입니다.
- **전역**: 활성화됨(원하지 않는 한 `describe`, `it`, `expect`을 가져올 필요 없음)
- **플러그인**: `@vitejs/plugin-vue` 및 i18n 블록 무시를 포함합니다.
- **범위**: 사전 구성된 `v8` 공급자.

**예: `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### 디렉토리 구조

- `src/**/*.spec.ts`: 단위 테스트 및 구성 요소 테스트.
- `src/**/*.stories.tsx`: 스토리북 스토리(상호작용 테스트 정의로도 사용됨)
- `apps/storybook/vitest.config.ts`: 브라우저 기반 상호 작용 테스트를 위한 기본 구성입니다.

### 스크립트 요약

| 스크립트 | 명령 | 목적 |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | 모든 작업 영역 테스트 작업을 실행합니다.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | 감시 모드에서 구성 요소 테스트를 실행합니다.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | 구성 요소 적용 범위 보고서를 생성합니다. |
| 러스트/WASM | `cargo test --workspace` | 기본 Rust 상자 테스트를 실행하세요.           |

Wasm 래퍼 패키지는 자체 패키지 작업을 통해 테스트됩니다. 예를 들어, scanner 패키지와 해당 패키지를 실행합니다.
스캐너 동작을 변경할 때 함께 래퍼:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## 관련 문서

- [개발 설정](development-setup.md)
- [모범 사례](best-practices.md)
- [패키지 개발](package-development.md)
