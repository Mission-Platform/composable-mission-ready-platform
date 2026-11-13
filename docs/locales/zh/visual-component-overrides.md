# 可视化组件覆盖契约和迁移清单

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> 语言: 简体中文 (zh)

状态：组件属性注册和 Vue 范围样式支持
已实施。 `properties` 型袋子，中性 `style` 排放，位于同一位置
`@property` 部分和目标感知 Vue `v-bind()` 降低已到位。

## 范围及审核方法

审核目标是符合以下条件的完整集合：

```text
packages/**/src/components/**/*.module.scss
```

当前审计发现 **17 个软件包中有 258 个源模块**。对于每个模块，以下内容
检查了同位接触点：

- `<component>.tsx` — 中立的 JSX 接口和根/包装器所有权；
- `<component>.module.scss` — 声明、现有 `--forge-*` 变量、
  `--mp-*` 令牌覆盖率、选择器、伪类和媒体规则；每个
  以本地组件为前缀的 `--forge-*` 参考进行检查
  注册部分；
- `<component>.stories.tsx` — 具有代表性的 Storybook 表面；
- `<component>.spec.ts` — 中性和/或目标渲染回归覆盖；
- `index.ts` — 本地类型/组件导出和包组件
  桶（`packages/<package>/src/components/index.ts`）。

