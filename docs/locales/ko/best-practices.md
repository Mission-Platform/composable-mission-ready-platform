# 미션 플랫폼 모범 사례

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> 언어: 한국어 (ko)

이 문서에서는 Mission Platform 모노레포의 핵심 원칙, 아키텍처 및 코딩 표준을 간략하게 설명합니다. 그것
특정 패턴을 따르는 이유에 대한 **설명**과 일상적인 개발을 위한 **지침** 역할을 합니다.

## 핵심 원칙

### 컴포저블 아키텍처

Mission Platform은 패키지 중심의 구성 가능한 아키텍처를 따릅니다. 재사용 가능한 빌딩 블록(UI 구성 요소,
컴포저블, 유틸리티)은 `packages/`에 있고 배포 가능한 애플리케이션은 `apps/`의 이러한 블록에서 어셈블됩니다.

### 의존성 규율

유지 관리 가능한 단일 저장소를 유지하기 위해 엄격한 단방향 종속성 흐름을 적용합니다.

- **`apps`** → **`packages`**
- **`packages`** → **`core`**, **`tooling`** 및 **`compiler`**와 같은 하위 수준 도메인 패키지

**규칙:** `packages/`의 코드는 **절대로** `apps/`에서 가져오면 안 됩니다. 이는 순환 종속성을 방지하고
패키지는 여전히 재사용이 가능합니다.

### 워크벤치로서의 스토리북

`packages/`에서 구성 요소를 추가하거나 수정할 때 Storybook 앱(`apps/storybook`)을 기본 개발로 사용하세요.
환경. `apps/storybook` 앱은 스토리 자체를 포함하지 않습니다.
구성 요소와 함께 살아가는 스토리를 발견하고 렌더링합니다.

- 각 `.stories.tsx` 파일을 해당 구성 요소의 패키지 디렉터리 내에 해당 구성 요소와 함께 배치합니다(예:
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), `apps/storybook` 아래에는 없습니다. 이 일치
  [Atomic Component Design](atomic-component-design.md)의 규칙.
- Vue, React, Svelte, Solid 및 웹 구성 요소를 전환하여 구성 요소 동작을 확인합니다.
  `STORYBOOK_FRAMEWORK` 환경 변수입니다. 각 모드는 동일한 중립 스토리 인벤토리를 사용해야 합니다. 실종
  프레임워크 아티팩트는 패키지/내보내기 실패이지 해당 스토리를 필터링하는 이유가 아닙니다.

전체 정적 유효성 검사 루프는 다음과 같습니다.

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## 개발 표준

### TypeScript 어디서나

모든 새로운 소스 코드는 TypeScript(`.ts`) 또는 `<script setup lang="ts">`이 포함된 Vue SFC로 작성되어야 합니다.

- **엄격 모드**: `strict: true`는 모든 `tsconfig.json` 파일에 적용됩니다.
- **명시적 유형**: 모든 공개 API, 내보낸 함수, 컴포저블에 명시적 유형을 제공합니다.
- **`any` 피하기**: 정확한 유형이나 제네릭을 사용하세요. 유형을 실제로 알 수 없는 경우 `unknown`를 사용하고 유형 축소를 수행합니다.

### 프레임워크 중립 구성 요소

가능하면 `@mission-platform/forge-jsx` 방언을 사용하여 UI 구성 요소를 작성하세요. 이를 통해 구성 요소를
핵심 로직을 다시 작성하지 않고 Vue, React, Svelte, Solid 및 웹 구성 요소에서 컴파일되어 사용됩니다. 구성
`mp:vue`, `mp:react`, `mp:svelte`, `mp:solid` 또는 `mp:web-component` 조건과 일치하는 소비자의 확인자.

### 반응성 패턴(Vue 3)

- **Composition API**만 사용하세요.
- 일관성을 유지하려면 대부분의 상태에 대해 `ref()`을 선호합니다.
- 복잡한 상태 저장 로직을 **컴포저블**(`useXxx`)로 추출합니다.
- `onUnmounted`에서 모든 부작용(감시자, 간격, 이벤트 리스너)이 제대로 정리되었는지 확인하세요.

## 모노레포 워크플로

