# @mission-platform/components

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/components/docs/index.md: [packages/components/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/components` 是 Mission Platform 的剩余一次写入组件库。中的每个组件
该库是使用框架中立的 JSX 方言（通过 `@mission-platform/forge`）编写一次，然后在
将构建时间写入本机 **Vue 3**、**React**、**Svelte**、**Solid** 和 **Web 组件** 输出。

`ForgeTypography` 由专用 `@mission-platform/typography` 包拥有。而是从该包导入它
与 `@mission-platform/components` 相比。

## 架构：“编写一次，随处运行”

该包演示了高效的跨框架架构：

- **中性源**：组件使用 `@mission-platform/forge` 写入 `.tsx` 文件中。
- **两阶段编译**：使用 `@mission-platform/vite-plugin-forge`，将中性源转换为
  特定于框架的源代码（Vue SFC 和 React TSX），然后由各自的本机工具链进行编译。
- **零运行时开销**：没有运行时适配器。消费者直接导入原生组件
  `@mission-platform/components` 说明符；通过 `mp:<framework>` 导出选择框架**一次**
  条件 — `resolve.conditions`（参见 `defineFrameworkAppConfig` / `frameworkResolveConditions`
  `@mission-platform/vite-config`）和 `customConditions`（通过
  `@mission-platform/typescript-config/framework-<name>` 预设）。
- **Storyblok 集成**：构建过程还会生成 Storyblok 块配置和包装器，从而使
  使用这些相同组件的 CMS 驱动布局。

## 通用尺码

库中的每个组件都支持遵循规范 T 恤比例的 `size` 属性。这确保了一致
跨所有 UI 元素进行缩放。

|价值|标签|
| :---- | :---------------- |
| `2xs` |超超小|
| `xs` |超小 |
| `sm` |小|
| `md` |中（默认）|
| `lg` |大|
| `xl` |超大|
| `2xl` |特大号|

大多数组件都应用共享大小调整实用程序，该实用程序根据设计令牌调整 `font-size`。有些复杂
组件（如 `ForgeButton` 或 `ForgeHero`）具有针对填充、边距和布局的定制的按尺寸样式。

## 组件目录

### 布局与结构

用于在页面上排列内容的基元。

|组件|描述 |关键道具|
| :--------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack` |具有可配置间隙的 Flexbox 堆栈（行/列）。         | `direction`、`gap` (`2xs-2xl`)、`justify`、`align` |
| `ForgeGrid` | CSS 网格布局原语。                                | `rows`、`cols`、`gap`、`justify`、`align` |
| `ForgeSeparator` |带有可选标签的视觉分隔线（水平/垂直）。 | `orientation`、`variant`（`solid`/`dashed`/`dotted`）|
| `ForgeMasonry` |多柱砌体布局。                              | `columns`、`minColumnWidth`、`gap` |

### 应用程序外壳和导航

用于应用程序结构和路由的高级组件。

|组件|描述 |关键道具|
| :--------------------------- | :----------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar` |响应式顶部导航栏，带有品牌和汉堡菜单。 | `brand`、`sticky`、`mobileTitle` |
| `ForgeDrawer` |滑动面板（固定或内联响应）。                  | `open`、`placement`、`size`、`inlineBreakpoint` |
| `ForgePagination` |受控的页面导航控制。                          | `modelValue`、`pageCount`/`total`、`pageSize` |
| `ForgeTabs` | ARIA 选项卡列表，带有流动选项卡索引和面板。                | `tabs`、`modelValue`、`variant`（`line`/`pill`）|
| `ForgeMenu` / `ForgeMenubar` | `ForgeMenu` / `ForgeMenubar`可访问的递归菜单/带有子菜单的菜单栏。            | `items`、`orientation`、`ariaLabel` |
| `ForgeBreadcrumb` |链接的层次结构。                                 | `items`、`separator` |

### 版式和内容

文本样式和语义内容块。

|组件|描述 |关键道具|
| :----------- | :--------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero` |带有标题、副标题、媒体背景和操作的页面横幅。 | `title`、`subtitle`、`media`、`actions` |
| `ForgeQuote` |带归属的语义块引用。                            | `variant`、`tone`、`author`、`source` |
| `ForgeList` |通用列表（有序/无序/描述）。                    | `items`、`variant`、`tone`、`divided` |

### 表格和输入

用于数据输入的交互元素。

|组件|描述 |关键道具|
| :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------- |
| `ForgeButton` |具有变体和加载状态的基础按钮。 | `variant`、`size`、`loading`、`disabled` |
| `ForgeIconButton` |紧凑的纯图标按钮。                            | `label`（必需）、`variant`、`size` |
| `ForgeInput` / `ForgeTextarea` | `ForgeTextarea` |带有标签、提示和错误状态的文本字段。      | `modelValue`、`type`、`placeholder`、`label` |
| `ForgeCheckbox` / `ForgeRadio` | `ForgeCheckbox` / `ForgeRadio`布尔或组选择输入。                   | `modelValue`、`value`、`label` |
| `ForgeSwitch` |布尔设置的切换开关。                  | `modelValue`、`label`、`size` |
| `ForgeNumberStepper` |使用递增/递减按钮输入数字。       | `modelValue`、`min`/`max`、`precision` |
| `ForgeSlider` / `ForgeRangeInput` |单拇指或双拇指范围选择器。                | `modelValue`、`min`/`max`、`step` |
| `ForgeDateInput` / `ForgeDateRangeInput` | `ForgeDateInput` / `ForgeDateRangeInput`带有弹出日历的日期和日期范围选择器。  | `modelValue`、`min`/`max`、`size` |
| `ForgeColorInput` |带有十六进制文本字段的颜色选择器。                   | `modelValue`、`size`、`label` |

### 数据显示与虚拟化

用于有效处理大型数据集的组件。

|组件|描述 |关键道具|
| :--------------------- | :---------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable` |具有加载和空状态的可排序数据表。          | `columns`、`rows`、`onSort`、`loading` |
| `ForgeVirtualList` |大型数组的窗口列表（仅呈现可见行）。 | `items`、`itemHeight`、`height` |
| `ForgeVirtualTable` |具有粘性标题的虚拟化可排序表。              | `columns`、`rows`、`rowHeight`、`onSort` |
| `ForgeVirtualTreeView` |具有展开/折叠逻辑的窗口树视图。              | `nodes`、`itemHeight`、`onSelect`、`onToggle` |
| `ForgeTreeView` |递归可访问树（非虚拟化）。                | `nodes`、`defaultOpen`、`onSelect` |
| `ForgeTimeline` |垂直或水平事件列表。                          | `items`、`orientation`、`align` |

### 反馈和叠加

通知和加载指示器。

|组件|描述 |关键道具|
| :----------------- | :------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner` |不确定的加载环。                  | `size`、`variant`、`label` |
| `ForgeSkeleton` |用于加载内容的闪烁占位符。  | `shape` (`line`/`circle`/`block`)、`width`、`height` |
| `ForgeProgressBar` |确定或不确定的进度轨迹。 | `value`、`max`、`variant`、`indeterminate` |
| `ForgeStatusIcon` |小色调状态指示器字形。          | `status`、`size`、`label` |

### 媒体

处理图像、视频和平台的外观。

|组件|描述 |关键道具|
| :--------------------- | :------------------------------------------------------------ | :------------------------------------- |
| `ForgeResponsiveImage` |具有本机 srcset/sizes 的艺术指导 `<picture>`。            | `src`、`sources`、`aspectRatio`、`fit` |
| `ForgeResponsiveVideo` |具有固定宽高比的响应式视频播放器。              | `src`、`sources`、`poster`、`autoplay` |
| `ForgeBackgroundVideo` |全出血背景视频，支持缩减动作。      | `src`、`overlay`、`minHeight` |
| `ForgeDeviceMock` |屏幕周围的设备框架（移动设备/平板电脑/桌面设备/浏览器）。 | `device`、`orientation`、`url`、`size` |

## 实施细节

### 老虎机与道具

由于中性的 JSX 方言，某些组件使用**命名槽**（编译为 React 的子级/属性和 Vue 的命名槽）
插槽），而其他人则使用 **Scoped Render-Props** 来实现高性能虚拟化。

### 主题整合

与主题相关的组件归 `@mission-platform/theme` 所有。导入 `ForgeThemeToggle`、`ForgeThemeProvider`、
和该包中的 `ForgeThemeComposer`；它的单例存储管理文档根目录上的 `data-theme` 属性
和设计令牌 CSS 变量，而不需要每个应用程序中都有全局状态提供程序。

完整的剩余库存和依赖感知的未来包分割记录在
[分解图](decomposition-map.md）。 `ForgeDrawer` 和 `ForgeWindowPopout` 仍在此包中待处理
那里描述了单独的覆盖/窗口边界决策。