每个审核的模块都有一个中立的 `.tsx` 源和一个位于同一位置的
`.stories.tsx`。每个模块都有一个位于同一位置的 `index.ts`，除了
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`；
该包桶直接导出源文件。包级
因此，即使本地桶是出口的，桶也是出口接触点。
失踪了。

这种分类是有意保守的：

- **原型** — 已经实现了嵌套包/继承变量模式
  是兼容性参考。
- **现有语义变量** — 已经发出自定义属性，但是
  值源自语义属性，例如 `columns`；不要重复它
  在通用覆盖袋中。
- **迁移/审查** — 视觉共置 CSS，可以公开狭隘拥有的、
  在逐个组件 API 决策后进行令牌支持的控制。一个
  标记化声明本身并不是将其公开的理由。
- **排除** — 生成的字形、诊断、供应商/画布、无渲染状态、
  或编辑器拥有的样式，在此过程中没有安全的组件拥有的覆盖。

## 合同

### 公形

每个被批准覆盖的组件都拥有一个命名接口。的
属性是可选的并且没有索引签名：

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

具体组件接口仍然是公共导出，例如
`TypographyProperties`；不要引入全局 `CSSProperties` 字典。
当值具有稳定的语法时，请使用更具描述性的别名（例如，
`TypographyFontFamily` 或 `TypographyLineHeight`) 并仅在以下情况下使用 `string`
CSS 语法合法地包含标记引用、`calc()`、逗号或
浏览器定义的值。未知密钥必须被 TypeScript 多余拒绝
财产检查。

嵌套键是组件拥有的概念，而不是原始 CSS 声明。做
不公开 `display`、`position`、`content`、动画内部结构或
其预期决策已由语义属性表示的声明
（`size`、`variant`、`columns`、`rows`、`gap` 等）。

### 自定义属性名称和样式表解析

将嵌套键转换为一个稳定的 kebab-case 自定义属性：

|嵌套键 |定制属性|
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

组件 slug 是公共 CSS 命名空间。 SCSS 声明解决
令牌/默认回退之前的覆盖：

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

如果当前声明具有有意义的非标记默认值，请将其保留为
最后后备 (`var(--forge-..., var(--mp-token, 1px))`)。不要创建新的
`packages/tokens` 已涵盖的值的 Mission Platform 代币。

当值必须跨越后代时，将 `@property` 与 `inherits: true` 一起使用，
变体选择器、伪类或弹出/包装边界。把
拥有 BEM 根的元素上的内联自定义属性映射。对于一个
多元素组件，将其放在可靠的现有包装上，以便所有
子孙继承它；不依赖嵌套的 Vue 作用域属性
渲染闭包节点。在该包装器外部呈现的门户需要显式
门户主机/传播决策，而不是默默的全局变量。

### 声明完整性

组件模块读取的每个具体 `--forge-*` 属性必须具有
模块导入中恰好有一个匹配的 `@property` 注册，
位于 `_forge-<component>-properties.scss` 部分。注册符合
符合 W3C CSS 属性和值 API 级别 1 规范：
他们使用 `syntax: "*"` 和 `inherits: true`，没有无效的 `initial-value`
描述符，允许标准 `var(--forge-*, var(--mp-*))` 后备解决
在接近 $O(1)$ 风格评估。注册时写为具体名称
而不是未解决的 Sass 插值。这包括每个有限的尺寸，
语气、状态、版式、弹出窗口和地图生成的变体，以及语义锚点
例如 `--forge-logo-columns`、`--forge-stats-columns`、
`--forge-testimonial-columns`、`--forge-grid-columns` 和
`--forge-grid-rows`。

`--forge-*` 声明是组件本地覆盖元数据。的
`--mp-*` 变量仍归 `packages/tokens` 所有，并且不得被
在组件部分中重新声明。可重复防护装置可用作
`pnpm validate:component-properties`；它仅扫描源模块并报告
丢失、重复、孤立或未解决的确切模块和属性
声明。

### 中性输出和优先级

中性 JSX 输出使用由以下方法生成的标准 `style` 属性：
`createForgeComponentStyle(prefix, props.properties)`。它的类型接受两者
通过平台的 `ForgePropertyBag` / 实现驼峰式和短横线式密钥
`CSSStyleProperties`，具有自动转换和前缀：

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

发出的对象中省略了未定义的值，因此令牌回退仍然存在
活跃。切勿发出 `styles` 属性；它不是中性运行时的一部分
契约，并且在不降低它的目标中将是一个未知的 DOM 属性
特别是。数字语义变量可以保留其现有的 `number`
代表；输入的覆盖值是 CSS 字符串，因此单位、逗号、空格、
和 `calc()` 保持不变。

### CSS 级联层层次结构和原子结构

所有样式都组织成明确的、确定性的 `@layer` 层次结构
在根令牌层声明（`@mission-platform/tokens`）：

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

组件样式表将其规则分配给各自的包和原子
子层（例如 `@layer mp.components.atoms`、`@layer mp.components.molecules`、
`@layer mp.scheduler.organisms`)，保证可预测的级联优先级
没有具体冲突。

### 通过 `@supports` 逐步增强性能

复杂的复合组件和重型有机体利用现代浏览器 CSS
由 `@supports` 功能查询保护的功能具有弹性优雅
退化：

1. **`content-visibility: auto`**：重载的离屏布局和绘制成本
   有机体（`ForgeScheduler`、`ForgeCodeBlock`、`ForgeBarcode`、`ForgeTable`）
   被 `contain-intrinsic-size` 推迟。
2. **容器查询（`@container`）**：自适应密度和响应式
   组件排版通过以下方式适应容器尺寸
   `@supports (container-type: inline-size)`。
3. **单跳回退**：属性查找保持浅层
   `var(--forge-*, var(--mp-*))` 图表可将样式重新计算保持在 $O(1)$ 附近。

优先级从最低到最高：令牌/主题后备、组件
变体/默认规则、语义道具选择、组件覆盖自定义
属性，然后是显式提供的消费者内联样式（如果目标
支持一）。 `className` 保留调用者的类钩子并且可以添加规则，
但不得将其视为打印包的替代品。覆盖
bag 不会更改选定的语义变体或绕过焦点，禁用，
简化运动或级联层规则。

React、Svelte、Solid 和 Web 组件输出使用中性 `style` 映射。
只有 Vue 本机模板 SFC 样式路径可以稍后重写相应的
SCSS 值为 `v-bind('properties.<name>')`； Vue 渲染关闭回退和
所有非 Vue 样式表路径必须保持有效的普通 CSS/SCSS。

该降低的实施接触点是中性运行时
`packages/core/forge-jsx/src/runtime/types.ts` 和 `packages/core/forge-jsx/src/runtime/h.ts` 中的合同，
现有中性至 Vue 风格降低
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`，以及位于同一位置的
`packages/compiler/plugins/forge-vue/src/runtime/styles.ts` 中的样式组装/发射和
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`。这些文件携带或降低
输入 `style` 值；他们不得添加特定于框架的 `styles` 属性。

## 原型和现有候选者

这些是确切的现有自定义属性站点。它们是回归和
兼容性锚点，而不是用包替换语义 API 的请求。

|组件|风格模块 |现有变量 |当前所有者/处置 |后期接触点 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` |完整的 `--forge-typography-*` 表面，包括基础、显示、变体、颜色、链接和弹出值 |原型;通过排版根和截断弹出包装继承 | `forge-typography.tsx`、本地 `index.ts`、`.spec.ts`、`.stories.tsx`；所有具体名称均在共同定位的部分 | 中注册。
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` |现有语义变量；保留`columns` 及其夹紧| `forge-logo-cloud.tsx`，本地桶，规格，故事；没有重复的 `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` |现有语义变量；保留 `columns` | `forge-stats-section.tsx`，本地桶，规格，故事；没有重复的 `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` |现有语义变量；保留 `columns` | `forge-testimonials-section.tsx`，本地桶，规格，故事；没有重复的 `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`、`--forge-grid-rows` |源自 `columns`/`rows` 的现有语义变量；保留夹紧和断点行为| `forge-grid-layout.tsx`，本地桶，规格，故事；没有重复的网格袋|

版式原型现在具有每个的完整注册部分
其模块消耗的具体属性，包括所有有限变体和
弹出名称。其中性 JSX 输出使用 `style={style}` 并保留类型
`CSSStyleProperties` 扩展；语义排版 API 保持不变。

## 包裹级库存

下面的列表是 258 个匹配的完整组件块库存
样式模块。对于每个 slug，模块，中性来源，故事和（其中
目前）spec 位于包现有原子下的同一目录中，
分子、有机体或模板路径。第一个包模块 glob
列是样式文件的精确路径规范。

|包和确切的模块路径规范 |   计数 |处置 |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 |迁移/审查生成的条形码演示 |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 |排除诊断/调试演示 |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 |迁移/审查扫描仪主机/框架演示|
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 84 3个现有语义变量； 81 迁移/审查 |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 10 8 迁移/审查； 2 编辑拥有/排除 |
| `packages/ui/float/src/components/**/*.module.scss` |       8 |迁移/审查；弹出/门户继承优先级|
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | 28迁移/审查，保留控制语义 |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | 106排除生成的字形包装器 |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1个现有语义变量； 6 迁移/审核 |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 |排除 MapLibre/canvas 主机 |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 |迁移/审查生成的代码演示 |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 |迁移/审查生成的代码演示 |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 |迁移/审查域演示 |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 |迁移/审查域演示 |
| `packages/ui/select/src/components/**/*.module.scss` |       3 |迁移/审查，保留选择语义 |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 迁移/审核； 2 无渲染/状态排除 |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 |原型|
| **总计** | **258** | **141 迁移/审查，5 原型/语义锚，112 排除** |

### 覆盖信号

以下信号来自同一模块扫描，并且是故意的
正交。 **MP refs** 对包含 `--mp-*` 引用的模块进行计数； **颜色
Literals** 对包含颜色函数或十六进制的模块进行计数； **尺寸
Literals** 对包含 CSS 长度/百分比文字的模块进行计数（包括
故意为零/视口值）； **Forge vars** 对包含以下内容的模块进行计数
现有 `--forge-*` 变量； **无令牌信号** 对包含的模块进行计数
`--mp-*` 和 `--forge-*` 都不是。这些是分类信号，不是自动 API
决定。

|套餐 |模块 |议员参考|颜色文字 |尺寸文字 |锻造变量 |无令牌信号 |根/包装分类 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
|条码| 1 | 1 | 0 | 1 | 0 | 0 |单个条码根 |
|断点| 1 | 1 | 1 | 1 | 0 | 0 |诊断根源|
|代码扫描仪 | 1 | 1 | 0 | 1 | 0 | 0 |扫描仪主机/框架根 |
|组件 | 84 | 84 83 | 83 3 | 75 | 75 3 | 1 | BEM 根；选定的内部网格和包装|
|内容 | 10 | 10 9 | 0 | 6 | 0 | 1 | root plus 编辑器/工具栏包装器 |
|浮动| 8 | 8 | 0 | 8 | 0 | 0 |弹出窗口、对话框、toast 和门户相邻包装器 |
|表格| 28 | 28 28 | 28 0 | 25 | 25 0 | 0 |控制根与状态后代|
|图标| 106 | 106 0 | 0 | 1 | 0 | 106 | 106生成的字形根/SVG 包装器 |
|布局| 7 | 2 | 0 | 7 | 1 | 4 |布局根；网格根上的网格变量 |
|地图 | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre 主机/画布根 |
|矩阵码| 1 | 1 | 0 | 1 | 0 | 0 |生成代码根 |
|二维码 | 1 | 1 | 0 | 1 | 0 | 0 |生成代码根 |
|资源规划师 | 1 | 1 | 0 | 1 | 0 | 0 |具有密集后代的规划根 |
|调度程序| 1 | 1 | 0 | 1 | 0 | 0 |具有密集后代的调度程序根 |
|选择 | 3 | 3 | 0 | 3 | 0 | 0 |使用弹出后代选择/控制根 |
|主题| 3 | 2 | 0 | 0 | 0 | 1 |切换根；作曲家/提供商包装器 |
|版式 | 1 | 1 | 0 | 1 | 1 | 0 |排版根加上截断弹出包装|
| **总计** | **258** | **143** | **4** | **134** | **5** | **114** |信号按设计重叠 |

根放置规则遵循此分类：普通 BEM 模块
将地图附加到其根目录； `ForgeLogoCloud`、`ForgeStatsSection` 和
`ForgeTestimonialsSection` 当前将语义列变量放置在其
内部网格/列表； `ForgeGridLayout` 将行/列放置在其根上；和
`ForgeTypography` 将继承的值放置在弹出包装器上
包装器存在。浮动/选择弹出结构使用相同的包装级别
继承规则，并且声明守卫涵盖了其使用的每个属性
弹出样式。

### `@mission-platform/barcode`、`breakpoints` 和 `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — 来源、模块、本地索引、规格、故事。仅查看生成的/条形码
  不属于条形码编码 API 一部分的尺寸或表面控件。
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — 来源、模块、本地索引、规格、故事。排除：这是一个诊断
  视口/调试显示，不是可重用的视觉主题表面。
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — 来源、模块、本地索引、规格、故事。检查扫描仪框架/容器
  仅控制；扫描仪引擎行为不是样式 API。