### 우려 사항의 격리

- **새 UI 구성 요소**: `packages/`에 속합니다.
- **공유 유틸리티**: `packages/`에 속합니다.
- **린트/형식/빌드 도구**: 공유 구성은 `packages/tooling/configs/`에 속합니다.

### 린팅 및 서식 지정

ESLint 및 Prettier을 통해 일관된 코드 스타일이 적용됩니다.

- `pnpm lint`을 실행하여 위반 사항을 확인합니다.
- `pnpm format:write`을 실행하여 형식 문제를 자동으로 수정합니다.
- 커밋 메시지는 **기존 커밋** 사양을 따라야 합니다.

### 업스트림 종속성 프라이밍 및 패키지 테스트

모듈식 모노 저장소에서 다운스트림 패키지는 업스트림 패키지에서 빌드 출력(`dist/`)을 자주 가져옵니다. 정리 상태 테스트 실패를 제거하고 다중 패키지 빌드 순서를 수동으로 추적하지 않으려면 다음을 수행하십시오.

1. **자동 업스트림 빌드 프라이밍(`^build`)**:
   `turbo.json` 작업 그래프는 `test`, `build:check` 및 `"dependsOn": ["^build"]`를 사용한 검증 작업을 정의합니다. Turborepo를 통해 테스트 또는 유형 확인 작업을 실행하면 먼저 모든 업스트림 작업 공간 종속성이 자동으로 빌드됩니다.

2. **패키지 범위 실행**:
   필수 구성 요소를 수동으로 컴파일하지 않고 개별 패키지를 테스트하거나 빌드하려면 다음을 수행하세요.
   - 프라이밍으로 테스트 실행:
     ```bash
     pnpm test:package <package-name>
     ```
     또는 Turborepo를 통해 직접:
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - 종속성이 있는 패키지를 빌드합니다.
     ```bash
     pnpm build:package <package-name>
     ```
     또는 Turborepo를 통해 직접:
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   Turbo 필터에서 `<package-name>...`은 패키지와 해당 업스트림을 선택합니다.
   종속성, `...<package-name>`은 패키지와 해당 다운스트림을 선택합니다.
   종속 항목 및 `<package-name>^...`는 패키지의 업스트림만 선택합니다.
   종속성(패키지 자체 제외) 패키지 도우미는 명시적으로 실행됩니다.
   업스트림 양식(`<package-name>^...`)을 먼저 사용하므로 직접적인 패키지 워크플로
   예측 가능하고 캐시 가능한 워밍업이 있어야 합니다. 작업 그래프의 `^build` 종속성
   직접적인 Turborepo 호출을 위한 안전망으로 남아 있습니다.

3. **워크트리 프로비저닝**:
   새로운 Git 작업 트리가 `pnpm worktree:create`를 통해 프로비저닝되거나 `pnpm worktree:setup`을 통해 초기화되면 유효성 검사를 실행하기 전에 업스트림 종속성이 자동으로 준비되어 새로 생성된 작업 트리가 즉시 작동하도록 합니다.

## 성능 최적화

- **코드 분할**: 중요하지 않은 기능과 대규모 라이브러리에는 동적 `import()`을 사용합니다.
- **자산 최적화**: 최신 이미지 형식(WebP/AVIF)을 선호하고 모든 정적 자산이 압축되도록 합니다.
- **반응성 오버헤드**: 깊은 반응성이 필요하지 않은 대형 개체에는 `shallowRef`을 사용합니다.

## 테스트 및 문서화

- **테스트 중심 개발**: 모든 새로운 기능이나 버그 수정에는 단위 테스트(`.spec.ts`)가 수반되어야 합니다.
- **Diátaxis 문서**: Diátaxis 프레임워크를 따르는 작성자 문서(자습서, 방법, 참조,
  설명).
- **TSDoc**: 모든 공개 방법 및 속성에 TSDoc/JSDoc을 사용하여 IDE 인텔리전스를 강화합니다.

## 관련 자료

- [테스트 가이드](testing.md)
- [프레임워크 모범 사례](framework-best-practices.md)
- [작업공간 구조](workspace-structure.md)
- [문제 해결](troubleshooting.md)
