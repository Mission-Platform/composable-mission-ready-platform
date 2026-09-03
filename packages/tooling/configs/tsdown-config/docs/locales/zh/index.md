# @mission-platform/tsdown-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/tsdown-config/docs/index.md: [packages/tooling/configs/tsdown-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

用于可发布工作空间的共享 tsdown 库构建助手。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

使用工作区中的包 `tsdown.config.ts` 并保留入口点，
外部依赖项，以及正在构建的包本地的输出约束。
生成的声明和捆绑包属于该包的 `dist/` 目录。

## 贡献

跑步 `pnpm --filter @mission-platform/tsdown-config lint` 及其格式检查。
保留确定性输出并且不添加特定于框架的目标分支
到中立的构建助手。