### `@mission-platform/components` (84)

以下所有条目都有 `<slug>.tsx`、`<slug>.module.scss`、
`<slug>.stories.tsx`、`<slug>.spec.ts` 和 `<slug>/index.ts`，带有软件包
桶位于 `packages/ui/components/src/components/index.ts`。

**现有的语义变量锚点：**
`forge-logo-cloud`、`forge-stats-section`、`forge-testimonials-section`。

**迁移/审查：**

- 原子：`forge-avatar`、`forge-background-video`、`forge-badge`、
  `forge-button`、 `forge-divider`、 `forge-gauge`、 `forge-icon-button`、
  `forge-icon`、 `forge-kbd`、 `forge-progress-bar`、 `forge-quote`、
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`、 `forge-spinner`、 `forge-stack`、 `forge-status-icon`、
  `forge-surface`、`forge-sync-status-indicator`。
- 分子：`forge-accordion`、`forge-alert`、`forge-breadcrumb`、
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`、`forge-drop-zone`、`forge-empty-state`、`forge-grid`、
  `forge-in-view`、 `forge-inline-edit`、 `forge-list`、 `forge-masonry`、
  `forge-mention-input`、 `forge-menu-item`、 `forge-menu`、 `forge-metric-card`、
  `forge-navbar-item`、 `forge-pagination`、 `forge-shortcut-hint`、 `forge-tabs`、
  `forge-tag-input`、`forge-timeline`、`forge-window-popout`。
