# 原子组件设计

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> 语言: 简体中文 (zh)

任务平台使用**原子设计**系统将组件组织成复杂的层次结构。每个
组件是用中立的 Forge JSX 方言编写的“一次写入”单元（`@mission-platform/forge`)，确保
跨多个框架的一致性。

## 设计水平

组件根据其范围和职责分为五个级别。

|水平|文件夹|描述 |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **原子** | `src/components/atoms/`     |最小的 UI 原语（例如， `ForgeButton`, `ForgeInput`, `ForgeBadge`)。它们通常是功能单元，不能在不失去其用途的情况下进一步分解。 |
| **分子** | `src/components/molecules/` |原子的简单组成（例如， `ForgeSearchInput`, `ForgeFieldSet`)。它们作为一个整体共同发挥作用。                                                                    |
| **生物体** | `src/components/organisms/` |由原子、分子和其他有机体（例如， `ForgeNavbar`, `ForgeTable`, `ForgeModal`)。                                                       |
| **模板** | `src/components/templates/` |定义内容结构的页面级布局（例如， `ForgeHero`, `ForgeAppLayout`)。他们经常使用插槽来定义内容的放置位置。                     |
| **页面** | `src/components/pages/`     |填充有具体内容和数据的模板的特定实例（例如， `AccountSettingsPage`).                                                                        |

## 组件文件夹布局

每个组件都位于相应级别文件夹下其自己命名的子目录中。该目录包含
组件源、故事、测试和可选样式。

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## 故事惯例

故事书故事必须与其组件位于同一位置，并遵循严格的标题约定以保持干净
侧边栏结构。

### 文件名

故事必须使用 `.stories.tsx` 扩大。

### 产权约定

这 `title` 故事书里的田野 `meta` 对象必须遵循以下模式：

```text
<Level>/<Category>/<Component>
```

- **级别**：大写复数（例如， `Atoms`, `Molecules`)。
- **类别**：功能分组（例如， `Forms`, `Navigation`, `Display`, `Feedback`)。
- **组件**：PascalCase 组件名称（例如， `ForgeButton`).

**例子 （`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## 编写标准

1. **框架中立性**：切勿单独创作 Vue 和 React 版本。使用 `@mission-platform/forge`。
2. **命名**：组件应使用 `Base` 前缀（例如， `ForgeCard`) 除非它们是具体的实现。
3. **类型安全**：导出 `*Properties` 组件道具的接口。
4. **测试**：同地办公 `.spec.ts` 每个组件都需要。
5. **脚手架**：使用 `scaffold_component` MCP 工具确保正确的目录结构和样板文件。

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## 相关指南

- [封装开发](package-development.md)
- [可组合创作](composable-authoring.md)
- [商店创作](store-authoring.md)
- [实用程序创作](util-authoring.md)
