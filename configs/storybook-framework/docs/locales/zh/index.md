# @mission-platform/storybook-framework

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> configs/storybook-framework/docs/index.md: [configs/storybook-framework/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

为任务平台预设的环境选择的故事书框架。

## 安装与使用

将包添加到 Storybook 工作区并从中引用它
`.storybook/main.ts` 或相应的 Storybook 配置。选择
通过工作空间的支持条件建立框架；不要硬编码
共享组件包中的框架适配器。

## 贡献

跑步 `pnpm --filter @mission-platform/storybook-framework lint` 和
故事书构建检查。让这个包专注于框架选择和
共享故事书默认值；组件故事属于 `apps/storybook`.
