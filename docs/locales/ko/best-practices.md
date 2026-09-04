# 미션 플랫폼 모범 사례

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> 언어: 한국어 (ko)

이 문서에서는 Mission Platform 모노레포의 핵심 원칙, 아키텍처 및 코딩 표준을 간략하게 설명합니다. 그것
특정 패턴을 따르는 이유에 대한 **설명**과 일상적인 개발을 위한 **지침** 역할을 합니다.

## 핵심 원칙

### 컴포저블 아키텍처

Mission Platform은 패키지 중심의 구성 가능한 아키텍처를 따릅니다. 재사용 가능한 빌딩 블록(UI 구성 요소,
컴포저블, 유틸리티) `packages/`, 배포 가능한 애플리케이션은 다음 블록에서 조립됩니다. `apps/`.

### 의존성 규율

유지 관리 가능한 단일 저장소를 유지하기 위해 엄격한 단방향 종속성 흐름을 적용합니다.

- **`apps`** → **`packages`** / **`packages/tooling/vite`** / **`packages/edge/workers`**
- **`packages`** / **`packages/tooling/vite`** / **`packages/edge/workers`** → **`packages/tooling/configs`**
- **`apps`** → **`packages/tooling/configs`** (툴링/빌드 구성을 위해 직접)

**규칙:** 코드 입력 `packages/` **절대** 다음에서 가져오면 안 됩니다. `apps/`. 이는 순환 종속성을 방지하고
패키지는 여전히 재사용이 가능합니다.

### 워크벤치로서의 스토리북

구성요소를 추가하거나 수정할 때 `packages/`, 스토리북 앱(`apps/storybook`) 주요 개발로
환경. 그만큼 `apps/storybook` 앱에는 스토리 자체가 포함되어 있지 않습니다.
구성 요소와 함께 살아가는 스토리를 발견하고 렌더링합니다.

- 각각 함께 위치 `.stories.tsx` 해당 구성 요소의 패키지 디렉터리 내에 해당 구성 요소가 포함된 파일(예:
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), 아래가 아님 `apps/storybook`. 이 일치
  협약 [원자 구성 요소 설계](atomic-component-design.md).
- 전체 구성 요소 동작을 확인합니다. Vue, React, Svelte, Solid및 웹 구성 요소를 전환하여
  `STORYBOOK_FRAMEWORK` 환경 변수. 각 모드는 동일한 중립 스토리 인벤토리를 소비해야 합니다. 실종
  프레임워크 아티팩트는 패키지/내보내기 실패이지 해당 스토리를 필터링하는 이유가 아닙니다.

전체 정적 유효성 검사 루프는 다음과 같습니다.

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## 개발 표준

### TypeScript 어디에나

모든 새로운 소스 코드는 다음과 같이 작성되어야 합니다. TypeScript (`.ts`) 또는 Vue 다음을 포함하는 SFC `<script setup lang="ts">`.

- **엄격 모드**: `strict: true` 모두에 걸쳐 시행됩니다 `tsconfig.json` 파일.
- **명시적 유형**: 모든 공개 API, 내보낸 함수, 컴포저블에 명시적 유형을 제공합니다.
- **피하다 `any`**: 정확한 유형이나 제네릭을 사용하세요. 유형을 실제로 알 수 없는 경우 다음을 사용하세요. `unknown` 유형 축소를 수행합니다.

### 프레임워크 중립 구성 요소

가능할 때마다 다음을 사용하여 UI 구성 요소를 작성하세요. `@mission-platform/forge-jsx` 방언. 이를 통해 구성 요소를
컴파일되어 사용됨 Vue, React, Svelte, Solid및 핵심 논리를 다시 작성하지 않고 웹 구성 요소를 사용할 수 있습니다. 구성
일치하는 소비자의 확인자 `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, 또는 `mp:web-component` 상태.

### 반응성 패턴(Vue 3)

- **Composition API**만 사용하세요.
- 선호하다 `ref()` 대부분의 주에서는 일관성을 유지합니다.
- **컴포저블**로 복잡한 스테이트풀(Stateful) 로직 추출(`useXxx`).
- 모든 부작용(감시자, 간격, 이벤트 리스너)이 적절하게 정리되었는지 확인합니다. `onUnmounted`.

## 모노레포 워크플로

### 우려 사항의 격리

- **새로운 UI 구성요소**: `packages/`.
- **공유 유틸리티**: 다음에 속함 `packages/`.
- **린트/형식/빌드 도구**: 공유 구성은 다음에 속합니다. `packages/tooling/configs/`.

### 린팅 및 서식 지정

일관된 코드 스타일은 다음을 통해 시행됩니다. ESLint 그리고 Prettier.

- 달리다 `pnpm lint` 위반 사항을 확인합니다.
- 달리다 `pnpm format:write` 서식 문제를 자동으로 해결합니다.
- 커밋 메시지는 **기존 커밋** 사양을 따라야 합니다.

## 성능 최적화

- **코드 분할**: 동적 사용 `import()` 중요하지 않은 기능과 대규모 라이브러리의 경우.
- **자산 최적화**: 최신 이미지 형식(WebP/AVIF)을 선호하고 모든 정적 자산이 압축되도록 합니다.
- **반응성 오버헤드**: 사용 `shallowRef` 깊은 반응성이 필요하지 않은 대형 물체의 경우.

## 테스트 및 문서화

- **테스트 중심 개발**: 모든 새로운 기능이나 버그 수정에는 단위 테스트(`.spec.ts`).
- **Diátaxis 문서**: Diátaxis 프레임워크를 따르는 작성자 문서(자습서, 방법, 참조,
  설명).
- **TSDoc**: 모든 공개 방법 및 속성에 대해 TSDoc/JSDoc을 사용하여 IDE 인텔리전스를 강화합니다.

## 관련 자료

- [테스트 가이드](testing.md)
- [프레임워크 모범 사례](framework-best-practices.md)
- [작업공간 구조](workspace-structure.md)
- [문제 해결](troubleshooting.md)
