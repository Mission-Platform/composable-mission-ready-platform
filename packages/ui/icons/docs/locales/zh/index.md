# @mission-platform/icons

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/ui/icons/docs/index.md: [packages/ui/icons/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/icons` 是用于 Mission Platform 的框架中立的 SVG 图标组件的集合。每个图标都是
编写一次并编译为本机 Vue 3、React、Solid、Svelte，并在构建时构建 Web 组件。

## 架构与分布

该软件包利用 `@mission-platform/vite-plugin-forge` 为所有用户提供高性能、tree-shakable 图标
支持的框架：

- **编译**：单个 `pnpm build` 为每个目标发出一个框架本机包，即确定性 `dist/icons.svg`
  精灵和每个图标的 CSS 资源。
- **单一入口，条件解决**：只有一个公共入口点，
  `@mission-platform/icons`。它携带 `mp:vue`、`mp:react`、`mp:solid` 和
  `mp:web-component` 导出条件；无论您的工具链激活哪一个，都决定哪个编译版本是裸露的
  说明符解析为。在没有设置任何条件的情况下，它会回落到中立锻造源，这就是其他锻造源
  “一次写入”组件会消耗。

## 用法

### 选择框架

选择框架**一次**，而不是每次导入 - 在 Vite 到 `resolve.conditions` 中（使用
`defineFrameworkAppConfig` 或 `frameworkResolveConditions`（来自 `@mission-platform/vite-config`）和 TypeScript
通过 `customConditions`（扩展 `@mission-platform/typescript-config/framework-<name>`
预设）：

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### 进口

然后，每个导入都是裸露的并且跨框架相同：

**Vue 3**（`mp:vue` 活动）：

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React**（`mp:react` 活动）：

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### 中性成分进口

创作框架中立组件（由 `vite-plugin-forge` 编译）时，没有 `mp:*` 条件处于活动状态，并且
相同的说明符为您提供中性来源：

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## 分类和目录

创作文件夹和故事书标题遵循 `icons/<category>/<subcategory>/<icon-name>`。审查的目录涵盖
`navigation`、`text`、`maps`、`routing`、`drawing`、`content`、`status`、`communication`、`media`、`security`、`data`、
`time` 和 `objects`。差距审查记录在 `src/catalog.ts` 中；它保持国家支持数据驱动和记录
推迟特定于应用程序的艺术作品，而不是为每个国家/地区创建一个组件。

## 精灵重用

每个包装器都会使用 `<use href="#icon-id">` 引用呈现可访问的外部 `<svg>`。 `IconSpriteProvider` 安装座
内联子树的规范符号一次：

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

对于外部可缓存资源，请使用 `src="/assets/icons.svg"` 和 `inline={false}`。外部 SVG 片段引用
需要同源访问或兼容的 CORS 策略；内联模式是 SSR、限制性 CSP 或浏览器的后备模式
无法解析外部片段。包构建发出 `dist/icons.svg`，也可用作
`@mission-platform/icons/icons.svg`。

## 国家和成分 API

`ForgeIconFlag` 和 `ForgeIconCountryGlobe` 接受来自 `SUPPORTED_COUNTRY_CODES` 的大写 ISO 样式代码，包括
`US`、`CA`、`JP`、`GB` 和 `ZA`。不受支持的运行时值会引发描述性错误。国家地球仪、路线/航点
模式和未来的覆盖是类型符号组合：它们通过转换引用现有 ID 并进行检查
用于在精灵生成之前缺少引用和循环。

## API参考

每个图标在使用 `.forge-icon-<name>` BEM 类的居中 `<div>` 包装器中呈现 `<svg role="img">`。
所有图标均基于 $24 \times 24$ 视图框。

### 通用道具

| 道具        | 类型               | 默认             | 描述                                                                                             |
| :---------- | :----------------- | :--------------- | :----------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`           | 宽度和高度。支持命名标记（`'2xs'`、`'xs'`、`'sm'`、`'md'`、`'lg'`、`'xl'`、`'2xl'`）或像素编号。 |
| `color`     | `string`           | `'currentColor'` | 描边颜色（以及填充标记图标的填充）。                                                             |
| `ariaLabel` | `string`           | _每个图标默认_   | 可访问的名称。如果省略，图标将标记为 `aria-hidden`。                                             |

### 行为图标

某些图标包含额外的道具来控制其外观：

| 图标               | 额外道具                                                            | 描述                                |
| :----------------- | :------------------------------------------------------------------ | :---------------------------------- |
| `ForgeIconArrow`   | `direction`：`'up' \| 'right' \| 'down' \| 'left'`（默认 `'up'`）   | 通过内联变换旋转箭头。              |
| `ForgeIconChevron` | `direction`：`'up' \| 'right' \| 'down' \| 'left'`（默认 `'down'`） | 通过内联变换旋转 V 形。             |
| `ForgeIconSort`    | `active`：`boolean`，`direction`：`'asc' \| 'desc' \| undefined`    | 突出显示与活动排序方向匹配的 V 形。 |

## 图标库

该库包含大量图标，涵盖多个类别：

- **状态和状态**：`ForgeIconAlert`、`ForgeIconCheck`、`ForgeIconError`、`ForgeIconInfo`、`ForgeIconWarning`。
- **导航**：`ForgeIconArrow`、`ForgeIconChevron`、`ForgeIconHome`、`ForgeIconMenu`、`ForgeIconExternalLink`。
- **媒体**：`ForgeIconCamera`、`ForgeIconImage`、`ForgeIconMail`、`ForgeIconPhone`。
- **UI 控件**：`ForgeIconClose`、`ForgeIconEdit`、`ForgeIconPlus`、`ForgeIconMinus`、`ForgeIconSearch`、
  `ForgeIconSettings`。
- **内容格式**：`ForgeIconBold`、`ForgeIconItalic`、`ForgeIconBulletList`、`ForgeIconNumberedList`、
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`。
- **专用工具**：`ForgeIconWrench`、`ForgeIconPalette`、`ForgeIconDebug`、`ForgeIconQrCode`。

## 开发与维护

### 建筑图标

包拥有的构建发出中性声明、所有框架适配器和 SVG sprite。更改目录后或
精灵源，运行：

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### 故事书

图标编目在 `icons/<category>/<subcategory>/<icon-name>` 下，而 `icons/overview` 仍然是完整的图库。
该概述还通过一个 `IconSpriteProvider` 演示了重复的图标；个别故事暴露了 `size`，
`color`、国家/地区代码和 `ariaLabel` 控件（如果适用）。
