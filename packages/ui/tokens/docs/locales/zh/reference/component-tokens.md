# 伪造组件令牌参考

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/ui/tokens/docs/reference/component-tokens.md: [packages/ui/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> 语言: 简体中文 (zh)

这是 Forge 创作的组件的规范清单和 Figma 交接。它是有意独立于
生成的框架适配器：相同的条目适用于 Vue、React、Solid、Svelte 和 Web 组件。

## 阅读合同

事实来源是下面的递归组件源代码树
[`tokens/component/`](../../../../tokens/component)，按原子级别分组
（`atoms/`、`molecules/`、`organisms/` 和 `templates/`）。每个源都是独立生成的，而所有源
保留相同稳定的 `component.*` DTCG 合约：

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

DTCG路径也是Figma和运行时覆盖路径；只有生成的 CSS 名称才会删除 `component` 包装器。
例如，`component.button.primary.background.hover` 发出为 `--mp-button-primary-background-hover`。一个
源 ID（例如 `component/atoms/button`）标识拥有合约的文件，而不是新的 DTCG 路径。

组件值是现有基元和语义主题文档的别名。因此，Figma 系列有
**浅色**和**深色**模式，无需重复组件令牌。运行时亮/暗行为继续使用
`color-scheme`、`light-dark()`、`[data-theme]` 和 `.theme-*` 子树引脚。消费者和故事书可以覆盖任何
`overrides.tokens.json` 中 `component` 下面的叶；在生成的令牌样式表之后应用覆盖。覆盖
继续使用 `component.*` 键，即使 CSS 自定义属性使用图层命名空间。

## 源和生成的输出布局

每个视觉合约在原子源树下都有一个所有者。生成器递归地发现新文件，因此
新源不需要描述符注册：

```text
packages/ui/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/ui/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

生成的 SCSS 和 TypeScript 桶包括按确定性源 ID 顺序排列的每个组件源。组件
文件可以重用共享合约，例如 `button`、`field`、`input`、`navigation` 和 `overlay`；组合组件
不得重复这些令牌路径。保留仅行为组件、仅继承字形和布局/DOM 公式
在视觉代币合约之外，除非库存条目分配给他们视觉所有权。

### 语义槽和状态词汇

| 老虎机家族                                   | Figma角色                             | 典型状态                                                                               |
| -------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | 填充或控制表面                        | `default`、`hover`、`active`、`disabled`、`loading`、`expanded`、`selected`、`invalid` |
| `text` / `label` / `helper-text`             | 版式颜色或命名版式风格                | `default`、`hover`、`disabled`、`selected`、`invalid`                                  |
| `border` / `focus-ring`                      | `border` / `focus-ring`笔画和键盘指示 | `default`、`hover`、`focus-visible`、`active`、`disabled`、`selected`、`invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | 几何和高程                            | 默认或特定尺寸                                                                         |
| `opacity` / `transition`                     | `transition`去加重和运动              | `disabled`、`loading`、`hover`、`active`                                               |

下面仅列出了组件支持的状态。 `expanded` 用于显示/选择表面，`selected`
用于选择/选项卡/导航，以及用于表单验证的 `invalid`；不需要未使用的状态变量。

## 库存汇总

存储库清单基于以下狭窄源路径：

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| 神器          | 计数 | 意义                                                      |
| ------------- | ---: | --------------------------------------------------------- |
| 组件 TSX 来源 |  249 | 249非故事 Forge 和电子邮件组件来源                        |
| 同地故事      |  246 | 246三个递归 Markdown/tree 辅助源故意没有独立的故事        |
| CSS 模块      |  219 | 219本地视觉风格模块；内联电子邮件和继承的合同也被记录下来 |
| 套餐          |   20 | 20每个包含组件源的包                                      |

审计后生成的表面包含 **2,841 个令牌叶**：132 个活跃的、2,161 个受保护的、548 个模糊的；
没有剩余候选人了。此次清理总共删除了 189 个无法访问的叶子：来自 185 个候选者
审查报告加上别名关闭后暴露的 4 个净二阶调色板叶（6 个已删除，2 个恢复为可到达的 `.500` 叶）。这种减少会影响生成的
仅原始、语义、版式和结构导出；保留 `component.*` 路径及其
`--mp-<layer>-*` 名称未更改。三个未解析的别名（`color.surface.raised`、`radius.2xs` 和
`font.weight.light`）早于本次审核并保持不变。

分类是按来源，而不是按包：

- **Visual** — 拥有 CSS 模块或内联视觉输出，并映射到包表中显示的合同。
- **继承视觉** - 不渲染独立样式的主机；它的出现来自于一个孩子，父母，`currentColor`，
  第三方主机/画布，或组合组件的合约。
- **仅行为** - 控制渲染或视口行为，并且不做出自己的视觉决定。

下面的每一项都是一个库存条目。除非故事被标记为 `story: missing`，否则该组件具有匹配的
`<component>.stories.tsx` 在源旁边。包/级别标题提供稳定的源路径前缀。

## `@mission-platform/components`

### 原子 — `packages/ui/components/src/components/atoms/`

| 组件                     | 分类 | 合同                                            | 外观道具/状态                                                              |
| ------------------------ | ---- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `forge-avatar`           | 视觉 | `component.media`                               | `src`、`initials`、`size`、`shape`、`status`、`variant`；默认/禁用状态颜色 |
| `forge-background-video` | 视觉 | `component.media`                               | 源、自动播放/静音/循环；默认/覆盖                                          |
| `forge-badge`            | 视觉 | `component.feedback`                            | `variant`、`size`；默认/禁用                                               |
| `forge-button`           | 视觉 | `component.button.<variant>`                    | `variant`、`size`、`padding`、`margin`；默认/悬停/活动/焦点可见/禁用/加载  |
| `forge-icon-button`      | 视觉 | `component.button.<variant>` + `component.icon` | 标签，`variant`，`size`；默认/悬停/活动/焦点可见/禁用/加载                 |
| `forge-progress-bar`     | 视觉 | `component.feedback`                            | 值、变量；默认/加载/禁用                                                   |
| `forge-quote`            | 视觉 | `component.typography` + `component.surface`    | `component.typography` + `component.surface`引文、变体；默认               |
| `forge-responsive-image` | 视觉 | `component.media`                               | 来源、方面/适合；默认/占位符                                               |
| `forge-responsive-video` | 视觉 | `component.media`                               | 源、控件/自动播放；默认/覆盖                                               |
| `forge-separator`        | 视觉 | `component.surface`                             | 方向;默认                                                                  |
| `forge-skeleton`         | 视觉 | `component.feedback`                            | 形状/尺寸；加载                                                            |
| `forge-spinner`          | 视觉 | `component.feedback`                            | 尺寸、型号；加载                                                           |
| `forge-stack`            | 视觉 | `component.layout`                              | 方向，`gap`，对齐；默认                                                    |
| `forge-status-icon`      | 视觉 | `component.feedback.<status>`                   | 状态、大小；默认/禁用                                                      |
| `forge-tag`              | 视觉 | `component.feedback`                            | 变型、尺寸、可拆卸；默认/悬停/禁用                                         |
| `forge-theme-toggle`     | 视觉 | `component.button` + `component.icon`           | `component.button` + `component.icon`主题、大小；默认/悬停/活动/选定       |
| `forge-typography`       | 视觉 | `component.typography`                          | `as`，排版变体，颜色；默认/链接/禁用                                       |

### 分子 — `packages/ui/components/src/components/molecules/`

| 组件                      | 分类     | 合同                                         | 外观道具/状态                                                       |
| ------------------------- | -------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `forge-accordion`         | 视觉     | `component.surface` + `component.navigation` | 项目，扩大；默认/悬停/焦点可见/展开/禁用                            |
| `forge-alert-banner`      | 视觉     | `component.feedback` + `component.overlay`   | 地位，可解雇；默认/悬停/焦点可见                                    |
| `forge-breadcrumb`        | 视觉     | `component.navigation`                       | 项目;默认/悬停/选定/焦点可见                                        |
| `forge-button-group`      | 视觉     | `component.button-group`                     | 方向、附着、变体、间隙；默认/焦点可见/禁用                          |
| `forge-card`              | 视觉     | `component.surface`                          | 变体，填充；默认/悬停/选定                                          |
| `forge-chat-bubble`       | 视觉     | `component.media` + `component.surface`      | 作者、方向/状态；默认/选定                                          |
| `forge-collapse`          | 视觉     | `component.collapse`                         | 开放、变体、禁用；默认/悬停/焦点可见/展开/禁用                      |
| `forge-device-mock`       | 视觉     | `component.media.device`                     | 设备、方向、尺寸；默认                                              |
| `forge-dropdown`          | 视觉     | `component.overlay` + `component.navigation` | 开放、安置；默认/扩展/焦点可见                                      |
| `forge-grid`              | 视觉     | `component.layout.grid`                      | 列、间隙、填充；默认                                                |
| `forge-in-view`           | 视觉     | `component.layout`                           | 临界点;继承子女合同                                                 |
| `forge-language-switcher` | 继承视觉 | `component.navigation` + 子选择合约          | 语言环境；默认/扩展/选定                                            |
| `forge-list`              | 视觉     | `component.surface`                          | 变体，间隙；默认/选定                                               |
| `forge-masonry`           | 视觉     | `component.layout.masonry`                   | 列、间隙、填充；默认                                                |
| `forge-menu-item`         | 视觉     | `component.navigation`                       | 活动/禁用；默认/悬停/焦点可见/选定/禁用                             |
| `forge-menu`              | 视觉     | `component.navigation`                       | 开放/方向；默认/扩展                                                |
| `forge-navbar-item`       | 视觉     | `component.navigation.navbar-item`           | 活动、下拉、变体、禁用；默认/悬停/焦点可见/选定/扩展/禁用           |
| `forge-pagination`        | 视觉     | `component.navigation`                       | 页码、尺寸；默认/悬停/焦点可见/选定/禁用                            |
| `forge-popover`           | 视觉     | `component.overlay`                          | 开放、安置；默认/扩展/焦点可见                                      |
| `forge-tabs`              | 视觉     | `component.navigation`                       | 方向、活动选项卡；默认/悬停/焦点可见/选定/禁用                      |
| `forge-timeline`          | 视觉     | `component.timeline`                         | 状态、方向、轮廓标记；默认/选定                                     |
| `forge-toast`             | 视觉     | `component.overlay` + `component.feedback`   | `component.overlay` + `component.feedback`状态、持续时间；默认/加载 |
| `forge-tooltip`           | 视觉     | `component.overlay`                          | 开放、安置；默认/扩展                                               |
| `forge-window-popout`     | 视觉     | `component.overlay.window-popout`            | 开放，尺寸；默认/悬停/焦点可见/选定                                 |

### 有机体和模板 — `packages/ui/components/src/components/{organisms,templates}/`

| 组件                       | 分类     | 合同                                                    | 外观道具/状态                                                                                                            |
| -------------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `forge-carousel`           | 视觉     | `component.navigation.carousel`                         | 幻灯片、控件、自动播放、音调；默认/悬停/焦点可见/选定/禁用                                                               |
| `forge-chat-area`          | 视觉     | `component.media.chat-area`                             | 大小、页眉/页脚槽、自动滚动；默认/加载                                                                                   |
| `forge-dialog`             | 视觉     | `component.overlay`                                     | 打开，标题/页脚；默认/扩展/焦点可见                                                                                      |
| `forge-drawer`             | 视觉     | `component.overlay.drawer`                              | 打开、放置/大小、调整大小；默认/悬停/活动/扩展                                                                           |
| `forge-menubar`            | 视觉     | `component.navigation.menubar`                          | 项目、边框、尺寸；默认/悬停/焦点可见/展开/禁用                                                                           |
| `forge-modal`              | 视觉     | `component.overlay`                                     | 打开、大小、页眉/页脚；默认/扩展/焦点可见                                                                                |
| `forge-navbar`             | 视觉     | `component.navigation.navbar`                           | 项目，响应模式；默认/悬停/焦点可见/选定                                                                                  |
| `forge-table`              | 视觉     | `component.data.table`                                  | 列、大小、标题、条纹/边框/可悬停、色调、加载；默认/悬停/焦点可见/加载                                                    |
| `forge-theme-composer`     | 视觉     | `component.surface` + `component.field`                 | 主题价值观；默认/无效                                                                                                    |
| `forge-theme-provider`     | 视觉     | `component.layout`                                      | 主题模式；默认/浅色/深色                                                                                                 |
| `forge-toast-container`    | 视觉     | `component.overlay`                                     | 放置;默认/加载                                                                                                           |
| `forge-tree-view-item`     | 继承视觉 | `component.navigation` + `component.surface`            | 展开、选择、禁用；默认/悬停/焦点可见/展开/选定/禁用                                                                      |
| `forge-tree-view`          | 视觉     | `component.data.tree`                                   | 节点、大小、defaultOpen、标签渲染器；默认/悬停/焦点可见/展开/选定                                                        |
| `forge-virtual-list`       | 视觉     | `component.data.virtual-list`                           | 项目、大小、itemHeight、高度、过扫描、行渲染器；默认/选定                                                                |
| `forge-virtual-log-viewer` | 视觉     | `component.code.virtual-log-viewer`                     | 级别/过滤器、列、follow-tail；默认/悬停/焦点可见/警告/错误/致命                                                          |
| `forge-virtual-table`      | 视觉     | `component.data.virtual-table` + `component.data.table` | `component.data.virtual-table` + `component.data.table`列、大小、行高、高度、过扫描、条纹/边框、排序；默认/悬停/焦点可见 |
| `forge-virtual-tabs`       | 视觉     | `component.navigation.tabs`                             | 变体、活动选项卡、可关闭/可添加；默认/悬停/焦点可见/选定/禁用                                                            |
| `forge-virtual-tree-view`  | 视觉     | `component.data.virtual-tree`                           | 节点、大小、itemHeight、高度、过扫描、defaultOpen、行渲染器；默认/悬停/焦点可见/展开                                     |
| `forge-hero`               | 视觉     | `component.layout.hero`                                 | 媒体、对齐方式、大小、覆盖；默认                                                                                         |

## 专业锻造包

| 套餐/级别                | 组件                           | 分类     | 合同                                                   | 外观道具/状态                                                                         |
| ------------------------ | ------------------------------ | -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | 视觉     | `component.code.barcode`                               | 值、格式、大小；默认/加载/无效                                                        |
| `breakpoints/atoms`      | `forge-hide-at`                | 仅行为   | 无                                                     | `min`、`max`；仅视口可见性                                                            |
| `breakpoints/atoms`      | `forge-show-at`                | 仅行为   | 无                                                     | `min`、`max`；仅视口可见性                                                            |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | 视觉     | `component.debug.breakpoint`                           | 断点显示；默认                                                                        |
| `code-scanner/organisms` | `forge-code-scanner`           | 视觉     | `component.code.scanner`                               | 相机/格式、扫描；默认/加载/无效                                                       |
| `content/atoms`          | `forge-code-block`             | 视觉     | `component.code`                                       | 语言、副本；默认/选定                                                                 |
| `content/atoms`          | `forge-mermaid`                | 视觉     | `component.code`                                       | 图表来源、加载/错误；默认/加载/无效                                                   |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | 视觉     | `component.button` + `component.icon`                  | 命令，主动；默认/悬停/活动/焦点可见/禁用/选定                                         |
| `content/molecules`      | `forge-markdown`               | 视觉     | `component.typography` + `component.code`              | `component.typography` + `component.code`尺寸、链接；默认/无效                        |
| `content/molecules`      | `markdown-block`               | 继承视觉 | `component.typography` + 子合约                        | 令牌、大小；继承                                                                      |
| `content/molecules`      | `markdown-inline`              | 继承视觉 | `component.typography`                                 | 令牌、链接；继承/悬停/选择                                                            |
| `content/molecules`      | `forge-wysiwyg-block-controls` | 视觉     | `component.editor.block-controls` + `component.button` | `component.editor.block-controls` + `component.button`块选择；默认/悬停/焦点可见/选定 |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | 视觉     | `component.editor.block-menu` + `component.overlay`    | `component.editor.block-menu` + `component.overlay`打开;默认/扩展/选定                |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | 视觉     | `component.editor.status-bar`                          | 地位;默认/无效/加载                                                                   |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | 视觉     | `component.editor.toolbar` + `component.button`        | `component.editor.toolbar` + `component.button`                                       | 命令；默认/禁用 |
| `content/organisms`      | `forge-monaco-editor`          | 视觉     | `component.editor.monaco` + `component.code`           | `component.editor.monaco` + `component.code`语言，只读；默认/禁用/无效                |
| `content/organisms`      | `forge-wysiwyg-editor`         | 视觉     | `component.editor.wysiwyg` + `component.code`          | `component.editor.wysiwyg` + `component.code`可编辑，无效；默认/焦点可见/无效/禁用    |
| `float/molecules`        | `forge-alert-banner`           | 视觉     | `component.feedback` + `component.overlay`             | 地位，可解雇；默认/焦点可见                                                           |
| `float/molecules`        | `forge-dropdown`               | 视觉     | `component.overlay` + `component.navigation`           | `component.overlay` + `component.navigation`打开;默认/扩展/选定                       |
| `float/molecules`        | `forge-popover`                | 视觉     | `component.overlay`                                    | 打开;默认/扩展                                                                        |
| `float/molecules`        | `forge-toast`                  | 视觉     | `component.overlay` + `component.feedback`             | `component.overlay` + `component.feedback`地位;默认/加载                              |
| `float/molecules`        | `forge-tooltip`                | 视觉     | `component.overlay`                                    | 打开;默认/扩展                                                                        |
| `float/organisms`        | `forge-dialog`                 | 视觉     | `component.overlay`                                    | 打开，标题/页脚；默认/扩展/焦点可见                                                   |
| `float/organisms`        | `forge-modal`                  | 视觉     | `component.overlay`                                    | 打开、大小、页眉/页脚；默认/扩展/焦点可见                                             |
| `float/organisms`        | `forge-toast-container`        | 视觉     | `component.overlay`                                    | 放置;默认/加载                                                                        |

### 表格 — `packages/ui/forms/src/components/`

除了下面的合同之外，所有表单条目都使用共享的 `component.field` 标签/帮助程序/错误角色。本地人
仅在控件支持的情况下才表示控件状态。

| 水平 | 组件（每个逗号分隔名称一个条目）                                                                                                                                                                                                                                                                                                                                           | 分类/合同                                                                                                    | 共享外观道具和状态                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 原子 | `forge-checkbox`、`forge-input`、`forge-radio`、`forge-range-input`、`forge-rating`、`forge-slider`、`forge-switch`、`forge-textarea`                                                                                                                                                                                                                                      | 视觉 / `component.checkable` 用于复选框/无线电/评级/滑块/开关； `component.input` 用于输入/范围输入/文本区域 | `size`，标签/值道具；默认/悬停/活动/焦点可见/禁用/无效/在支持的情况下选择 |
| 分子 | `forge-calendar`、`forge-color-input`、`forge-date-input`、`forge-date-range-input`、`forge-field-set`、`forge-file-input`、`forge-location-input`、`forge-multiselect`、`forge-number-stepper`、`forge-otp-input`、`forge-phone-input`、 `forge-radio-group`、`forge-search-input`、`forge-segment-control`、`forge-select`、`forge-time-input`、`forge-time-range-input` | 视觉 / `component.input`、`component.select`、`component.checkable` 或 `component.field` 根据组合控件        | `size`、`disabled`、验证和选择道具；默认/焦点可见/禁用/扩展/选定/无效     |
| 生物 | `forge-date-time-range-input`、`forge-form-builder`、`forge-form-wizard`、`forge-schema-form-dialog`、`forge-schema-form`                                                                                                                                                                                                                                                  | 视觉/`component.field` + 组合输入/选择/覆盖合约                                                              | 模式、步骤、验证；默认/焦点可见/禁用/扩展/选定/无效                       |

### 图标 — `packages/ui/icons/src/components/`

所有 106 个图标条目都是**继承视觉**。字形使用 `currentColor`；它们的大小由消费者控制或映射到
`component.icon.size`。他们不接收每个字形变量。每个都有一个共同的故事并且遵循相同的原则
默认/选定/禁用的颜色角色，其中父级公开该状态。

| 图标类别  | 组件                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通讯/消息 | `forge-icon-bell`、`forge-icon-chat`、`forge-icon-mail`、`forge-icon-phone`、`forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 沟通/分享 | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 内容/编辑 | `forge-icon-copy`、`forge-icon-edit`、`forge-icon-eye`、`forge-icon-eye-off`、`forge-icon-redo`、`forge-icon-trash`、`forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                        |
| 内容/文件 | `forge-icon-download`、`forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 数据/过滤 | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 数据/表格 | `forge-icon-sort`、`forge-icon-table`、`forge-icon-table-column-add`、`forge-icon-table-column-remove`、`forge-icon-table-row-add`、`forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                             |
| 绘图/变换 | `forge-icon-draw-circle`、`forge-icon-draw-line`、`forge-icon-draw-polygon`、`forge-icon-draw-square`、`forge-icon-draw-triangle`、`forge-icon-move`、`forge-icon-palette`、`forge-icon-pencil`、`forge-icon-rotate-ccw`、`forge-icon-rotate-cw`、`forge-icon-scale-down`、 `forge-icon-scale-up`                                                                                                                                                                                                                             |
| 地图/国家 | `forge-icon-country-globe`、`forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 地图/地理 | `forge-icon-geodesic`、`forge-icon-globe`、`forge-icon-language`、`forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 地图/图层 | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 地图/标记 | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 媒体/捕捉 | `forge-icon-camera`、`forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 媒体/播放 | `forge-icon-pause`、`forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 导航/控制 | `forge-icon-arrow`、`forge-icon-chevron`、`forge-icon-chevrons`、`forge-icon-close`、`forge-icon-home`、`forge-icon-join`、`forge-icon-menu`、`forge-icon-minus`、`forge-icon-plus`、`forge-icon-refresh`、`forge-icon-split`                                                                                                                                                                                                                                                                                                 |
| 导航/链接 | `forge-icon-external-link`、`forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 导航/搜索 | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 对象/系统 | `forge-icon-cloud`、`forge-icon-debug`、`forge-icon-heart`、`forge-icon-lightning`、`forge-icon-puzzle`、`forge-icon-qr-code`、`forge-icon-settings`、`forge-icon-star`、`forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                  |
| 路线/方向 | `forge-icon-route`、`forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 安全/访问 | `forge-icon-lock`、`forge-icon-lock-open`、`forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 状态/反馈 | `forge-icon-alert`、`forge-icon-alert-critical`、`forge-icon-alert-info`、`forge-icon-alert-neutral`、`forge-icon-alert-warning`、`forge-icon-check`、`forge-icon-error`、`forge-icon-info`、`forge-icon-notice`、`forge-icon-warning`                                                                                                                                                                                                                                                                                        |
| 文本/格式 | `forge-icon-align-center`、`forge-icon-align-justify`、`forge-icon-align-left`、`forge-icon-align-right`、`forge-icon-blockquote`、`forge-icon-bold`、`forge-icon-bullet-list`、`forge-icon-code-block`、`forge-icon-code-inline`、`forge-icon-heading`、`forge-icon-heading-five`、 `forge-icon-heading-four`、`forge-icon-heading-one`、`forge-icon-heading-six`、`forge-icon-heading-three`、`forge-icon-heading-two`、`forge-icon-italic`、`forge-icon-numbered-list`、`forge-icon-strikethrough`、`forge-icon-underline` |
| 时间/日历 | `forge-icon-calendar`、`forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### 其他视觉包

| 套餐/级别                    | 组件                                                                                                                                               | 分类     | 合同                                                         | 外观道具/状态                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `layout/atoms`               | `forge-container`                                                                                                                                  | 视觉     | `component.layout`                                           | 最大宽度、填充；默认                                                |
| `layout/templates`           | `forge-application-layout`、`forge-bento-layout`、`forge-f-pattern-layout`、`forge-grid-layout`、`forge-vertical-layout`、`forge-z-pattern-layout` | 视觉     | `component.layout`                                           | 布局配置和间隙；默认                                                |
| `map/molecules`              | `forge-map-draw`、`forge-map-layer`、`forge-map-marker`、`forge-map-popup`、`forge-map-source`                                                     | 继承视觉 | `component.map`                                              | 地图源/图层/标记/弹出选项；弹出默认/焦点可见，其他主机继承          |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | 视觉     | `component.map`                                              | 控件、样式、弹出窗口；默认/加载/选定                                |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | 视觉     | `component.code`                                             | 值、大小；默认/无效/加载                                            |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | 视觉     | `component.code`                                             | 值、大小；默认/无效/加载                                            |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | 视觉     | `component.resource-planner`                                 | 资源、范围、选择；默认/悬停/选定/焦点可见/冲突/不可用               |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | 视觉     | `component.scheduler`                                        | 范围、事件、选择；默认/焦点可见/今天/外面/忙                        |
| `select/atoms`               | `forge-tag`                                                                                                                                        | 视觉     | `component.feedback`                                         | 变型、尺寸、可拆卸；默认/悬停/禁用                                  |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | 继承视觉 | `component.select` + `component.navigation`                  | `component.select` + `component.navigation`语言环境；默认/扩展/选定 |
| `select/molecules`           | `forge-multiselect`、`forge-select`                                                                                                                | 视觉     | `component.select` + `component.input` + `component.field`   | 尺寸、选项、型号、验证；默认/悬停/焦点可见/禁用/扩展/选定/无效      |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | 视觉     | `component.button` + `component.icon`                        | `component.button` + `component.icon`模式;默认/悬停/活动/选定       |
| `theme/organisms`            | `forge-theme-composer`、`forge-theme-provider`                                                                                                     | 视觉     | `component.surface` + `component.field` / `component.layout` | 主题值/模式；默认/浅色/深色/无效                                    |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | 继承视觉 | `component.media`                                            | 画布主机尺寸为结构尺寸；继承表面                                    |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | 视觉     | `component.typography`                                       | 变体，颜色，`as`；默认/链接/禁用                                    |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | 仅行为   | 无                                                           | 序列化日历数据；没有视觉主机                                        |
| `vcard`                      | `forge-vcard`                                                                                                                                      | 仅行为   | 无                                                           | 序列化联系人数据；没有视觉主机                                      |

## 电子邮件组件

包含 `@mission-platform/email-components` 是因为它的 TSX 源是 Forge 创作的。电子邮件客户端没有
使用运行时自定义属性：渲染器将相同的语义角色解析为内联值。下面的每个条目
是可视化的，并使用 `component.email`，并在注明的情况下使用 `component.button`、`component.typography` 或 `component.media`。

| 水平 | 组件                                                                          | 合同                                                                                                                         |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 原子 | `email-button`                                                                | `component.email` + `component.button.<variant>`；变体中性/主要/次要/第三/成功/警告/信息/错误/严重/幽灵；默认/悬停/活动/禁用 |
| 原子 | `email-divider`、`email-image`、`email-spacer`、`email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`；默认                                       |
| 分子 | `email-card`、`email-column`、`email-list`、`email-row`、`email-social-links` | `component.email`；默认/选定链接是交互式的                                                                                   |
| 生物 | `email-footer`、`email-header`、`email-preheader`                             | `component.email` + `component.typography`；默认                                                                             |
| 模板 | `email-container`、`email-document`、`email-section`                          | `component.email`；默认/亮/暗光源模式                                                                                        |

## 故事和覆盖范围

249 个组件源有 246 个位于同一位置的故事。唯一没有独立故事的来源是
递归助手 `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block` 和 `content/molecules/forge-markdown/markdown-inline`；他们的
视觉状态由其父故事执行，并在上面记录为继承视觉。

共享 Storybook 预览加载 `@mission-platform/tokens/scss/tokens`、Storybook 覆盖插件和
`theme` 全球。要检查合约，请将全局主题设置为浅色或深色，并使用组件故事的控件；
要测试使用者覆盖，请使用以下命令编辑 `component` 下的 `apps/storybook/design-tokens/overrides.tokens.json`
`{ "light": "...", "dark": "..." }` 值。覆盖架构是
[`packages/tooling/vite/token-overrides/schema/token-overrides.schema.json`](../../../../packages/tooling/vite/token-overrides/schema/token-overrides.schema.json）。

以下叶子有意为组件范围，也可以在单个组件主机上覆盖
使用生成的 CSS 自定义属性。当主机发生故障时，组合组件中的后备值会保留默认值
没有定义覆盖。

| 组件                 | DTCG 覆盖路径                                      | 生成的 CSS 变量模式                                    |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Figma 交接清单

1. 创建具有浅色和深色模式的 `Mission Platform / Component` 变量集合。
2. 从 `component/<atomic-level>/` 源树导入组件路径，保留组件、变体、插槽、
   和状态部分。
3. 将组件变量绑定到相应的基元/语义变量，而不是复制原始颜色或比例值。
4. 为记录的变型和尺寸创建组件属性；仅为清单中列出的状态创建状态变体。
5. 将布局公式、视口断点、画布行为和 DOM/辅助功能行为保留在可视变量集合之外。