- 生物体：`forge-activity-feed`、`forge-announcement-bar`、
  `forge-asset-browser`、`forge-carousel`、`forge-chat-area`、
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`、`forge-drawer`、`forge-error-page`、
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`、`forge-notification-panel`、`forge-onboarding-tour`、
  `forge-pricing-table`、`forge-profile-card`、`forge-site-footer`、
  `forge-split-pane`、`forge-table`、`forge-transfer-list`、`forge-tree-view`、
  `forge-virtual-list`、`forge-virtual-log-viewer`、`forge-virtual-table`、
  `forge-virtual-tabs`、`forge-virtual-tree-view`。
- 模板：`forge-hero`。

三个现有的锚点仅针对当前的语义属性
`columns` API；稍后的通行证可能会添加其他狭隘拥有的财产，但必须
不公开选择列的第二种方法。

### `@mission-platform/content` (10)

`forge-code-block`、`forge-mermaid`、`forge-wysiwyg-toolbar-button`、
`forge-markdown`、`forge-wysiwyg-block-controls`、`forge-wysiwyg-block-menu`、
`forge-wysiwyg-status-bar`、`forge-wysiwyg-toolbar`、`forge-monaco-editor`、
`forge-wysiwyg-editor` 在其现有的原子/分子/有机体下
目录，所有目录都有源代码、模块、故事、本地索引和包
桶位于 `packages/content/content/content/src/components/index.ts`。

