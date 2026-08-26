# @mission-platform/barcode

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/barcode/docs/index.md: [packages/barcode/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

用 Rust 编写并编译为 **WebAssembly** 的无依赖性 **1D（线性）条形码编码器和解码器**，公开
通过一个小型的、完全类型化的 ES 模块包装器和一个一次性写入的 `ForgeBarcode` UI 组件。

## 概述

`@mission-platform/barcode` 为一维线性条码提供高性能编码和解码：

- **编码器**：将符号系统 + 有效负载呈现为平坦的模块位（`1` = 条，`0` = 空格）。
- **解码器**：将任何支持的符号系统的干净模块运行读回到其有效负载中。
- **UI 组件 (`ForgeBarcode`)**：为 Vue 3、React、Solid 和 Web 组件编译的一次写入组件，全部
  通过 `mp:<framework>` 导出条件从裸 `@mission-platform/barcode` 说明符提供服务。

## 支持的符号系统

| 符号学       | 笔记                                                     |
| ------------ | -------------------------------------------------------- |
| `code128`    | 高密度。代码 B 表示可打印 ASCII；代码 C 数字的快速路径。 |
| `gs1-128`    | 带有领先 FNC1 的代码 128 用于 GS1 应用标识符。           |
| `code39`     | 字母数字，自检；使用 `*` 启动/停止自动构建。             |
| `code39ext`  | 通过移位字符的完整 ASCII 代码 39。                       |
| `code93`     | 紧凑，自检查（两个检查字符）。                           |
| `code93ext`  | 通过移位字符的全 ASCII 代码 93。                         |
| `ean13`      | 12 位数字（附加支票）或 13 位（支票已验证）。            |
| `ean8`       | 7 位数字（附加支票）或 8 位（支票已验证）。              |
| `upca`       | 11 位数字（附加支票）或 12 位（已验证支票）。            |
| `upce`       | 零抑制UPC； 6 位数字或 7/8 位数字形式。                  |
| `itf`        | 交错 2 个 5 个；需要偶数位数。                           |
| `itf14`      | 固定 14 位 GTIN-14。                                     |
| `codabar`    | 数字加上 `-$:/.+`；使用 `A` 启动/停止自动构建。          |
| `msi`        | MSI / 经过 mod-10 检查的修改 Plessey。                   |
| `pharmacode` | Laetus 药品二进制代码 (`3`–`131070`)。                   |

## API及使用

### 核心编码器和解码器 (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### 框架 UI 组件

没有每个框架的子路径：通过 `resolve.conditions` 选择框架**一次**（请参阅
`defineFrameworkAppConfig` / `frameworkResolveConditions` 来自 `@mission-platform/vite-config`) 和
`customConditions`（通过 `@mission-platform/typescript-config/framework-<name>` 预设），然后导入
来自包根目录的 `ForgeBarcode`。

**Vue 3**（`mp:vue` 活动）：

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

**React**（`mp:react` 活动）：

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
