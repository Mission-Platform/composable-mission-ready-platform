# @mission-platform/stylelint-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

共享 Stylelint Mission Platform 中 CSS 和 SCSS 的规则。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

从工作区扩展包 `stylelint.config.mjs`。保留组件
样式接近其组件，并且仅对已记录的内容使用本地覆盖
工作空间限制。

## 贡献

跑步 `pnpm --filter @mission-platform/stylelint-config lint` 和
`pnpm --filter @mission-platform/stylelint-config format`。测试规则变更
针对包 SCSS 和应用程序样式。
