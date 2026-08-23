# @mission-platform/forms

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forms/docs/index.md: [packages/forms/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/forms` 提供高级表单编排组件，允许任务平台渲染
复杂的表单和向导完全来自 JSON 模式定义。

与其他共享包一样，它遵循“一次编写”方法，在中性 JSX 中编写组件并编译它们
转换为本机 Vue 3 和 React 组件。

所有导入均使用裸 `@mission-platform/forms` 说明符。通过以下方式为整个应用程序选择一次框架
`mp:<framework>` 导出条件 — `resolve.conditions`（请参阅 `defineFrameworkAppConfig` /
`frameworkResolveConditions` 来自 `@mission-platform/vite-config`）和 `customConditions`（通过
`@mission-platform/typescript-config/framework-<name>` 预设）。

## 核心组件

### `ForgeSchemaForm`

用于呈现数据驱动表单的主要组件。它采用 JSON 模式定义并自动生成
相应的 UI 小部件和验证逻辑。

#### 主要特点：

- **架构驱动**：完全通过 JSON 架构进行配置。单个对象呈现一步形式；对象数组
  创建一个多步骤向导。
- **一致验证**：使用 `@mission-platform/forms-core` (Ajv) 确保 Vue 和 React 应用程序验证
  相同的数据完全相同。
- **条件可见性**：支持 `ui.visibleWhen` 根据其他输入值动态显示或隐藏字段。
- **嵌套结构**：处理复杂数据模型的嵌套字段集。

#### 用法：

**Vue**（`mp:vue` 活动）：

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React**（`mp:react` 有效 — 请注意相同的说明符）：

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

一种可视化创作工具，允许非开发人员创建表单架构，而无需手动编写 JSON。

#### 主要特点：

- **Visual Canvas**：拖放式编辑器，用于排列字段并定义其属性。
- **向导配置**：专用的“步骤”选项卡，用于管理向导中的多步骤流程。
- **实时预览**：构建表单时实时呈现。
- **架构导出**：发出 `SchemaFormDefinition`，可以保存到数据库或直接使用
  `ForgeSchemaForm`。

#### 布局：

使用 `ForgeVerticalLayout` 将构建器构造为三列布局：

1. **字段调色板**：要添加到表单的可用小部件（输入、选择、日期等）的列表。
2. **编辑器画布**：配置和组织字段的中心区域。
3. **检查器**：当前所选字段的详细属性编辑器。

## 架构和依赖关系

为了避免依赖循环，同时保持框架奇偶性：

- `@mission-platform/forms` 取决于 `@mission-platform/components`（对于 `ForgeInput` 等单个输入小部件，
  `ForgeCheckbox`) 和 `@mission-platform/layouts`。
- 它将所有繁重的工作（验证、模式解析和条件逻辑）委托给与框架无关的框架
  `@mission-platform/forms-core`。

## 风格

该包通过以下方式提供共享辅助功能帮助程序：

```ts
import '@mission-platform/forms/styles';
```

每个组件还利用自己的并置 CSS 模块来实现特定样式。
