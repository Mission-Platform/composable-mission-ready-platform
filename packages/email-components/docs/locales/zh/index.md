# @mission-platform/email-components

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/email-components` 包含类型化、框架中立的 Forge JSX 组件，用于生成电子邮件安全树。使用 `@mission-platform/email-renderer` 在服务器上序列化这些树；电子邮件路径不需要 Vue、React、Svelte、Solid、Web 组件运行时、浏览器 DOM 或 JavaScript。

## 用法

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## 浏览器预览

这些组件返回与框架使用的相同的框架中立的 Forge 树。
标准浏览器管道。要进行预览，请将该树传递给可选的
主机框架所需的适配器入口点：

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React、Svelte、Solid 和 Web 组件使用其相应的渲染器
子路径，或者所有五个都可以从
`@mission-platform/email-renderer/adapters`。浏览器预览路径和
`renderEmail` 服务器路径消耗相同的组件树；只有后者
添加完整的电子邮件文档包装。

## 成分

- 原子：`EmailTypography`、`EmailButton`、`EmailImage`、`EmailDivider`、`EmailSpacer`。
- 分子：`EmailRow`、`EmailColumn`、`EmailCard`、`EmailList`、`EmailSocialLinks`。
- 生物体：`EmailPreheader`、`EmailHeader`、`EmailFooter`。
- 模板：`EmailDocument`、`EmailContainer`、`EmailSection`。

`EmailTypography` 是单个文本原子，镜像网络 `ForgeTypography` 词汇：`as` 选择渲染元素（默认为 `p`，设置 `href` 时为 `a`），`variant` 选择文字比例（当 `as` 为 `as` 时匹配的标题比例） `h1`–`h6`，否则为 `body-md`)，以及 `color`、`align`、`target` 和 `underline` 调整内联声明。

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

所有布局均基于 `table`、`tbody`、`tr` 和 `td`。按钮是表格内的普通链接，图像需要非空 `alt` 文本，URL 进行验证，样式解析为 `@mission-platform/tokens` 中的文字声明。

## 兼容性政策

基线遵循 [我可以通过电子邮件发送功能目录吗](https://www.caniemail.com/features），在 `2026-08-08` 上进行审查。实现依赖于 [HTML 表格](https://www.caniemail.com/features/html-tables), [内联样式](https://www.caniemail.com/features/css-inline-styles), [最大宽度](https://www.caniemail.com/features/css-max-width)，以及可选的 [媒体查询](https://www.caniemail.com/features/css-at-media)。静态输出不依赖于 Flexbox、网格、CSS 自定义属性、逻辑属性、脚本、事件处理程序或框架水合标记。

响应式 CSS 仅是渐进增强：当删除或忽略 `<style>` 块时，内联表布局仍然可用。添加自定义节点时，在应用程序测试中使用 `assertCompatibleEmailHtml`。
