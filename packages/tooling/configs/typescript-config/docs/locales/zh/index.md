# @mission-platform/typescript-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

共享 TypeScript 每个任务平台工作区的预设。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

扩展匹配预设 `tsconfig.json`： 使用 `app` 为了 Vue 应用程序，
`react` 为了 React 应用程序， `library` 对于包裹声明， `node` 对于工具，
和 `test` 为了 Vitest 规格。框架消费者还应该使用匹配的
`framework-<name>` 自定义条件预设。请参阅包 README 以了解
完整的预设表和示例。

## 贡献

将共享编译器标志保留在预设中。跑步
`pnpm --filter @mission-platform/typescript-config build:check` 和格式
更换后检查。
