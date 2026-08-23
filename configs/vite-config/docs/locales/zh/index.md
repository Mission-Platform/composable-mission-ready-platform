# @mission-platform/vite-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> configs/vite-config/docs/index.md: [configs/vite-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

共享 Vite 和 Vitest 任务平台包的配置助手和
应用程序。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/vite-config
```

使用 `defineLibraryConfig` 对于包裹， `defineAppConfig` 对于应用程序，以及
`defineVitestConfig` 从 `/vitest` 子路径。框架应用程序应该
选择一个 `defineFrameworkAppConfig` 条件然后导入共享包
通过他们的裸包说明符。

## 贡献

跑步 `pnpm --filter @mission-platform/vite-config lint` 和格式检查。保留
助手的默认值可重用并保留共享 Vite、PostCSS 和
包 README 中描述了外部化行为。
