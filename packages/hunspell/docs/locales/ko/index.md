# @mission-platform/hunspell

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/hunspell`은 Hunspell을 기반으로 하는 고성능 맞춤법 검사 엔진을 제공합니다.
**WebAssembly**(Emscripten을 통한). 브라우저나 Web Worker 내에서 완전히 실행되는 ES 모듈로 패키지되어 있습니다.

## 건축학

패키지는 Node.js 런타임에 대한 종속성을 없애기 위해 특수 빌드 파이프라인을 활용합니다.

1. **WASM 컴파일**: `hunspell-1.7.2` 라이브러리는 Emscripten을 사용하여 크로스 컴파일됩니다.
2. **C++ 래퍼**: 얇은 C++ 래퍼(`hunspell_wrapper.cpp`)는 Emscripten 바인딩을 통해 필요한 기능을 노출합니다.
3. **단일 파일 아티팩트**: 최종 출력은 WASM 바이너리가 다음과 같이 인라인되는 독립형 `hunspell.js`입니다.
   base64를 사용하므로 별도의 `.wasm` 파일 로드 및 URL 확인이 필요하지 않습니다.

### WASM 아티팩트 재구축

재건축에는 다음이 필요합니다. [도커](https://www.docker.com/). 루트에서 다음 명령을 사용하십시오.

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## 용법

### 기본 API

모든 JavaScript/TypeScript 환경에서 Hunspell 엔진을 직접 사용할 수 있습니다.

```ts
import { createHunspell } from '@mission-platform/hunspell';

// Initialize the WASM module
const module = await createHunspell();

// Create a checker instance by passing the text content of .aff and .dic files
const checker = new module.HunspellChecker(affFileContent, dicFileContent);

console.log(checker.spell('hello')); // true
console.log(checker.spell('wrold')); // false
console.log(checker.suggest('wrold')); // ['world', 'word', ...]

// Important: free WASM memory when done
checker.delete();
```

### 모나코 편집기 통합

이 패키지는 Monaco 편집기에 대한 원활한 통합을 제공하여 작업자 생성 및 디바운스된 맞춤법 검사를 처리합니다.
자동으로.

#### Vue 3(구성 API)

`useHunspellMonaco` 컴포저블을 사용하여 맞춤법 검사를 반응적으로 연결합니다.

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHunspellMonaco } from '@mission-platform/hunspell';

  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  // Attach spell-checking logic
  useHunspellMonaco(editorRef, enabled, 'plaintext');
</script>
```

#### 프레임워크에 구애받지 않음/필수적

Vue가 아닌 소비자(예: `@mission-platform/components`의 구성 요소)의 경우 `attachHunspellMonaco` 함수를 사용합니다.

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## 사전 파일

이 패키지는 번들 크기를 작게 유지하기 위해 **내장 사전과 함께 제공되지 않습니다**. 직접 제공해야 합니다.
`.aff`(접사) 및 `.dic`(사전) 쌍입니다.

권장 소스: [LibreOffice 사전](https://github.com/LibreOffice/dictionaries).
