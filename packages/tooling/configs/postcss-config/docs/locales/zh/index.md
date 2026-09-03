# @mission-platform/postcss-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/postcss-config/docs/index.md: [packages/tooling/configs/postcss-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Mission Platform 样式表使用的共享 PostCSS 管道。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

从工作区引用包 `postcss.config.mjs` 而不是
复制共享插件管道。本地覆盖属于那个
工作区配置。

## 贡献

跑步 `pnpm --filter @mission-platform/postcss-config lint` 和
`pnpm --filter @mission-platform/postcss-config format`。保留浏览器
此包中的兼容性行为并避免特定于应用程序的插件。
