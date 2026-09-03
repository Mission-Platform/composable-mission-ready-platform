# @mission-platform/forms-core

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/ui/forms-core/docs/index.md: [packages/ui/forms-core/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/forms-core` 是一个与框架无关的核心库，提供业务逻辑、类型定义和
整个任务平台表单的验证引擎。通过将此逻辑集中在纯 TypeScript 包中，
Vue 和 React 实现通过构造保持完美的奇偶性。

## 概述

该计划重点关注三个主要领域：

1. **JSON Schema Definition**：用于定义表单模式的类型和结构。
2. **条件可见性**：确定是否应根据其他表单值呈现字段的逻辑。
3. **验证和默认值**：与 Ajv 集成以进行 JSON 模式验证并自动生成默认值
   价值观。

## 关键模块

### 1. 表单定义和类型 (`src/types.ts`)

定义表单的结构契约：

- `SchemaFormDefinition`：根定义。单个对象代表一步形式，而对象数组
  定义多步骤向导。
- `FormFieldSchema`：已解析的准备渲染的字段形状。
- `FieldUiOptions`：对 JSON 架构的扩展以提供表示提示（`ui` 命名空间）。
- `FormValues` 和 `FormErrors`：当前表单数据的类型映射及其相应的验证错误。

### 2. 条件可见性 (`src/conditions.ts`)

提供引擎来根据当前值评估字段是否可见：

- `evaluateCondition(condition, values)`：使用类似 JSON 模式的组合器评估 `FieldCondition`：
  - `allOf`：AND 逻辑（所有条件必须为真）。
  - `anyOf`：OR 逻辑（至少一个条件必须为真）。
  - `oneOf`：XOR 逻辑（必须只有一个条件为真）。
- `isFieldVisible(field, values)`：用于确定是否满足特定字段的 `visibleWhen` 属性的帮助程序。

### 3. JSON 架构集成 (`src/json-schema.ts`)

处理原始 JSON 模式和可呈现表单字段之间的转换：

- `jsonSchemaToFields(schema)`：将 JSON 架构递归转换为 `FormFieldSchema` 的有序列表。
- `jsonSchemaDefaults(schema)`：根据架构的 `default` 关键字或适当的类型生成初始值
  空白。
- `createFormValidator(schema, translate?)`：返回使用 Ajv 验证表单值的 `FormValidator`。它
  自动从验证中排除隐藏字段并支持自定义错误消息。

### 4. 表单生成器逻辑（`src/builder-types.ts`、`src/form-schema.ts`）

支持可视化表单生成器工具：

- **转换**：`fieldsToSchema` 和 `schemaToFields` 等功能允许构建器在其工作之间移动
  表示（字段树）和最终的 `SchemaFormDefinition`。
- **字段调色板**：提供 `DEFAULT_FIELD_TYPES`，它定义构建器调色板中的可用小部件。

## 依赖模型

这个包是有意精简且与框架无关的：

- **无框架**：不依赖于 Vue 或 React。
- **关键依赖项**：
  - `ajv` 和 `ajv-formats`：用于高性能 JSON 模式验证。
  - `nanoid`：用于在构建器中生成唯一字段标识符。

## 消费者

主要消费者是 `@mission-platform/forms`，它使用该内核来驱动：

- **ForgeSchemaForm**：使用这些实用程序呈现字段并验证数据。
- **ForgeFormBuilder**：使用转换逻辑允许用户直观地创作模式。
