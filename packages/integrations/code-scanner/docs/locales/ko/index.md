# @mission-platform/code-scanner

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

정적으로 링크된 소스에서 컴파일된 종속성 없는 **이미지/카메라 코드 스캐너**
웹 스크립트 그래프를 WebAssembly로 포지합니다. QR 코드, 데이터를 찾아 디코딩합니다.
이미지 파일의 Matrix, Aztec, 1D 바코드, PDF417, GS1 DataBar 및 MaxiCode
또는 라이브 카메라 스트림. 동적 소스 모듈 프로필도 사용할 수 있습니다.
독립적으로 캐시 가능한 디코더 모듈이 필요한 배포.

## API 개요

### 코어 스캐너(`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### UI 구성요소(`ForgeCodeScanner`)

Vue 3, React, Solid 및 동일한 베어의 웹 구성 요소에 사용할 수 있는 일회성 구성 요소
`@mission-platform/code-scanner` 지정자 - 활성 `mp:<framework>` 내보내기 조건은 빌드를 선택합니다.
`resolve.conditions`를 통해 **한 번** 설정합니다(`defineFrameworkAppConfig` / `frameworkResolveConditions` 참조).
`@mission-platform/vite-config`에서) 및 `customConditions`(을 통해)
`@mission-platform/typescript-config/framework-<name>` 사전 설정).

**Vue 3**(`mp:vue` 활성):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React**(`mp:react` 활성):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```
