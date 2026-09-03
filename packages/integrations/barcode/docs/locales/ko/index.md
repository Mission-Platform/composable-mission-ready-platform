# @mission-platform/barcode

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/integrations/barcode/docs/index.md: [packages/integrations/barcode/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Rust로 작성되고 **WebAssembly**로 컴파일되어 노출되는 종속성 없는 **1D(선형) 바코드 인코더 및 디코더**
작고 완전한 유형의 ES 모듈 래퍼와 한 번만 쓸 수 있는 `ForgeBarcode` UI 구성 요소를 통해.

## 개요

`@mission-platform/barcode`은 1D 선형 바코드에 대한 고성능 인코딩 및 디코딩을 제공합니다.

- **인코더**: 기호 + 페이로드를 모듈 비트의 플랫 런으로 렌더링합니다(`1` = 바, `0` = 공백).
- **디코더**: 지원되는 모든 기호의 클린 모듈 실행을 페이로드로 다시 읽습니다.
- **UI 구성 요소(`ForgeBarcode`)**: Vue 3, React, Solid 및 웹 구성 요소용으로 컴파일된 1회 쓰기 구성 요소, 모두
  `mp:<framework>` 내보내기 조건을 통해 기본 `@mission-platform/barcode` 지정자에서 제공됩니다.

## 지원되는 기호

| 기호         | 메모                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `code128`    | 고밀도. 인쇄 가능한 ASCII용 코드 B; 숫자에 대한 코드 C 빠른 경로입니다. |
| `gs1-128`    | GS1 애플리케이션 식별자의 앞에 FNC1이 있는 코드 128입니다.              |
| `code39`     | 영숫자, 자체 검사; `*` 시작/중지로 자동 프레임됩니다.                   |
| `code39ext`  | 시프트 문자를 통한 전체 ASCII 코드 39.                                  |
| `code93`     | 간결한 자체 점검(2개의 점검 문자).                                      |
| `code93ext`  | 시프트 문자를 통한 전체 ASCII 코드 93.                                  |
| `ean13`      | 12자리(체크가 추가됨) 또는 13(체크가 확인됨).                           |
| `ean8`       | 7자리(체크가 추가됨) 또는 8(체크가 확인됨).                             |
| `upca`       | 11자리(체크가 추가됨) 또는 12(체크가 확인됨).                           |
| `upce`       | 0으로 억제된 UPC; 6자리 또는 7/8자리 형식.                              |
| `itf`        | 2/5 인터리브; 짝수 숫자가 필요합니다.                                   |
| `itf14`      | 14자리 GTIN-14가 수정되었습니다.                                        |
| `codabar`    | 숫자 + `-$:/.+`; `A` 시작/중지로 자동 프레임됩니다.                     |
| `msi`        | MSI / Mod-10 검사를 통해 수정된 Plessey.                                |
| `pharmacode` | Laetus 제약 바이너리 코드(`3`–`131070`).                                |

## API 및 사용법

### 코어 인코더 및 디코더(`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### 프레임워크 UI 구성요소

프레임워크별 하위 경로는 없습니다. `resolve.conditions`을 통해 프레임워크를 **한 번** 선택하세요(참조).
`defineFrameworkAppConfig` / `@mission-platform/vite-config`의 `frameworkResolveConditions`) 및
`customConditions`(`@mission-platform/typescript-config/framework-<name>` 사전 설정을 통해), 가져오기
패키지 루트의 `ForgeBarcode`.

**Vue 3**(`mp:vue` 활성):

```vue
<script setup lang="ts">
  import { ForgeBarcode } from '@mission-platform/barcode';
</script>

<template>
  <ForgeBarcode
    symbology="code128"
    value="MISSION-128"
    :height="60"
  />
</template>
```

**React**(`mp:react` 활성):

```tsx
import { ForgeBarcode } from '@mission-platform/barcode';

export function BarcodeViewer() {
  return (
    <ForgeBarcode
      symbology="code128"
      value="MISSION-128"
      height={60}
    />
  );
}
```
