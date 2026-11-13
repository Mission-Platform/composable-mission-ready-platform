# @mission-platform/code-scanner

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

从静态链接编译的无依赖性**图像/相机代码扫描仪**
Flint 图到 WebAssembly。链接的工件当前解码数据
Matrix、紧凑型 Aztec、1D/RSS 阅读器、PDF417 和来自图像文件的 MaxiCode 或
实时摄像机流。 QR 图独立发出，但仍处于外部
研究 Forge 发射器限制时组合工件。

## API概述

### 核心扫描仪 (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll, type ScanOptions } from '@mission-platform/code-scanner';

// Scan ImageData directly
const options: ScanOptions = { formats: ['DATA_MATRIX'], tryHarder: true };
const result = scanImageData(imageData, options);

// Scan the package's all-results entry point. The current linked reduced graph
// returns at most its first validated result until multi-symbol detection lands.
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### UI 组件 (`ForgeCodeScanner`)

一次性写入组件可用于同一裸机中的 Vue 3、React、Solid 和 Web 组件
`@mission-platform/code-scanner` 说明符 — 活动的 `mp:<framework>` 导出条件选择构建。
通过 `resolve.conditions` 设置**一次**（请参阅 `defineFrameworkAppConfig` / `frameworkResolveConditions`
来自 `@mission-platform/vite-config`）和 `customConditions`（通过
`@mission-platform/typescript-config/framework-<name>` 预设）。

**Vue 3**（`mp:vue` 有效）：

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React**（`mp:react` 活动）：

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```
