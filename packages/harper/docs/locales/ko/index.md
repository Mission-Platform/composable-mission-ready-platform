# @mission-platform/harper

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/harper`은 다음과 같은 통합을 제공합니다. [하퍼](https://writewithharper.com) 문법 검사기 및
모나코 편집자. Harper는 WebAssembly로 구동되는 빠른 오프라인 개인 정보 보호 우선 영어 문법 검사기입니다.
브라우저에서 완전히.

## 특징

- **실시간 문법 검사**: 입력하는 동안 문제가 감지되며 결과는 편집기를 유지하기 위해 300ms 단위로 디바운싱됩니다.
  성능.
- **시각적 마커**: 문법 및 스타일 문제는 표준 마커를 사용하여 Monaco 편집기 내에서 직접 강조 표시됩니다.
- **빠른 수정**: Monaco의 "전구" 코드 작업과 통합되어 사용자가 제안된 수정 사항을 적용할 수 있습니다.
  즉시.
- **개인정보 보호 우선**: 모든 처리는 웹 워커에서 로컬로 이루어집니다. 네트워크를 통해 텍스트가 전송되지 않습니다.
- **심각도 수준**: 표준 LSP 심각도 수준(오류, 경고, 정보 및 힌트)을 지원합니다.

## 설정 및 구성

Harper는 Web Worker에서 실행되기 때문에 애플리케이션은 편집기를 초기화하기 전에 작업자 팩토리를 구성해야 합니다.
인스턴스.

### 글로벌 환경 구성

애플리케이션의 기본 진입점(예: `main.ts`)에서 `HarperEnvironment`을 정의합니다.

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## 용법

### Vue 3(구성 API)

`useHarperMonaco` 컴포저블은 Vue의 Monaco 편집기 인스턴스에 문법 검사를 연결하는 쉬운 방법을 제공합니다.
구성 요소.

#### 예

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHarperMonaco } from '@mission-platform/harper';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const grammarCheckEnabled = ref(true);

  // Initialize Monaco editor
  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of a grammer error.',
      language: 'markdown',
    });
  });

  // Attach Harper grammar checking
  useHarperMonaco(editorRef, grammarCheckEnabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

#### API 참조: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: Monaco 편집기 인스턴스를 제공하는 참조 또는 getter입니다.
- `enabled`: 문법 검사 켜기/끄기를 전환하는 반응형 부울입니다.
- `languageReference`: 코드 액션 등록에 사용되는 편집기의 언어 모드입니다.

---

### 프레임워크에 구애받지 않는 통합

Vue가 아닌 소비자(예: `@mission-platform/components`의 구성 요소)의 경우 필수 `attachHarperMonaco`을 사용합니다.
기능.

#### 예

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## 기술적인 세부사항

### `HarperIssue` 인터페이스

작업자가 문법 문제를 감지하면 `HarperIssue` 객체를 반환합니다.

```ts
interface HarperIssue {
  offset: number; // Byte offset of the issue in the text
  length: number; // Length of the affected text
  message: string; // Human-readable explanation of the error
  ruleId: string; // The identifier of the specific Harper rule triggered
  suggestions: string[]; // Suggested alternative text corrections
  severity: 1 | 2 | 3 | 4; // LSP severity (1=Error, 2=Warning, 3=Info, 4=Hint)
}
```

### 작업 흐름

1. **Worker Spawn**: 패키지는 `window.HarperEnvironment`에 제공된 팩토리를 사용하여 Harper Web Worker를 생성합니다.
2. **디바운스 검사**: 편집기 모델이 변경될 때마다 작업자에 대한 디바운스 요청이 트리거됩니다.
3. **마커 매핑**: Harper가 반환한 문제는 시각적 강조를 위해 Monaco 마커에 매핑됩니다.
4. **코드 작업**: `HarperIssue.suggestions`을 빠른 수정으로 제공하기 위해 사용자 지정 공급자가 모나코에 등록되었습니다.
   행동.
