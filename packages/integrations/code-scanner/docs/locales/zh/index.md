# @mission-platform/code-scanner

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

从静态链接编译的无依赖**图像/相机代码扫描仪**
将 Web 脚本图锻造为 WebAssembly。它定位并解码 QR 码、数据
图像文件中的 Matrix、Aztec、一维条形码、PDF417、GS1 DataBar 和 MaxiCode
或实时摄像机流。动态源模块配置文件也可用于
需要独立可缓存解码器模块的部署。

## API概述

### 核心扫描仪 (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
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

**Vue 3**（`mp:vue` 活动）：

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React**（`mp:react` 活动）：

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```
