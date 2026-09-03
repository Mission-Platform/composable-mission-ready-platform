# 开发代币包

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/ui/tokens/docs/guides/development.md: [packages/ui/tokens/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

## 安装并验证

从存储库根运行包检查：

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

构建会在 `dist/` 中生成 JavaScript 和声明输出。生成
`src/generated/` 下的 SCSS 和 TypeScript 源是派生工件，
必须保持确定性。

## 更改令牌

编辑 `tokens/` 下的源 JSON 并保持其 DTCG 路径稳定，除非
变更是有意为之并记录在案的。组件合同存在于
`tokens/component/<atomic-level>/`；组件来源不应重复
共享令牌路径。使用现有的令牌生成脚本并查看两者
发布前的 SCSS 和 TypeScript 输出。

该包与框架无关。主题行为由消费者选择
通过导出的 SCSS 入口点的样式表；这个包不属于自己
应用程序主题状态或组件标记。
