# @mission-platform/email-renderer

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/email-renderer` 拥有 Mission Platform 电子邮件树的框架中立渲染边界。它的根条目对于服务器端电子邮件生成来说是安全的；浏览器适配器被隔离在显式子路径后面。

## 服务器渲染和 Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown 被转换为共享的 Forge 树，因此链接、图像、文本和 HTML 在序列化之前会被转义或验证。输出具有确定性的属性/样式排序，并拒绝脚本 URL、事件属性、CSS 变量、flex/grid 值和框架标记。

## 浏览器适配器

仅使用浏览器预览或应用程序所需的适配器子路径：

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`、`toEmailVueComponent`。
- `@mission-platform/email-renderer/react` → `renderToEmailReact`、`toEmailReactComponent`。
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` 用于 Svelte 5 `{@render ...}`。
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`、`toEmailSolidComponent`。
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`。

对于公开所有五个浏览器适配器的单个可选导入，请使用
`@mission-platform/email-renderer/adapters`。该条目独立于
根条目，因此仅服务器电子邮件生成永远不会加载框架运行时。

这些可选入口点重复使用相同的 Forge 树。它们不是由根电子邮件序列化程序导入的，并且在仅服务器电子邮件部署中不需要。
