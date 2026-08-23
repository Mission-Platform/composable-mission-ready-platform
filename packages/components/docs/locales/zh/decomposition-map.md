# 组件分解图

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/components/docs/decomposition-map.md: [packages/components/docs/decomposition-map.md](../../decomposition-map.md)
> 语言: 简体中文 (zh)

本文档记录了提取`ForgeTag`后的剩余库存
`@mission-platform/select`，浮动和通知 UI 到 `@mission-platform/float`，
并将主题 UI/状态设置为 `@mission-platform/theme`。中性桶位于
`src/components/index.ts` 目前导出 **45** 组件；下面的列表是
建议的下一波所有权边界，而不是创建额外的包
通过这次迁移。

## 推荐的下一波套餐

### `@mission-platform/navigation`

`ForgeBreadcrumb`、`ForgeMenu`、`ForgeMenuItem`、`ForgeMenubar`、`ForgeNavbar`、
`ForgeNavbarItem`、`ForgePagination`、`ForgeTabs` 和 `ForgeVirtualTabs`。

这些组件共享键盘导航、移动焦点、菜单/选项卡状态以及
面向导航的交互合约。他们的中立实施取决于
在 `@mission-platform/forge` 上；菜单和类似表格的控件也使用
`@mission-platform/icons`，而面包屑/导航栏内容则构成所有权
`@mission-platform/typography` 包。 `ForgeNavbar` 目前组成
残留 `ForgeDrawer`，因此提取导航需要保留
显式依赖或首先确定抽屉边界；它一定不能介绍
从 `@mission-platform/components` 回到导航的依赖关系。

### `@mission-platform/data-display`

`ForgeAccordion`、`ForgeList`、`ForgeTable`、`ForgeTreeView`、`ForgeVirtualList`、
`ForgeVirtualTable`、`ForgeVirtualTreeView`、`ForgeVirtualLogViewer`、
`ForgeTimeline`、`ForgeBadge`、`ForgeProgressBar` 和 `ForgeStatusIcon`。

普遍关注的是呈现结构化或大容量数据，包括
窗口、排序、树扩展和状态呈现。当前来源
使用 `@mission-platform/forge`，并且在组成文本或字形的情况下，
`@mission-platform/typography` 和 `@mission-platform/icons`；这些应该保留
未来包的较低级别依赖项。虚拟组件应随移动
他们的风格/规格/故事位于同一位置，因此他们的中性钩子行为和五个
Forge 目标仍然一起进行测试。

### `@mission-platform/layout`

`ForgeCard`、`ForgeGrid`、`ForgeMasonry`、`ForgeStack`、`ForgeSeparator` 和
`ForgeCollapse`。

这些是结构基元，不依赖于提取的浮动、主题、
或选择套餐。 `ForgeCard` 和当前使用的间距方位基元
包本地 SCSS 实用程序，因此移动必须要么携带这些样式，要么推广
稳定的较低级别包的实用程序；它不应该触及另一个
域包的源代码树。

### `@mission-platform/media`

`ForgeBackgroundVideo`、`ForgeResponsiveImage`、`ForgeResponsiveVideo`、
`ForgeCarousel` 和 `ForgeDeviceMock`。

前三个拥有媒体加载/渲染语义，而轮播和设备
围绕媒体模拟添加演示。他们的中立来源目前取决于
`@mission-platform/forge`，对于轮播控件，`@mission-platform/icons`；
对提取的包没有依赖性。保留减少运动和
每个组件 CSS 作为未来举措的一部分，而不是分割媒体行为
从它的风格来看。

### `@mission-platform/communication`

`ForgeChatBubble` 和 `ForgeChatArea`。

这些组件共享对话语义、活动区域行为和消息
布局。 `ForgeChatBubble` 组成 `ForgeAvatar` 和 `@mission-platform/typography`
今天，所以未来的一揽子计划应该取决于那些稳定的公共合同
原语（或将它们保留在基础包中）而不是导入残差
通过别名的组件源文件。

## 目前仍保留在一起的组件

将此小基础/内容/模板集保留在 `@mission-platform/components` 中
直到它有足够的 API 表面来证明另一个边界的合理性：

`ForgeAvatar`、`ForgeButton`、`ForgeButtonGroup`、`ForgeIconButton`、`ForgeQuote`、
`ForgeSkeleton`、`ForgeSpinner` 和 `ForgeHero`。

`ForgeInView` 也被保留为一个小型交互实用程序。 `ForgeTypography`
由 `@mission-platform/typography` 所有，故意不属于
残留桶。

## 延迟覆盖/窗口候选

`ForgeDrawer` 和 `ForgeWindowPopout` 在此更改中故意不移动。
`ForgeDrawer` 是覆盖/窗口相邻的，当前由
`ForgeNavbar`； `ForgeWindowPopout` 拥有浏览器窗口生命周期，因此
需要单独的 SSR、焦点和跨窗口合约决策。评估两者
在创建包之前与导航和浮动所有者联系，并且不要保留
重复实现作为兼容性快捷方式。

## 边界审核

检查残留组件源是否导入提取的包：
没有导入 `@mission-platform/theme`、`@mission-platform/float` 或
`packages/components/src` 下的 `@mission-platform/select`。中性成分
使用 `@mission-platform/forge`，从 `@mission-platform/icons` 中选择图标，
来自 `@mission-platform/typography` 的排版和包本地样式/实用程序。
故事可以导入包桶来锻炼公共表面；那不是
实现依赖性或包周期。

每个剩余组件都保留其共同定位的 `index.ts`、中性源、SCSS、
规格和故事书故事。包清单发布 `dist`、组件、
仅样式和实用程序；不再包含提取的商店树。

## 共享规模公用事业合同

`.forge-size--2xs` 到 `.forge-size--2xl` 类是故意的
由 `@mission-platform/tokens/scss/tokens` 发出，而不是由残差发出
组件包。残留成分和提取的 `float` 和 `theme`
包都使用这些类，而独立的 Forge 包输出不能
可靠地包含 `@mission-platform/components` 拥有的 CSS 模块。

令牌桶在 `mp.tokens` 级联中包含一次 `scss/_size.scss`
层，以及令牌自定义属性和基础重置。这保留了
现有的优先契约：无分层的应用程序样式覆盖
实用程序规则，并且每个受影响的应用程序/故事书条目都已导入
代币桶。因此，组件不断发出稳定的全局类
名称，而不重复每个包装中的尺寸比例。