`forge-code-block`、`forge-mermaid`、`forge-markdown` 的规格
`forge-monaco-editor`、`forge-wysiwyg-status-bar` 和
`forge-wysiwyg-editor`。其他四个所见即所得控件没有规格。
`forge-monaco-editor` 和 `forge-wysiwyg-editor` 不包括在直接
编辑器样式覆盖：Monaco/编辑器 DOM 和编辑器状态拥有其内部
风格。他们周围的主机/工具栏仍然是审查候选者。

### `@mission-platform/float`、`forms`、`layout` 和域包

- Float（全部 8 个，每个都有源/模块/规范/故事/本地索引）：
  `forge-alert-banner`、`forge-dropdown`、`forge-popover`、`forge-toast`、
  `forge-tooltip`、`forge-dialog`、`forge-modal`、`forge-toast-container`。
  优先考虑根到弹出窗口的继承和包装器/门户行为。
- 表格（全部 28 个，每个都有源/模块/规范/故事/本地索引）：
  `forge-checkbox`、`forge-input`、`forge-radio`、`forge-range-input`、
  `forge-rating`、 `forge-slider`、 `forge-switch`、 `forge-textarea`、
  `forge-calendar`、`forge-color-input`、`forge-date-input`、
  `forge-date-range-input`、`forge-field-set`、`forge-file-input`、
  `forge-location-input`、`forge-number-stepper`、`forge-otp-input`、
  `forge-phone-input`、`forge-radio-group`、`forge-search-input`、
  `forge-segment-control`、`forge-time-input`、`forge-time-range-input`、
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`、`forge-schema-form`。
  保留 `size`、验证、检查、禁用和选择语义。
- 布局：`forge-container`、`forge-application-layout`、`forge-bento-layout`、
  `forge-f-pattern-layout`、`forge-vertical-layout`、`forge-z-pattern-layout`
  是审查候选人。 `forge-grid-layout` 是现有的语义锚
  并保留 `rows`、`columns`、`gap`、`margin`、`padding` 和 `breakpoint`。
  封装桶为`packages/ui/layout/src/components/index.ts`。
- 生成/域候选（每个都有源/模块/故事/本地索引/规范
  除非另有说明）：`forge-matrix-code`（`packages/matrix-code`）、`forge-qr-code`
  （`packages/qr-code`），`forge-resource-planner`
  （`packages/resource-planner`；无本地索引，直接从
  `src/components/index.ts`) 和 `forge-scheduler` (`packages/scheduler`)。
- 选择：`forge-tag`、`forge-multiselect` 和 `forge-select`，每个都带有
  source/module/spec/story/local 索引和包桶。保留选项
  状态和选择道具语义。
- 主题：`forge-theme-toggle` 是审查候选者； `forge-theme-composer`
  和 `forge-theme-provider` 被排除在视觉覆盖迁移之外，因为
  主题状态/无渲染提供者基础设施。包装桶为
  `packages/ui/theme/src/components/index.ts`。

### `@mission-platform/icons` (106)

所有 106 个图标模块都是在下面生成的字形包装器
`packages/ui/icons/src/components/**`，具有中立的来源、模块、故事和
本地导出，并由生成的导出
`packages/ui/icons/src/components/index.ts`。没有一个具有共同定位的规范。的
完整生成的名称是：

`forge-icon-alert`、`forge-icon-alert-critical`、`forge-icon-alert-info`、
`forge-icon-alert-neutral`、`forge-icon-alert-warning`、`forge-icon-align-center`、
`forge-icon-align-justify`、`forge-icon-align-left`、`forge-icon-align-right`、
`forge-icon-arrow`、 `forge-icon-bell`、 `forge-icon-blockquote`、 `forge-icon-bold`、
`forge-icon-bullet-list`、`forge-icon-calendar`、`forge-icon-camera`、
`forge-icon-chat`、`forge-icon-check`、`forge-icon-chevron`、`forge-icon-chevrons`、
`forge-icon-clock`、 `forge-icon-close`、 `forge-icon-cloud`、 `forge-icon-code-block`、
`forge-icon-code-inline`、 `forge-icon-copy`、 `forge-icon-debug`、 `forge-icon-download`、
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`、 `forge-icon-external-link`、 `forge-icon-eye`、 `forge-icon-eye-off`、
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`、`forge-icon-heading-one`、`forge-icon-heading-six`、
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`、 `forge-icon-image`、 `forge-icon-info`、 `forge-icon-italic`、
`forge-icon-join`、`forge-icon-language`、`forge-icon-lightning`、`forge-icon-link`、
`forge-icon-lock`、 `forge-icon-lock-open`、 `forge-icon-mail`、 `forge-icon-map-pin`、
`forge-icon-menu`、`forge-icon-minus`、`forge-icon-move`、`forge-icon-notice`、
`forge-icon-numbered-list`、`forge-icon-palette`、`forge-icon-pause`、
`forge-icon-pencil`、`forge-icon-phone`、`forge-icon-play`、`forge-icon-plus`、
`forge-icon-puzzle`、 `forge-icon-qr-code`、 `forge-icon-refresh`、 `forge-icon-redo`、
`forge-icon-route`、`forge-icon-rotate-ccw`、`forge-icon-rotate-cw`、
`forge-icon-scale-down`、`forge-icon-scale-up`、`forge-icon-search`、
`forge-icon-send`、 `forge-icon-settings`、 `forge-icon-share`、 `forge-icon-sort`、
`forge-icon-split`、`forge-icon-star`、`forge-icon-strikethrough`、
`forge-icon-table`、`forge-icon-table-column-add`、`forge-icon-table-column-remove`、
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`、 `forge-icon-underline`、 `forge-icon-upload`、 `forge-icon-user`、
`forge-icon-warning`、`forge-icon-waypoint`、`forge-icon-wrench`。

这些样式仅建立字形包装器（`inline-flex`、对齐方式、
`currentColor` 或 SVG 大小调整）。消费者已经通过以下方式控制图标大小
周围的图标/字体上下文或图标的语义 API。不要添加
包到每个生成的图标。

### `@mission-platform/map` 和 `@mission-platform/typography`

`forge-map-libre` 是唯一的 MapLibre 主机模块
`packages/integrations/map/src/components/organisms/forge-map-libre/`；它有一个故事
本地/包导出，但没有共存规范。它的画布/地图引擎拥有
内部视觉模型，因此被排除；只有主机大小调整行为应该是
如果以后的 API 明确需要它，则予以考虑。

`forge-typography` 是唯一的排版模块
`packages/ui/typography/src/components/atoms/forge-typography/`。它的来源，
本地索引，包桶（`packages/ui/typography/src/components/index.ts`），
规格和故事正是第 2 步的接触点。其现有继承
属性是字体系列、行距、显示规格和
截断弹出窗口的后代。

## 显式排除和纯语义规则

1. **电子邮件组件：** 258 匹配集中没有电子邮件模块。电子邮件样式
   有意内联并遵循单独的渲染模型；不添加
   该合约为 `packages/email-components`。
2. **生成的图标：** 保留所有 106 个 `@mission-platform/icons` 模块
   语义字形组件，没有每个图标的视觉包。
3. **诊断/基础设施主机：** `ForgeBreakpointDebug`、`ForgeMapLibre`、
   `ForgeThemeComposer` 和 `ForgeThemeProvider` 仍被排除在外
   原因同上。摩纳哥/编辑拥有的 DOM 也仍然被排除在外。
4. **现有语义维度：** `ForgeLogoCloud.columns`，
   `ForgeStatsSection.columns`、`ForgeTestimonialsSection.columns` 和
   `ForgeGridLayout.rows`/`columns` 仍然是这些决策的唯一所有者。
   他们现有的定制属性名称不得与未来的包袋冲突
   名称。
5. **语义交互道具：** `size`、`variant`、选中/选中状态、
   验证状态、断点、行/列和控制行为不是
   CSS 覆盖键。该包可以调整组件拥有的视觉价值
   选定的语义状态，但不能替换该状态。

## 步骤 2 实施清单

- 仅向分类行添加类型化 `properties` 接口
  **确认声明属于组件所有后进行迁移/审查**。
- 将每个中性覆盖样式键入为 `CSSStyleProperties` 与
  组件的显式自定义属性键 (`string | undefined`)；做
  不要将其替换为 `Record<string, string>` 或全局 CSS 字典。
- 为每个暴露的密钥添加一个 `--forge-<slug>-<key>` 后备，并带有令牌后备
  和 `inherits: true`（后代需要它）。
- 通过 `style` 仅将定义的值附加到组件根/包装器；
  从来没有 `styles` 也从来没有未知的包属性。
- 当新的公共时更新确切的本地索引和包组件桶
  类型介绍；保留现有的出口订单/公约。
- 将默认/一次覆盖/嵌套状态覆盖添加到每个受影响的规范和
  覆盖现有同地故事的示例。使用锚规格
  徽标/统计/推荐/网格来保护语义变量。
- 保持 Vue 发射器工作独立：可以使用本机模板作用域样式
  Vue `v-bind()`，而中性源和其他目标样式必须保留
  框架中立。
