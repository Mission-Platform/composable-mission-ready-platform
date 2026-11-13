# @mission-platform/vite-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

任务平台包和 Vitest 共享 Vite 和 Vitest 配置助手
应用程序。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/vite-config
```

对于软件包使用 `defineLibraryConfig`，对于应用程序使用 `defineAppConfig`，并且
来自 `/vitest` 子路径的 `defineVitestConfig`。框架应用程序应该
选择一个 `defineFrameworkAppConfig` 条件，然后导入共享包
通过他们的裸包说明符。

## 贡献

运行 `pnpm --filter @mission-platform/vite-config lint` 并进行格式检查。保留
帮助器的默认值可重用并保留共享的 Vite、PostCSS 和
包 README 中描述了外部化行为。
